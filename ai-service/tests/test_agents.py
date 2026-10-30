import asyncio
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from app.schemas.trip import (
    TripPlanningQuery,
    TravelMode,
    TransportCategory,
    TravelStyle,
    ActivityPace,
    DietaryPref,
    MissingDetailsResponse,
)
from app.schemas.transport import TransportCandidateItem, TransportRecommendation
from app.schemas.accommodation import AccommodationRecommendation
from app.schemas.activities import ActivityItem
from app.schemas.itinerary import ItineraryDay
from app.schemas.plan import CompleteTripPlanResponse
from app.agents.coordinator import TripCoordinatorAgent
from app.agents.transport import TransportRecommendationAgent
from app.agents.accommodation import AccommodationAgent
from app.agents.activities import ActivitiesAgent
from app.agents.itinerary import ItineraryPlanningAgent
from app.agents.budget import BudgetValidationAgent
from app.llm.provider import MockLLMProvider
from app.api.v1.plan import generate_plan, PlanTripRequest


# ---------------------------------------------------------------------------
# Fixtures and Sample Data
# ---------------------------------------------------------------------------

def make_sample_candidates():
    now_iso = datetime.now(timezone.utc).isoformat()
    return [
        TransportCandidateItem(
            id="FL-001",
            mode=TravelMode.FLIGHT,
            category=TransportCategory.FASTEST,
            operator="IndiGo",
            identifier="6E-204",
            originHub="DEL",
            destinationHub="JAI",
            departureTime=now_iso,
            arrivalTime=now_iso,
            durationMinutes=60,
            baseFareInr=4000.0,
            taxesAndFeesInr=500.0,
            totalCostInr=4500.0,
            bookingUrl="https://amadeus.example.com/book/FL-001",
        ),
        TransportCandidateItem(
            id="TR-12951",
            mode=TravelMode.TRAIN,
            category=TransportCategory.BEST_VALUE,
            operator="Indian Railways",
            identifier="12015 Ajmer Shatabdi",
            originHub="NDLS",
            destinationHub="JP",
            departureTime=now_iso,
            arrivalTime=now_iso,
            durationMinutes=270,
            baseFareInr=800.0,
            taxesAndFeesInr=50.0,
            totalCostInr=850.0,
            bookingUrl="https://irctc.example.com/book/12951",
        ),
        TransportCandidateItem(
            id="BS-ZING-01",
            mode=TravelMode.BUS,
            category=TransportCategory.CHEAPEST,
            operator="Zingbus",
            identifier="Electric AC Sleeper",
            originHub="ISBT Kashmiri Gate",
            destinationHub="Sindhi Camp",
            departureTime=now_iso,
            arrivalTime=now_iso,
            durationMinutes=330,
            baseFareInr=550.0,
            taxesAndFeesInr=50.0,
            totalCostInr=600.0,
            bookingUrl="https://zingbus.example.com/book/01",
        ),
    ]


# ---------------------------------------------------------------------------
# 1. Schema and Validation Tests
# ---------------------------------------------------------------------------

def test_query_validation_success():
    query = TripPlanningQuery(
        origin="Delhi",
        destination="Jaipur",
        departure_date="2026-11-15",
        return_date="2026-11-18",
        travelers=2,
        budget_inr=25000.0,
        preferred_modes=[TravelMode.TRAIN, TravelMode.FLIGHT],
        style=TravelStyle.MID_RANGE,
        pace=ActivityPace.MODERATE,
    )
    assert query.origin == "Delhi"
    assert query.destination == "Jaipur"
    assert query.travelers == 2
    assert query.budget_inr == 25000.0
    assert query.style == TravelStyle.MID_RANGE


def test_query_validation_same_origin_and_destination_fails():
    with pytest.raises(ValidationError) as exc_info:
        TripPlanningQuery(
            origin="Jaipur",
            destination="Jaipur",
            departure_date="2026-11-15",
            travelers=1,
        )
    assert "cannot be identical" in str(exc_info.value)


def test_query_validation_negative_budget_fails():
    with pytest.raises(ValidationError):
        TripPlanningQuery(
            origin="Delhi",
            destination="Jaipur",
            departure_date="2026-11-15",
            budget_inr=-500.0,
        )


def test_query_validation_below_minimum_budget_fails():
    with pytest.raises(ValidationError):
        TripPlanningQuery(
            origin="Delhi",
            destination="Jaipur",
            departure_date="2026-11-15",
            budget_inr=100.0,  # Below ge=500.0
        )


def test_query_validation_zero_travelers_fails():
    with pytest.raises(ValidationError):
        TripPlanningQuery(
            origin="Delhi",
            destination="Jaipur",
            departure_date="2026-11-15",
            travelers=0,
        )


# ---------------------------------------------------------------------------
# 2. Coordinator Missing Details Validation Tests
# ---------------------------------------------------------------------------

def test_coordinator_identifies_missing_origin():
    coordinator = TripCoordinatorAgent()
    query = TripPlanningQuery(
        origin="  ",  # 2 spaces passes min_length=2, but strip() fails coordinator check
        destination="Jaipur",
        departure_date="2026-11-15",
    )
    missing_response = coordinator.validate_essential_details(query)
    assert isinstance(missing_response, MissingDetailsResponse)
    assert "origin" in missing_response.missing_fields
    assert missing_response.needs_clarification is True


def test_coordinator_identifies_missing_destination():
    coordinator = TripCoordinatorAgent()
    query = TripPlanningQuery(
        origin="Delhi",
        destination="  ",
        departure_date="2026-11-15",
    )
    missing_response = coordinator.validate_essential_details(query)
    assert isinstance(missing_response, MissingDetailsResponse)
    assert "destination" in missing_response.missing_fields


def test_coordinator_validates_when_all_essentials_present():
    coordinator = TripCoordinatorAgent()
    query = TripPlanningQuery(
        origin="Delhi",
        destination="Jaipur",
        departure_date="2026-11-15",
    )
    missing_response = coordinator.validate_essential_details(query)
    assert missing_response is None


# ---------------------------------------------------------------------------
# 3. Transport Recommendation Agent Tests
# ---------------------------------------------------------------------------

def test_transport_agent_selects_cheapest_for_budget_style():
    async def run():
        agent = TransportRecommendationAgent(MockLLMProvider())
        candidates = make_sample_candidates()
        ctx = {
            "budget_inr": 3000.0,  # Below 5000 -> triggers cheapest selection
            "transport_candidates": candidates,
        }
        rec, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert rec is not None
        # Cheapest candidate is the bus at 600.0 INR
        assert rec.selected_offer_id == "BS-ZING-01"
        assert rec.mode == TravelMode.BUS
        assert rec.total_cost_inr == 600.0
        assert rec.booking_url == "https://zingbus.example.com/book/01"
        assert len(rec.alternative_options) == 2
    asyncio.run(run())


def test_transport_agent_selects_best_value_for_generous_budget():
    async def run():
        agent = TransportRecommendationAgent(MockLLMProvider())
        candidates = make_sample_candidates()
        ctx = {
            "budget_inr": 15000.0,
            "transport_candidates": candidates,
        }
        rec, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert rec is not None
        # Best value candidate is the train at 850.0 INR
        assert rec.selected_offer_id == "TR-12951"
        assert rec.mode == TravelMode.TRAIN
        assert rec.total_cost_inr == 850.0
        assert rec.booking_url == "https://irctc.example.com/book/12951"
    asyncio.run(run())


def test_transport_agent_empty_candidates_fallback():
    async def run():
        agent = TransportRecommendationAgent(MockLLMProvider())
        ctx = {"transport_candidates": []}
        rec, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert rec is not None
        assert rec.selected_offer_id == "fallback-irctc-vande-bharat"
        assert rec.mode == TravelMode.TRAIN
        assert rec.total_cost_inr == 1160.0
    asyncio.run(run())


# ---------------------------------------------------------------------------
# 4. Accommodation Agent Tests
# ---------------------------------------------------------------------------

def test_accommodation_agent_returns_verified_stay():
    async def run():
        agent = AccommodationAgent(MockLLMProvider())
        ctx = {
            "destination": "jaipur",
            "style": TravelStyle.MID_RANGE,
            "duration_days": 4,  # 3 nights
        }
        rec, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert rec is not None
        assert "Haveli" in rec.name
        assert rec.nights == 3
        assert rec.price_per_night_inr == 4200.0
        assert rec.total_stay_inr == 4200.0 * 3
        assert rec.rating >= 4.0
    asyncio.run(run())


def test_accommodation_agent_budget_style_selects_affordable_guesthouse():
    async def run():
        agent = AccommodationAgent(MockLLMProvider())
        ctx = {
            "destination": "jaipur",
            "style": TravelStyle.BUDGET,
            "duration_days": 3,  # 2 nights
        }
        rec, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert rec is not None
        assert rec.type == "BOUTIQUE_HOMESTAY"
        assert rec.price_per_night_inr == 2100.0
        assert rec.total_stay_inr == 4200.0
    asyncio.run(run())


# ---------------------------------------------------------------------------
# 5. Activities Agent Tests
# ---------------------------------------------------------------------------

def test_activities_agent_curates_destination_sights():
    async def run():
        agent = ActivitiesAgent(MockLLMProvider())
        ctx = {
            "destination": "jaipur",
            "interests": ["HERITAGE", "SHOPPING"],
        }
        activities, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert isinstance(activities, list)
        assert len(activities) >= 4
        # Top interest should be sorted to the front
        first_act = activities[0]
        assert first_act.category in ["HERITAGE", "SHOPPING"]
        assert first_act.entry_fee_inr >= 0
        assert first_act.duration_minutes > 0
    asyncio.run(run())


# ---------------------------------------------------------------------------
# 6. Itinerary Planning Agent Tests
# ---------------------------------------------------------------------------

def test_itinerary_planning_agent_builds_daily_schedule():
    async def run():
        agent = ItineraryPlanningAgent(MockLLMProvider())
        activities_agent = ActivitiesAgent(MockLLMProvider())
        activities, _, _ = await activities_agent.execute({"destination": "jaipur"})

        ctx = {
            "departure_date": "2026-11-20",
            "duration_days": 3,
            "activities": activities,
            "destination": "Jaipur",
        }
        days, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert isinstance(days, list)
        assert len(days) == 3
        day_1 = days[0]
        assert day_1.day_number == 1
        assert day_1.date == "2026-11-20"
        assert day_1.morning is not None
        assert day_1.afternoon is not None
        assert day_1.evening is not None
        assert len(day_1.dining_recommendation) > 0
        assert day_1.estimated_daily_spend_inr > 0
    asyncio.run(run())


# ---------------------------------------------------------------------------
# 7. Budget Validation Agent Tests (Strictly Deterministic Arithmetic)
# ---------------------------------------------------------------------------

def test_budget_agent_detects_deficit_and_provides_suggestions():
    async def run():
        agent = BudgetValidationAgent(MockLLMProvider())
        # Flight transport
        transport = TransportRecommendation(
            selected_offer_id="FL-001",
            operator="IndiGo",
            identifier="6E-204",
            mode=TravelMode.FLIGHT,
            category=TransportCategory.FASTEST,
            departure_time="06:00 AM",
            arrival_time="07:00 AM",
            duration_minutes=60,
            total_cost_inr=5000.0,
            booking_url="https://amadeus.example.com",
            trade_off_explanation="Fastest flight",
            alternative_options=[],
        )
        accommodation = AccommodationRecommendation(
            id="acc-jp-luxury-3",
            name="Rambagh Palace",
            type="RESORT",
            price_per_night_inr=24000.0,
            total_stay_inr=48000.0,
            nights=2,
            rating=4.95,
            proximity_to_hub="5.5 km",
            amenities=["Spa"],
            why_recommended="Luxury heritage",
        )
        itinerary = [
            ItineraryDay(
                day_number=1,
                date="2026-11-20",
                theme="Heritage",
                morning=ActivityItem(id="a1", title="Fort", location="Amer", category="HERITAGE", time_slot="Morning", duration_minutes=120, entry_fee_inr=200.0, description="Fort"),
                afternoon=ActivityItem(id="a2", title="Palace", location="City", category="HERITAGE", time_slot="Afternoon", duration_minutes=120, entry_fee_inr=300.0, description="Palace"),
                evening=ActivityItem(id="a3", title="Market", location="Bazaar", category="SHOPPING", time_slot="Evening", duration_minutes=120, entry_fee_inr=0.0, description="Market"),
                dining_recommendation="Local dinner",
                estimated_daily_spend_inr=1300.0,
            )
        ]
        ctx = {
            "budget_inr": 10000.0,  # Strict budget
            "travelers": 1,
            "duration_days": 2,
            "transport": transport,
            "accommodation": accommodation,
            "itinerary": itinerary,
        }
        audit, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert audit.is_within_budget is False
        assert audit.variance_inr > 0  # Deficit
        assert audit.grand_total_inr > 10000.0
        assert len(audit.cost_saving_suggestions) >= 2
        # Should include suggestion to switch flight and high stay costs
        assert any("Vande Bharat" in s or "train" in s for s in audit.cost_saving_suggestions)
    asyncio.run(run())


def test_budget_agent_detects_surplus():
    async def run():
        agent = BudgetValidationAgent(MockLLMProvider())
        transport = TransportRecommendation(
            selected_offer_id="TR-001",
            operator="IRCTC",
            identifier="Shatabdi",
            mode=TravelMode.TRAIN,
            category=TransportCategory.BEST_VALUE,
            departure_time="06:00 AM",
            arrival_time="10:00 AM",
            duration_minutes=240,
            total_cost_inr=850.0,
            booking_url="https://irctc.co.in",
            trade_off_explanation="Value rail",
            alternative_options=[],
        )
        accommodation = AccommodationRecommendation(
            id="acc-1",
            name="Pearl Palace",
            type="BOUTIQUE_HOMESTAY",
            price_per_night_inr=2100.0,
            total_stay_inr=4200.0,
            nights=2,
            rating=4.8,
            proximity_to_hub="1 km",
            amenities=["WiFi"],
            why_recommended="Value stay",
        )
        ctx = {
            "budget_inr": 25000.0,  # Generous budget
            "travelers": 1,
            "duration_days": 2,
            "transport": transport,
            "accommodation": accommodation,
            "itinerary": [],
        }
        audit, duration, status = await agent.execute(ctx)

        assert status == "SUCCESS"
        assert audit.is_within_budget is True
        assert audit.variance_inr < 0  # Negative = surplus
        assert any("surplus" in s for s in audit.cost_saving_suggestions)
    asyncio.run(run())


# ---------------------------------------------------------------------------
# 8. Full Coordinator End-to-End Orchestration Tests
# ---------------------------------------------------------------------------

def test_coordinator_full_plan_assembly():
    async def run():
        coordinator = TripCoordinatorAgent()
        query = TripPlanningQuery(
            origin="Delhi",
            destination="Jaipur",
            departure_date="2026-11-15",
            return_date="2026-11-17",
            travelers=2,
            budget_inr=25000.0,
            style=TravelStyle.MID_RANGE,
            interests=["HERITAGE", "FOOD"],
        )
        candidates = make_sample_candidates()
        response = await coordinator.run({
            "query": query,
            "transport_candidates": [c.model_dump() for c in candidates],
        })

        assert isinstance(response, CompleteTripPlanResponse)
        assert response.destination == "Jaipur"
        assert response.transport is not None
        assert response.transport.mode in [TravelMode.TRAIN, TravelMode.BUS, TravelMode.FLIGHT]
        assert response.accommodation is not None
        assert len(response.itinerary) >= 2
        assert response.budget_analysis is not None
        assert len(response.agent_traces) >= 5
        assert len(response.title) > 0
        assert len(response.summary) > 0
    asyncio.run(run())


def test_coordinator_missing_details_returns_early():
    coordinator = TripCoordinatorAgent()
    query = TripPlanningQuery(
        origin="  ",
        destination="Jaipur",
        departure_date="2026-11-15",
    )
    response = coordinator.validate_essential_details(query)
    assert isinstance(response, MissingDetailsResponse)
    assert "origin" in response.missing_fields


# ---------------------------------------------------------------------------
# 9. API Route Direct Handler Tests
# ---------------------------------------------------------------------------

def test_api_route_generate_plan_direct():
    async def run():
        query = TripPlanningQuery(
            origin="Delhi",
            destination="Jaipur",
            departure_date="2026-11-15",
            return_date="2026-11-17",
            travelers=1,
            budget_inr=15000.0,
        )
        candidates = make_sample_candidates()
        payload = PlanTripRequest(
            query=query,
            transport_candidates=[c.model_dump() for c in candidates],
        )
        result = await generate_plan(payload)
        assert isinstance(result, CompleteTripPlanResponse)
        assert result.destination == "Jaipur"
        assert result.budget_analysis.grand_total_inr > 0
    asyncio.run(run())
