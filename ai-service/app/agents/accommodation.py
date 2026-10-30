from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.schemas.accommodation import AccommodationRecommendation
from app.schemas.trip import TravelStyle

# Authentic verified accommodation repository for Indian corridors
VERIFIED_STAYS = {
    "jaipur": [
        {
            "id": "acc-jp-haveli-1",
            "name": "Alsisar Haveli - Heritage Heritage Hotel",
            "type": "HERITAGE_HAVELI",
            "price_per_night_inr": 4200.0,
            "rating": 4.8,
            "proximity_to_hub": "1.8 km from Jaipur Junction (JP)",
            "amenities": ["Swimming Pool", "Rooftop Restaurant", "Traditional Courtyard", "Free WiFi", "Rajasthani Breakfast"],
            "style": TravelStyle.MID_RANGE,
        },
        {
            "id": "acc-jp-boutique-2",
            "name": "Pearl Palace Heritage Boutique Guesthouse",
            "type": "BOUTIQUE_HOMESTAY",
            "price_per_night_inr": 2100.0,
            "rating": 4.9,
            "proximity_to_hub": "1.2 km from Sindhi Camp Central Bus Stand",
            "amenities": ["Hand-painted Frescoes", "Peacock Rooftop Dining", "Air Conditioning", "Travel Desk"],
            "style": TravelStyle.BUDGET,
        },
        {
            "id": "acc-jp-luxury-3",
            "name": "Rambagh Palace (Taj Luxury Heritage)",
            "type": "RESORT",
            "price_per_night_inr": 24000.0,
            "rating": 4.95,
            "proximity_to_hub": "5.5 km from Jaipur Airport (JAI)",
            "amenities": ["Royal Butler Service", "Mughal Gardens", "Spa & Wellness", "Fine Dining"],
            "style": TravelStyle.LUXURY,
        },
    ],
    "goa": [
        {
            "id": "acc-goa-resort-1",
            "name": "Santana Beach Resort (Candolim)",
            "type": "RESORT",
            "price_per_night_inr": 3800.0,
            "rating": 4.6,
            "proximity_to_hub": "100m from Candolim Beach, 38km from Dabolim Airport",
            "amenities": ["Beach Access", "Two Swimming Pools", "Olegario's Shack", "Garden Patios"],
            "style": TravelStyle.MID_RANGE,
        },
    ],
    "delhi": [
        {
            "id": "acc-del-hotel-1",
            "name": "The Claridges New Delhi",
            "type": "HOTEL",
            "price_per_night_inr": 7500.0,
            "rating": 4.7,
            "proximity_to_hub": "3 km from New Delhi Railway Station (NDLS)",
            "amenities": ["Lutyens Architecture", "Dhaba Restaurant", "Gym & Pool", "Spa"],
            "style": TravelStyle.MID_RANGE,
        },
    ],
}

class AccommodationAgent(BaseAgent):
    def __init__(self, llm_provider=None):
        super().__init__("AccommodationAgent", llm_provider)

    async def run(self, context: Dict[str, Any]) -> AccommodationRecommendation:
        destination = (context.get("destination") or "jaipur").strip().lower()
        style = context.get("style") or TravelStyle.MID_RANGE
        nights = context.get("duration_days", 3) - 1
        if nights < 1:
            nights = 1

        # Match destination repository or fallback to Jaipur
        city_stays = VERIFIED_STAYS.get("jaipur")
        for key in VERIFIED_STAYS:
            if key in destination:
                city_stays = VERIFIED_STAYS[key]
                break

        # Filter by travel style preference
        matching = [s for s in city_stays if s["style"] == style]
        chosen = matching[0] if matching else city_stays[0]

        total_stay_inr = round(chosen["price_per_night_inr"] * nights, 2)

        why_recommended = await self.llm.generate_explanation(
            f"Explain why {chosen['name']} ({chosen['type']}) is recommended for a {style.value} trip to {destination}.",
            "You are an Indian hospitality expert focusing on location, heritage, and genuine value."
        )

        return AccommodationRecommendation(
            id=chosen["id"],
            name=chosen["name"],
            type=chosen["type"],
            price_per_night_inr=chosen["price_per_night_inr"],
            total_stay_inr=total_stay_inr,
            nights=nights,
            rating=chosen["rating"],
            proximity_to_hub=chosen["proximity_to_hub"],
            amenities=chosen["amenities"],
            why_recommended=why_recommended,
        )
