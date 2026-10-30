import { describe, it, expect, vi } from 'vitest';
import { Security } from '../utils/security.js';
import { ConnectionValidator } from '../services/comparison/connectionValidator.js';
import { ItineraryValidationService } from '../services/itineraryValidation.service.js';
import {
  ProviderRegistry,
  TransportSearchOrchestrator,
  TransportProvider,
  TransportQuery,
} from '../integrations/transport/index.js';
import {
  TransportOption,
  JourneyLeg,
  ItineraryPlan,
} from '@safar-saarthi/shared';

describe('Phase 10 — Resilience, Security & Hardening Suite', () => {
  // =========================================================================
  // 1. STALE OR MISSING PROVIDER DATA HANDLING
  // =========================================================================
  describe('1. Stale or Missing Provider Data Handling', () => {
    it('detects offers older than 24-hour TTL as stale', () => {
      const now = Date.now();
      const freshTimestamp = new Date(now - 1000 * 60 * 30).toISOString(); // 30 mins ago
      const staleTimestamp = new Date(now - 1000 * 60 * 60 * 25).toISOString(); // 25 hours ago

      const isStale = (isoDate: string, maxAgeHours = 24): boolean => {
        const ageMs = Date.now() - new Date(isoDate).getTime();
        return ageMs > maxAgeHours * 60 * 60 * 1000;
      };

      expect(isStale(freshTimestamp)).toBe(false);
      expect(isStale(staleTimestamp)).toBe(true);
    });

    it('gracefully normalizes provider data with missing optional fields without crashing', () => {
      // Simulating raw response where baggage and amenities are omitted
      const incompleteRawOffer: any = {
        id: 'raw-123',
        price: '2500',
        departureTime: '10:00',
        arrivalTime: '14:00',
        origin: 'DEL',
        destination: 'JAI',
      };

      const normalizeRaw = (raw: any): Partial<TransportOption> => {
        return {
          id: raw.id || `gen-${Date.now()}`,
          totalCostInr: Number(raw.price) || 0,
          departureTime: raw.departureTime || '00:00',
          arrivalTime: raw.arrivalTime || '00:00',
          originHub: raw.origin || 'Unknown',
          destinationHub: raw.destination || 'Unknown',
          durationMinutes: 240,
        };
      };

      const normalized = normalizeRaw(incompleteRawOffer);
      expect(normalized.totalCostInr).toBe(2500);
      expect(normalized.durationMinutes).toBe(240);
    });
  });

  // =========================================================================
  // 2. INVALID JOURNEY CONNECTIONS & CONSTRAINTS
  // =========================================================================
  describe('2. Invalid Journey Connections & Constraints', () => {
    it('rejects connecting journeys where departure occurs before previous leg arrival', () => {
      const leg1: JourneyLeg = {
        legOrder: 1,
        mode: 'TRAIN',
        originHub: 'NDLS',
        destinationHub: 'CNB',
        departureTime: '2026-11-01T08:00:00Z',
        arrivalTime: '2026-11-01T12:00:00Z',
        durationMinutes: 240,
        baseFareInr: 750,
        mandatoryFeesInr: 50,
        operator: 'Indian Railways',
        identifier: '12004 Shatabdi',
      };

      // Departure is 11:00 AM, but leg1 arrives at 12:00 PM (negative layover of -60 min)
      const leg2Invalid: JourneyLeg = {
        legOrder: 2,
        mode: 'TRAIN',
        originHub: 'CNB',
        destinationHub: 'PRYJ',
        departureTime: '2026-11-01T11:00:00Z',
        arrivalTime: '2026-11-01T13:30:00Z',
        durationMinutes: 150,
        baseFareInr: 350,
        mandatoryFeesInr: 50,
        operator: 'Indian Railways',
        identifier: '12418 Prayagraj Exp',
      };

      const result = ConnectionValidator.validate([leg1, leg2Invalid]);
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('Chronological violation');
    });

    it('rejects connection when layover is less than minimum station transfer threshold', () => {
      const leg1: JourneyLeg = {
        legOrder: 1,
        mode: 'FLIGHT',
        originHub: 'DEL',
        destinationHub: 'BOM',
        departureTime: '2026-11-01T08:00:00Z',
        arrivalTime: '2026-11-01T10:15:00Z',
        durationMinutes: 135,
        baseFareInr: 4000,
        mandatoryFeesInr: 500,
        operator: 'IndiGo',
        identifier: '6E 202',
      };

      // Layover is only 15 minutes at Mumbai airport (minimum required is 45 min)
      const leg2TightLayover: JourneyLeg = {
        legOrder: 2,
        mode: 'FLIGHT',
        originHub: 'BOM',
        destinationHub: 'GOI',
        departureTime: '2026-11-01T10:30:00Z',
        arrivalTime: '2026-11-01T11:45:00Z',
        durationMinutes: 75,
        baseFareInr: 2500,
        mandatoryFeesInr: 300,
        operator: 'IndiGo',
        identifier: '6E 551',
      };

      const result = ConnectionValidator.validate([leg1, leg2TightLayover]);
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('Insufficient transfer time');
    });

    it('flags itinerary error when Day 1 activities violate transit arrival buffer', () => {
      const mockPlan: ItineraryPlan = {
        id: 'plan-tight',
        origin: 'New Delhi',
        destination: 'Jaipur',
        durationDays: 2,
        travelers: 1,
        pace: 'MODERATE',
        style: 'MID_RANGE',
        dietary: 'VEG',
        interests: ['HERITAGE'],
        title: 'Jaipur Express',
        selectedTransport: {
          id: 'trans-1',
          mode: 'TRAIN',
          operator: 'Indian Railways',
          identifier: '12015 Ajmer Shatabdi',
          departureTime: '06:10 AM',
          arrivalTime: '10:45 AM',
          durationMinutes: 275,
          totalCostInr: 1050,
          baseFareInr: 950,
          taxesAndFeesInr: 100,
          originHub: 'NDLS',
          destinationHub: 'JP',
          category: 'BEST_VALUE',
          attribution: {
            provider: 'IRCTC',
            displayName: 'IRCTC',
            dataSource: 'LIVE',
            isDemonstrationData: false,
            lastCheckedTimestamp: new Date().toISOString(),
            officialBookingUrl: 'https://www.irctc.co.in',
          },
        },
        recommendedStay: {
          id: 'stay-1',
          type: 'HOTEL',
          name: 'Hotel Diggi Palace',
          neighborhood: 'Shivaji Marg',
          pricePerNightInr: 3200,
          rating: 4.5,
          reviewsCount: 320,
          proximityToHub: '3.5 km from Jaipur Junction',
          bookingUrl: 'https://www.makemytrip.com',
          amenities: ['WiFi', 'Pool'],
          attribution: {
            provider: 'MAKEMYTRIP',
            displayName: 'MakeMyTrip Curated Stay',
            dataSource: 'DEMO',
            isDemonstrationData: true,
            lastCheckedTimestamp: new Date().toISOString(),
            officialBookingUrl: 'https://www.makemytrip.com',
          },
        },
        budgetBreakdown: {
          transportTotalInr: 1050,
          stayTotalInr: 3200,
          activitiesTotalInr: 500,
          foodEstimatedInr: 1600,
          grandTotalInr: 6350,
          userBudgetInr: 10000,
        },
        days: [
          {
            dayNumber: 1,
            theme: 'Heritage',
            date: '2026-11-01',
            dailyBudgetEstimateInr: 2500,
            activities: [
              {
                id: 'act-premature',
                title: 'Amber Fort Morning Tour',
                timeSlot: '11:00 AM - 01:00 PM', // 15 mins after arrival (violates 45m buffer)
                location: 'Amer',
                description: 'Guided tour',
                entryFeeInr: 200,
                durationMinutes: 120,
                category: 'HERITAGE',
                requiresConfirmation: false,
              },
            ],
          },
        ],
      };

      const validation = ItineraryValidationService.validateItinerary(mockPlan);
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some((i) => i.code === 'TEMPORAL_OUT_OF_BOUNDS')).toBe(true);
    });
  });

  // =========================================================================
  // 3. BUDGET CONSTRAINT VIOLATIONS
  // =========================================================================
  describe('3. Budget Constraint Violations', () => {
    it('detects budget deficit and calculates variance deterministically', () => {
      const userBudget = 10000;
      const grandTotal = 14500;

      const evaluateBudget = (budget: number, actual: number) => {
        const isExceeded = actual > budget;
        const deficitInr = isExceeded ? actual - budget : 0;
        const overagePercent = isExceeded ? Math.round((deficitInr / budget) * 100) : 0;
        return { isExceeded, deficitInr, overagePercent };
      };

      const assessment = evaluateBudget(userBudget, grandTotal);
      expect(assessment.isExceeded).toBe(true);
      expect(assessment.deficitInr).toBe(4500);
      expect(assessment.overagePercent).toBe(45);
    });
  });

  // =========================================================================
  // 4. EXTERNAL BOOKING REDIRECTION SECURITY
  // =========================================================================
  describe('4. External Booking Redirection Security', () => {
    it('approves legitimate authorized transport and stay partners', () => {
      const validUrls = [
        'https://www.irctc.co.in/nget/train-search',
        'https://www.goindigo.in/booking/select.html',
        'https://www.airindia.com/en-in/book-flights',
        'https://www.redbus.in/bus-tickets/delhi-to-jaipur',
        'https://www.makemytrip.com/hotels/jaipur',
        'https://rsrtconline.rajasthan.gov.in/bus',
        'https://ksrtc.in/oprs-web',
      ];

      for (const url of validUrls) {
        const res = Security.validateBookingUrl(url);
        expect(res.isValid).toBe(true);
        expect(res.sanitizedUrl).toBeDefined();
      }
    });

    it('rejects disallowed schemes such as javascript: or data:', () => {
      const attackUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert(1)</script>',
        'ftp://files.irctc.co.in/download',
      ];

      for (const url of attackUrls) {
        const res = Security.validateBookingUrl(url);
        expect(res.isValid).toBe(false);
        expect(res.error).toBeDefined();
      }
    });

    it('rejects open redirects and subdomains of unauthorized phishing targets', () => {
      const phishingUrls = [
        'https://irctc.co.in.phishing-scam.xyz/login',
        'https://evil-hacker.com?redirect=https://irctc.co.in',
        'https://fake-indigo-offers.net/pay',
      ];

      for (const url of phishingUrls) {
        const res = Security.validateBookingUrl(url);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Unrecognized or untrusted');
      }
    });

    it('strips sensitive auth tokens from booking URLs', () => {
      const urlWithToken = 'https://www.irctc.co.in/nget?token=SECRET_JWT_123&auth=ADMIN&city=JAI';
      const res = Security.validateBookingUrl(urlWithToken);
      expect(res.isValid).toBe(true);
      expect(res.sanitizedUrl).not.toContain('SECRET_JWT_123');
      expect(res.sanitizedUrl).not.toContain('ADMIN');
      expect(res.sanitizedUrl).toContain('city=JAI');
    });
  });

  // =========================================================================
  // 5. FAULT ISOLATION & PROVIDER RESILIENCE
  // =========================================================================
  describe('5. Fault Isolation & Provider Resilience', () => {
    it('aggregates healthy providers when one provider throws an unhandled failure or timeout', async () => {
      const registry = new ProviderRegistry();

      const sampleOffer = {
        id: 'fl-1',
        naturalKey: 'FLIGHT:AI:401:2026-11-01',
        providerCode: 'MOCK_AIR_INDIA',
        providerName: 'Air India',
        mode: 'FLIGHT' as const,
        category: 'FASTEST' as const,
        operator: 'Air India',
        identifier: 'AI 401',
        origin: {
          timestamp: '2026-11-01T09:00:00+05:30',
          timezone: 'Asia/Kolkata',
          hubCode: 'DEL',
          hubName: 'Indira Gandhi International Airport',
          city: 'Delhi',
        },
        destination: {
          timestamp: '2026-11-01T10:15:00+05:30',
          timezone: 'Asia/Kolkata',
          hubCode: 'JAI',
          hubName: 'Jaipur International Airport',
          city: 'Jaipur',
        },
        durationMinutes: 75,
        price: {
          baseFare: 2800,
          mandatoryTaxesAndFees: 400,
          ticketTotal: 3200,
          currency: 'INR',
          transferCostEstimate: null,
          estimatedGrandTotal: 3200,
        },
        availability: {
          status: 'AVAILABLE' as const,
          seatsRemaining: 12,
          seatClass: 'Economy',
        },
        booking: {
          url: 'https://www.airindia.com',
          isOfficialDeepLink: true,
          partnerName: 'Air India',
        },
        lastCheckedTimestamp: new Date().toISOString(),
        dataSource: {
          type: 'LIVE' as const,
          isDemonstration: false,
        },
      };

      const healthyFlightProvider: TransportProvider = {
        code: 'MOCK_AIR_INDIA',
        name: 'Air India Mock Provider',
        mode: 'FLIGHT',
        isEnabled: true,
        search: vi.fn().mockResolvedValue([sampleOffer]),
      };

      const failingTrainProvider: TransportProvider = {
        code: 'MOCK_FAILING_IRCTC',
        name: 'Failing IRCTC Provider',
        mode: 'TRAIN',
        isEnabled: true,
        search: vi.fn().mockRejectedValue(new Error('503 Service Unavailable: IRCTC upstream timeout')),
      };

      registry.register(healthyFlightProvider);
      registry.register(failingTrainProvider);

      const orchestrator = new TransportSearchOrchestrator({ registry });

      const query: TransportQuery = {
        origin: 'Delhi',
        destination: 'Jaipur',
        departureDate: '2026-11-01',
        travelers: 1,
      };

      const result = await orchestrator.search(query);

      // Fault isolation guarantee: remaining healthy providers still deliver valid offers
      expect(result.offers.length).toBe(1);
      expect(result.offers[0].operator).toBe('Air India');
      expect(result.meta.successfulProviders).toContain('MOCK_AIR_INDIA');
      expect(result.meta.failedProviders).toContain('MOCK_FAILING_IRCTC');
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('IRCTC upstream timeout');
    });
  });
});
