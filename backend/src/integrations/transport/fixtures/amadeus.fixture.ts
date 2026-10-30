import { AmadeusFlightOffersResponse } from '../amadeus/types.js';

export const RAW_AMADEUS_FLIGHT_OFFERS_RESPONSE: AmadeusFlightOffersResponse = {
  meta: {
    count: 2,
    links: {
      self: 'https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=DEL&destinationLocationCode=BOM&departureDate=2026-11-20&adults=1&currencyCode=INR',
    },
  },
  data: [
    {
      type: 'flight-offer',
      id: '1',
      source: 'GDS',
      instantTicketingRequired: false,
      nonHomogeneous: false,
      oneWay: true,
      lastTicketingDate: '2026-11-19',
      numberOfBookableSeats: 9,
      itineraries: [
        {
          duration: 'PT2H15M',
          segments: [
            {
              departure: {
                iataCode: 'DEL',
                terminal: '3',
                at: '2026-11-20T07:00:00',
              },
              arrival: {
                iataCode: 'BOM',
                terminal: '2',
                at: '2026-11-20T09:15:00',
              },
              carrierCode: 'AI',
              number: '865',
              aircraft: {
                code: '77W',
              },
              duration: 'PT2H15M',
              id: '1',
              numberOfStops: 0,
            },
          ],
        },
      ],
      price: {
        currency: 'INR',
        total: '4950.00',
        base: '4100.00',
        fees: [
          { amount: '0.00', type: 'SUPPLIER' },
          { amount: '0.00', type: 'TICKETING' },
        ],
        grandTotal: '4950.00',
      },
      pricingOptions: {
        fareType: ['PUBLISHED'],
        includedCheckedBagsOnly: true,
      },
      validatingAirlineCodes: ['AI'],
      travelerPricings: [
        {
          travelerId: '1',
          fareOption: 'STANDARD',
          travelerType: 'ADULT',
          price: {
            currency: 'INR',
            total: '4950.00',
            base: '4100.00',
            grandTotal: '4950.00',
          },
          fareDetailsBySegment: [
            {
              segmentId: '1',
              cabin: 'ECONOMY',
              fareBasis: 'UIP',
              class: 'U',
              includedCheckedBags: {
                weight: 15,
                weightUnit: 'KG',
              },
            },
          ],
        },
      ],
    },
    {
      type: 'flight-offer',
      id: '2',
      source: 'GDS',
      instantTicketingRequired: false,
      nonHomogeneous: false,
      oneWay: true,
      lastTicketingDate: '2026-11-19',
      numberOfBookableSeats: 4,
      itineraries: [
        {
          duration: 'PT2H05M',
          segments: [
            {
              departure: {
                iataCode: 'DEL',
                terminal: '2',
                at: '2026-11-20T09:30:00',
              },
              arrival: {
                iataCode: 'BOM',
                terminal: '1',
                at: '2026-11-20T11:35:00',
              },
              carrierCode: '6E',
              number: '2042',
              aircraft: {
                code: '32N',
              },
              duration: 'PT2H05M',
              id: '2',
              numberOfStops: 0,
            },
          ],
        },
      ],
      price: {
        currency: 'INR',
        total: '4450.00',
        base: '3700.00',
        fees: [{ amount: '0.00', type: 'SUPPLIER' }],
        grandTotal: '4450.00',
      },
      pricingOptions: {
        fareType: ['PUBLISHED'],
        includedCheckedBagsOnly: true,
      },
      validatingAirlineCodes: ['6E'],
      travelerPricings: [
        {
          travelerId: '1',
          fareOption: 'STANDARD',
          travelerType: 'ADULT',
          price: {
            currency: 'INR',
            total: '4450.00',
            base: '3700.00',
            grandTotal: '4450.00',
          },
          fareDetailsBySegment: [
            {
              segmentId: '2',
              cabin: 'ECONOMY',
              fareBasis: 'SAVER',
              class: 'R',
              includedCheckedBags: {
                weight: 15,
                weightUnit: 'KG',
              },
            },
          ],
        },
      ],
    },
  ],
  dictionaries: {
    locations: {
      DEL: { cityCode: 'DEL', countryCode: 'IN' },
      BOM: { cityCode: 'BOM', countryCode: 'IN' },
    },
    aircraft: {
      '77W': 'BOEING 777-300ER',
      '32N': 'AIRBUS A320NEO',
    },
    currencies: {
      INR: 'INDIAN RUPEE',
    },
    carriers: {
      AI: 'AIR INDIA',
      '6E': 'INDIGO',
    },
  },
};
