import { BaseTransportAdapter, BaseAdapterOptions } from './base.adapter.js';
import {
  FlightProvider,
  TransportQuery,
  NormalizedTransportOffer,
  AvailabilityStatus,
} from '../types.js';
import { AmadeusClient } from '../amadeus/client.js';
import { AmadeusFlightOffersResponse, AmadeusFlightOffer } from '../amadeus/types.js';
import { OfferNormalizationService } from '../normalizer.js';
import { Logger } from '../../../utils/logger.js';

export interface AmadeusAdapterOptions extends BaseAdapterOptions {
  client?: AmadeusClient;
}

export class AmadeusFlightAdapter extends BaseTransportAdapter implements FlightProvider {
  readonly code = 'AMADEUS';
  readonly name = 'Amadeus for Developers (Global Distribution System)';
  readonly mode = 'FLIGHT' as const;

  private client: AmadeusClient;

  // Well-known Indian airline codes mapping dictionary
  private static readonly KNOWN_CARRIERS: Record<string, string> = {
    '6E': 'IndiGo Airlines',
    AI: 'Air India',
    UK: 'Vistara',
    SG: 'SpiceJet',
    QP: 'Akasa Air',
    I5: 'AIX Connect (AirAsia India)',
    IX: 'Air India Express',
    G8: 'Go First',
  };

  constructor(options: AmadeusAdapterOptions = {}) {
    super(options);
    this.client = options.client || new AmadeusClient();
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getClient(): AmadeusClient {
    return this.client;
  }

  protected async executeSearch(query: TransportQuery): Promise<NormalizedTransportOffer[]> {
    const originIata = AmadeusClient.extractIataCode(query.origin);
    const destIata = AmadeusClient.extractIataCode(query.destination);

    // If unconfigured, handle safely per specification:
    // "If production credentials are unavailable, implement and test the adapter interface with fixtures,
    // label the integration as unconfigured, and document how to enable it."
    if (!this.isConfigured()) {
      Logger.info(
        'Amadeus for Developers is unconfigured (AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET missing). Returning 0 live offers. See docs/amadeus-flight-integration.md to activate.',
        'AMADEUS_ADAPTER'
      );
      return [];
    }

    try {
      const response: AmadeusFlightOffersResponse = await this.client.searchFlightOffers(
        {
          originLocationCode: originIata,
          destinationLocationCode: destIata,
          departureDate: query.departureDate,
          returnDate: query.returnDate,
          adults: query.travelers,
          currencyCode: 'INR',
          max: 15,
        },
        query.signal
      );

      // Do not invent flights or fares when provider returns no results
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        Logger.info(
          `Amadeus search returned 0 flight offers for corridor ${originIata} -> ${destIata} on ${query.departureDate}`,
          'AMADEUS_ADAPTER'
        );
        return [];
      }

      return this.normalizeAmadeusResponse(response, query, originIata, destIata, true);
    } catch (err: unknown) {
      Logger.error(
        `Amadeus search error: ${err instanceof Error ? err.message : String(err)}`,
        'AMADEUS_ADAPTER'
      );
      throw err;
    }
  }

  /**
   * Normalizes raw Amadeus v2 FlightOffers response into NormalizedTransportOffer[]
   */
  normalizeAmadeusResponse(
    response: AmadeusFlightOffersResponse,
    query: TransportQuery,
    originIata: string,
    destIata: string,
    isLive: boolean = true
  ): NormalizedTransportOffer[] {
    const offers: NormalizedTransportOffer[] = [];
    const carrierDict = response.dictionaries?.carriers || {};

    for (const item of response.data) {
      try {
        const normalized = this.normalizeSingleOffer(item, carrierDict, query, originIata, destIata, isLive);
        if (normalized) {
          offers.push(OfferNormalizationService.validate(normalized));
        }
      } catch (err: unknown) {
        Logger.warn(
          `Skipping unparsable Amadeus offer ${item.id}: ${err instanceof Error ? err.message : String(err)}`,
          'AMADEUS_ADAPTER'
        );
      }
    }

    return offers;
  }

  private normalizeSingleOffer(
    offer: AmadeusFlightOffer,
    carrierDict: Record<string, string>,
    query: TransportQuery,
    originIata: string,
    destIata: string,
    isLive: boolean
  ): NormalizedTransportOffer | null {
    if (!offer || !offer.itineraries || !Array.isArray(offer.itineraries) || offer.itineraries.length === 0) {
      return null;
    }

    const firstItinerary = offer.itineraries[0];
    if (!firstItinerary || !firstItinerary.segments || !Array.isArray(firstItinerary.segments) || firstItinerary.segments.length === 0) {
      return null;
    }

    if (!offer.price || (!offer.price.grandTotal && !offer.price.total)) {
      return null;
    }

    const segments = firstItinerary.segments;
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    // Airline identification
    const carrierCode = firstSegment.carrierCode;
    const carrierName =
      AmadeusFlightAdapter.KNOWN_CARRIERS[carrierCode] ||
      carrierDict[carrierCode] ||
      `Airline ${carrierCode}`;

    const flightNumber = `${carrierCode}-${firstSegment.number}`;
    const aircraftCode = firstSegment.aircraft?.code ? ` (${firstSegment.aircraft.code})` : '';
    const identifier = segments.length === 1
      ? `${flightNumber}${aircraftCode}`
      : `${flightNumber} + ${segments.length - 1} stop${segments.length > 2 ? 's' : ''}`;

    // Timestamps
    const depTimeRaw = firstSegment.departure.at;
    const arrTimeRaw = lastSegment.arrival.at;

    const depIso = depTimeRaw.includes('+') ? depTimeRaw : `${depTimeRaw}+05:30`;
    const arrIso = arrTimeRaw.includes('+') ? arrTimeRaw : `${arrTimeRaw}+05:30`;

    // Duration calculation
    const durationMinutes = AmadeusClient.parseIsoDurationToMinutes(firstItinerary.duration);

    // Pricing
    const totalCost = parseFloat(offer.price.grandTotal || offer.price.total);
    const baseFare = parseFloat(offer.price.base);
    const mandatoryTaxesAndFees = Math.max(0, Math.round((totalCost - baseFare) * 100) / 100);

    // Fare details & baggage
    const travelerPricing = offer.travelerPricings[0];
    const fareDetails = travelerPricing?.fareDetailsBySegment[0];
    const cabin = fareDetails?.cabin || 'ECONOMY';
    const checkedBags = fareDetails?.includedCheckedBags;

    let baggageAllowanceKg: number | undefined;
    if (checkedBags?.weight) {
      baggageAllowanceKg = checkedBags.weight;
    } else if (checkedBags?.quantity && checkedBags.quantity > 0) {
      baggageAllowanceKg = checkedBags.quantity * 15;
    }

    // Availability
    const seatsRemaining = offer.numberOfBookableSeats ?? null;
    const status: AvailabilityStatus =
      seatsRemaining && seatsRemaining > 0
        ? 'AVAILABLE'
        : seatsRemaining === 0
        ? 'SOLD_OUT'
        : 'UNKNOWN';

    // Official Booking URL generation based on carrier capabilities
    let bookingUrl = `https://www.google.com/travel/flights?q=flights+from+${originIata}+to+${destIata}`;
    let isOfficialDeepLink = false;
    let partnerName = carrierName;

    if (carrierCode === 'AI') {
      bookingUrl = `https://www.airindia.com/in/en/book/flight-search.html?from=${originIata}&to=${destIata}&departDate=${query.departureDate}`;
      isOfficialDeepLink = true;
      partnerName = 'Air India Official Portal';
    } else if (carrierCode === '6E') {
      bookingUrl = `https://www.goindigo.in/booking.html?origin=${originIata}&dest=${destIata}&date=${query.departureDate}`;
      isOfficialDeepLink = true;
      partnerName = 'IndiGo Official Portal';
    } else if (carrierCode === 'SG') {
      bookingUrl = `https://www.spicejet.com`;
      isOfficialDeepLink = true;
      partnerName = 'SpiceJet Official Portal';
    } else if (carrierCode === 'QP') {
      bookingUrl = `https://www.akasaair.com`;
      isOfficialDeepLink = true;
      partnerName = 'Akasa Air Official Portal';
    }

    const naturalKey = OfferNormalizationService.generateNaturalKey({
      mode: 'FLIGHT',
      operator: carrierName,
      identifier: flightNumber,
      originHub: firstSegment.departure.iataCode,
      destinationHub: lastSegment.arrival.iataCode,
      departureTimestamp: depIso,
      seatClass: cabin,
    });

    return {
      id: `amadeus-${offer.id}-${query.departureDate}`,
      naturalKey,
      providerCode: this.code,
      providerName: this.name,
      mode: 'FLIGHT',
      category: 'BEST_VALUE',
      operator: carrierName,
      identifier,
      origin: {
        timestamp: depIso,
        timezone: 'Asia/Kolkata',
        hubCode: firstSegment.departure.iataCode,
        hubName: `${firstSegment.departure.iataCode}${firstSegment.departure.terminal ? ` T${firstSegment.departure.terminal}` : ''}`,
        city: query.origin,
      },
      destination: {
        timestamp: arrIso,
        timezone: 'Asia/Kolkata',
        hubCode: lastSegment.arrival.iataCode,
        hubName: `${lastSegment.arrival.iataCode}${lastSegment.arrival.terminal ? ` T${lastSegment.arrival.terminal}` : ''}`,
        city: query.destination,
      },
      durationMinutes,
      price: {
        baseFare,
        mandatoryTaxesAndFees,
        ticketTotal: totalCost,
        currency: offer.price.currency || 'INR',
        transferCostEstimate: {
          firstMileInr: 450,
          lastMileInr: 350,
          isEstimate: true,
          notes: 'Estimated airport taxi / cab transfers factored into overall cost.',
        },
        estimatedGrandTotal: totalCost + 450 + 350,
      },
      availability: {
        status,
        seatsRemaining,
        seatClass: cabin,
      },
      booking: {
        url: bookingUrl,
        isOfficialDeepLink,
        partnerName,
      },
      lastCheckedTimestamp: new Date().toISOString(),
      dataSource: {
        type: isLive ? 'LIVE' : 'DEMO',
        isDemonstration: !isLive,
        attributionNotes: isLive
          ? `GDS inventory via Amadeus for Developers (${this.client.getEnvironment()} environment).`
          : 'Amadeus API unconfigured. Benchmark demonstration data.',
      },
      details: {
        flight: {
          flightNumber,
          cabinClass: cabin,
          stops: segments.length - 1,
          baggageAllowanceKg,
          mealIncluded: cabin === 'BUSINESS' || carrierCode === 'AI',
        },
      },
    };
  }
}
