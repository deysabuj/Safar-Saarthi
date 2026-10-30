import { useState, useEffect, useRef } from 'react';
import type {
  TravelSearchQuery,
  TransportOption,
  ItineraryPlan,
  SavedTrip,
  TravelMode,
} from '@safar-saarthi/shared';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, NavTab } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { TransportComparisonPage } from './pages/TransportComparisonPage';
import { AiItineraryPage } from './pages/AiItineraryPage';
import { SavedTripsPage } from './pages/SavedTripsPage';
import { TravelApiService } from './services/api';
import { MOCK_ITINERARY_PLAN } from './services/fixtures';

function parseUrlQuery(): TravelSearchQuery {
  const defaultDeparture = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  if (typeof window === 'undefined') {
    return {
      origin: 'New Delhi (DEL)',
      destination: 'Jaipur (JAI)',
      departureDate: defaultDeparture,
      travelers: 2,
      budgetInInr: 15000,
      preferredModes: ['FLIGHT', 'TRAIN', 'BUS'],
    };
  }

  const params = new URLSearchParams(window.location.search);
  const origin = params.get('origin') || 'New Delhi (DEL)';
  const destination = params.get('destination') || 'Jaipur (JAI)';
  const departureDate = params.get('date') || defaultDeparture;
  const returnDate = params.get('returnDate') || undefined;
  const travelers = params.get('travelers') ? parseInt(params.get('travelers')!, 10) : 2;
  const budget = params.get('budget') ? parseInt(params.get('budget')!, 10) : 15000;
  const modesParam = params.get('modes');
  const preferredModes: TravelMode[] = modesParam
    ? (modesParam.split(',') as TravelMode[])
    : ['FLIGHT', 'TRAIN', 'BUS'];

  return {
    origin,
    destination,
    departureDate,
    returnDate,
    travelers,
    budgetInInr: budget,
    preferredModes,
  };
}

function updateUrlQuery(query: TravelSearchQuery) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  params.set('origin', query.origin);
  params.set('destination', query.destination);
  params.set('date', query.departureDate);
  if (query.returnDate) params.set('returnDate', query.returnDate);
  params.set('travelers', String(query.travelers));
  if (query.budgetInInr) params.set('budget', String(query.budgetInInr));
  if (query.preferredModes && query.preferredModes.length > 0) {
    params.set('modes', query.preferredModes.join(','));
  }

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({ query }, '', newUrl);
}

function MainAppContent() {
  const [currentTab, setCurrentTab] = useState<NavTab>('LANDING');
  const { token } = useAuth();

  // Search State with URL query sync
  const [searchQuery, setSearchQuery] = useState<TravelSearchQuery>(() => parseUrlQuery());

  // Search request cancellation / race condition prevention
  const searchRequestIdRef = useRef(0);

  // Transport results
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const [isLoadingTransport, setIsLoadingTransport] = useState<boolean>(false);

  // Active Trip ID from backend
  const [activeTripId, setActiveTripId] = useState<string | undefined>(undefined);

  // Active AI Itinerary
  const [activeItinerary, setActiveItinerary] = useState<ItineraryPlan>(MOCK_ITINERARY_PLAN);

  // Saved Trips
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  // Load saved trips on mount and when auth token changes
  useEffect(() => {
    let isMounted = true;
    TravelApiService.getSavedTrips(token).then((trips) => {
      if (isMounted) {
        setSavedTrips(trips);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Initial fetch on mount & check if URL specifies corridor
  useEffect(() => {
    const initialQuery = parseUrlQuery();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('origin') || params.has('destination')) {
        setCurrentTab('COMPARISON');
      }
    }
    executeSearch(initialQuery, false);

    const handlePopState = () => {
      const q = parseUrlQuery();
      setSearchQuery(q);
      executeSearch(q, false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const executeSearch = async (query: TravelSearchQuery, syncUrl: boolean = true) => {
    const currentRequestId = ++searchRequestIdRef.current;
    setSearchQuery(query);
    if (syncUrl) {
      updateUrlQuery(query);
    }
    setIsLoadingTransport(true);
    setTransportOptions([]);

    try {
      const result = await TravelApiService.searchTransport(query, token);
      if (currentRequestId === searchRequestIdRef.current) {
        setTransportOptions(result.options);
        if (result.tripId) {
          setActiveTripId(result.tripId);
        }
      }
    } catch (err) {
      if (currentRequestId === searchRequestIdRef.current) {
        console.error('Failed to search transport', err);
      }
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setIsLoadingTransport(false);
      }
    }
  };

  const handleLandingSearch = (query: TravelSearchQuery) => {
    executeSearch(query, true);
    setCurrentTab('COMPARISON');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickRouteSelect = (origin: string, destination: string) => {
    const updatedQuery: TravelSearchQuery = {
      ...searchQuery,
      origin,
      destination,
    };
    executeSearch(updatedQuery, true);
    setCurrentTab('COMPARISON');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateItineraryForOption = async (option: TransportOption) => {
    const itinerary = await TravelApiService.getItinerary({
      tripId: activeTripId,
      origin: searchQuery.origin,
      destination: searchQuery.destination,
      travelers: searchQuery.travelers,
      selectedTransportId: option.id,
    });
    // Link the selected transport into the itinerary plan
    itinerary.selectedTransport = option;
    setActiveItinerary(itinerary);
    setCurrentTab('ITINERARY');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveTrip = async (trip: SavedTrip) => {
    const updated = await TravelApiService.saveTrip(trip, token);
    setSavedTrips(updated);
  };

  const handleDeleteTrip = async (tripId: string) => {
    const updated = await TravelApiService.deleteTrip(tripId, token);
    setSavedTrips(updated);
  };

  const handleDuplicateTrip = async (tripId: string) => {
    const updated = await TravelApiService.duplicateTrip(tripId, token);
    setSavedTrips(updated);
  };

  const handleOpenSavedTrip = (trip: SavedTrip) => {
    if (trip.itineraryPlan) {
      setActiveItinerary(trip.itineraryPlan);
      setCurrentTab('ITINERARY');
    } else {
      // Trigger search for this corridor
      const query: TravelSearchQuery = {
        origin: trip.origin,
        destination: trip.destination,
        departureDate: trip.departureDate,
        travelers: trip.travelers,
        budgetInInr: trip.estimatedTotalInr,
      };
      executeSearch(query);
      setCurrentTab('COMPARISON');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isCurrentItinerarySaved = savedTrips.some(
    (t) => t.title === activeItinerary.title && t.destination === activeItinerary.destination
  );

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col justify-between font-sans antialiased text-[#202B33]">
      {/* Top Navy Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        savedTripsCount={savedTrips.length}
      />

      {/* Main Page Content */}
      <main className="flex-1">
        {currentTab === 'LANDING' && (
          <LandingPage
            initialQuery={searchQuery}
            onSearch={handleLandingSearch}
            onSelectRouteQuick={handleQuickRouteSelect}
            onExploreItinerary={() => {
              setCurrentTab('ITINERARY');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'COMPARISON' && (
          <TransportComparisonPage
            searchQuery={searchQuery}
            options={transportOptions}
            isLoading={isLoadingTransport}
            onModifySearch={() => {
              setCurrentTab('LANDING');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGenerateItineraryForOption={handleGenerateItineraryForOption}
          />
        )}

        {currentTab === 'ITINERARY' && (
          <AiItineraryPage
            itinerary={activeItinerary}
            onSaveTrip={handleSaveTrip}
            isTripSaved={isCurrentItinerarySaved}
          />
        )}

        {currentTab === 'SAVED_TRIPS' && (
          <SavedTripsPage
            savedTrips={savedTrips}
            onOpenTrip={handleOpenSavedTrip}
            onDuplicateTrip={handleDuplicateTrip}
            onDeleteTrip={handleDeleteTrip}
            onStartNewSearch={() => {
              setCurrentTab('LANDING');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
