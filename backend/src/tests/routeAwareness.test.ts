import { describe, it, expect } from 'vitest';
import { IrctcTrainAdapter } from '../integrations/transport/adapters/irctc.adapter.js';
import { RedBusAdapter } from '../integrations/transport/adapters/redbus.adapter.js';
import { IndigoFlightAdapter } from '../integrations/transport/adapters/indigo.adapter.js';
import { AirIndiaFlightAdapter } from '../integrations/transport/adapters/airIndia.adapter.js';
import { TransportSearchOrchestrator } from '../integrations/transport/orchestrator.js';
import { ProviderRegistry } from '../integrations/transport/registry.js';
import { CuratedPlacesProvider } from '../providers/places/curatedPlacesProvider.js';
import { CuratedAccommodationProvider } from '../providers/accommodation/curatedAccommodationProvider.js';

describe('Route Awareness & Corridor Isolation Regression Tests', () => {
  const irctc = new IrctcTrainAdapter();
  const redbus = new RedBusAdapter();
  const indigo = new IndigoFlightAdapter();
  const airIndia = new AirIndiaFlightAdapter();

  const registry = new ProviderRegistry();
  registry.register(irctc);
  registry.register(redbus);
  registry.register(indigo);
  registry.register(airIndia);
  const orchestrator = new TransportSearchOrchestrator({ registry });

  describe('IRCTC Train Adapter', () => {
    it('returns Jaipur trains when destination is Jaipur (JP)', async () => {
      const offers = await irctc.search({
        origin: 'New Delhi (DEL)',
        destination: 'Jaipur (JAI)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.hubCode).toBe('JP');
        expect(offer.destination.city.toLowerCase()).toContain('jaipur');
      }
    });

    it('returns Varanasi trains when destination is Varanasi (VNS / BSB)', async () => {
      const offers = await irctc.search({
        origin: 'New Delhi (DEL)',
        destination: 'Varanasi (VNS)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.hubCode).toBe('BSB');
        expect(offer.destination.hubName.toLowerCase()).toContain('varanasi');
        expect(offer.identifier).not.toContain('Ajmer');
      }
      // Specifically check for Vande Bharat 22436
      const vb = offers.find((o) => o.identifier.includes('22436'));
      expect(vb).toBeDefined();
    });

    it('returns Kanpur trains when destination is Kanpur (CNB)', async () => {
      const offers = await irctc.search({
        origin: 'New Delhi (DEL)',
        destination: 'Kanpur (CNB)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.hubCode).toBe('CNB');
        expect(offer.destination.hubName.toLowerCase()).toContain('kanpur');
      }
      const vb = offers.find((o) => o.identifier.includes('22436'));
      expect(vb).toBeDefined();
      const shatabdi = offers.find((o) => o.identifier.includes('12004'));
      expect(shatabdi).toBeDefined();
    });

    it('returns Mumbai trains when destination is Mumbai (BOM / MMCT / CSMT)', async () => {
      const offers = await irctc.search({
        origin: 'New Delhi (DEL)',
        destination: 'Mumbai (BOM)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(['BOM', 'MMCT', 'CSMT', 'BDTS']).toContain(offer.destination.hubCode);
        expect(offer.destination.city.toLowerCase()).toContain('mumbai');
      }
      const rajdhani = offers.find((o) => o.identifier.includes('12952'));
      expect(rajdhani).toBeDefined();
    });

    it('returns reverse Mumbai -> Delhi trains (12951)', async () => {
      const offers = await irctc.search({
        origin: 'Mumbai (BOM)',
        destination: 'New Delhi (DEL)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(['DEL', 'NDLS', 'NZM']).toContain(offer.destination.hubCode);
      }
      const rajdhani = offers.find((o) => o.identifier.includes('12951'));
      expect(rajdhani).toBeDefined();
    });

    it('returns empty array for unsupported corridor without leaking Jaipur data', async () => {
      const offers = await irctc.search({
        origin: 'New Delhi (DEL)',
        destination: 'Leh Ladakh (IXL)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers).toEqual([]);
    });
  });

  describe('RedBus Adapter', () => {
    it('returns Jaipur buses when destination is Jaipur', async () => {
      const offers = await redbus.search({
        origin: 'Delhi',
        destination: 'Jaipur',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.city.toLowerCase()).toBe('jaipur');
      }
    });

    it('returns Varanasi buses when destination is Varanasi', async () => {
      const offers = await redbus.search({
        origin: 'Delhi',
        destination: 'Varanasi',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.city.toLowerCase()).toBe('varanasi');
        expect(offer.destination.hubName.toLowerCase()).toContain('varanasi');
      }
    });

    it('returns Kanpur buses when destination is Kanpur', async () => {
      const offers = await redbus.search({
        origin: 'Delhi',
        destination: 'Kanpur',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.city.toLowerCase()).toBe('kanpur');
      }
      const janrath = offers.find((o) => o.identifier.includes('Janrath'));
      expect(janrath).toBeDefined();
    });

    it('returns empty array for unsupported corridor without leaking Jaipur data', async () => {
      const offers = await redbus.search({
        origin: 'Delhi',
        destination: 'Leh',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers).toEqual([]);
    });
  });

  describe('IndiGo and Air India Flight Adapters', () => {
    it('IndiGo returns VNS destination flights for Varanasi query', async () => {
      const offers = await indigo.search({
        origin: 'New Delhi (DEL)',
        destination: 'Varanasi (VNS)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.hubCode).toBe('VNS');
        expect(offer.destination.hubName.toLowerCase()).toContain('lal bahadur shastri');
      }
    });

    it('IndiGo returns KNU destination flights for Kanpur query', async () => {
      const offers = await indigo.search({
        origin: 'New Delhi (DEL)',
        destination: 'Kanpur (KNU)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.hubCode).toBe('KNU');
        expect(offer.destination.hubName.toLowerCase()).toContain('chakeri');
      }
    });

    it('IndiGo returns empty array for unsupported routes', async () => {
      const offers = await indigo.search({
        origin: 'New Delhi (DEL)',
        destination: 'Leh (IXL)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers).toEqual([]);
    });

    it('Air India returns VNS destination flights for Varanasi query', async () => {
      const offers = await airIndia.search({
        origin: 'New Delhi (DEL)',
        destination: 'Varanasi (VNS)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect(offer.destination.hubCode).toBe('VNS');
      }
    });

    it('Air India returns empty array for unsupported routes', async () => {
      const offers = await airIndia.search({
        origin: 'New Delhi (DEL)',
        destination: 'Leh (IXL)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(offers).toEqual([]);
    });
  });

  describe('Transport Search Orchestrator Corridor Integrity', () => {
    it('returns strictly Varanasi offers across all providers for Varanasi search', async () => {
      const result = await orchestrator.search({
        origin: 'New Delhi (DEL)',
        destination: 'Varanasi (VNS)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(result.offers.length).toBeGreaterThan(0);
      for (const offer of result.offers) {
        // Must NOT match Jaipur
        expect(offer.destination.hubCode).not.toBe('JP');
        expect(offer.destination.hubCode).not.toBe('JAI');
        expect(offer.destination.hubName.toLowerCase()).not.toContain('jaipur');

        // Must match Varanasi
        const isVaranasi =
          offer.destination.hubCode === 'VNS' ||
          offer.destination.hubCode === 'BSB' ||
          offer.destination.hubName.toLowerCase().includes('varanasi') ||
          offer.destination.city.toLowerCase().includes('varanasi');
        expect(isVaranasi).toBe(true);
      }
    });

    it('returns strictly Kanpur offers across all providers for Kanpur search', async () => {
      const result = await orchestrator.search({
        origin: 'New Delhi (DEL)',
        destination: 'Kanpur (CNB)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(result.offers.length).toBeGreaterThan(0);
      for (const offer of result.offers) {
        // Must NOT match Jaipur or Varanasi
        expect(offer.destination.hubCode).not.toBe('JP');
        expect(offer.destination.hubCode).not.toBe('JAI');
        expect(offer.destination.hubCode).not.toBe('BSB');
        expect(offer.destination.hubCode).not.toBe('VNS');

        // Must match Kanpur
        const isKanpur =
          offer.destination.hubCode === 'CNB' ||
          offer.destination.hubCode === 'KNU' ||
          offer.destination.city.toLowerCase().includes('kanpur') ||
          offer.destination.hubName.toLowerCase().includes('kanpur') ||
          offer.destination.hubName.toLowerCase().includes('jhakarkati') ||
          offer.destination.hubName.toLowerCase().includes('fazalganj');
        expect(isKanpur).toBe(true);
      }
    });

    it('returns strictly Mumbai offers across modes for Delhi -> Mumbai search', async () => {
      const result = await orchestrator.search({
        origin: 'New Delhi (DEL)',
        destination: 'Mumbai (BOM)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(result.offers.length).toBeGreaterThan(0);
      const modes = new Set(result.offers.map((o) => o.mode));
      expect(modes.has('TRAIN')).toBe(true);
      expect(modes.has('FLIGHT')).toBe(true);
      expect(modes.has('BUS')).toBe(true);

      for (const offer of result.offers) {
        // Destination must be Mumbai
        const isMumbai =
          ['BOM', 'MMCT', 'CSMT', 'BDTS'].includes(offer.destination.hubCode) ||
          offer.destination.city.toLowerCase().includes('mumbai') ||
          offer.destination.hubName.toLowerCase().includes('mumbai');
        expect(isMumbai).toBe(true);
      }
    });

    it('returns strictly Bengaluru offers for Delhi -> Bengaluru search', async () => {
      const result = await orchestrator.search({
        origin: 'New Delhi (DEL)',
        destination: 'Bengaluru (BLR)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(result.offers.length).toBeGreaterThan(0);
      for (const offer of result.offers) {
        const isBLR =
          ['BLR', 'SBC', 'YPR'].includes(offer.destination.hubCode) ||
          offer.destination.city.toLowerCase().includes('bengaluru') ||
          offer.destination.city.toLowerCase().includes('bangalore');
        expect(isBLR).toBe(true);
      }
    });

    it('returns 0 offers and no leaks when searching unsupported corridor', async () => {
      const result = await orchestrator.search({
        origin: 'New Delhi (DEL)',
        destination: 'Leh Ladakh (IXL)',
        departureDate: '2026-11-20',
        travelers: 1,
      });

      expect(result.offers).toHaveLength(0);
    });
  });

  describe('Curated Places and Accommodation Providers', () => {
    const placesProvider = new CuratedPlacesProvider();
    const stayProvider = new CuratedAccommodationProvider();

    it('returns Varanasi places for Varanasi destination without Jaipur fallback', async () => {
      const places = await placesProvider.getPlaces('Varanasi');
      expect(places.length).toBeGreaterThan(0);
      for (const p of places) {
        expect(p.destination.toLowerCase()).toBe('varanasi');
        expect(p.title.toLowerCase()).not.toContain('amber');
        expect(p.title.toLowerCase()).not.toContain('hawa mahal');
      }
    });

    it('returns Kanpur places for Kanpur destination', async () => {
      const places = await placesProvider.getPlaces('Kanpur');
      expect(places.length).toBeGreaterThan(0);
      for (const p of places) {
        expect(p.destination.toLowerCase()).toBe('kanpur');
      }
      const bithoor = places.find((p) => p.title.includes('Bithoor'));
      expect(bithoor).toBeDefined();
    });

    it('returns Mumbai places for Mumbai destination', async () => {
      const places = await placesProvider.getPlaces('Mumbai');
      expect(places.length).toBeGreaterThan(0);
      for (const p of places) {
        expect(p.destination.toLowerCase()).toBe('mumbai');
      }
      const gateway = places.find((p) => p.title.includes('Gateway of India'));
      expect(gateway).toBeDefined();
    });

    it('returns Bengaluru places for Bengaluru destination', async () => {
      const places = await placesProvider.getPlaces('Bengaluru');
      expect(places.length).toBeGreaterThan(0);
      for (const p of places) {
        expect(p.destination.toLowerCase()).toBe('bengaluru');
      }
    });

    it('returns empty places list for unlisted destination without falling back to Jaipur', async () => {
      const places = await placesProvider.getPlaces('Leh');
      expect(places).toHaveLength(0);
    });

    it('returns Varanasi stays for Varanasi destination', async () => {
      const stays = await stayProvider.search({
        destination: 'Varanasi',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-22',
        guests: 2,
      });

      expect(stays.length).toBeGreaterThan(0);
      for (const s of stays) {
        expect(s.address ? s.address.toLowerCase() : '').toContain('varanasi');
        expect(s.neighborhood.toLowerCase()).not.toContain('pink city');
      }
    });

    it('returns Kanpur stays for Kanpur destination', async () => {
      const stays = await stayProvider.search({
        destination: 'Kanpur',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-22',
        guests: 2,
      });

      expect(stays.length).toBeGreaterThan(0);
      for (const s of stays) {
        expect(s.address ? s.address.toLowerCase() : '').toContain('kanpur');
      }
      const landmark = stays.find((s) => s.name.includes('Landmark'));
      expect(landmark).toBeDefined();
    });

    it('returns Mumbai stays for Mumbai destination (BOM)', async () => {
      const stays = await stayProvider.search({
        destination: 'Mumbai (BOM)',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-22',
        guests: 2,
      });

      expect(stays.length).toBeGreaterThan(0);
      for (const s of stays) {
        expect(s.address ? s.address.toLowerCase() : '').toContain('mumbai');
      }
      const taj = stays.find((s) => s.name.includes('Taj Mahal Palace'));
      expect(taj).toBeDefined();
    });

    it('returns empty stay list for unlisted destination without falling back to Jaipur', async () => {
      const stays = await stayProvider.search({
        destination: 'Leh',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-22',
        guests: 2,
      });

      expect(stays).toHaveLength(0);
    });
  });
});
