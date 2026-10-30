import {
  NormalizedTransportOffer,
  TransportQuery,
  TravelMode,
} from './types.js';
import { RawBenchmarkItem, getRawCorridorOffersByMode } from '@safar-saarthi/shared';
import { OfferNormalizationService } from './normalizer.js';

function parseTimeTo24h(timeStr: string): string {
  const trimmed = timeStr.trim().toUpperCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) {
    return '12:00';
  }
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const modifier = match[3];

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export function convertBenchmarkItemToOffer(
  item: RawBenchmarkItem,
  query: TransportQuery
): NormalizedTransportOffer {
  const dateStr = query.departureDate;
  const depTime24 = parseTimeTo24h(item.departureTime);
  const arrTime24 = parseTimeTo24h(item.arrivalTime);

  const depIso = `${dateStr}T${depTime24}:00+05:30`;

  // Calculate arrival date (could be same day or +1/+2 days for overnight trains/buses)
  let arrDateStr = dateStr;
  const depMinutes = parseInt(depTime24.split(':')[0], 10) * 60 + parseInt(depTime24.split(':')[1], 10);
  const arrMinutes = parseInt(arrTime24.split(':')[0], 10) * 60 + parseInt(arrTime24.split(':')[1], 10);

  let daysToAdd = Math.floor(item.durationMinutes / 1440);
  if (arrMinutes < depMinutes && item.durationMinutes < 1440) {
    daysToAdd += 1;
  }
  if (daysToAdd > 0) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + daysToAdd);
    arrDateStr = d.toISOString().split('T')[0];
  }
  const arrIso = `${arrDateStr}T${arrTime24}:00+05:30`;

  const naturalKey = OfferNormalizationService.generateNaturalKey({
    mode: item.mode,
    operator: item.operator,
    identifier: item.identifier,
    seatClass: item.seatClass,
    originHub: item.originHubCode,
    destinationHub: item.destHubCode,
    departureTimestamp: depIso,
  });

  const offer: NormalizedTransportOffer = {
    id: `${item.id}-${dateStr}`,
    naturalKey,
    providerCode: item.provider,
    providerName: item.operator,
    mode: item.mode,
    category: item.category,
    operator: item.operator,
    identifier: item.identifier,
    origin: {
      timestamp: depIso,
      timezone: 'Asia/Kolkata',
      hubCode: item.originHubCode,
      hubName: item.originHubName,
      city: query.origin,
    },
    destination: {
      timestamp: arrIso,
      timezone: 'Asia/Kolkata',
      hubCode: item.destHubCode,
      hubName: item.destHubName,
      city: query.destination,
    },
    durationMinutes: item.durationMinutes,
    price: {
      baseFare: item.baseFareInr,
      mandatoryTaxesAndFees: item.taxesAndFeesInr,
      ticketTotal: item.totalCostInr,
      currency: 'INR',
      transferCostEstimate: item.firstMileCostInr
        ? {
            firstMileInr: item.firstMileCostInr,
            lastMileInr: item.lastMileCostInr || 80,
            isEstimate: true,
            notes: item.transferNotes || 'Transfer to/from hub',
          }
        : null,
      estimatedGrandTotal: item.totalCostInr + (item.firstMileCostInr || 0) + (item.lastMileCostInr || 0),
    },
    availability: {
      status: item.availableSeats > 0 ? 'AVAILABLE' : 'WAITLIST',
      seatsRemaining: item.availableSeats > 0 ? item.availableSeats : null,
      seatClass: item.seatClass,
    },
    booking: {
      url: item.officialBookingUrl,
      isOfficialDeepLink: true,
      partnerName:
        item.provider === 'IRCTC'
          ? 'IRCTC e-Ticketing'
          : item.provider === 'REDBUS'
          ? 'RedBus India'
          : item.provider,
    },
    lastCheckedTimestamp: new Date().toISOString(),
    dataSource: {
      type: 'DEMO',
      isDemonstration: true,
      attributionNotes: item.notes,
    },
    details:
      item.mode === 'FLIGHT'
        ? {
            flight: {
              flightNumber: item.identifier.split(' ')[0],
              cabinClass: item.seatClass,
              stops: 0,
              baggageAllowanceKg: 15,
              mealIncluded: item.seatClass.toLowerCase().includes('meal'),
            },
          }
        : item.mode === 'TRAIN'
        ? {
            train: {
              trainNumber: item.identifier.split(' ')[0],
              trainName: item.identifier,
              seatClassCode: item.seatClass,
              pantryCarAvailable: true,
            },
          }
        : {
            bus: {
              busType: item.seatClass,
              operatorName: item.operator,
              hasChargingPoint: true,
              isSleeper: item.seatClass.toLowerCase().includes('sleeper'),
              boardingPoint: item.originHubName,
              droppingPoint: item.destHubName,
            },
          },
  };

  return OfferNormalizationService.validate(offer);
}

export function getNormalizedBenchmarkOffers(
  mode: TravelMode,
  query: TransportQuery,
  providerFilter?: string
): NormalizedTransportOffer[] {
  const rawItems = getRawCorridorOffersByMode(mode, query.origin, query.destination);
  if (rawItems.length === 0) {
    return [];
  }

  const filtered = providerFilter
    ? rawItems.filter((i) => i.provider === providerFilter)
    : rawItems;

  return filtered.map((item) => convertBenchmarkItemToOffer(item, query));
}
