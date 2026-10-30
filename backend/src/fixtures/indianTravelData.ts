import { ProviderCategory, TravelMode, TransportCategory, OfferDataSource, AccommodationType, ActivityCategory } from '@prisma/client';

export interface SeedProvider {
  code: string;
  name: string;
  category: ProviderCategory;
  officialUrl: string;
}

export const INITIAL_PROVIDERS: SeedProvider[] = [
  {
    code: 'IRCTC',
    name: 'Indian Railway Catering and Tourism Corporation',
    category: ProviderCategory.RAIL,
    officialUrl: 'https://www.irctc.co.in/nget/train-search',
  },
  {
    code: 'INDIGO',
    name: 'IndiGo Airlines (InterGlobe Aviation)',
    category: ProviderCategory.AIRLINE,
    officialUrl: 'https://www.goindigo.in',
  },
  {
    code: 'AIR_INDIA',
    name: 'Air India Limited',
    category: ProviderCategory.AIRLINE,
    officialUrl: 'https://www.airindia.com',
  },
  {
    code: 'REDBUS',
    name: 'RedBus India Intercity',
    category: ProviderCategory.BUS_OPERATOR,
    officialUrl: 'https://www.redbus.in',
  },
  {
    code: 'RSRTC',
    name: 'Rajasthan State Road Transport Corporation',
    category: ProviderCategory.BUS_OPERATOR,
    officialUrl: 'https://rsrtconline.rajasthan.gov.in',
  },
  {
    code: 'MAKEMYTRIP',
    name: 'MakeMyTrip Stays & Experiences',
    category: ProviderCategory.OTA_HOTEL,
    officialUrl: 'https://www.makemytrip.com',
  },
  {
    code: 'AMADEUS',
    name: 'Amadeus for Developers (GDS Flight Network)',
    category: ProviderCategory.AIRLINE,
    officialUrl: 'https://developers.amadeus.com',
  },
];

export const INITIAL_PLACES = [
  // Jaipur Places
  {
    destination: 'Jaipur',
    title: 'City Palace & Chandra Mahal',
    location: 'Jaleb Chowk, Near Badi Chaupar, Old City',
    category: ActivityCategory.HERITAGE,
    description: 'Seat of the Maharaja of Jaipur featuring Rajput courtyards, textile galleries, and Peacock Gate.',
    entryFee: 300.0,
    typicalDurationMinutes: 150,
    insiderTip: 'Buy the composite ticket at the counter to also cover Jantar Mantar and Hawa Mahal.',
    bestTimeToVisit: 'Morning before midday sun',
  },
  {
    destination: 'Jaipur',
    title: 'Amer (Amber) Fort & Sheesh Mahal',
    location: 'Devisinghpura, Amer',
    category: ActivityCategory.HERITAGE,
    description: 'Majestic UNESCO World Heritage hill fort of red sandstone and marble with the famous Hall of Mirrors.',
    entryFee: 200.0,
    typicalDurationMinutes: 180,
    insiderTip: 'Arrive right at 8:30 AM to beat the tour buses and enjoy uninterrupted photos in the Sheesh Mahal.',
    bestTimeToVisit: 'Early morning (08:30 AM)',
  },
  {
    destination: 'Jaipur',
    title: 'Hawa Mahal (Palace of Winds)',
    location: 'Badi Choupad, J.D.A. Market',
    category: ActivityCategory.HERITAGE,
    description: 'Iconic five-story pink sandstone facade with 953 honeycomb windows for royal ladies to observe street life.',
    entryFee: 50.0,
    typicalDurationMinutes: 90,
    insiderTip: 'Rooftop cafes across the street offer the best panoramic frontal photography.',
    bestTimeToVisit: 'Afternoon lighting (03:30 PM)',
  },
  {
    destination: 'Jaipur',
    title: 'Jantar Mantar Astronomical Observatory',
    location: 'Gangori Bazar, J.D.A. Market',
    category: ActivityCategory.HERITAGE,
    description: 'World largest stone astronomical observatory built by Sawai Jai Singh II with 19 architectural astronomical instruments.',
    entryFee: 200.0,
    typicalDurationMinutes: 120,
    insiderTip: 'An authorized audio guide or licensed guide is essential to understand how shadow angles tell exact IST minutes.',
    bestTimeToVisit: 'Morning or late afternoon',
  },
  {
    destination: 'Jaipur',
    title: 'Nahargarh Fort Sunset Viewpoint',
    location: 'Krishna Nagar, Brahampuri',
    category: ActivityCategory.CULTURE,
    description: 'Fort ramparts on the edge of the Aravalli Hills overlooking the entire expanse of Jaipur city.',
    entryFee: 100.0,
    typicalDurationMinutes: 120,
    insiderTip: 'Carry a light jacket; ridge winds get chilly after dusk.',
    bestTimeToVisit: '05:00 PM to sunset',
  },
  {
    destination: 'Jaipur',
    title: 'Johari Bazar & Bapu Bazar Street Walk',
    location: 'Pink City Inner Ring',
    category: ActivityCategory.SHOPPING,
    description: 'Historic vibrant arcades famous for Kundan jewelry, Rajasthani quilts (razai), leather mojaris, and blue pottery.',
    entryFee: 0.0,
    typicalDurationMinutes: 120,
    insiderTip: 'Gentle bargaining of 15-20% is customary in outdoor street stalls.',
    bestTimeToVisit: 'Late afternoon (04:30 PM)',
  },
];

export const INITIAL_ACCOMMODATIONS = [
  {
    destination: 'Jaipur',
    name: 'Alsisar Haveli — Heritage Boutique Hotel',
    type: AccommodationType.HERITAGE_HAVELI,
    neighborhood: 'Sansar Chandra Road, Old Pink City',
    proximityToHub: '1.8 km from Jaipur Railway Station (10 min ride)',
    pricePerNight: 3850.0,
    rating: 4.7,
    reviewsCount: 1420,
    amenities: [
      'Traditional Rajasthani Courtyard',
      'Swimming Pool',
      'Free High-Speed Wi-Fi',
      'Rooftop View of Nahargarh Fort',
      'Authentic Rajasthani Breakfast Included',
    ],
    bookingUrl: 'https://www.makemytrip.com/hotels/jaipur',
    isDemonstration: true,
  },
  {
    destination: 'Jaipur',
    name: 'Umaid Bhawan Heritage Home',
    type: AccommodationType.BOUTIQUE_HOMESTAY,
    neighborhood: 'Bani Park, Central Jaipur',
    proximityToHub: '1.2 km from Jaipur Junction (5 min auto)',
    pricePerNight: 2400.0,
    rating: 4.5,
    reviewsCount: 890,
    amenities: [
      'Rooftop Restaurant with Live Folk Music',
      'Air Conditioned Rooms',
      'Luggage Storage',
      'Travel Desk Assistance',
    ],
    bookingUrl: 'https://www.makemytrip.com/hotels/jaipur',
    isDemonstration: true,
  },
  {
    destination: 'Jaipur',
    name: 'Zostel Jaipur (Backpacker Social Hostel)',
    type: AccommodationType.HOSTEL,
    neighborhood: 'Hawa Mahal Road, Walled City',
    proximityToHub: '3.5 km from Jaipur Junction',
    pricePerNight: 850.0,
    rating: 4.6,
    reviewsCount: 2150,
    amenities: [
      'Female & Mixed AC Dorms',
      'Common Rooftop Chill Lounge',
      'Daily Walking Tours',
      'High-Speed Wi-Fi',
    ],
    bookingUrl: 'https://www.zostel.com',
    isDemonstration: true,
  },
];
