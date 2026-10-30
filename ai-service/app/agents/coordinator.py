import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Union, List
from app.agents.base import BaseAgent
from app.agents.transport import TransportRecommendationAgent
from app.agents.accommodation import AccommodationAgent
from app.agents.activities import ActivitiesAgent
from app.agents.itinerary import ItineraryPlanningAgent
from app.agents.budget import BudgetValidationAgent
from app.schemas.trip import TripPlanningQuery, MissingDetailsResponse
from app.schemas.plan import CompleteTripPlanResponse, AgentExecutionTrace
from app.core.logging import logger

class TripCoordinatorAgent(BaseAgent):
    def __init__(self, llm_provider=None):
        super().__init__("TripCoordinatorAgent", llm_provider)
        self.transport_agent = TransportRecommendationAgent(llm_provider)
        self.accommodation_agent = AccommodationAgent(llm_provider)
        self.activities_agent = ActivitiesAgent(llm_provider)
        self.itinerary_agent = ItineraryPlanningAgent(llm_provider)
        self.budget_agent = BudgetValidationAgent(llm_provider)

    def validate_essential_details(self, query: TripPlanningQuery) -> Union[None, MissingDetailsResponse]:
        """Checks for missing essential details without which planning cannot safely proceed."""
        missing = []
        if not query.origin or len(query.origin.strip()) < 2:
            missing.append("origin")
        if not query.destination or len(query.destination.strip()) < 2:
            missing.append("destination")
        if not query.departure_date:
            missing.append("departure_date")

        if missing:
            fields_str = ", ".join(missing)
            return MissingDetailsResponse(
                needs_clarification=True,
                missing_fields=missing,
                clarification_question=f"Please specify your {fields_str} so Safar Saarthi can search verified transit and accommodations.",
                suggested_defaults={
                    "origin": "New Delhi (DEL)",
                    "destination": "Jaipur (JAI)",
                    "departure_date": datetime.now().strftime("%Y-%m-%d"),
                },
            )
        return None

    async def run(self, context: Dict[str, Any]) -> CompleteTripPlanResponse:
        traces: List[AgentExecutionTrace] = []
        query_dict = context.get("query", {})
        query = TripPlanningQuery(**query_dict) if isinstance(query_dict, dict) else query_dict

        # Calculate trip duration in days
        duration_days = 3
        if query.return_date and query.departure_date:
            try:
                d1 = datetime.strptime(query.departure_date, "%Y-%m-%d")
                d2 = datetime.strptime(query.return_date, "%Y-%m-%d")
                diff = (d2 - d1).days
                if diff > 0:
                    duration_days = min(14, diff + 1)
            except ValueError:
                pass

        shared_context = {
            "origin": query.origin,
            "destination": query.destination,
            "departure_date": query.departure_date,
            "return_date": query.return_date,
            "travelers": query.travelers,
            "budget_inr": query.budget_inr,
            "preferred_modes": query.preferred_modes,
            "pace": query.pace,
            "style": query.style,
            "dietary": query.dietary,
            "interests": query.interests,
            "duration_days": duration_days,
            "transport_candidates": context.get("transport_candidates", []),
        }

        # 1. Concurrently invoke independent specialist searches (Transport, Accommodation, Activities)
        transport_task = self.transport_agent.execute(shared_context)
        accommodation_task = self.accommodation_agent.execute(shared_context)
        activities_task = self.activities_agent.execute(shared_context)

        results = await asyncio.gather(
            transport_task,
            accommodation_task,
            activities_task,
            return_exceptions=True
        )

        # Process Transport Agent Output
        if isinstance(results[0], Exception):
            logger.error(f"TransportAgent failed: {str(results[0])}; engaging fallback.")
            traces.append(AgentExecutionTrace(agent_name="TransportRecommendationAgent", status="FALLBACK", duration_ms=0, summary="Used fallback benchmark route"))
            transport_rec, _, _ = await self.transport_agent.execute({**shared_context, "transport_candidates": []})
        else:
            transport_rec, duration, status = results[0]
            traces.append(AgentExecutionTrace(agent_name="TransportRecommendationAgent", status=status, duration_ms=duration, summary=f"Recommended {transport_rec.operator} ({transport_rec.mode.value})"))

        # Process Accommodation Agent Output
        if isinstance(results[1], Exception):
            logger.error(f"AccommodationAgent failed: {str(results[1])}; engaging fallback.")
            traces.append(AgentExecutionTrace(agent_name="AccommodationAgent", status="FALLBACK", duration_ms=0, summary="Used standard heritage stay"))
            accommodation_rec, _, _ = await self.accommodation_agent.execute({**shared_context, "style": "MID_RANGE"})
        else:
            accommodation_rec, duration, status = results[1]
            traces.append(AgentExecutionTrace(agent_name="AccommodationAgent", status=status, duration_ms=duration, summary=f"Recommended {accommodation_rec.name} (₹{accommodation_rec.total_stay_inr:,.0f})"))

        # Process Activities Agent Output
        if isinstance(results[2], Exception):
            logger.error(f"ActivitiesAgent failed: {str(results[2])}; engaging fallback.")
            traces.append(AgentExecutionTrace(agent_name="ActivitiesAgent", status="FALLBACK", duration_ms=0, summary="Used top city sights"))
            activities_list, _, _ = await self.activities_agent.execute({**shared_context, "interests": []})
        else:
            activities_list, duration, status = results[2]
            traces.append(AgentExecutionTrace(agent_name="ActivitiesAgent", status=status, duration_ms=duration, summary=f"Selected {len(activities_list)} verified places & experiences"))

        # 2. Sequential Dependent Agent: Itinerary Planning Agent
        shared_context["transport"] = transport_rec
        shared_context["accommodation"] = accommodation_rec
        shared_context["activities"] = activities_list

        itinerary_days, itin_duration, itin_status = await self.itinerary_agent.execute(shared_context)
        traces.append(AgentExecutionTrace(
            agent_name="ItineraryPlanningAgent",
            status=itin_status,
            duration_ms=itin_duration,
            summary=f"Organized {len(itinerary_days)}-day feasible itinerary around travel schedule"
        ))

        # 3. Sequential Dependent Agent: Budget and Constraint Validation Agent
        shared_context["itinerary"] = itinerary_days
        budget_analysis, budget_duration, budget_status = await self.budget_agent.execute(shared_context)
        traces.append(AgentExecutionTrace(
            agent_name="BudgetValidationAgent",
            status=budget_status,
            duration_ms=budget_duration,
            summary=f"Total: ₹{budget_analysis.grand_total_inr:,.0f} (Within budget: {budget_analysis.is_within_budget})"
        ))

        # 4. Synthesize Final Plan
        title = f"{duration_days}-Day Curated Journey to {query.destination.title()}"
        summary = (
            f"Personalized multi-agent travel plan from {query.origin} to {query.destination}. "
            f"Features verified {transport_rec.operator} transit, stay at {accommodation_rec.name}, "
            f"and {len(itinerary_days)} days of cultural experiences."
        )

        return CompleteTripPlanResponse(
            trip_id=context.get("trip_id"),
            destination=query.destination,
            title=title,
            summary=summary,
            context={
                "origin": query.origin,
                "departure_date": query.departure_date,
                "travelers": query.travelers,
                "duration_days": duration_days,
                "budget_inr": query.budget_inr,
            },
            transport=transport_rec,
            accommodation=accommodation_rec,
            itinerary=itinerary_days,
            budget_analysis=budget_analysis,
            agent_traces=traces,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
