from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.agents.base import BaseAgent
from app.schemas.itinerary import ItineraryDay
from app.schemas.activities import ActivityItem

class ItineraryPlanningAgent(BaseAgent):
    def __init__(self, llm_provider=None):
        super().__init__("ItineraryPlanningAgent", llm_provider)

    async def run(self, context: Dict[str, Any]) -> List[ItineraryDay]:
        departure_date_str = context.get("departure_date", "2026-11-20")
        duration_days = int(context.get("duration_days", 3))
        activities: List[ActivityItem] = context.get("activities", [])
        destination = (context.get("destination") or "Jaipur").title()

        try:
            start_date = datetime.strptime(departure_date_str, "%Y-%m-%d")
        except ValueError:
            start_date = datetime.now() + timedelta(days=14)

        days: List[ItineraryDay] = []
        themes = [
            "Royal Fortresses & Palace Heritage",
            "Pink City Bazaars, Astronomy & Sunset Panoramas",
            "Culinary Traditions & Cultural Immersion",
            "Hidden Stepwells & Artisan Crafts",
        ]

        dining_spots = [
            "Lunch at 1135 AD inside Amber Fort (Royal Thali) & Dinner at Handi on MI Road (Laal Maas)",
            "Lunch at Laxmi Mishthan Bhandar (LMB) for Pyaz Kachori & Evening tea at Wind View Cafe",
            "Traditional feast at Chokhi Dhani & Local sweets at Rawat Mishthan Bhandar",
            "Dinner at The Rajput Room at Rambagh Palace",
        ]

        # Allocate activities across days
        act_index = 0
        total_acts = len(activities)

        for d in range(1, duration_days + 1):
            day_date = (start_date + timedelta(days=d - 1)).strftime("%Y-%m-%d")
            theme = themes[(d - 1) % len(themes)]
            dining = dining_spots[(d - 1) % len(dining_spots)]

            # Morning
            morning = activities[act_index % total_acts] if total_acts > 0 else ActivityItem(
                id=f"act-gen-{d}-1", title="Historic Monument Walk", location=f"Old Town, {destination}",
                category="HERITAGE", time_slot="09:00 AM - 12:00 PM", entry_fee_inr=100.0,
                description="Explore local architectural landmarks."
            )
            act_index += 1

            # Afternoon
            afternoon = activities[act_index % total_acts] if total_acts > 0 else ActivityItem(
                id=f"act-gen-{d}-2", title="Cultural Museum Tour", location=f"Central District, {destination}",
                category="CULTURE", time_slot="02:00 PM - 04:30 PM", entry_fee_inr=150.0,
                description="Browse historic exhibits and local craft galleries."
            )
            act_index += 1

            # Evening
            evening = activities[act_index % total_acts] if total_acts > 0 else ActivityItem(
                id=f"act-gen-{d}-3", title="Evening Bazaar & Sunset", location=f"Main Market, {destination}",
                category="SHOPPING", time_slot="05:30 PM - 08:00 PM", entry_fee_inr=0.0,
                description="Local artisan markets and street food tasting."
            )
            act_index += 1

            daily_spend = morning.entry_fee_inr + afternoon.entry_fee_inr + evening.entry_fee_inr + 800.0  # +800 for meals

            days.append(
                ItineraryDay(
                    day_number=d,
                    date=day_date,
                    theme=theme,
                    morning=morning,
                    afternoon=afternoon,
                    evening=evening,
                    dining_recommendation=dining,
                    estimated_daily_spend_inr=daily_spend,
                )
            )

        return days
