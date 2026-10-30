from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.schemas.budget import BudgetAuditResult
from app.schemas.transport import TransportRecommendation
from app.schemas.accommodation import AccommodationRecommendation
from app.schemas.itinerary import ItineraryDay

class BudgetValidationAgent(BaseAgent):
    def __init__(self, llm_provider=None):
        super().__init__("BudgetValidationAgent", llm_provider)

    async def run(self, context: Dict[str, Any]) -> BudgetAuditResult:
        user_budget_inr = context.get("budget_inr")
        travelers = max(1, int(context.get("travelers", 1)))
        duration_days = max(1, int(context.get("duration_days", 3)))

        transport: TransportRecommendation = context.get("transport")
        accommodation: AccommodationRecommendation = context.get("accommodation")
        itinerary: List[ItineraryDay] = context.get("itinerary", [])

        # 1. Deterministic calculation of cost categories
        # Transport per person * travelers
        transport_single = transport.total_cost_inr if transport else 0.0
        transport_total_inr = round(transport_single * travelers, 2)

        # Accommodation per room (assuming 2 travelers per room)
        rooms = (travelers + 1) // 2
        stay_base = accommodation.total_stay_inr if accommodation else 0.0
        stay_total_inr = round(stay_base * rooms, 2)

        # Activities entry fees across itinerary days
        activities_total_single = sum(
            day.morning.entry_fee_inr + day.afternoon.entry_fee_inr + day.evening.entry_fee_inr
            for day in itinerary
        )
        activities_total_inr = round(activities_total_single * travelers, 2)

        # Estimated dining and local incidentals (e.g. ₹900/day per person for mid-range)
        estimated_food_inr = round(900.0 * duration_days * travelers, 2)

        # Grand total
        grand_total_inr = round(
            transport_total_inr + stay_total_inr + activities_total_inr + estimated_food_inr,
            2
        )

        # Check hard budget constraint
        is_within_budget = True
        variance_inr = 0.0
        suggestions: List[str] = []

        if user_budget_inr is not None and user_budget_inr > 0:
            variance_inr = round(grand_total_inr - user_budget_inr, 2)
            is_within_budget = grand_total_inr <= user_budget_inr

            if not is_within_budget:
                # Deterministic cost-saving suggestions
                if transport and transport.mode.value == "FLIGHT":
                    flight_saving = round((transport.total_cost_inr - 1160.0) * travelers, 2)
                    if flight_saving > 0:
                        suggestions.append(
                            f"Switch from flights to the Vande Bharat Express or Shatabdi train to save ₹{flight_saving:,.0f}."
                        )

                if accommodation and accommodation.price_per_night_inr > 3000:
                    stay_saving = round((accommodation.price_per_night_inr - 2100.0) * accommodation.nights * rooms, 2)
                    if stay_saving > 0:
                        suggestions.append(
                            f"Opt for a certified boutique heritage homestay to save approx ₹{stay_saving:,.0f} on accommodation."
                        )

                suggestions.append(
                    f"Prioritize monument composite passes (saving up to 40% on entry fees) and dine at historic local eateries."
                )
            else:
                surplus = abs(variance_inr)
                suggestions.append(
                    f"Your itinerary is within budget with a comfortable reserve surplus of ₹{surplus:,.0f} for shopping and fine dining."
                )

        return BudgetAuditResult(
            user_budget_inr=user_budget_inr,
            transport_total_inr=transport_total_inr,
            stay_total_inr=stay_total_inr,
            activities_total_inr=activities_total_inr,
            estimated_food_inr=estimated_food_inr,
            grand_total_inr=grand_total_inr,
            is_within_budget=is_within_budget,
            variance_inr=variance_inr,
            cost_saving_suggestions=suggestions,
            confidence_score=0.96,
        )
