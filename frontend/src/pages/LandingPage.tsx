import React, { useState, useEffect } from 'react';
import {
  Compass,
  ArrowRight,
  Plane,
  Train,
  Bus,
  Calendar,
  Users,
  IndianRupee,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingDown,
} from 'lucide-react';
import type { TravelSearchQuery, TravelMode } from '@safar-saarthi/shared';
import { resolveLocation } from '@safar-saarthi/shared';
import { POPULAR_ROUTES } from '../services/fixtures';
import { CityAutocomplete } from '../components/common/CityAutocomplete';

interface LandingPageProps {
  initialQuery?: TravelSearchQuery;
  onSearch: (query: TravelSearchQuery) => void;
  onSelectRouteQuick: (origin: string, destination: string) => void;
  onExploreItinerary: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  initialQuery,
  onSearch,
  onSelectRouteQuick,
  onExploreItinerary,
}) => {
  // Search Form State initialized with initialQuery if provided
  const [origin, setOrigin] = useState(initialQuery?.origin || 'New Delhi (DEL)');
  const [destination, setDestination] = useState(initialQuery?.destination || 'Jaipur (JAI)');
  const [departureDate, setDepartureDate] = useState(() => {
    if (initialQuery?.departureDate) return initialQuery.departureDate;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    return tomorrow.toISOString().split('T')[0];
  });
  const [returnDate, setReturnDate] = useState(initialQuery?.returnDate || '');
  const [travelers, setTravelers] = useState(initialQuery?.travelers || 2);
  const [budget, setBudget] = useState(
    initialQuery?.budgetInInr ? String(initialQuery.budgetInInr) : '15000'
  );
  const [selectedModes, setSelectedModes] = useState<TravelMode[]>(
    initialQuery?.preferredModes && initialQuery.preferredModes.length > 0
      ? initialQuery.preferredModes
      : ['FLIGHT', 'TRAIN', 'BUS']
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize state when initialQuery changes (e.g. from Modify Search or navigation)
  useEffect(() => {
    if (initialQuery) {
      if (initialQuery.origin) setOrigin(initialQuery.origin);
      if (initialQuery.destination) setDestination(initialQuery.destination);
      if (initialQuery.departureDate) setDepartureDate(initialQuery.departureDate);
      if (initialQuery.returnDate !== undefined) setReturnDate(initialQuery.returnDate);
      if (initialQuery.travelers) setTravelers(initialQuery.travelers);
      if (initialQuery.budgetInInr) setBudget(String(initialQuery.budgetInInr));
      if (initialQuery.preferredModes && initialQuery.preferredModes.length > 0) {
        setSelectedModes(initialQuery.preferredModes);
      }
    }
  }, [initialQuery]);

  const toggleMode = (mode: TravelMode) => {
    if (selectedModes.includes(mode)) {
      if (selectedModes.length === 1) return; // keep at least 1
      setSelectedModes(selectedModes.filter((m) => m !== mode));
    } else {
      setSelectedModes([...selectedModes, mode]);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setErrorMsg(null);

    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();

    if (!trimmedOrigin || !trimmedDestination) {
      setErrorMsg('Please specify both origin and destination.');
      return;
    }

    // Resolve cities to verify they aren't identical
    const originResolved = resolveLocation(trimmedOrigin);
    const destResolved = resolveLocation(trimmedDestination);

    if (
      trimmedOrigin.toLowerCase() === trimmedDestination.toLowerCase() ||
      (originResolved && destResolved && originResolved.id === destResolved.id)
    ) {
      setErrorMsg('Origin and destination cannot be identical.');
      return;
    }

    if (!departureDate) {
      setErrorMsg('Please select a valid departure date.');
      return;
    }

    if (returnDate && new Date(returnDate) < new Date(departureDate)) {
      setErrorMsg('Return date cannot be earlier than departure date.');
      return;
    }

    const budgetNum = budget ? parseInt(budget, 10) : undefined;
    if (budgetNum && budgetNum <= 0) {
      setErrorMsg('Budget must be greater than zero.');
      return;
    }

    // Format destination cleanly if user typed just the city name
    const finalOrigin =
      originResolved && !trimmedOrigin.includes('(')
        ? `${originResolved.name} (${originResolved.airport.code})`
        : trimmedOrigin;
    const finalDest =
      destResolved && !trimmedDestination.includes('(')
        ? `${destResolved.name} (${destResolved.airport.code})`
        : trimmedDestination;

    onSearch({
      origin: finalOrigin,
      destination: finalDest,
      departureDate,
      returnDate: returnDate || undefined,
      travelers,
      budgetInInr: budgetNum,
      preferredModes: selectedModes,
    });
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section - Clean Navy Header with Restrained Design */}
      <section className="bg-[#142B3B] text-white pt-14 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#263E4E]">
        <div className="max-w-5xl mx-auto text-center space-y-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B3242] border border-[#263E4E] text-[#84C0B6] text-xs font-semibold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-[#84C0B6]" />
            <span>AI Multi-Agent Transportation &amp; Itinerary System</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Your Journey, Smarter with <span className="text-[#84C0B6]">Safar Saarthi.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#BDCDDB] leading-relaxed font-normal">
            Compare Indian Railways (IRCTC), domestic airlines, and intercity buses in real-time. Uncover the cheapest, fastest, and best-value routes with autonomous multi-agent recommendations.
          </p>

          {/* Search Box Card - Elevated Crisp Card */}
          <div className="mt-8 bg-white text-[#202B33] rounded-2xl p-6 sm:p-7 shadow-lg border border-[#E3E7E5] max-w-4xl mx-auto text-left">
            <form onSubmit={handleSearchSubmit} className="space-y-5">
              {errorMsg && (
                <div
                  data-testid="search-validation-error"
                  className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#9E2A2B] text-xs font-semibold flex items-center gap-2"
                >
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Row 1: Origin & Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CityAutocomplete
                  id="search-origin"
                  label="Origin Hub / City"
                  iconColor="text-[#24766F]"
                  value={origin}
                  onChange={(val) => setOrigin(val)}
                  placeholder="e.g. New Delhi (DEL), Mumbai (BOM)"
                  testId="search-origin"
                  required
                />

                <CityAutocomplete
                  id="search-destination"
                  label="Destination"
                  iconColor="text-[#D7A45B]"
                  value={destination}
                  onChange={(val) => setDestination(val)}
                  placeholder="e.g. Jaipur (JAI), Kanpur (CNB), Varanasi"
                  testId="search-destination"
                  required
                />
              </div>

              {/* Row 2: Dates, Travelers & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#142B3B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#586875]" /> Departure Date
                  </label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] text-[#202B33] text-xs font-medium focus:outline-none focus:border-[#24766F] bg-[#F7F5F0]/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B3B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#586875]" /> Return (Optional)
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] text-[#202B33] text-xs font-medium focus:outline-none focus:border-[#24766F] bg-[#F7F5F0]/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B3B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#586875]" /> Travelers
                  </label>
                  <div className="flex items-center border border-[#E3E7E5] rounded-xl overflow-hidden bg-[#F7F5F0]/60">
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      className="px-3 py-2 text-[#586875] hover:bg-[#E3E7E5] text-xs font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-xs text-[#202B33]">
                      {travelers} {travelers === 1 ? 'Person' : 'People'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.min(9, travelers + 1))}
                      className="px-3 py-2 text-[#586875] hover:bg-[#E3E7E5] text-xs font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B3B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-[#24766F]" /> Est. Budget (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-[#586875] text-xs font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1000"
                      min="500"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="15000"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#E3E7E5] text-[#202B33] text-xs font-medium focus:outline-none focus:border-[#24766F] bg-[#F7F5F0]/60"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Preferred Modes & Submit */}
              <div className="pt-2 border-t border-[#E3E7E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-[#586875] uppercase tracking-wider block">
                    Included Modes:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMode('FLIGHT')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedModes.includes('FLIGHT')
                          ? 'bg-[#F2F5F8] text-[#142B3B] border border-[#BDCDDB]'
                          : 'bg-[#F7F5F0] text-[#586875] border border-[#E3E7E5] opacity-60'
                      }`}
                    >
                      <Plane className="w-3.5 h-3.5 text-[#355366]" /> Flights
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMode('TRAIN')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedModes.includes('TRAIN')
                          ? 'bg-[#FAF5EA] text-[#7A541A] border border-[#EBD5A4]'
                          : 'bg-[#F7F5F0] text-[#586875] border border-[#E3E7E5] opacity-60'
                      }`}
                    >
                      <Train className="w-3.5 h-3.5 text-[#D7A45B]" /> Trains (IRCTC)
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMode('BUS')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedModes.includes('BUS')
                          ? 'bg-[#F0F8F7] text-[#174C47] border border-[#B4DAD4]'
                          : 'bg-[#F7F5F0] text-[#586875] border border-[#E3E7E5] opacity-60'
                      }`}
                    >
                      <Bus className="w-3.5 h-3.5 text-[#24766F]" /> Buses
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  onClick={handleSearchSubmit}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#24766F] hover:bg-[#1D605A] active:bg-[#174C47] text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Find My Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Popular Corridors Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-7 gap-3">
          <div>
            <span className="text-[#24766F] text-xs font-bold uppercase tracking-wider block mb-1">
              Top Indian Corridors
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#142B3B] tracking-tight">
              Popular Routes with Full Multi-Modal Comparison
            </h2>
          </div>
          <p className="text-xs text-[#586875] max-w-md">
            Click any corridor to instantly compare train schedules, flight tariffs, and electric sleeper buses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {POPULAR_ROUTES.map((route, idx) => (
            <div
              key={idx}
              onClick={() => onSelectRouteQuick(route.origin, route.destination)}
              className="group bg-white rounded-2xl border border-[#E3E7E5] overflow-hidden shadow-sm hover:border-[#24766F] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="relative h-44 overflow-hidden bg-slate-100">
                <img
                  src={route.image}
                  alt={route.destination}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#142B3B]/90 text-[#84C0B6] border border-[#263E4E]">
                    {route.tag}
                  </span>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#142B3B]/90 to-transparent p-3 pt-6">
                  <span className="text-xs font-bold text-white block">
                    {route.origin} → {route.destination}
                  </span>
                  <span className="text-[11px] text-[#84C0B6] font-medium">{route.distanceKm} km</span>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <p className="text-xs text-[#586875] line-clamp-2 leading-relaxed">
                  {route.description}
                </p>

                <div className="pt-2 border-t border-[#E3E7E5] flex items-center justify-between text-[11px] text-[#586875]">
                  <span className="flex items-center gap-1 font-medium">
                    <Train className="w-3.5 h-3.5 text-[#D7A45B]" /> {route.typicalTrainHours}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Plane className="w-3.5 h-3.5 text-[#355366]" /> {route.typicalFlightHours}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Bus className="w-3.5 h-3.5 text-[#24766F]" /> {route.typicalBusHours}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-Agent Architecture & Value Proposition */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#142B3B] text-white rounded-2xl p-7 sm:p-10 border border-[#263E4E]">
          <div className="max-w-3xl mb-8">
            <span className="text-[#84C0B6] text-xs font-bold uppercase tracking-wider block mb-2">
              Autonomous Intelligence
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Why Safar Saarthi Outperforms Conventional Portals
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#BDCDDB] leading-relaxed">
              Standard booking portals silo flights from trains and buses. Safar Saarthi operates a 5-agent coordinator network that computes end-to-end door-to-door costs, prevents budget overruns, and personalizes your journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#1B3242] p-5 rounded-xl border border-[#263E4E] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#24766F]/20 text-[#84C0B6] flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Full-Cost Accounting</h3>
              <p className="text-xs text-[#93ADBE] leading-relaxed">
                We calculate airport transfers, railhead autos, luggage surcharges, and highway tolls so you compare true total out-of-pocket costs.
              </p>
            </div>

            <div className="bg-[#1B3242] p-5 rounded-xl border border-[#263E4E] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#D7A45B]/20 text-[#D7A45B] flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Cheapest vs Fastest vs Best-Value</h3>
              <p className="text-xs text-[#93ADBE] leading-relaxed">
                Deterministic sorting highlights whether saving 2 hours on an economy flight is worth 4x the cost of a modern Vande Bharat Express chair car.
              </p>
            </div>

            <div className="bg-[#1B3242] p-5 rounded-xl border border-[#263E4E] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#84C0B6]/20 text-[#84C0B6] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">AI Day-Wise Itineraries</h3>
              <p className="text-xs text-[#93ADBE] leading-relaxed">
                Get hour-by-hour plans attuned to Indian cultural timings, seasonal weather, insider hacks, and neighborhood homestays.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#263E4E] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#93ADBE]">
              <ShieldCheck className="w-4 h-4 text-[#84C0B6]" />
              <span>Attribution guaranteed: Official IRCTC, Airline, &amp; State Bus direct deep-links</span>
            </div>
            <button
              type="button"
              onClick={onExploreItinerary}
              className="text-xs font-bold text-[#84C0B6] hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Explore Sample Jaipur AI Itinerary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
