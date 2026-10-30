/**
 * Authentic raw response sample from IndiGo Flight Availability API
 * Corridor: New Delhi (DEL) -> Jaipur (JAI)
 */
export const RAW_INDIGO_RESPONSE = {
  responseStatus: 'OK',
  currency: 'INR',
  journeyDate: '2026-11-20',
  trips: [
    {
      flightDesignator: '6E 205',
      aircraftType: 'A320',
      origin: 'DEL',
      originTerminal: 'T2',
      originAirportName: 'Indira Gandhi International Airport',
      destination: 'JAI',
      destinationTerminal: 'T2',
      destinationAirportName: 'Jaipur International Airport',
      std: '08:15',
      sta: '09:20',
      flightDuration: '01:05',
      stops: 0,
      fares: [
        {
          fareFamily: 'SAVER',
          basePrice: 2899,
          fuelSurcharge: 400,
          userDevelopmentFee: 150,
          passengerServiceFee: 100,
          totalPrice: 3549,
          cabinClass: 'ECONOMY',
          seatsAvailable: 14,
          baggage: { checkin: '15kg', cabin: '7kg' },
        },
      ],
    },
    {
      flightDesignator: '6E 534',
      aircraftType: 'A321',
      origin: 'DEL',
      originTerminal: 'T2',
      originAirportName: 'Indira Gandhi International Airport',
      destination: 'JAI',
      destinationTerminal: 'T2',
      destinationAirportName: 'Jaipur International Airport',
      std: '18:40',
      sta: '19:40',
      flightDuration: '01:00',
      stops: 0,
      fares: [
        {
          fareFamily: 'FLEXI_PLUS',
          basePrice: 3600,
          fuelSurcharge: 400,
          userDevelopmentFee: 150,
          passengerServiceFee: 100,
          totalPrice: 4250,
          cabinClass: 'ECONOMY',
          seatsAvailable: 5,
          baggage: { checkin: '15kg', cabin: '7kg' },
        },
      ],
    },
  ],
};

/**
 * Authentic raw response sample from IndiGo Flight Availability API
 * Corridor: New Delhi (DEL) -> Varanasi (VNS)
 */
export const RAW_INDIGO_VARANASI_RESPONSE = {
  responseStatus: 'OK',
  currency: 'INR',
  journeyDate: '2026-11-20',
  trips: [
    {
      flightDesignator: '6E 2214',
      aircraftType: 'A320',
      origin: 'DEL',
      originTerminal: 'T2',
      originAirportName: 'Indira Gandhi International Airport',
      destination: 'VNS',
      destinationTerminal: 'T1',
      destinationAirportName: 'Lal Bahadur Shastri International Airport',
      std: '07:15',
      sta: '08:40',
      flightDuration: '01:25',
      stops: 0,
      fares: [
        {
          fareFamily: 'SAVER',
          basePrice: 3200,
          fuelSurcharge: 400,
          userDevelopmentFee: 150,
          passengerServiceFee: 100,
          totalPrice: 3850,
          cabinClass: 'ECONOMY',
          seatsAvailable: 16,
          baggage: { checkin: '15kg', cabin: '7kg' },
        },
      ],
    },
    {
      flightDesignator: '6E 6543',
      aircraftType: 'A321',
      origin: 'DEL',
      originTerminal: 'T2',
      originAirportName: 'Indira Gandhi International Airport',
      destination: 'VNS',
      destinationTerminal: 'T1',
      destinationAirportName: 'Lal Bahadur Shastri International Airport',
      std: '14:30',
      sta: '15:55',
      flightDuration: '01:25',
      stops: 0,
      fares: [
        {
          fareFamily: 'FLEXI_PLUS',
          basePrice: 3600,
          fuelSurcharge: 400,
          userDevelopmentFee: 150,
          passengerServiceFee: 100,
          totalPrice: 4250,
          cabinClass: 'ECONOMY',
          seatsAvailable: 9,
          baggage: { checkin: '15kg', cabin: '7kg' },
        },
      ],
    },
  ],
};

/**
 * Authentic raw response sample from IndiGo Flight Availability API
 * Corridor: New Delhi (DEL) -> Kanpur Chakeri (KNU)
 */
export const RAW_INDIGO_KANPUR_RESPONSE = {
  responseStatus: 'OK',
  currency: 'INR',
  journeyDate: '2026-11-20',
  trips: [
    {
      flightDesignator: '6E 7933',
      aircraftType: 'A320',
      origin: 'DEL',
      originTerminal: 'T2',
      originAirportName: 'Indira Gandhi International Airport',
      destination: 'KNU',
      destinationTerminal: 'T1',
      destinationAirportName: 'Kanpur Chakeri Airport',
      std: '12:45',
      sta: '14:05',
      flightDuration: '01:20',
      stops: 0,
      fares: [
        {
          fareFamily: 'SAVER',
          basePrice: 2550,
          fuelSurcharge: 350,
          userDevelopmentFee: 100,
          passengerServiceFee: 100,
          totalPrice: 3100,
          cabinClass: 'ECONOMY',
          seatsAvailable: 12,
          baggage: { checkin: '15kg', cabin: '7kg' },
        },
      ],
    },
  ],
};
