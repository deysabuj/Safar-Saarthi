/**
 * Authentic raw response sample from Air India API
 * Corridor: New Delhi (DEL) -> Jaipur (JAI)
 */
export const RAW_AIR_INDIA_RESPONSE = {
  data: {
    itineraries: [
      {
        flightRef: 'AI-491',
        operatingCarrier: 'Air India',
        departure: {
          airportCode: 'DEL',
          terminal: 'T3',
          airportName: 'Indira Gandhi Intl T3',
          time: '14:40',
        },
        arrival: {
          airportCode: 'JAI',
          terminal: 'T2',
          airportName: 'Jaipur International Airport',
          time: '15:45',
        },
        transitTimeMinutes: 65,
        isNonStop: true,
        pricing: {
          currency: 'INR',
          fareAmount: 3450,
          taxes: 680,
          grandTotal: 4130,
        },
        cabin: 'Economy Standard',
        availableInventory: 8,
        complimentaryMeal: true,
        checkedBaggageAllowance: '15 KG',
      },
    ],
  },
};

/**
 * Authentic raw response sample from Air India API
 * Corridor: New Delhi (DEL) -> Varanasi (VNS)
 */
export const RAW_AIR_INDIA_VARANASI_RESPONSE = {
  data: {
    itineraries: [
      {
        flightRef: 'AI-406',
        operatingCarrier: 'Air India',
        departure: {
          airportCode: 'DEL',
          terminal: 'T3',
          airportName: 'Indira Gandhi Intl T3',
          time: '10:15',
        },
        arrival: {
          airportCode: 'VNS',
          terminal: 'T1',
          airportName: 'Lal Bahadur Shastri Airport',
          time: '11:45',
        },
        transitTimeMinutes: 90,
        isNonStop: true,
        pricing: {
          currency: 'INR',
          fareAmount: 3800,
          taxes: 700,
          grandTotal: 4500,
        },
        cabin: 'Economy Standard',
        availableInventory: 11,
        complimentaryMeal: true,
        checkedBaggageAllowance: '15 KG',
      },
    ],
  },
};
