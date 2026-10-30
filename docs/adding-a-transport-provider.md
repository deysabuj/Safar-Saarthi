# Adding a New Transport Provider to Safar Saarthi

Safar Saarthi uses a **pluggable, provider-independent transport architecture**. Ranking, deduplication, fault isolation, timeout management, and frontend formatting are strictly separated from provider adapters.

You can add a new domestic flight carrier, state bus corporation, or private railway operator in **3 simple steps without modifying any comparison or aggregation logic**.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │    TransportSearchOrchestrator       │
                      │  (Concurrent Promise.allSettled)     │
                      └──────────────────┬───────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
┌─────────────────┐            ┌──────────────────┐             ┌──────────────────┐
│ IrctcTrainAdapter│            │IndigoFlightAdapter│             │ [YourNewAdapter] │
│ (TrainProvider) │            │ (FlightProvider) │             │ (BaseAdapter)    │
└────────┬────────┘            └────────┬─────────┘             └────────┬─────────┘
         │                              │                                │
         └──────────────────────────────┼────────────────────────────────┘
                                        ▼
                      ┌──────────────────────────────────────┐
                      │      OfferNormalizationService       │
                      │  - Deduplication via naturalKey      │
                      │  - Deterministic Ranking             │
                      │    (Cheapest, Fastest, Best Value)   │
                      │  - Zod Schema Validation             │
                      └──────────────────────────────────────┘
```

---

## 3 Steps to Add a New Provider

### Step 1: Create the Adapter Class
Extend `BaseTransportAdapter` and implement `FlightProvider`, `TrainProvider`, or `BusProvider`.

Create `backend/src/integrations/transport/adapters/akasaAir.adapter.ts`:

```typescript
import { BaseTransportAdapter, BaseAdapterOptions } from './base.adapter.js';
import { FlightProvider, TransportQuery, NormalizedTransportOffer, AvailabilityStatus } from '../types.js';
import { OfferNormalizationService } from '../normalizer.js';

export class AkasaAirFlightAdapter extends BaseTransportAdapter implements FlightProvider {
  readonly code = 'AKASA_AIR';
  readonly name = 'Akasa Air';
  readonly mode = 'FLIGHT' as const;

  constructor(options: BaseAdapterOptions = {}) {
    // Override default timeout (3500ms) or retry limits if needed
    super({ timeoutMs: 3000, maxRetries: 2, ...options });
  }

  protected async executeSearch(query: TransportQuery): Promise<NormalizedTransportOffer[]> {
    // 1. Fetch from provider API or SDK
    const rawResponse = await this.callAkasaAirApi(query);

    const offers: NormalizedTransportOffer[] = [];

    // 2. Map and normalize each raw item
    for (const flight of rawResponse.flights) {
      const depIso = `${query.departureDate}T${flight.depTime}:00+05:30`;
      const arrIso = `${query.departureDate}T${flight.arrTime}:00+05:30`;

      // 3. Generate natural key for deduplication
      const naturalKey = OfferNormalizationService.generateNaturalKey({
        mode: 'FLIGHT',
        operator: 'Akasa Air',
        identifier: flight.flightNumber,
        originHub: flight.originAirport,
        destinationHub: flight.destinationAirport,
        departureTimestamp: depIso,
        seatClass: flight.cabin,
      });

      const offer: NormalizedTransportOffer = {
        id: `akasa-${flight.flightNumber}-${query.departureDate}`,
        naturalKey,
        providerCode: this.code,
        providerName: this.name,
        mode: 'FLIGHT',
        category: 'BEST_VALUE', // initial placeholder; ranked automatically by orchestrator
        operator: 'Akasa Air',
        identifier: flight.flightNumber,
        origin: {
          timestamp: depIso,
          timezone: 'Asia/Kolkata',
          hubCode: flight.originAirport,
          hubName: flight.originAirportName,
          city: query.origin,
        },
        destination: {
          timestamp: arrIso,
          timezone: 'Asia/Kolkata',
          hubCode: flight.destinationAirport,
          hubName: flight.destinationAirportName,
          city: query.destination,
        },
        durationMinutes: flight.durationMinutes,
        price: {
          baseFare: flight.baseFare,
          mandatoryTaxesAndFees: flight.taxes,
          ticketTotal: flight.baseFare + flight.taxes,
          currency: 'INR',
          // CRITICAL: Set to null if transfer cost is unknown (do NOT assume 0)
          transferCostEstimate: {
            firstMileInr: 450,
            lastMileInr: 350,
            isEstimate: true,
            notes: 'City center cab transfer',
          },
          estimatedGrandTotal: flight.baseFare + flight.taxes + 800,
        },
        availability: {
          // CRITICAL: If provider doesn't supply seat counts, use 'UNKNOWN' and null
          status: flight.seatsLeft > 0 ? 'AVAILABLE' : 'SOLD_OUT',
          seatsRemaining: flight.seatsLeft ?? null,
          seatClass: flight.cabin,
        },
        booking: {
          url: `https://www.akasaair.com/booking?flight=${flight.flightNumber}&date=${query.departureDate}`,
          isOfficialDeepLink: true,
          partnerName: 'Akasa Air Official Booking',
        },
        lastCheckedTimestamp: new Date().toISOString(),
        dataSource: {
          type: 'LIVE',
          isDemonstration: false,
        },
      };

      // 4. Validate before returning
      offers.push(OfferNormalizationService.validate(offer));
    }

    return offers;
  }

  private async callAkasaAirApi(query: TransportQuery) {
    // External API invocation with query.signal propagation
    return { flights: [] };
  }
}
```

---

### Step 2: Register the Adapter in the Registry
In `backend/src/integrations/transport/index.ts`:

```typescript
import { AkasaAirFlightAdapter } from './adapters/akasaAir.adapter.js';

defaultProviderRegistry.register(new AkasaAirFlightAdapter());
```

---

### Step 3: Write Unit Tests with Deterministic Fixtures
In `backend/src/tests/`:
```typescript
import { AkasaAirFlightAdapter } from '../integrations/transport/adapters/akasaAir.adapter.js';
import { normalizedTransportOfferSchema } from '../integrations/transport/schemas.js';

it('should normalize Akasa Air payload into standard contract', async () => {
  const adapter = new AkasaAirFlightAdapter();
  const offers = await adapter.search({
    origin: 'DEL',
    destination: 'BOM',
    departureDate: '2026-11-20',
    travelers: 1,
  });

  for (const offer of offers) {
    expect(normalizedTransportOfferSchema.safeParse(offer).success).toBe(true);
  }
});
```

---

## What Happens Automatically?

1. **Concurrent Search**: `TransportSearchOrchestrator` will automatically discover your registered adapter and query it in parallel with other providers.
2. **Timeout Isolation**: If your adapter is slow or unresponsive, it will timeout at `timeoutMs` without failing other providers.
3. **Transient Retry**: Transient connection issues will be retried automatically with exponential backoff and jitter.
4. **Deduplication**: If your provider returns identical flights or codeshare partner flights, the natural key will automatically eliminate duplicates.
5. **Ranking**: The normalizer will evaluate your provider's offers alongside all others to designate the **Cheapest**, **Fastest**, and **Best Value** routes.
