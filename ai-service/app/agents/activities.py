from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.schemas.activities import ActivityItem

# Authentic place data repository for major Indian tourist corridors
VERIFIED_PLACES = {
    "jaipur": [
        ActivityItem(
            id="act-jp-amber-fort",
            title="Amber Fort & Sheesh Mahal Exploration",
            location="Devisinghpura, Amer, Jaipur",
            category="HERITAGE",
            time_slot="09:00 AM - 12:30 PM",
            duration_minutes=210,
            entry_fee_inr=100.0,
            description="Hilltop 16th-century Rajput fortress with stunning mirror mosaic palaces and panoramic Maota Lake vistas.",
            insider_tip="Arrive before 09:30 AM to tour before tour buses and witness the morning light across the Sheesh Mahal mirrors.",
        ),
        ActivityItem(
            id="act-jp-city-palace",
            title="City Palace & Chandra Mahal Royal Museum",
            location="Tulsi Marg, Gangori Bazaar, J.D.A. Market, Jaipur",
            category="HERITAGE",
            time_slot="02:00 PM - 04:30 PM",
            duration_minutes=150,
            entry_fee_inr=300.0,
            description="Active royal palace complex blending Rajasthani and Mughal court architecture, housing historic royal armory and costumes.",
            insider_tip="Composite tickets include entry to Jaigarh Fort and the royal cenotaphs.",
        ),
        ActivityItem(
            id="act-jp-hawa-mahal",
            title="Hawa Mahal & Johari Bazaar Walk",
            location="Badi Choupad, J.D.A. Market, Pink City, Jaipur",
            category="SHOPPING",
            time_slot="05:30 PM - 08:00 PM",
            duration_minutes=150,
            entry_fee_inr=50.0,
            description="Iconic 5-story pink honeycomb facade built for royal women, followed by traditional gemstone and blue pottery bazaar shopping.",
            insider_tip="Wind View Cafe across the street offers the best sunset photography angle of the facade.",
        ),
        ActivityItem(
            id="act-jp-jantar-mantar",
            title="Jantar Mantar UNESCO Astronomical Observatory",
            location="Gangori Bazaar, J.D.A. Market, Pink City, Jaipur",
            category="CULTURE",
            time_slot="10:00 AM - 12:00 PM",
            duration_minutes=120,
            entry_fee_inr=50.0,
            description="Collection of 19 architectural astronomical instruments built by Maharaja Jai Singh II, including the world's largest stone sundial.",
            insider_tip="Hire an authorized guide at the gate to appreciate how the sundials predict eclipse times within 2 seconds.",
        ),
        ActivityItem(
            id="act-jp-nahargarh",
            title="Nahargarh Fort Sunset & Stepwell Views",
            location="Krishna Nagar, Brahampuri, Jaipur",
            category="NATURE",
            time_slot="04:30 PM - 07:00 PM",
            duration_minutes=150,
            entry_fee_inr=50.0,
            description="Panoramic cliffside fortress overlooking the entire Pink City skyline, famous for dramatic sunset colors.",
            insider_tip="Pre-arrange your cab ride back down the hill as cell reception drops near the palace gates at dusk.",
        ),
        ActivityItem(
            id="act-jp-chokhi-dhani",
            title="Chokhi Dhani Ethnic Rajasthani Cultural Village",
            location="12 Miles, Tonk Road, Jaipur",
            category="FOOD",
            time_slot="07:30 PM - 10:30 PM",
            duration_minutes=180,
            entry_fee_inr=900.0,
            description="Immersive heritage village with puppet shows, folk Kalbelia dancing, fire eating, and a traditional pure-ghee Rajasthani Thali.",
            insider_tip="Arrive hungry; the Dal Baati Churma and Ker Sangri are served with unlimited hospitality.",
        ),
    ]
}

class ActivitiesAgent(BaseAgent):
    def __init__(self, llm_provider=None):
        super().__init__("ActivitiesAgent", llm_provider)

    async def run(self, context: Dict[str, Any]) -> List[ActivityItem]:
        destination = (context.get("destination") or "jaipur").strip().lower()
        interests = [i.strip().upper() for i in context.get("interests", [])]

        places = VERIFIED_PLACES.get("jaipur")
        for key in VERIFIED_PLACES:
            if key in destination:
                places = VERIFIED_PLACES[key]
                break

        # If user specified interests, sort them to front
        if interests:
            sorted_places = sorted(
                places,
                key=lambda p: 0 if p.category.upper() in interests else 1
            )
            return sorted_places

        return places
