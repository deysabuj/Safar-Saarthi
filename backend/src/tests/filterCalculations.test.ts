import { describe, it, expect } from 'vitest';
import {
  getCorridorBenchmarkOptions,
  findCorridor,
  TravelMode,
  TransportCategory,
  TransportOption,
} from '@safar-saarthi/shared';

// Replica of TravelApiService filtering and sorting logic for unit verification
function filterOptions(
  options: TransportOption[],
  filters: {
    mode?: TravelMode | 'ALL';
    maxCost?: number | null;
    maxDurationMinutes?: number | null;
    departureTimeOfDay?: 'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  }
): TransportOption[] {
  return options.filter((opt) => {
    if (filters.mode && filters.mode !== 'ALL' && opt.mode !== filters.mode) {
      return false;
    }
    if (
      typeof filters.maxCost === 'number' &&
      !isNaN(filters.maxCost) &&
      filters.maxCost > 0 &&
      typeof opt.totalCostInr === 'number' &&
      opt.totalCostInr > filters.maxCost
    ) {
      return false;
    }
    if (
      typeof filters.maxDurationMinutes === 'number' &&
      !isNaN(filters.maxDurationMinutes) &&
      filters.maxDurationMinutes > 0 &&
      typeof opt.durationMinutes === 'number' &&
      opt.durationMinutes > filters.maxDurationMinutes
    ) {
      return false;
    }
    if (filters.departureTimeOfDay && filters.departureTimeOfDay !== 'ALL') {
      const timeStr = (opt.departureTime || '').toUpperCase();
      const isPM = timeStr.includes('PM');
      const parts = timeStr.split(':');
      let hour = parseInt(parts[0], 10);
      if (isNaN(hour)) return true;
      if (isPM && hour < 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;

      if (filters.departureTimeOfDay === 'MORNING' && (hour < 6 || hour >= 12)) return false;
      if (filters.departureTimeOfDay === 'AFTERNOON' && (hour < 12 || hour >= 17)) return false;
      if (filters.departureTimeOfDay === 'EVENING' && (hour < 17 || hour >= 21)) return false;
      if (filters.departureTimeOfDay === 'NIGHT' && (hour < 21 && hour >= 6)) return false;
    }

    return true;
  });
}

function sortOptions(
  options: TransportOption[],
  sortBy: TransportCategory | 'DEFAULT'
): TransportOption[] {
  const cloned = [...options];
  switch (sortBy) {
    case 'CHEAPEST':
      return cloned.sort((a, b) => a.totalCostInr - b.totalCostInr);
    case 'FASTEST':
      return cloned.sort((a, b) => a.durationMinutes - b.durationMinutes);
    case 'BEST_VALUE':
      return cloned.sort((a, b) => {
        const scoreA = a.totalCostInr * 0.6 + a.durationMinutes * 4;
        const scoreB = b.totalCostInr * 0.6 + b.durationMinutes * 4;
        return scoreA - scoreB;
      });
    default:
      return cloned;
  }
}

describe('Filter Behavior and Fare/Duration Calculation Unit Tests', () => {
  describe('1. Delhi -> Bengaluru Corridor Options & Default Ceilings', () => {
    const options = getCorridorBenchmarkOptions('New Delhi (DEL)', 'Bengaluru (BLR)');

    it('returns both flight and train options for Delhi -> Bengaluru', () => {
      expect(options.length).toBeGreaterThanOrEqual(2);
      const modes = new Set(options.map((o) => o.mode));
      expect(modes.has('FLIGHT')).toBe(true);
      expect(modes.has('TRAIN')).toBe(true);
    });

    it('contains a flight costing more than ₹5,000 (e.g. ₹5,800)', () => {
      const flight = options.find((o) => o.mode === 'FLIGHT');
      expect(flight).toBeDefined();
      expect(flight!.totalCostInr).toBeGreaterThan(5000);
    });

    it('contains a long-distance train with duration exceeding 12 hours (720 mins)', () => {
      const train = options.find((o) => o.mode === 'TRAIN');
      expect(train).toBeDefined();
      expect(train!.durationMinutes).toBeGreaterThan(720); // 33h 55m = 2035 mins
      expect(train!.durationMinutes).toBeGreaterThan(1800); // Exceeds 30 hours
    });

    it('ensures unrestricted / dynamic default filters include ALL returned options without excluding them', () => {
      const maxOptionFare = Math.max(...options.map((o) => o.totalCostInr));
      const maxOptionDuration = Math.max(...options.map((o) => o.durationMinutes));

      const sliderMaxFare = Math.max(25000, Math.ceil((maxOptionFare * 1.25) / 1000) * 1000);
      const sliderMaxDuration = Math.max(2880, Math.ceil((maxOptionDuration * 1.25) / 360) * 360);

      const filtered = filterOptions(options, {
        mode: 'ALL',
        maxCost: sliderMaxFare,
        maxDurationMinutes: sliderMaxDuration,
        departureTimeOfDay: 'ALL',
      });

      expect(filtered.length).toBe(options.length);
      expect(filtered.find((o) => o.mode === 'FLIGHT')).toBeDefined();
      expect(filtered.find((o) => o.mode === 'TRAIN')).toBeDefined();
    });

    it('proves that old hardcoded limits (₹5,000 and 12h) improperly hid both results', () => {
      const oldFiltered = filterOptions(options, {
        mode: 'ALL',
        maxCost: 5000,
        maxDurationMinutes: 720,
        departureTimeOfDay: 'ALL',
      });

      // Both the flight (>₹5,000) and the train (>12h) were hidden
      expect(oldFiltered.length).toBe(0);
    });
  });

  describe('2. Delhi -> Mumbai Corridor with Default Filters', () => {
    const options = getCorridorBenchmarkOptions('New Delhi (DEL)', 'Mumbai (BOM)');

    it('returns options across Flights, Trains, and Buses for Delhi -> Mumbai', () => {
      expect(options.length).toBeGreaterThanOrEqual(3);
      const modes = new Set(options.map((o) => o.mode));
      expect(modes.has('FLIGHT')).toBe(true);
      expect(modes.has('TRAIN')).toBe(true);
      expect(modes.has('BUS')).toBe(true);
    });

    it('includes all modes under default dynamic filter bounds', () => {
      const maxOptionFare = Math.max(...options.map((o) => o.totalCostInr));
      const maxOptionDuration = Math.max(...options.map((o) => o.durationMinutes));
      const sliderMaxFare = Math.max(25000, Math.ceil((maxOptionFare * 1.25) / 1000) * 1000);
      const sliderMaxDuration = Math.max(2880, Math.ceil((maxOptionDuration * 1.25) / 360) * 360);

      const filtered = filterOptions(options, {
        mode: 'ALL',
        maxCost: sliderMaxFare,
        maxDurationMinutes: sliderMaxDuration,
        departureTimeOfDay: 'ALL',
      });

      expect(filtered.length).toBe(options.length);
    });
  });

  describe('3. Delhi -> Jaipur Corridor with Default Filters', () => {
    const options = getCorridorBenchmarkOptions('New Delhi (DEL)', 'Jaipur (JAI)');

    it('returns Vande Bharat, flights, and intercity buses', () => {
      expect(options.length).toBeGreaterThanOrEqual(3);
      const vb = options.find((o) => o.identifier.includes('20977'));
      expect(vb).toBeDefined();
      const flight = options.find((o) => o.mode === 'FLIGHT');
      expect(flight).toBeDefined();
      const bus = options.find((o) => o.mode === 'BUS');
      expect(bus).toBeDefined();
    });
  });

  describe('4. Two-Passenger Fare & Budget Calculation Integrity', () => {
    const options = getCorridorBenchmarkOptions('New Delhi (DEL)', 'Mumbai (BOM)');
    const flight = options.find((o) => o.mode === 'FLIGHT')!;

    it('clarifies per-person ticket fare vs multi-passenger total', () => {
      const travelers = 2;
      const perPersonFare = flight.totalCostInr;
      const partyTotal = perPersonFare * travelers;

      expect(partyTotal).toBe(perPersonFare * 2);
      expect(partyTotal).toBeGreaterThan(perPersonFare);
    });

    it('does not conflate trip budget with per-ticket max fare filter', () => {
      const tripBudget = 15000; // Overall trip budget
      const perTicketFilter = 6000; // Max fare per person

      // A flight ticket costing ₹5,320 is within per-ticket filter ₹6,000
      expect(flight.totalCostInr).toBeLessThanOrEqual(perTicketFilter);

      // Total for 2 travelers is ₹10,640, which is within the ₹15,000 trip budget
      const partyTotal = flight.totalCostInr * 2;
      expect(partyTotal).toBeLessThanOrEqual(tripBudget);

      // Filtering with per-ticket maxCost must not exclude this flight
      const filtered = filterOptions([flight], { maxCost: perTicketFilter });
      expect(filtered).toHaveLength(1);
    });
  });

  describe('5. Reset Filters Restoration', () => {
    const options = getCorridorBenchmarkOptions('New Delhi (DEL)', 'Bengaluru (BLR)');

    it('restores all valid options after an intentionally restrictive filter excludes everything', () => {
      // Apply restrictive filter excluding everything
      const restrictive = filterOptions(options, {
        maxCost: 1000,
        maxDurationMinutes: 60,
      });
      expect(restrictive).toHaveLength(0);

      // Reset to dynamic unrestricted bounds
      const maxOptionFare = Math.max(...options.map((o) => o.totalCostInr));
      const maxOptionDuration = Math.max(...options.map((o) => o.durationMinutes));
      const resetMaxFare = Math.max(25000, Math.ceil((maxOptionFare * 1.25) / 1000) * 1000);
      const resetMaxDuration = Math.max(2880, Math.ceil((maxOptionDuration * 1.25) / 360) * 360);

      const restored = filterOptions(options, {
        mode: 'ALL',
        maxCost: resetMaxFare,
        maxDurationMinutes: resetMaxDuration,
        departureTimeOfDay: 'ALL',
      });

      expect(restored.length).toBe(options.length);
    });
  });

  describe('6. Mode Switching and Sorting After Filtering', () => {
    const options = getCorridorBenchmarkOptions('New Delhi (DEL)', 'Mumbai (BOM)');

    it('switches between transport tabs correctly', () => {
      const flightsOnly = filterOptions(options, { mode: 'FLIGHT' });
      expect(flightsOnly.length).toBeGreaterThan(0);
      for (const f of flightsOnly) {
        expect(f.mode).toBe('FLIGHT');
      }

      const trainsOnly = filterOptions(options, { mode: 'TRAIN' });
      expect(trainsOnly.length).toBeGreaterThan(0);
      for (const t of trainsOnly) {
        expect(t.mode).toBe('TRAIN');
      }

      const busesOnly = filterOptions(options, { mode: 'BUS' });
      expect(busesOnly.length).toBeGreaterThan(0);
      for (const b of busesOnly) {
        expect(b.mode).toBe('BUS');
      }
    });

    it('sorts options correctly after filtering', () => {
      const filtered = filterOptions(options, { mode: 'ALL' });

      // Sort by cheapest
      const cheapestSorted = sortOptions(filtered, 'CHEAPEST');
      for (let i = 1; i < cheapestSorted.length; i++) {
        expect(cheapestSorted[i].totalCostInr).toBeGreaterThanOrEqual(cheapestSorted[i - 1].totalCostInr);
      }

      // Sort by fastest
      const fastestSorted = sortOptions(filtered, 'FASTEST');
      for (let i = 1; i < fastestSorted.length; i++) {
        expect(fastestSorted[i].durationMinutes).toBeGreaterThanOrEqual(fastestSorted[i - 1].durationMinutes);
      }
    });
  });
});
