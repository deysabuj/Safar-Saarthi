from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.schemas.transport import TransportRecommendation, TransportCandidateItem
from app.schemas.trip import TransportCategory, TravelMode

class TransportRecommendationAgent(BaseAgent):
    def __init__(self, llm_provider=None):
        super().__init__("TransportRecommendationAgent", llm_provider)

    async def run(self, context: Dict[str, Any]) -> TransportRecommendation:
        candidates_raw: List[Dict[str, Any]] = context.get("transport_candidates", [])
        preferred_modes = context.get("preferred_modes") or []
        budget_inr = context.get("budget_inr")

        if not candidates_raw:
            # Generate deterministic fallback benchmark route if no candidates supplied
            return TransportRecommendation(
                selected_offer_id="fallback-irctc-vande-bharat",
                operator="Indian Railways (IRCTC)",
                identifier="20977 - Vande Bharat Express",
                mode=TravelMode.TRAIN,
                category=TransportCategory.BEST_VALUE,
                departure_time="06:00 AM",
                arrival_time="09:50 AM",
                duration_minutes=230,
                total_cost_inr=1160.0,
                booking_url="https://www.irctc.co.in/nget/train-search",
                trade_off_explanation="Direct express rail connection with zero airport check-in overhead.",
                alternative_options=[],
            )

        # Parse candidate items safely
        candidates: List[TransportCandidateItem] = [
            c if isinstance(c, TransportCandidateItem) else TransportCandidateItem(**c)
            for c in candidates_raw
        ]

        # Filter by preferred modes if requested
        matching = [c for c in candidates if not preferred_modes or c.mode in preferred_modes]
        pool = matching if matching else candidates

        # Select best value by default, or cheapest if budget is tight
        selected = pool[0]
        if budget_inr and budget_inr < 5000:
            # Pick cheapest
            cheapest = min(pool, key=lambda c: c.totalCostInr)
            selected = cheapest
        else:
            best_value = next((c for c in pool if c.category == TransportCategory.BEST_VALUE), pool[0])
            selected = best_value

        # Build trade-off explanation
        explanation = await self.llm.generate_explanation(
            f"Explain why {selected.operator} ({selected.mode.value}) is recommended over alternatives for a total fare of ₹{selected.totalCostInr}.",
            "You are a transparent Indian travel logistics specialist. Explain trade-offs between price and transit speed concisely."
        )

        alternatives = [
            {
                "id": c.id,
                "operator": c.operator,
                "mode": c.mode.value,
                "category": c.category.value,
                "total_cost_inr": c.totalCostInr,
                "duration_minutes": c.durationMinutes,
            }
            for c in pool if c.id != selected.id
        ][:3]

        return TransportRecommendation(
            selected_offer_id=selected.id,
            operator=selected.operator,
            identifier=selected.identifier,
            mode=selected.mode,
            category=selected.category,
            departure_time=selected.departureTime,
            arrival_time=selected.arrivalTime,
            duration_minutes=selected.durationMinutes,
            total_cost_inr=selected.totalCostInr,
            booking_url=selected.bookingUrl or "https://www.irctc.co.in",
            trade_off_explanation=explanation,
            alternative_options=alternatives,
        )
