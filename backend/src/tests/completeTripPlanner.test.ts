import { describe, it, expect, vi } from 'vitest';
import { CuratedAccommodationProvider } from '../providers/accommodation/curatedAccommodationProvider.js';
import { AmadeusAccommodationProvider } from '../providers/accommodation/amadeusAccommodationProvider.js';
import { AccommodationService } from '../services/accommodation.service.js';
import { CuratedPlacesProvider } from '../providers/places/curatedPlacesProvider.js';
import { PlacesService } from '../providers/places/placesService.js';
import { GroundTransferService } from '../services/transfers/groundTransferService.js';
import { RouteOptimizer } from '../services/transfers/routeOptimizer.js';
import { ItineraryValidationService } from '../services/itineraryValidation.service.js';
import { MapProjectionService } from '../services/transfers/mapProjectionService.js';
import { ItineraryService } from '../services/itinerary.service.js';
import { TripRepository } from '../repositories/trip.repository.js';
import { ItineraryRepository } from '../repositories/itinerary.repository.js';
import type { ItineraryPlan } from '@safar-saarthi/shared';

const mockValidPlan: ItineraryPlan = {
  id: 'test-plan-01',
  title: '3-Day Curated Journey to Jaipur',
  origin: 'Delhi',
  destination: 'Jaipur',
  durationDays: 3,
  travelers: 2,
  pace: 'MODERATE',
  style: 'MID_RANGE',
  dietary: 'VEG',
  interests: [],
  selectedTransport: {
    id: 'tr-01',
    mode: 'TRAIN',
    category: 'BEST_VALUE',
    operator: 'IRCTC Shatabdi',
    identifier: '12015',
    departureTime: '08:45 PM', // Return departure in evening
    arrivalTime: '10:40 AM', // Arrival on day 1
    durationMinutes: 275,
    originHub: 'NDLS',
    destinationHub: 'JP',
    baseFareInr: 850,
    taxesAndFeesInr: 0,
    totalCostInr: 850,
    attribution: {
      provider: 'IRCTC',
      displayName: 'IRCTC',
      officialBookingUrl: 'https://irctc.co.in',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: false,
      dataSource: 'LIVE',
    },
  },
  recommendedStay: {
    id: 'stay-01',
    name: 'Alsisar Haveli',
    type: 'HERITAGE_HAVELI',
    neighborhood: 'Sansar Chandra Road',
    proximityToHub: '1.8 km',
    pricePerNightInr: 4200,
    rating: 4.8,
    reviewsCount: 1400,
    amenities: ['Pool', 'WiFi'],
    latitude: 26.9242,
    longitude: 75.7955,
    attribution: {
      provider: 'MAKEMYTRIP',
      displayName: 'MMT',
      officialBookingUrl: 'https://mmt.com',
      lastCheckedTimestamp: new Date().toISOString(),
      isDemonstrationData: false,
      dataSource: 'LIVE',
    },
  },
  days: [
    {
      dayNumber: 1,
      theme: 'Arrival and Royal Heritage',
      date: '2026-11-15',
      dailyBudgetEstimateInr: 2500,
      activities: [
        {
          id: 'a1',
          title: 'City Palace',
          location: 'Pink City',
          description: 'Palace',
          entryFeeInr: 300,
          durationMinutes: 120,
          category: 'HERITAGE',
          timeSlot: '11:45 AM - 01:45 PM', // Safely after 10:40 AM arrival + 45 min buffer
          latitude: 26.9258,
          longitude: 75.8237,
          openingHours: '09:30 AM - 05:00 PM',
        },
        {
          id: 'a2',
          title: 'Hawa Mahal',
          location: 'Pink City',
          description: 'Honeycomb facade',
          entryFeeInr: 50,
          durationMinutes: 60,
          category: 'HERITAGE',
          timeSlot: '03:00 PM - 04:00 PM', // Good buffer
          latitude: 26.9239,
          longitude: 75.8267,
          openingHours: '09:00 AM - 04:30 PM',
          transferFromPrevious: {
            fromLocation: 'City Palace',
            toLocation: 'Hawa Mahal',
            mode: 'WALK',
            distanceKm: 0.6,
            estimatedDurationMinutes: 10,
            estimatedCostInr: 0,
            isEstimated: true,
            disclaimer: 'Estimates vary',
          },
        },
      ],
    },
  ],
  budgetBreakdown: {
    transportTotalInr: 1700,
    stayTotalInr: 8400,
    activitiesTotalInr: 700,
    foodEstimatedInr: 4800,
    grandTotalInr: 15600,
    userBudgetInr: 25000,
  },
};

describe('Phase 08 — Complete Trip Planner Test Suite', () => {
  // -------------------------------------------------------------
  // 1. Accommodation Provider Integration
  // -------------------------------------------------------------
  describe('Accommodation Provider', () => {
    it('should return verified Indian stays matching destination with real coordinates and pricing', async () => {
      const provider = new CuratedAccommodationProvider();
      const offers = await provider.search({
        destination: 'Jaipur',
        checkInDate: '2026-11-15',
        checkOutDate: '2026-11-18', // 3 nights
        guests: 2,
      });

      expect(offers.length).toBeGreaterThan(0);
      const first = offers[0];
      expect(first.destination).toBe('Jaipur');
      expect(first.nights).toBe(3);
      expect(first.pricePerNightInr).toBeGreaterThan(0);
      expect(first.totalStayInr).toBe(first.pricePerNightInr * 3);
      expect(first.latitude).toBeGreaterThan(26.0);
      expect(first.longitude).toBeGreaterThan(75.0);
      expect(first.amenities.length).toBeGreaterThan(0);
      expect(first.attribution.dataSource).toBe('LIVE');
    });

    it('should filter stays by maximum price and property type', async () => {
      const provider = new CuratedAccommodationProvider();
      const budgetStays = await provider.search({
        destination: 'Jaipur',
        checkInDate: '2026-11-15',
        checkOutDate: '2026-11-17',
        type: 'BOUTIQUE_HOMESTAY',
        maxPricePerNight: 2500,
      });

      expect(budgetStays.length).toBeGreaterThan(0);
      for (const stay of budgetStays) {
        expect(stay.type).toBe('BOUTIQUE_HOMESTAY');
        expect(stay.pricePerNightInr).toBeLessThanOrEqual(2500);
      }
    });

    it('should gracefully degrade when Amadeus credentials are not configured', async () => {
      const amadeusProvider = new AmadeusAccommodationProvider();
      const offers = await amadeusProvider.search({
        destination: 'Jaipur',
        checkInDate: '2026-11-15',
        checkOutDate: '2026-11-18',
      });

      // Without credentials, returns empty array rather than throwing or inventing fake data
      expect(Array.isArray(offers)).toBe(true);
    });

    it('should search accommodations through AccommodationService', async () => {
      const offers = await AccommodationService.searchAccommodations({
        destination: 'Jaipur',
        checkInDate: '2026-11-15',
        checkOutDate: '2026-11-18',
      });

      expect(offers.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------
  // 2. Places Discovery Provider
  // -------------------------------------------------------------
  describe('Places & Destinations Provider', () => {
    it('should return real attractions with coordinates, entry fees, and opening hours', async () => {
      const provider = new CuratedPlacesProvider();
      const places = await provider.getPlaces('Jaipur');

      expect(places.length).toBeGreaterThanOrEqual(5);

      const amberFort = places.find((p) => p.title.includes('Amber Fort'));
      expect(amberFort).toBeDefined();
      expect(amberFort?.latitude).toBeCloseTo(26.9855, 3);
      expect(amberFort?.longitude).toBeCloseTo(75.8513, 3);
      expect(amberFort?.entryFeeInr).toBe(100);
      expect(amberFort?.typicalDurationMinutes).toBe(180);
      expect(amberFort?.openingHours).toContain('09:00 AM');
    });

    it('should honestly flag unverified bazaar stall timings with requiresConfirmation', async () => {
      const provider = new CuratedPlacesProvider();
      const places = await provider.getPlaces('Jaipur');

      const bazaar = places.find((p) => p.title.includes('Bazaar'));
      expect(bazaar).toBeDefined();
      expect(bazaar?.requiresConfirmation).toBe(true);
      expect(bazaar?.confirmationNote).toBeDefined();
    });

    it('should retrieve places through PlacesService with category filtering', async () => {
      const heritagePlaces = await PlacesService.getPlacesForDestination('Jaipur', 'HERITAGE');
      expect(heritagePlaces.length).toBeGreaterThan(0);
      for (const p of heritagePlaces) {
        expect(p.category).toBe('HERITAGE');
      }
    });
  });

  // -------------------------------------------------------------
  // 3. Ground Transfers & Anti-Backtracking Engine
  // -------------------------------------------------------------
  describe('Ground Transfers & Anti-Backtracking', () => {
    it('should compute Haversine distance correctly between known coordinates', () => {
      // Jaipur Junction (26.9196, 75.7878) to Amber Fort (26.9855, 75.8513) ~ 9.8 km
      const distance = GroundTransferService.calculateHaversineDistanceKm(
        { latitude: 26.9196, longitude: 75.7878 },
        { latitude: 26.9855, longitude: 75.8513 }
      );

      expect(distance).toBeGreaterThan(8.5);
      expect(distance).toBeLessThan(11.5);
    });

    it('should select WALK mode for short distances under 1 km with 0 fare', () => {
      const estimate = GroundTransferService.estimateTransfer(
        'Hawa Mahal',
        'Jantar Mantar',
        { latitude: 26.9239, longitude: 75.8267 },
        { latitude: 26.9248, longitude: 75.8246 }
      );

      expect(estimate.mode).toBe('WALK');
      expect(estimate.estimatedCostInr).toBe(0);
      expect(estimate.distanceKm).toBeLessThan(1.0);
      expect(estimate.disclaimer).toContain('Transfer times and costs are estimates');
    });

    it('should select AUTO_RICKSHAW for medium city distances with appropriate fare formula', () => {
      const estimate = GroundTransferService.estimateTransfer(
        'Hotel',
        'City Palace',
        { latitude: 26.9242, longitude: 75.7955 },
        { latitude: 26.9258, longitude: 75.8237 }
      );

      expect(estimate.mode).toBe('AUTO_RICKSHAW');
      expect(estimate.estimatedCostInr).toBeGreaterThan(30);
      expect(estimate.estimatedDurationMinutes).toBeGreaterThan(10);
      expect(estimate.isEstimated).toBe(true);
    });

    it('should optimize daily stops to eliminate backtracking loops', () => {
      const hotel = {
        name: 'Hotel Alsisar',
        coordinates: { latitude: 26.9242, longitude: 75.7955 },
      };

      // Amber Fort is in North (Amer)
      const northPlace = {
        id: 'p-north',
        destination: 'Jaipur',
        title: 'Amber Fort',
        location: 'Amer',
        address: 'Amer',
        category: 'HERITAGE' as const,
        description: 'Fort',
        entryFeeInr: 100,
        currency: 'INR',
        typicalDurationMinutes: 180,
        latitude: 26.9855,
        longitude: 75.8513,
      };

      // Albert Hall is in South (Adarsh Nagar)
      const southPlace = {
        id: 'p-south',
        destination: 'Jaipur',
        title: 'Albert Hall',
        location: 'South',
        address: 'South',
        category: 'CULTURE' as const,
        description: 'Museum',
        entryFeeInr: 40,
        currency: 'INR',
        typicalDurationMinutes: 90,
        latitude: 26.9116,
        longitude: 75.8195,
      };

      // Jal Mahal is on way to North
      const midPlace = {
        id: 'p-mid',
        destination: 'Jaipur',
        title: 'Jal Mahal',
        location: 'Amer Road',
        address: 'Amer Road',
        category: 'NATURE' as const,
        description: 'Lake',
        entryFeeInr: 0,
        currency: 'INR',
        typicalDurationMinutes: 45,
        latitude: 26.9535,
        longitude: 75.8462,
      };

      const result = RouteOptimizer.optimizeDailySequence(hotel, [northPlace, southPlace, midPlace]);

      expect(result.orderedPlaces.length).toBe(3);
      // SouthPlace (close to hotel) should precede the North corridor places (mid -> north)
      expect(result.orderedPlaces[0].id).toBe('p-south');
      expect(result.totalDistanceKm).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------
  // 4. Itinerary Validation Service
  // -------------------------------------------------------------
  describe('Itinerary Validation Engine', () => {
    it('should validate feasible plan with high score and zero critical errors', () => {
      const report = ItineraryValidationService.validateItinerary(mockValidPlan);

      expect(report.isValid).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(90);
      expect(report.issues.some((i) => i.severity === 'ERROR')).toBe(false);
      expect(report.antiBacktrackingSummary).toBeDefined();
    });

    it('should flag an error if activity is scheduled before arrival time buffer', () => {
      const invalidPlan: ItineraryPlan = {
        ...mockValidPlan,
        days: [
          {
            ...mockValidPlan.days[0],
            activities: [
              {
                ...mockValidPlan.days[0].activities[0],
                timeSlot: '09:00 AM - 11:00 AM', // Arrival is 10:40 AM!
              },
            ],
          },
        ],
      };

      const report = ItineraryValidationService.validateItinerary(invalidPlan);
      expect(report.isValid).toBe(false);
      expect(report.issues.some((i) => i.code === 'TEMPORAL_OUT_OF_BOUNDS')).toBe(true);
    });

    it('should flag insufficient transfer buffer between consecutive stops', () => {
      const tightBufferPlan: ItineraryPlan = {
        ...mockValidPlan,
        days: [
          {
            ...mockValidPlan.days[0],
            activities: [
              {
                ...mockValidPlan.days[0].activities[0],
                timeSlot: '11:45 AM - 01:45 PM',
              },
              {
                ...mockValidPlan.days[0].activities[1],
                timeSlot: '01:50 PM - 02:50 PM', // Only 5 min buffer, but transfer takes 25 min
                transferFromPrevious: {
                  fromLocation: 'Stop 1',
                  toLocation: 'Stop 2',
                  mode: 'CAB_TRANSFER',
                  distanceKm: 8.0,
                  estimatedDurationMinutes: 25,
                  estimatedCostInr: 180,
                  isEstimated: true,
                  disclaimer: 'Disclaimer',
                },
              },
            ],
          },
        ],
      };

      const report = ItineraryValidationService.validateItinerary(tightBufferPlan);
      expect(report.issues.some((i) => i.code === 'INSUFFICIENT_BUFFER')).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 5. Map Projection Engine
  // -------------------------------------------------------------
  describe('Map Projection Service', () => {
    it('should generate structured map data with markers, legs, and disclaimer', () => {
      const mapData = MapProjectionService.buildMapData(mockValidPlan);

      expect(mapData.destination).toBe('Jaipur');
      expect(mapData.center.latitude).toBeGreaterThan(26.0);
      expect(mapData.center.longitude).toBeGreaterThan(75.0);
      expect(mapData.markers.length).toBeGreaterThanOrEqual(3); // Transit, Stay, 2 Activities
      expect(mapData.routeLegs.length).toBeGreaterThanOrEqual(2);
      expect(mapData.disclaimer).toContain('traffic');

      const stayMarker = mapData.markers.find((m) => m.type === 'ACCOMMODATION');
      expect(stayMarker).toBeDefined();
      expect(stayMarker?.title).toBe('Alsisar Haveli');
    });
  });

  // -------------------------------------------------------------
  // 6. Complete Itinerary Generation via Service
  // -------------------------------------------------------------
  describe('Itinerary Generation Service', () => {
    it('should generate feasible day-wise itinerary with check-in, check-out, and deterministic budget', async () => {
      // Mock TripRepository findById
      vi.spyOn(TripRepository, 'findById').mockResolvedValue({
        id: 'mock-trip-123',
        origin: 'Delhi',
        destination: 'Jaipur',
        departureDate: new Date('2026-11-15T06:00:00Z'),
        returnDate: new Date('2026-11-17T20:00:00Z'),
        travelers: 2,
        totalBudget: 25000 as any,
        transportOffers: [
          {
            id: 'to-01',
            mode: 'TRAIN',
            category: 'BEST_VALUE',
            operator: 'Indian Railways',
            identifier: '12015 Ajmer Shatabdi',
            originHub: 'NDLS',
            destinationHub: 'JP',
            departureTime: new Date('2026-11-15T06:05:00Z'),
            arrivalTime: new Date('2026-11-15T10:40:00Z'),
            durationMinutes: 275,
            baseFare: 850 as any,
            taxesAndFees: 0 as any,
            totalCost: 850 as any,
            bookingUrl: 'https://irctc.co.in',
            provider: { name: 'IRCTC' },
          } as any,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock ItineraryRepository createDays to avoid needing active postgres connection during unit test
      vi.spyOn(ItineraryRepository, 'createDays').mockResolvedValue([]);

      const plan = await ItineraryService.generateOrGetItinerary('mock-trip-123', {
        days: 3,
        pace: 'MODERATE',
        style: 'MID_RANGE',
        dietary: 'VEG',
      });

      expect(plan.id).toBe('mock-trip-123');
      expect(plan.days.length).toBe(3);
      expect(plan.selectedTransport.identifier).toContain('Shatabdi');
      expect(plan.recommendedStay).toBeDefined();

      // Check-in on Day 1
      expect(plan.days[0].checkInEvent).toBeDefined();
      expect(plan.days[0].checkInEvent?.hotelName).toBe(plan.recommendedStay.name);

      // Check-out on Day 3
      expect(plan.days[2].checkOutEvent).toBeDefined();

      // Deterministic Budget Breakdown
      const b = plan.budgetBreakdown;
      expect(b.transportTotalInr).toBe(850 * 2);
      expect(b.grandTotalInr).toBe(
        b.transportTotalInr + b.stayTotalInr + b.activitiesTotalInr + b.foodEstimatedInr
      );
      expect(b.grandTotalInr).toBeGreaterThan(0);

      // Validation and Map Attachments
      expect(plan.validationReport).toBeDefined();
      expect(plan.validationReport?.isValid).toBe(true);
      expect(plan.mapData).toBeDefined();
      expect(plan.mapData?.markers.length).toBeGreaterThan(0);
    });
  });
});
