import type {
  TransportOption,
  ItineraryPlan,
  SavedTrip,
  AccommodationRecommendation,
} from '@safar-saarthi/shared';
import { resolveLocation, getCorridorBenchmarkOptions } from '@safar-saarthi/shared';

export const DEMO_NOTICE =
  'Demonstration Data: Estimated for typical travel dates. Fares, schedules, and availability represent typical Indian transit benchmarks and are not live ticketing quotes.';

export const POPULAR_ROUTES = [
  {
    origin: 'New Delhi (DEL)',
    destination: 'Jaipur (JAI)',
    distanceKm: 280,
    typicalTrainHours: '4h 30m',
    typicalFlightHours: '1h 00m',
    typicalBusHours: '5h 30m',
    tag: 'Weekend Getaway',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
    description: 'The Pink City: grand forts, majestic palaces, and royal Rajasthani heritage.',
  },
  {
    origin: 'Mumbai (BOM)',
    destination: 'Goa (GOI)',
    distanceKm: 590,
    typicalTrainHours: '8h 15m',
    typicalFlightHours: '1h 15m',
    typicalBusHours: '12h 00m',
    tag: 'Coastal Escape',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    description: 'Golden beaches, Portuguese architecture, and vibrant coastal cuisine.',
  },
  {
    origin: 'Bengaluru (BLR)',
    destination: 'Kochi (COK)',
    distanceKm: 550,
    typicalTrainHours: '9h 45m',
    typicalFlightHours: '1h 10m',
    typicalBusHours: '10h 30m',
    tag: 'Southern Serenity',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80',
    description: 'Historic Fort Kochi, serene backwaters, and lush spice plantations.',
  },
  {
    origin: 'New Delhi (DEL)',
    destination: 'Varanasi (VNS)',
    distanceKm: 820,
    typicalTrainHours: '8h 00m',
    typicalFlightHours: '1h 25m',
    typicalBusHours: '14h 00m',
    tag: 'Cultural Pilgrimage',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80',
    description: 'The spiritual heart of India: Ganga Aarti, ancient ghats, and silk weaving.',
  },
  {
    origin: 'New Delhi (DEL)',
    destination: 'Kanpur (CNB)',
    distanceKm: 440,
    typicalTrainHours: '4h 10m',
    typicalFlightHours: '1h 20m',
    typicalBusHours: '8h 00m',
    tag: 'Industrial & Cultural Hub',
    image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=600&q=80',
    description: 'Leather heritage, premier IIT Kanpur campus, and Bithoor riverside on the holy Ganges.',
  },
];

export const DEL_JAI_TRANSPORT_OPTIONS: TransportOption[] = [
  // 1. Train - Vande Bharat (Best Value)
  {
    id: 'tr-20977',
    mode: 'TRAIN',
    category: 'BEST_VALUE',
    operator: 'Indian Railways (IRCTC)',
    identifier: '20977 - Vande Bharat Express',
    departureTime: '06:00 AM',
    arrivalTime: '09:50 AM',
    durationMinutes: 230,
    originHub: 'NDLS - New Delhi Railway Station',
    destinationHub: 'JP - Jaipur Junction',
    baseFareInr: 1040,
    taxesAndFeesInr: 120,
    totalCostInr: 1160,
    availableSeats: 48,
    seatClass: 'Chair Car (CC)',
    attribution: {
      provider: 'IRCTC',
      displayName: 'IRCTC Official e-Ticketing',
      officialBookingUrl: 'https://www.irctc.co.in/nget/train-search',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Direct station-to-station express with onboard catering options.',
    },
    transferDetails: {
      firstMileEstMinutes: 30,
      firstMileCostInr: 150,
      lastMileEstMinutes: 20,
      lastMileCostInr: 120,
      description: 'Delhi Metro / Auto to New Delhi Stn & Auto to Jaipur City Center.',
    },
  },

  // 2. Train - Shatabdi Express (Cheapest Train)
  {
    id: 'tr-12015',
    mode: 'TRAIN',
    category: 'CHEAPEST',
    operator: 'Indian Railways (IRCTC)',
    identifier: '12015 - Ajmer Shatabdi',
    departureTime: '06:10 AM',
    arrivalTime: '10:40 AM',
    durationMinutes: 270,
    originHub: 'NDLS - New Delhi Railway Station',
    destinationHub: 'JP - Jaipur Junction',
    baseFareInr: 680,
    taxesAndFeesInr: 75,
    totalCostInr: 755,
    availableSeats: 112,
    seatClass: 'Chair Car (CC)',
    attribution: {
      provider: 'IRCTC',
      displayName: 'IRCTC Official e-Ticketing',
      officialBookingUrl: 'https://www.irctc.co.in/nget/train-search',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Reliable morning departure with comfortable seating.',
    },
    transferDetails: {
      firstMileEstMinutes: 30,
      firstMileCostInr: 150,
      lastMileEstMinutes: 20,
      lastMileCostInr: 120,
      description: 'Central location arrival in Jaipur; minimal transfer needed.',
    },
  },

  // 3. Flight - IndiGo (Fastest)
  {
    id: 'fl-6e205',
    mode: 'FLIGHT',
    category: 'FASTEST',
    operator: 'IndiGo Airlines',
    identifier: '6E-205 (Airbus A320)',
    departureTime: '08:15 AM',
    arrivalTime: '09:15 AM',
    durationMinutes: 60,
    originHub: 'DEL - Indira Gandhi Intl T2',
    destinationHub: 'JAI - Jaipur International T2',
    baseFareInr: 2899,
    taxesAndFeesInr: 650,
    totalCostInr: 3549,
    availableSeats: 14,
    seatClass: 'Economy (Saver)',
    attribution: {
      provider: 'INDIGO',
      displayName: 'IndiGo Official Website',
      officialBookingUrl: 'https://www.goindigo.in',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Fastest airborne transit. Account for 75 mins check-in buffer.',
    },
    transferDetails: {
      firstMileEstMinutes: 50,
      firstMileCostInr: 450,
      lastMileEstMinutes: 35,
      lastMileCostInr: 350,
      description: 'Cab to Delhi IGI Airport & Cab from Jaipur Sanganer to City Center.',
    },
  },

  // 4. Flight - Air India
  {
    id: 'fl-ai491',
    mode: 'FLIGHT',
    category: 'BEST_VALUE',
    operator: 'Air India',
    identifier: 'AI-491',
    departureTime: '02:40 PM',
    arrivalTime: '03:45 PM',
    durationMinutes: 65,
    originHub: 'DEL - Indira Gandhi Intl T3',
    destinationHub: 'JAI - Jaipur International T2',
    baseFareInr: 3450,
    taxesAndFeesInr: 680,
    totalCostInr: 4130,
    availableSeats: 8,
    seatClass: 'Economy (Standard with Meal)',
    attribution: {
      provider: 'AIR_INDIA',
      displayName: 'Air India Official Portal',
      officialBookingUrl: 'https://www.airindia.com',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Includes 15kg checked luggage and complimentary hot refreshment.',
    },
    transferDetails: {
      firstMileEstMinutes: 50,
      firstMileCostInr: 450,
      lastMileEstMinutes: 35,
      lastMileCostInr: 350,
      description: 'Airport cab transfers factored into total budget estimation.',
    },
  },

  // 5. Bus - Zingbus Electric Sleeper (Cheapest overall)
  {
    id: 'bus-zb44',
    mode: 'BUS',
    category: 'CHEAPEST',
    operator: 'Zingbus Electric Intercity',
    identifier: 'Zingbus Premium AC Sleeper (2+1)',
    departureTime: '11:15 PM',
    arrivalTime: '04:45 AM',
    durationMinutes: 330,
    originHub: 'ISBT Kashmiri Gate, Delhi',
    destinationHub: 'Sindhi Camp Central Bus Stand, Jaipur',
    baseFareInr: 499,
    taxesAndFeesInr: 45,
    totalCostInr: 544,
    availableSeats: 21,
    seatClass: 'Single AC Sleeper',
    attribution: {
      provider: 'REDBUS',
      displayName: 'RedBus Verified Partner',
      officialBookingUrl: 'https://www.redbus.in',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Overnight journey saves one hotel night cost. USB charging & blankets.',
    },
    transferDetails: {
      firstMileEstMinutes: 25,
      firstMileCostInr: 80,
      lastMileEstMinutes: 15,
      lastMileCostInr: 60,
      description: 'Metro to Kashmiri Gate & walking/e-rickshaw from Sindhi Camp.',
    },
  },

  // 6. Bus - RSRTC Goldline Super Express
  {
    id: 'bus-rsrtc-10',
    mode: 'BUS',
    category: 'BEST_VALUE',
    operator: 'RSRTC (Rajasthan State Road Transport)',
    identifier: 'Volvo Multi-Axle AC Goldline',
    departureTime: '07:30 AM',
    arrivalTime: '01:15 PM',
    durationMinutes: 345,
    originHub: 'Bikaner House, India Gate, Delhi',
    destinationHub: 'Narayan Singh Circle, Jaipur',
    baseFareInr: 720,
    taxesAndFeesInr: 36,
    totalCostInr: 756,
    availableSeats: 16,
    seatClass: 'AC Semi-Sleeper',
    attribution: {
      provider: 'OFFICIAL_STATE_TRANSPORT',
      displayName: 'RSRTC Official Portal',
      officialBookingUrl: 'https://rsrtconline.rajasthan.gov.in',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Departs from central Delhi (Bikaner House). Highly punctual highway service.',
    },
    transferDetails: {
      firstMileEstMinutes: 20,
      firstMileCostInr: 60,
      lastMileEstMinutes: 10,
      lastMileCostInr: 50,
      description: 'Central pick-up and drop locations minimize last-mile fare.',
    },
  },
];

export const DEL_VNS_TRANSPORT_OPTIONS: TransportOption[] = [
  // 1. Train - Vande Bharat Express (Best Value)
  {
    id: 'tr-22436',
    mode: 'TRAIN',
    category: 'BEST_VALUE',
    operator: 'Indian Railways (IRCTC)',
    identifier: '22436 - Vande Bharat Express',
    departureTime: '06:00 AM',
    arrivalTime: '02:00 PM',
    durationMinutes: 480,
    originHub: 'NDLS - New Delhi Railway Station',
    destinationHub: 'BSB - Varanasi Junction',
    baseFareInr: 1650,
    taxesAndFeesInr: 144,
    totalCostInr: 1794,
    availableSeats: 48,
    seatClass: 'Chair Car (CC)',
    attribution: {
      provider: 'IRCTC',
      displayName: 'IRCTC Official e-Ticketing',
      officialBookingUrl: 'https://www.irctc.co.in/nget/train-search',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Fastest semi-high-speed daytime rail connection directly into Varanasi Jn with onboard catering.',
    },
    transferDetails: {
      firstMileEstMinutes: 30,
      firstMileCostInr: 150,
      lastMileEstMinutes: 20,
      lastMileCostInr: 100,
      description: 'Metro/Auto to New Delhi Station & E-rickshaw from Varanasi Cantt to Dashashwamedh Ghat.',
    },
  },

  // 2. Train - Kashi Vishwanath Express (Cheapest Train)
  {
    id: 'tr-15128',
    mode: 'TRAIN',
    category: 'CHEAPEST',
    operator: 'Indian Railways (IRCTC)',
    identifier: '15128 - Kashi Vishwanath Express',
    departureTime: '11:35 AM',
    arrivalTime: '04:40 AM',
    durationMinutes: 1025,
    originHub: 'NDLS - New Delhi Railway Station',
    destinationHub: 'BSB - Varanasi Junction',
    baseFareInr: 1010,
    taxesAndFeesInr: 40,
    totalCostInr: 1050,
    availableSeats: 24,
    seatClass: 'AC 3 Tier (3A)',
    attribution: {
      provider: 'IRCTC',
      displayName: 'IRCTC Official e-Ticketing',
      officialBookingUrl: 'https://www.irctc.co.in/nget/train-search',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Overnight journey with comfortable AC 3-tier berths, arriving early morning in Varanasi.',
    },
    transferDetails: {
      firstMileEstMinutes: 30,
      firstMileCostInr: 150,
      lastMileEstMinutes: 20,
      lastMileCostInr: 100,
      description: 'Early morning arrival at Varanasi Junction; quick auto transfer to Godowlia Chowk.',
    },
  },

  // 3. Flight - IndiGo (Fastest)
  {
    id: 'fl-6e2214',
    mode: 'FLIGHT',
    category: 'FASTEST',
    operator: 'IndiGo Airlines',
    identifier: '6E-2214 (Airbus A320)',
    departureTime: '07:15 AM',
    arrivalTime: '08:40 AM',
    durationMinutes: 85,
    originHub: 'DEL - Indira Gandhi Intl T2',
    destinationHub: 'VNS - Lal Bahadur Shastri Intl T1',
    baseFareInr: 3200,
    taxesAndFeesInr: 650,
    totalCostInr: 3850,
    availableSeats: 16,
    seatClass: 'Economy (Saver)',
    attribution: {
      provider: 'INDIGO',
      displayName: 'IndiGo Official Website',
      officialBookingUrl: 'https://www.goindigo.in',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Non-stop flight. Babatpur Airport is 26 km northwest of Varanasi city center.',
    },
    transferDetails: {
      firstMileEstMinutes: 50,
      firstMileCostInr: 450,
      lastMileEstMinutes: 45,
      lastMileCostInr: 650,
      description: 'Prepaid taxi from Lal Bahadur Shastri Airport to Dashashwamedh / Ghat road.',
    },
  },

  // 4. Flight - Air India
  {
    id: 'fl-ai406',
    mode: 'FLIGHT',
    category: 'BEST_VALUE',
    operator: 'Air India',
    identifier: 'AI-406 (Airbus A320neo)',
    departureTime: '10:15 AM',
    arrivalTime: '11:45 AM',
    durationMinutes: 90,
    originHub: 'DEL - Indira Gandhi Intl T3',
    destinationHub: 'VNS - Lal Bahadur Shastri Intl T1',
    baseFareInr: 3800,
    taxesAndFeesInr: 700,
    totalCostInr: 4500,
    availableSeats: 11,
    seatClass: 'Economy Standard',
    attribution: {
      provider: 'AIR_INDIA',
      displayName: 'Air India Official Portal',
      officialBookingUrl: 'https://www.airindia.com',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Includes 15kg checked luggage and hot meal service onboard.',
    },
    transferDetails: {
      firstMileEstMinutes: 50,
      firstMileCostInr: 450,
      lastMileEstMinutes: 45,
      lastMileCostInr: 650,
      description: 'Airport cab transfers factored into overall journey cost calculation.',
    },
  },

  // 5. Bus - UPSRTC Janrath AC Sleeper
  {
    id: 'bus-upsrtc-01',
    mode: 'BUS',
    category: 'CHEAPEST',
    operator: 'UPSRTC (Uttar Pradesh State Road Transport)',
    identifier: 'Janrath 3x2 AC Sleeper',
    departureTime: '06:30 PM',
    arrivalTime: '08:30 AM',
    durationMinutes: 840,
    originHub: 'ISBT Kashmiri Gate, Delhi',
    destinationHub: 'Varanasi Cantt Bus Stand, Varanasi',
    baseFareInr: 1050,
    taxesAndFeesInr: 75,
    totalCostInr: 1125,
    availableSeats: 18,
    seatClass: 'AC Sleeper',
    attribution: {
      provider: 'REDBUS',
      displayName: 'RedBus Verified Partner',
      officialBookingUrl: 'https://www.redbus.in/bus-tickets/delhi-to-varanasi',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Overnight journey via Purvanchal Expressway. Arrives at Varanasi Cantt.',
    },
    transferDetails: {
      firstMileEstMinutes: 25,
      firstMileCostInr: 80,
      lastMileEstMinutes: 20,
      lastMileCostInr: 80,
      description: 'Metro to Kashmiri Gate & Auto from Cantt bus depot to Godowlia Chowk.',
    },
  },

  // 6. Bus - Zingbus Electric Intercity
  {
    id: 'bus-zing-vns',
    mode: 'BUS',
    category: 'BEST_VALUE',
    operator: 'Zingbus Electric Intercity',
    identifier: 'Zingbus Premium AC Sleeper (2+1)',
    departureTime: '08:00 PM',
    arrivalTime: '09:30 AM',
    durationMinutes: 810,
    originHub: 'Akshardham Metro Station, Delhi',
    destinationHub: 'Varanasi Cantt Bus Stand, Varanasi',
    baseFareInr: 1299,
    taxesAndFeesInr: 100,
    totalCostInr: 1399,
    availableSeats: 12,
    seatClass: 'Single AC Sleeper',
    attribution: {
      provider: 'REDBUS',
      displayName: 'RedBus Verified Partner',
      officialBookingUrl: 'https://www.redbus.in/bus-tickets/delhi-to-varanasi',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Direct expressway sleeper bus with live GPS tracking and charging ports.',
    },
    transferDetails: {
      firstMileEstMinutes: 25,
      firstMileCostInr: 80,
      lastMileEstMinutes: 20,
      lastMileCostInr: 80,
      description: 'Metro to Akshardham & Auto from Cantt to Ghat accommodations.',
    },
  },
];

export const DEL_KNU_TRANSPORT_OPTIONS: TransportOption[] = [
  // 1. Train - Vande Bharat Express (Fastest Rail)
  {
    id: 'tr-knu-22436',
    mode: 'TRAIN',
    category: 'FASTEST',
    operator: 'Indian Railways (IRCTC)',
    identifier: '22436 - Vande Bharat Express',
    departureTime: '06:00 AM',
    arrivalTime: '10:10 AM',
    durationMinutes: 250,
    originHub: 'NDLS - New Delhi Railway Station',
    destinationHub: 'CNB - Kanpur Central Railway Station',
    baseFareInr: 990,
    taxesAndFeesInr: 125,
    totalCostInr: 1115,
    availableSeats: 38,
    seatClass: 'Chair Car (CC)',
    attribution: {
      provider: 'IRCTC',
      displayName: 'IRCTC Official e-Ticketing',
      officialBookingUrl: 'https://www.irctc.co.in/nget/train-search',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'High-speed semi-bullet train completing Delhi to Kanpur in 4h 10m with morning breakfast onboard.',
    },
    transferDetails: {
      firstMileEstMinutes: 30,
      firstMileCostInr: 150,
      lastMileEstMinutes: 15,
      lastMileCostInr: 80,
      description: 'Delhi Metro to NDLS & Auto/E-rickshaw from Kanpur Central to Mall Road.',
    },
  },

  // 2. Train - Swarna Shatabdi Express (Best Value)
  {
    id: 'tr-knu-12004',
    mode: 'TRAIN',
    category: 'BEST_VALUE',
    operator: 'Indian Railways (IRCTC)',
    identifier: '12004 - Lucknow Swarna Shatabdi',
    departureTime: '06:10 AM',
    arrivalTime: '11:20 AM',
    durationMinutes: 310,
    originHub: 'NDLS - New Delhi Railway Station',
    destinationHub: 'CNB - Kanpur Central Railway Station',
    baseFareInr: 695,
    taxesAndFeesInr: 85,
    totalCostInr: 780,
    availableSeats: 84,
    seatClass: 'Chair Car (CC)',
    attribution: {
      provider: 'IRCTC',
      displayName: 'IRCTC Official e-Ticketing',
      officialBookingUrl: 'https://www.irctc.co.in/nget/train-search',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Premier morning Shatabdi service with 98% punctuality and hot breakfast service included.',
    },
    transferDetails: {
      firstMileEstMinutes: 30,
      firstMileCostInr: 150,
      lastMileEstMinutes: 15,
      lastMileCostInr: 80,
      description: 'Central station-to-station rail transit avoiding highway traffic.',
    },
  },

  // 3. Train - Prayagraj Express (Cheapest Rail)
  {
    id: 'tr-knu-12418',
    mode: 'TRAIN',
    category: 'CHEAPEST',
    operator: 'Indian Railways (IRCTC)',
    identifier: '12418 - Prayagraj Express',
    departureTime: '10:10 PM',
    arrivalTime: '03:50 AM',
    durationMinutes: 340,
    originHub: 'NDLS - New Delhi Railway Station',
    destinationHub: 'CNB - Kanpur Central Railway Station',
    baseFareInr: 720,
    taxesAndFeesInr: 75,
    totalCostInr: 795,
    availableSeats: 45,
    seatClass: 'AC 3 Tier (3A)',
    attribution: {
      provider: 'IRCTC',
      displayName: 'IRCTC Official e-Ticketing',
      officialBookingUrl: 'https://www.irctc.co.in/nget/train-search',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Overnight journey with comfortable AC 3-tier berths, arriving early morning in Kanpur.',
    },
    transferDetails: {
      firstMileEstMinutes: 30,
      firstMileCostInr: 150,
      lastMileEstMinutes: 15,
      lastMileCostInr: 80,
      description: 'Pre-dawn arrival at Kanpur Central; quick auto transfer to Civil Lines.',
    },
  },

  // 4. Flight - IndiGo Airlines
  {
    id: 'fl-knu-6e7933',
    mode: 'FLIGHT',
    category: 'FASTEST',
    operator: 'IndiGo Airlines',
    identifier: '6E-7933 (Airbus A320)',
    departureTime: '12:45 PM',
    arrivalTime: '02:05 PM',
    durationMinutes: 80,
    originHub: 'DEL - Indira Gandhi Intl T2',
    destinationHub: 'KNU - Kanpur Chakeri Airport',
    baseFareInr: 2550,
    taxesAndFeesInr: 550,
    totalCostInr: 3100,
    availableSeats: 12,
    seatClass: 'Economy (Saver)',
    attribution: {
      provider: 'INDIGO',
      displayName: 'IndiGo Official Website',
      officialBookingUrl: 'https://www.goindigo.in',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Direct daily flight. Chakeri Airport is 14 km southeast of Kanpur city center.',
    },
    transferDetails: {
      firstMileEstMinutes: 50,
      firstMileCostInr: 450,
      lastMileEstMinutes: 35,
      lastMileCostInr: 400,
      description: 'Cab to Delhi IGI Airport & Cab from Chakeri Airport to Mall Road.',
    },
  },

  // 5. Bus - UPSRTC Janrath AC Seater
  {
    id: 'bus-knu-upsrtc',
    mode: 'BUS',
    category: 'CHEAPEST',
    operator: 'UPSRTC (Uttar Pradesh State Road Transport)',
    identifier: 'Janrath 2x2 AC Seater',
    departureTime: '09:00 PM',
    arrivalTime: '05:30 AM',
    durationMinutes: 510,
    originHub: 'ISBT Kashmiri Gate, Delhi',
    destinationHub: 'Jhakarkati Bus Stand, Kanpur',
    baseFareInr: 680,
    taxesAndFeesInr: 40,
    totalCostInr: 720,
    availableSeats: 22,
    seatClass: '2x2 AC Seater',
    attribution: {
      provider: 'REDBUS',
      displayName: 'RedBus Verified Partner',
      officialBookingUrl: 'https://www.redbus.in/bus-tickets/delhi-to-kanpur',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Overnight expressway service via Yamuna and Agra-Lucknow Expressways.',
    },
    transferDetails: {
      firstMileEstMinutes: 25,
      firstMileCostInr: 80,
      lastMileEstMinutes: 15,
      lastMileCostInr: 60,
      description: 'Metro to Kashmiri Gate & Auto from Jhakarkati to central Kanpur.',
    },
  },

  // 6. Bus - Zingbus Premium AC Sleeper
  {
    id: 'bus-knu-zing',
    mode: 'BUS',
    category: 'BEST_VALUE',
    operator: 'Zingbus Electric Intercity',
    identifier: 'Zingbus Premium AC Sleeper (2+1)',
    departureTime: '10:00 PM',
    arrivalTime: '06:00 AM',
    durationMinutes: 480,
    originHub: 'Anand Vihar Metro Station, Delhi',
    destinationHub: 'Fazalganj Chauraha, Kanpur',
    baseFareInr: 850,
    taxesAndFeesInr: 60,
    totalCostInr: 910,
    availableSeats: 16,
    seatClass: 'Single AC Sleeper',
    attribution: {
      provider: 'REDBUS',
      displayName: 'RedBus Verified Partner',
      officialBookingUrl: 'https://www.redbus.in/bus-tickets/delhi-to-kanpur',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: true,
      dataSource: 'DEMO',
      notes: 'Express sleeper coach with clean bed linens, charging points, and live tracking.',
    },
    transferDetails: {
      firstMileEstMinutes: 25,
      firstMileCostInr: 80,
      lastMileEstMinutes: 15,
      lastMileCostInr: 60,
      description: 'Metro to Anand Vihar & Auto from Fazalganj to hotel accommodations.',
    },
  },
];

export const MOCK_TRANSPORT_OPTIONS: TransportOption[] = DEL_JAI_TRANSPORT_OPTIONS;

export function getRouteBenchmarkOptions(origin: string, destination: string): TransportOption[] {
  // Query centralized corridor benchmark catalog (supports 14 major corridors, both directions)
  const centralizedOptions = getCorridorBenchmarkOptions(origin, destination);
  if (centralizedOptions.length > 0) {
    return centralizedOptions;
  }

  const originLoc = resolveLocation(origin);
  const destLoc = resolveLocation(destination);

  if (originLoc?.id === 'delhi' && destLoc?.id === 'kanpur') {
    return DEL_KNU_TRANSPORT_OPTIONS;
  }
  if (originLoc?.id === 'delhi' && destLoc?.id === 'varanasi') {
    return DEL_VNS_TRANSPORT_OPTIONS;
  }
  if (originLoc?.id === 'delhi' && destLoc?.id === 'jaipur') {
    return DEL_JAI_TRANSPORT_OPTIONS;
  }

  // Substring fallback for robustness
  const originClean = origin.toLowerCase().trim();
  const destClean = destination.toLowerCase().trim();

  const isDelhiOrigin =
    originClean.includes('delhi') ||
    originClean.includes('del') ||
    originClean.includes('ndls');
  const isKanpurDest =
    destClean.includes('kanpur') ||
    destClean.includes('cnb') ||
    destClean.includes('knu');
  const isJaipurDest =
    destClean.includes('jaipur') ||
    destClean.includes('jai') ||
    destClean.includes('jp');
  const isVaranasiDest =
    destClean.includes('varanasi') ||
    destClean.includes('vns') ||
    destClean.includes('bsb') ||
    destClean.includes('kashi');

  if (isDelhiOrigin && isKanpurDest) {
    return DEL_KNU_TRANSPORT_OPTIONS;
  }

  if (isDelhiOrigin && isVaranasiDest) {
    return DEL_VNS_TRANSPORT_OPTIONS;
  }

  if (isDelhiOrigin && isJaipurDest) {
    return DEL_JAI_TRANSPORT_OPTIONS;
  }

  // Strictly route-aware: Return empty array for unsupported routes so UI shows an honest empty state
  return [];
}

export const MOCK_ACCOMMODATION: AccommodationRecommendation = {
  id: 'acc-jp-01',
  name: 'Alsisar Haveli — Heritage Boutique Hotel',
  type: 'HERITAGE_HAVELI',
  neighborhood: 'Sansar Chandra Road, Old Pink City',
  proximityToHub: '1.8 km from Jaipur Railway Station (10 min ride)',
  pricePerNightInr: 3850,
  rating: 4.7,
  reviewsCount: 1420,
  amenities: [
    'Traditional Rajasthani Courtyard',
    'Swimming Pool',
    'Free High-Speed Wi-Fi',
    'Rooftop View of Nahargarh Fort',
    'Authentic Rajasthani Breakfast Included',
  ],
  attribution: {
    provider: 'MAKEMYTRIP',
    displayName: 'MakeMyTrip Verified Heritage Stay',
    officialBookingUrl: 'https://www.makemytrip.com/hotels/jaipur',
    lastCheckedTimestamp: new Date().toISOString(),
    isDemonstrationData: true,
    dataSource: 'DEMO',
  },
};

export const MOCK_ITINERARY_PLAN: ItineraryPlan = {
  id: 'itin-del-jp-3d',
  title: 'Pink City Cultural Odyssey & Royal Forts',
  origin: 'New Delhi (DEL)',
  destination: 'Jaipur (JAI)',
  durationDays: 3,
  travelers: 2,
  pace: 'MODERATE',
  style: 'MID_RANGE',
  dietary: 'VEG',
  interests: ['HERITAGE', 'FOOD', 'SHOPPING', 'CULTURE'],
  selectedTransport: MOCK_TRANSPORT_OPTIONS[0], // Vande Bharat Express
  recommendedStay: MOCK_ACCOMMODATION,
  budgetBreakdown: {
    transportTotalInr: 2320, // 2 tickets * 1160
    stayTotalInr: 7700, // 2 nights * 3850
    activitiesTotalInr: 1600, // monument entries + audio guides for 2
    foodEstimatedInr: 3200, // ₹1600/day for 2 foodies
    grandTotalInr: 14820,
    userBudgetInr: 18000,
  },
  days: [
    {
      dayNumber: 1,
      theme: 'Arrival, Walled City Gates & Royal Heritage',
      date: 'Day 1',
      dailyBudgetEstimateInr: 4600,
      localTransportTip: 'Use licensed E-rickshaws inside the Walled City (fixed ₹50-₹80 per hop).',
      activities: [
        {
          id: 'act-1-1',
          timeSlot: '10:30 AM - 01:00 PM',
          title: 'City Palace & Chandra Mahal Museum',
          location: 'Jaleb Chowk, Near Badi Chaupar',
          description:
            'Explore the seat of the Maharaja of Jaipur, featuring exquisite Rajput architecture, costume galleries, and the famed Peacock Courtyard.',
          entryFeeInr: 300,
          durationMinutes: 150,
          category: 'HERITAGE',
          insiderTip: 'Book the Composite Ticket at the counter to also cover Jantar Mantar and Hawa Mahal.',
          bestTimeToVisit: 'Morning before midday sun.',
        },
        {
          id: 'act-1-2',
          timeSlot: '01:15 PM - 02:30 PM',
          title: 'Traditional Rajasthani Thali Lunch',
          location: 'LMB (Laxmi Mishthan Bhandar), Johari Bazar',
          description:
            'Indulge in authentic Dal Baati Churma, Ker Sangri, and royal Ghewar from a century-old culinary institution.',
          entryFeeInr: 650,
          durationMinutes: 75,
          category: 'FOOD',
          insiderTip: 'Try the fresh Paneer Ghewar made with pure desi ghee.',
        },
        {
          id: 'act-1-3',
          timeSlot: '03:30 PM - 05:00 PM',
          title: 'Hawa Mahal (Palace of Winds) & Wind View Cafe',
          location: 'Hawa Mahal Rd, Badi Choupad',
          description:
            'Admire the 953 honeycombed jharokhas built for royal women to witness street processions unnoticed.',
          entryFeeInr: 50,
          durationMinutes: 90,
          category: 'HERITAGE',
          insiderTip: 'Head to the Wind View Cafe rooftop across the road for the most iconic frontal photo angle.',
        },
        {
          id: 'act-1-4',
          timeSlot: '05:30 PM - 07:30 PM',
          title: 'Evening Sunset over Nahargarh Fort',
          location: 'Nahargarh Fort Ridge',
          description:
            'Watch the sunset bathe the entire Pink City in golden hues from the fort ramparts overlooking the valley.',
          entryFeeInr: 100,
          durationMinutes: 120,
          category: 'CULTURE',
          insiderTip: 'Carry a light jacket; ridge winds get chilly after dusk.',
        },
      ],
    },
    {
      dayNumber: 2,
      theme: 'Majestic Hilltop Forts & Textile Artisan Bazaars',
      date: 'Day 2',
      dailyBudgetEstimateInr: 5200,
      localTransportTip: 'Hire a pre-negotiated cab for the Amber-Jaigarh circuit (typical ₹1,200 half-day).',
      activities: [
        {
          id: 'act-2-1',
          timeSlot: '08:30 AM - 11:30 AM',
          title: 'Amer (Amber) Fort & Sheesh Mahal',
          location: 'Devisinghpura, Amer',
          description:
            'A UNESCO World Heritage marvel constructed from red sandstone and marble, crowned by the opulent Mirror Palace (Sheesh Mahal).',
          entryFeeInr: 200,
          durationMinutes: 180,
          category: 'HERITAGE',
          insiderTip: 'Arrive right at 8:30 AM to beat the tour buses and enjoy uninterrupted photos in the Sheesh Mahal.',
          bestTimeToVisit: 'Early morning.',
        },
        {
          id: 'act-2-2',
          timeSlot: '12:00 PM - 01:15 PM',
          title: 'Panna Meena Ka Kund (Historic Stepwell)',
          location: 'Near Anokhi Museum, Amer',
          description:
            'An intricate 16th-century geometric stepwell used by locals and pilgrims, featuring breathtaking symmetrical staircases.',
          entryFeeInr: 0,
          durationMinutes: 75,
          category: 'HERITAGE',
          insiderTip: 'Photography from the ground level is free and best in midday overhead lighting.',
        },
        {
          id: 'act-2-3',
          timeSlot: '02:00 PM - 03:30 PM',
          title: 'Hand-Block Printing Workshop at Sanganer / Anokhi',
          location: 'Anokhi Museum of Hand Printing',
          description:
            'Learn traditional wooden block carving and natural vegetable dyeing techniques from 5th-generation master artisans.',
          entryFeeInr: 150,
          durationMinutes: 90,
          category: 'CULTURE',
          insiderTip: 'You can create and take home your own hand-printed cotton scarf.',
        },
        {
          id: 'act-2-4',
          timeSlot: '04:30 PM - 07:00 PM',
          title: 'Bapu Bazar & Johari Bazar Walk',
          location: 'Pink City Inner Ring',
          description:
            'Stroll through vibrant arcades renowned for Jaipuri razai (quilts), Mojari leather jutis, and blue pottery artifacts.',
          entryFeeInr: 0,
          durationMinutes: 150,
          category: 'SHOPPING',
          insiderTip: 'Gentle bargaining of 15-20% is customary in the outdoor street stalls.',
        },
      ],
    },
    {
      dayNumber: 3,
      theme: 'Ancient Astronomy, Street Delicacies & Departure',
      date: 'Day 3',
      dailyBudgetEstimateInr: 3800,
      localTransportTip: 'Keep your hotel luggage stored with concierge until afternoon departure.',
      activities: [
        {
          id: 'act-3-1',
          timeSlot: '09:00 AM - 11:00 AM',
          title: 'Jantar Mantar Astronomical Observatory',
          location: 'Gangori Bazar, J.D.A. Market',
          description:
            'The world largest stone astronomical observatory built by Sawai Jai Singh II, featuring the 27-meter tall Samrat Yantra sundial.',
          entryFeeInr: 200,
          durationMinutes: 120,
          category: 'HERITAGE',
          insiderTip: 'An authorized audio guide or licensed guide is essential to understand how shadows tell exact IST minutes.',
        },
        {
          id: 'act-3-2',
          timeSlot: '11:30 AM - 01:00 PM',
          title: 'Lassi at Lassiwala (Since 1944)',
          location: 'MI Road, Jaipur',
          description:
            'Thick, creamy matka lassi topped with rich malai served in earthen clay kulhads that enhance the earthy aroma.',
          entryFeeInr: 90,
          durationMinutes: 60,
          category: 'FOOD',
          insiderTip: 'Look for Shop #312 (the original shop); stocks usually sell out by 2 PM.',
        },
        {
          id: 'act-3-3',
          timeSlot: '02:30 PM - 04:00 PM',
          title: 'Albert Hall Museum & Ram Niwas Garden',
          location: 'Museum Road, Ram Niwas Garden',
          description:
            'Indo-Saracenic museum showcasing rare miniature paintings, Persian carpets, and century-old metal artifacts.',
          entryFeeInr: 150,
          durationMinutes: 90,
          category: 'HERITAGE',
          insiderTip: 'The illuminated facade in the late afternoon makes for stunning architectural photography.',
        },
      ],
    },
  ],
};

export const MOCK_SAVED_TRIPS: SavedTrip[] = [
  {
    id: 'trip-saved-01',
    title: 'Pink City Heritage & Royal Bazaars',
    origin: 'New Delhi (DEL)',
    destination: 'Jaipur (JAI)',
    departureDate: '2026-11-12',
    returnDate: '2026-11-15',
    travelers: 2,
    estimatedTotalInr: 14820,
    transportMode: 'TRAIN',
    createdAt: '2026-10-14T11:20:00.000Z',
    itineraryPlan: MOCK_ITINERARY_PLAN,
  },
  {
    id: 'trip-saved-02',
    title: 'Goan Coastlines, Churches & Spice Trails',
    origin: 'Mumbai (BOM)',
    destination: 'Goa (GOI)',
    departureDate: '2026-12-05',
    returnDate: '2026-12-10',
    travelers: 1,
    estimatedTotalInr: 18400,
    transportMode: 'FLIGHT',
    createdAt: '2026-10-12T16:45:00.000Z',
  },
];
