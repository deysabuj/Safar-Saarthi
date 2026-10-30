import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plane,
  Train,
  Bus,
  ArrowRight,
  Filter,
  Sparkles,
  Zap,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  ExternalLink,
  Info,
  Calendar,
  Users,
  KeyRound,
  Compass,
} from 'lucide-react';
import type {
  TransportOption,
  TravelSearchQuery,
  TravelMode,
  TransportCategory,
} from '@safar-saarthi/shared';
import { ModeBadge, CategoryBadge, DataSourceBadge, DataQualityBadge } from '../components/common/Badge';
import { CardSkeleton } from '../components/common/Skeleton';
import { BookingRedirectModal } from '../components/common/BookingRedirectModal';
import { DEMO_NOTICE } from '../services/fixtures';
import { TravelApiService } from '../services/api';

interface TransportComparisonPageProps {
  searchQuery: TravelSearchQuery;
  options: TransportOption[];
  isLoading: boolean;
  onModifySearch: () => void;
  onGenerateItineraryForOption: (option: TransportOption) => void;
}

function generateRouteAdvice(
  origin: string,
  destination: string,
  visibleOptions: TransportOption[],
  allRouteOptions: TransportOption[]
): string {
  const originClean = origin.split('(')[0].trim();
  const destClean = destination.split('(')[0].trim();

  if (allRouteOptions.length === 0) {
    return `No verified transit offers are active for ${originClean} to ${destClean}. Connect live provider API credentials (Amadeus, IRCTC, RedBus) in your environment to query live availability across any Indian route.`;
  }

  if (visibleOptions.length === 0) {
    return `All ${allRouteOptions.length} verified transit options for ${originClean} to ${destClean} are currently hidden by your active filters. Click "Reset Filters" to view recommended flights and trains.`;
  }

  const cheapest = visibleOptions.find((o) => o.category === 'CHEAPEST');
  const fastest = visibleOptions.find((o) => o.category === 'FASTEST');
  const bestValue = visibleOptions.find((o) => o.category === 'BEST_VALUE');
  const train = visibleOptions.find((o) => o.mode === 'TRAIN');
  const flight = visibleOptions.find((o) => o.mode === 'FLIGHT');

  let recommendation = '';

  // Dynamically analyze transit trade-offs between available visible modes
  if (flight && train && flight.id !== train.id) {
    const timeSavedHrs = Math.max(1, Math.round((train.durationMinutes - flight.durationMinutes) / 60));
    const costDiff = flight.totalCostInr - train.totalCostInr;

    // High time savings (>4 hours) justify flight over rail for long distances
    if (timeSavedHrs >= 4 && costDiff > 0) {
      recommendation = `For ${originClean} to ${destClean}, ${flight.operator} (${flight.identifier}) saves approximately ${timeSavedHrs} hours over rail transit, while ${train.operator} (${train.identifier}) provides the most economical city-center connection at ₹${train.totalCostInr.toLocaleString('en-IN')}.`;
    } else if (train.durationMinutes <= 360) {
      // Short/medium distance where high-speed rail avoids airport transfer overhead
      recommendation = `For ${originClean} to ${destClean}, high-speed rail via ${train.identifier} arrives directly downtown in ${Math.round(train.durationMinutes / 60)}h ${train.durationMinutes % 60}m, avoiding airport check-in and transfer overhead.`;
    }
  }

  if (!recommendation && cheapest && fastest && cheapest.id !== fastest.id) {
    const timeSavedMins = cheapest.durationMinutes - fastest.durationMinutes;
    const timeSavedStr = timeSavedMins >= 60 ? `${Math.round(timeSavedMins / 60)} hours` : `${timeSavedMins} minutes`;
    recommendation = `For ${originClean} to ${destClean}, ${fastest.operator} (${fastest.identifier}) delivers the fastest door-to-door transit (${Math.round(fastest.durationMinutes / 60)}h), saving ${timeSavedStr} over ${cheapest.operator} at ₹${cheapest.totalCostInr.toLocaleString('en-IN')}.`;
  }

  if (!recommendation && bestValue) {
    recommendation = `For ${originClean} to ${destClean}, ${bestValue.operator} (${bestValue.identifier}) is recommended as the optimal balance of travel time (${Math.round(bestValue.durationMinutes / 60)}h) and fare (₹${bestValue.totalCostInr.toLocaleString('en-IN')}).`;
  }

  if (!recommendation && visibleOptions.length > 0) {
    const top = visibleOptions[0];
    recommendation = `For ${originClean} to ${destClean}, ${top.operator} (${top.identifier}) is available at ₹${top.totalCostInr.toLocaleString('en-IN')} taking ${Math.floor(top.durationMinutes / 60)}h ${top.durationMinutes % 60}m.`;
  }

  if (!recommendation) {
    recommendation = `Comparing verified options from ${originClean} to ${destClean}. Filter by mode or sort by best value to view optimal connections.`;
  }

  if (visibleOptions.length < allRouteOptions.length) {
    const hiddenCount = allRouteOptions.length - visibleOptions.length;
    recommendation += ` (${hiddenCount} other option${hiddenCount > 1 ? 's' : ''} currently hidden by active filters)`;
  }

  return recommendation;
}

export const TransportComparisonPage: React.FC<TransportComparisonPageProps> = ({
  searchQuery,
  options,
  isLoading,
  onModifySearch,
  onGenerateItineraryForOption,
}) => {
  // Active Tab: ALL | FLIGHT | TRAIN | BUS
  const [activeTab, setActiveTab] = useState<TravelMode | 'ALL'>('ALL');

  // Sorting: BEST_VALUE | CHEAPEST | FASTEST
  const [sortBy, setSortBy] = useState<TransportCategory>('BEST_VALUE');

  // Filter state
  const [customMaxPrice, setCustomMaxPrice] = useState<number | null>(null);
  const [customMaxDuration, setCustomMaxDuration] = useState<number | null>(null);
  const [userModifiedFare, setUserModifiedFare] = useState<boolean>(false);
  const [userModifiedDuration, setUserModifiedDuration] = useState<boolean>(false);
  const [timeOfDay, setTimeOfDay] = useState<'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'>('ALL');
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

  // Selected Option for Redirection Modal
  const [selectedForBooking, setSelectedForBooking] = useState<TransportOption | null>(null);

  // Strict route-aware filtering: never display options from an unrelated destination
  const routeAwareOptions = useMemo(() => {
    return options.filter((o) =>
      TravelApiService.isOptionMatchingDestination(o, searchQuery.destination)
    );
  }, [options, searchQuery.destination]);

  // Dynamic ceilings derived from actual returned options
  const maxOptionFare = useMemo(() => {
    if (routeAwareOptions.length === 0) return 10000;
    return Math.max(...routeAwareOptions.map((o) => o.totalCostInr));
  }, [routeAwareOptions]);

  const maxOptionDuration = useMemo(() => {
    if (routeAwareOptions.length === 0) return 720;
    return Math.max(...routeAwareOptions.map((o) => o.durationMinutes));
  }, [routeAwareOptions]);

  // Sliders max capacity (accommodates all returned options with safety padding)
  const sliderMaxFare = useMemo(() => {
    return Math.max(25000, Math.ceil((maxOptionFare * 1.25) / 1000) * 1000);
  }, [maxOptionFare]);

  const sliderMaxDuration = useMemo(() => {
    return Math.max(2880, Math.ceil((maxOptionDuration * 1.25) / 360) * 360);
  }, [maxOptionDuration]);

  // Reset filter customizations when the searched route changes
  const prevSearchRef = useRef<string>('');
  const currentSearchKey = `${searchQuery.origin}->${searchQuery.destination}`;
  useEffect(() => {
    if (prevSearchRef.current !== currentSearchKey) {
      prevSearchRef.current = currentSearchKey;
      setUserModifiedFare(false);
      setUserModifiedDuration(false);
      setCustomMaxPrice(null);
      setCustomMaxDuration(null);
      setTimeOfDay('ALL');
      setActiveTab('ALL');
    }
  }, [currentSearchKey]);

  // Effective filter values: use user-chosen value only if user explicitly modified it; otherwise unrestricted sliderMax
  const effectiveMaxPrice = userModifiedFare && customMaxPrice !== null ? customMaxPrice : sliderMaxFare;
  const effectiveMaxDuration = userModifiedDuration && customMaxDuration !== null ? customMaxDuration : sliderMaxDuration;

  // Options matching criteria filters (fare, duration, time of day) before mode tab selection
  const criteriaFilteredOptions = useMemo(() => {
    return TravelApiService.filterOptions(routeAwareOptions, {
      mode: 'ALL',
      maxCost: effectiveMaxPrice,
      maxDurationMinutes: effectiveMaxDuration,
      departureTimeOfDay: timeOfDay,
    });
  }, [routeAwareOptions, effectiveMaxPrice, effectiveMaxDuration, timeOfDay]);

  // Mode counts after criteria filters (accurately reflects what will appear on selecting the tab)
  const filteredModeCounts = useMemo(() => {
    return {
      ALL: criteriaFilteredOptions.length,
      FLIGHT: criteriaFilteredOptions.filter((o) => o.mode === 'FLIGHT').length,
      TRAIN: criteriaFilteredOptions.filter((o) => o.mode === 'TRAIN').length,
      BUS: criteriaFilteredOptions.filter((o) => o.mode === 'BUS').length,
    };
  }, [criteriaFilteredOptions]);

  // Total mode counts from search (unfiltered)
  const totalModeCounts = useMemo(() => {
    return {
      ALL: routeAwareOptions.length,
      FLIGHT: routeAwareOptions.filter((o) => o.mode === 'FLIGHT').length,
      TRAIN: routeAwareOptions.filter((o) => o.mode === 'TRAIN').length,
      BUS: routeAwareOptions.filter((o) => o.mode === 'BUS').length,
    };
  }, [routeAwareOptions]);

  // Apply filtering and sorting
  const processedOptions = useMemo(() => {
    const filtered = TravelApiService.filterOptions(routeAwareOptions, {
      mode: activeTab,
      maxCost: effectiveMaxPrice,
      maxDurationMinutes: effectiveMaxDuration,
      departureTimeOfDay: timeOfDay,
    });

    return TravelApiService.sortOptions(filtered, sortBy);
  }, [routeAwareOptions, activeTab, sortBy, effectiveMaxPrice, effectiveMaxDuration, timeOfDay]);

  // Dynamic route-aware agent recommendation based on visible options
  const agentAdvice = useMemo(() => {
    return generateRouteAdvice(searchQuery.origin, searchQuery.destination, processedOptions, routeAwareOptions);
  }, [searchQuery.origin, searchQuery.destination, processedOptions, routeAwareOptions]);

  // Reset filters to sensible, unrestricted defaults
  const resetFilters = () => {
    setActiveTab('ALL');
    setSortBy('BEST_VALUE');
    setUserModifiedFare(false);
    setUserModifiedDuration(false);
    setCustomMaxPrice(null);
    setCustomMaxDuration(null);
    setTimeOfDay('ALL');
  };

  // Exclusion analytics for empty state
  const fareExcludedCount = useMemo(() => {
    return routeAwareOptions.filter((o) => o.totalCostInr > effectiveMaxPrice).length;
  }, [routeAwareOptions, effectiveMaxPrice]);

  const durationExcludedCount = useMemo(() => {
    return routeAwareOptions.filter((o) => o.durationMinutes > effectiveMaxDuration).length;
  }, [routeAwareOptions, effectiveMaxDuration]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Route & Search Context Bar */}
      <div className="bg-[#142B3B] text-white rounded-2xl p-6 border border-[#263E4E] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#84C0B6] text-xs font-bold uppercase tracking-wider">
            <span>Route Search Comparison</span>
            <span>•</span>
            <span>One-Way Transit</span>
          </div>
          <div className="flex items-center gap-2 text-xl sm:text-2xl font-black">
            <span>{searchQuery.origin}</span>
            <ArrowRight className="w-5 h-5 text-[#84C0B6]" />
            <span>{searchQuery.destination}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#BDCDDB] pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#93ADBE]" /> {searchQuery.departureDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#93ADBE]" /> {searchQuery.travelers}{' '}
              {searchQuery.travelers === 1 ? 'Traveler' : 'Travelers'}
            </span>
            {searchQuery.budgetInInr && (
              <>
                <span>•</span>
                <span className="text-[#84C0B6] font-semibold">
                  Budget: ₹{searchQuery.budgetInInr.toLocaleString('en-IN')}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onModifySearch}
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-[#1B3242] hover:bg-[#263E4E] text-[#84C0B6] text-xs font-bold border border-[#263E4E] transition-colors"
        >
          Modify Search
        </button>
      </div>

      {/* Demo Notice Banner */}
      <div className="bg-[#FAF5EA] border border-[#EBD5A4] rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#7A541A]">
        <Info className="w-4 h-4 text-[#D7A45B] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-[#7A541A]">Transparent Demonstration Notice:</span>
          <p className="text-[11px] text-[#7A541A]/90 leading-relaxed">{DEMO_NOTICE}</p>
        </div>
      </div>

      {/* Mode Tabs & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Mode Switcher Tabs */}
        <div className="flex bg-[#EFECE3] p-1 rounded-xl border border-[#E3E7E5] overflow-x-auto text-xs font-bold text-[#586875]">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-white text-[#142B3B] shadow-sm border border-[#E3E7E5]'
                : 'hover:text-[#142B3B]'
            }`}
          >
            All Modes ({filteredModeCounts.ALL})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TRAIN')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'TRAIN'
                ? 'bg-white text-[#7A541A] shadow-sm border border-[#E3E7E5]'
                : 'hover:text-[#7A541A]'
            }`}
          >
            <Train className="w-3.5 h-3.5 text-[#D7A45B]" /> Trains ({filteredModeCounts.TRAIN})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FLIGHT')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'FLIGHT'
                ? 'bg-white text-[#142B3B] shadow-sm border border-[#E3E7E5]'
                : 'hover:text-[#142B3B]'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-[#355366]" /> Flights ({filteredModeCounts.FLIGHT})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BUS')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'BUS'
                ? 'bg-white text-[#174C47] shadow-sm border border-[#E3E7E5]'
                : 'hover:text-[#174C47]'
            }`}
          >
            <Bus className="w-3.5 h-3.5 text-[#24766F]" /> Buses ({filteredModeCounts.BUS})
          </button>
        </div>

        {/* Sort Pills */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-semibold text-[#586875] hidden md:inline">Sort:</span>
          <button
            type="button"
            onClick={() => setSortBy('BEST_VALUE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
              sortBy === 'BEST_VALUE'
                ? 'bg-[#142B3B] text-[#D7A45B]'
                : 'bg-white border border-[#E3E7E5] text-[#586875] hover:text-[#142B3B] hover:bg-[#F7F5F0]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D7A45B]" />
            <span>Best Value</span>
          </button>
          <button
            type="button"
            onClick={() => setSortBy('CHEAPEST')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
              sortBy === 'CHEAPEST'
                ? 'bg-[#142B3B] text-[#84C0B6]'
                : 'bg-white border border-[#E3E7E5] text-[#586875] hover:text-[#142B3B] hover:bg-[#F7F5F0]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#24766F]" />
            <span>Cheapest</span>
          </button>
          <button
            type="button"
            onClick={() => setSortBy('FASTEST')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
              sortBy === 'FASTEST'
                ? 'bg-[#142B3B] text-white'
                : 'bg-white border border-[#E3E7E5] text-[#586875] hover:text-[#142B3B] hover:bg-[#F7F5F0]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#355366]" />
            <span>Fastest</span>
          </button>

          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="md:hidden p-1.5 rounded-xl bg-white border border-[#E3E7E5] text-[#586875]"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Results List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Filter Sidebar */}
        <aside
          className={`space-y-5 bg-white p-5 rounded-2xl border border-[#E3E7E5] md:block ${
            showFiltersMobile ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E7E5]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#142B3B] flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#24766F]" /> Filter Options
            </h3>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[#24766F] hover:text-[#1D605A] font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Max Fare Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#586875]">
              <span>Max Ticket Fare (per person)</span>
              <span className="text-[#24766F] font-bold">
                {effectiveMaxPrice >= sliderMaxFare
                  ? `₹${effectiveMaxPrice.toLocaleString('en-IN')} (All fares)`
                  : `₹${effectiveMaxPrice.toLocaleString('en-IN')}`}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max={sliderMaxFare}
              step="500"
              value={effectiveMaxPrice}
              onChange={(e) => {
                setUserModifiedFare(true);
                setCustomMaxPrice(parseInt(e.target.value, 10));
              }}
              className="w-full accent-[#24766F] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#586875]">
              <span>₹500</span>
              <span>₹{sliderMaxFare.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Max Duration Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#586875]">
              <span>Max Duration</span>
              <span className="text-[#24766F] font-bold">
                {effectiveMaxDuration >= sliderMaxDuration
                  ? `${Math.floor(effectiveMaxDuration / 60)}h (All durations)`
                  : `${Math.floor(effectiveMaxDuration / 60)}h ${effectiveMaxDuration % 60}m`}
              </span>
            </div>
            <input
              type="range"
              min="60"
              max={sliderMaxDuration}
              step="60"
              value={effectiveMaxDuration}
              onChange={(e) => {
                setUserModifiedDuration(true);
                setCustomMaxDuration(parseInt(e.target.value, 10));
              }}
              className="w-full accent-[#24766F] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#586875]">
              <span>1 hr</span>
              <span>{Math.floor(sliderMaxDuration / 60)} hrs</span>
            </div>
          </div>

          {/* Departure Time Slots */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#142B3B] block">Departure Window</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTimeOfDay(timeOfDay === 'MORNING' ? 'ALL' : 'MORNING')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  timeOfDay === 'MORNING'
                    ? 'border-[#24766F] bg-[#F0F8F7] text-[#174C47] font-bold'
                    : 'border-[#E3E7E5] text-[#586875] hover:bg-[#F7F5F0]'
                }`}
              >
                Morning
                <span className="block text-[10px] text-[#586875] font-normal">06:00 - 12:00</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay(timeOfDay === 'AFTERNOON' ? 'ALL' : 'AFTERNOON')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  timeOfDay === 'AFTERNOON'
                    ? 'border-[#24766F] bg-[#F0F8F7] text-[#174C47] font-bold'
                    : 'border-[#E3E7E5] text-[#586875] hover:bg-[#F7F5F0]'
                }`}
              >
                Afternoon
                <span className="block text-[10px] text-[#586875] font-normal">12:00 - 17:00</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay(timeOfDay === 'EVENING' ? 'ALL' : 'EVENING')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  timeOfDay === 'EVENING'
                    ? 'border-[#24766F] bg-[#F0F8F7] text-[#174C47] font-bold'
                    : 'border-[#E3E7E5] text-[#586875] hover:bg-[#F7F5F0]'
                }`}
              >
                Evening
                <span className="block text-[10px] text-[#586875] font-normal">17:00 - 21:00</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay(timeOfDay === 'NIGHT' ? 'ALL' : 'NIGHT')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  timeOfDay === 'NIGHT'
                    ? 'border-[#24766F] bg-[#F0F8F7] text-[#174C47] font-bold'
                    : 'border-[#E3E7E5] text-[#586875] hover:bg-[#F7F5F0]'
                }`}
              >
                Night
                <span className="block text-[10px] text-[#586875] font-normal">21:00 - 06:00</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Results Column */}
        <main className="md:col-span-3 space-y-4">
          {/* Multi-Agent Advice Box - Always visible across desktop and mobile */}
          <div
            data-testid="agent-advice-box"
            className="bg-[#F7F5F0] rounded-xl p-3.5 border border-[#E3E7E5] text-xs space-y-1.5"
          >
            <div className="flex items-center gap-1.5 text-[#142B3B] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#24766F]" />
              <span>Agent Advice</span>
            </div>
            <p className="text-[#586875] text-[11px] leading-relaxed">
              {agentAdvice}
            </p>
          </div>

          {/* Result Counts Summary & Filter Indicator */}
          {!isLoading && routeAwareOptions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1">
              {filteredModeCounts.ALL < totalModeCounts.ALL || activeTab !== 'ALL' ? (
                <div className="bg-[#FAF5EA] border border-[#EBD5A4] px-3.5 py-2 rounded-xl flex items-center justify-between w-full">
                  <span className="text-[#7A541A]">
                    <strong>{totalModeCounts.ALL} options found</strong> ·{' '}
                    <strong className="text-[#142B3B]">{processedOptions.length}</strong> match your current filters
                    {activeTab !== 'ALL' ? ` (${activeTab.toLowerCase()}s)` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[#24766F] hover:text-[#1D605A] font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Filters
                  </button>
                </div>
              ) : (
                <span className="text-[#586875] font-semibold">
                  Showing all {processedOptions.length} verified transit options
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : processedOptions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-10 border border-[#E3E7E5] space-y-6">
              {routeAwareOptions.length === 0 ? (
                <>
                  <div className="text-center space-y-2 max-w-lg mx-auto">
                    <div className="w-12 h-12 bg-[#F7F5F0] rounded-xl flex items-center justify-center mx-auto text-[#24766F]">
                      <Compass className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-[#142B3B]">
                      No verified transit offers for {searchQuery.origin} → {searchQuery.destination}
                    </h3>
                    <p className="text-xs text-[#586875] leading-relaxed">
                      This route is currently outside our 14 curated high-speed demonstration corridors, and live provider API gateways are not configured in this environment.
                    </p>
                  </div>

                  {/* Informative Diagnostic Panels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
                    <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#E3E7E5] text-left space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#142B3B]">
                        <KeyRound className="w-3.5 h-3.5 text-[#D7A45B]" />
                        <span>Live Provider Gateways</span>
                      </div>
                      <p className="text-[11px] text-[#586875] leading-relaxed">
                        Live APIs (Amadeus Flight Search, IRCTC Railway gateway, and RedBus) are unconfigured. Supplying credentials in <code className="bg-[#EAE7DC] px-1 py-0.5 rounded text-[10px]">backend/.env</code> enables real-time search across any pair of 8,000+ railway stations and 150+ airports nationwide.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F0F8F7] border border-[#B4DAD4] text-left space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#174C47]">
                        <Sparkles className="w-3.5 h-3.5 text-[#24766F]" />
                        <span>Supported Demonstration Corridors</span>
                      </div>
                      <p className="text-[11px] text-[#24766F] leading-relaxed">
                        Curated benchmarks are available in both directions for: Delhi ↔ Mumbai, Delhi ↔ Bengaluru, Delhi ↔ Kolkata, Delhi ↔ Hyderabad, Delhi ↔ Chennai, Delhi ↔ Pune, Delhi ↔ Ahmedabad, Delhi ↔ Lucknow, Delhi ↔ Jaipur, Delhi ↔ Varanasi, Delhi ↔ Kanpur, Mumbai ↔ Bengaluru, Mumbai ↔ Goa, and Kolkata ↔ Bengaluru.
                      </p>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={onModifySearch}
                      className="px-5 py-2.5 rounded-xl bg-[#24766F] text-white text-xs font-bold hover:bg-[#1D605A] transition-colors"
                    >
                      Modify Search
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4 max-w-lg mx-auto">
                  <div className="w-12 h-12 bg-[#FAF5EA] text-[#D7A45B] rounded-xl flex items-center justify-center mx-auto">
                    <Filter className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-[#142B3B]">
                      No transport options match your current filters
                    </h3>
                    <p className="text-xs text-[#586875]">
                      {routeAwareOptions.length} transit option{routeAwareOptions.length > 1 ? 's were' : ' was'} found for this corridor, but your active filters excluded all of them:
                    </p>
                  </div>

                  {/* Specific Breakdown of Active Exclusions */}
                  <div className="bg-[#F7F5F0] rounded-xl p-4 border border-[#E3E7E5] text-left text-xs space-y-2 text-[#586875]">
                    {activeTab !== 'ALL' && (
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-[#142B3B]">• Mode filter:</span>
                        <span>Viewing only {activeTab.toLowerCase()}s ({routeAwareOptions.filter((o) => o.mode === activeTab).length} available for this corridor).</span>
                      </div>
                    )}
                    {fareExcludedCount > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-[#142B3B]">• Max Fare:</span>
                        <span>Set to ₹{effectiveMaxPrice.toLocaleString('en-IN')}, excluding {fareExcludedCount} option{fareExcludedCount > 1 ? 's' : ''} with higher ticket fares.</span>
                      </div>
                    )}
                    {durationExcludedCount > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-[#142B3B]">• Max Duration:</span>
                        <span>Set to {Math.floor(effectiveMaxDuration / 60)}h {effectiveMaxDuration % 60}m, excluding {durationExcludedCount} option{durationExcludedCount > 1 ? 's' : ''} taking longer.</span>
                      </div>
                    )}
                    {timeOfDay !== 'ALL' && (
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-[#142B3B]">• Departure Window:</span>
                        <span>Filtered to {timeOfDay.toLowerCase()} departures only.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-5 py-2.5 rounded-xl bg-[#24766F] text-white text-xs font-bold hover:bg-[#1D605A] transition-colors"
                    >
                      Reset Filters to Show All {routeAwareOptions.length} Options
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            processedOptions.map((option) => {
              const count = Math.max(1, searchQuery.travelers);
              const partyTotal = option.totalCostInr * count;

              return (
                <div
                  key={option.id}
                  data-testid="transport-card"
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E3E7E5] hover:border-[#BDCDDB] transition-all relative"
                >
                  {/* Top Bar: Identifier, Category Badge, Data Source */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E3E7E5]">
                    <div className="flex items-center gap-2">
                      <ModeBadge mode={option.mode} />
                      <CategoryBadge category={option.category} />
                      <span className="font-bold text-sm text-[#142B3B]">
                        {option.identifier}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#586875] font-medium">
                        {option.operator}
                      </span>
                      <DataQualityBadge
                        quality={(option as any).dataQuality || (option.attribution.dataSource === 'LIVE' ? 'VERIFIED_COMPLETE' : 'ESTIMATED')}
                      />
                      <DataSourceBadge
                        source={option.attribution.dataSource}
                        lastChecked={option.attribution.lastCheckedTimestamp}
                      />
                    </div>
                  </div>

                  {/* Middle Row: Schedule & Hubs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 py-4">
                    {/* Departure */}
                    <div className="space-y-0.5">
                      <span className="text-2xl font-black text-[#142B3B]">
                        {option.departureTime}
                      </span>
                      <span className="text-xs text-[#586875] block font-medium truncate">
                        {option.originHub}
                      </span>
                    </div>

                    {/* Transit Duration & Graphic */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-[#586875]">
                        {Math.floor(option.durationMinutes / 60)}h {option.durationMinutes % 60}m
                      </span>
                      <div className="w-24 h-0.5 bg-[#BDCDDB] relative my-1.5">
                        <div className="w-2 h-2 bg-[#24766F] rounded-full absolute right-0 -top-0.5" />
                      </div>
                      <span className="text-[11px] text-[#24766F] font-semibold">
                        Non-stop direct
                      </span>
                    </div>

                    {/* Arrival */}
                    <div className="space-y-0.5 text-left sm:text-right">
                      <span className="text-2xl font-black text-[#142B3B]">
                        {option.arrivalTime}
                      </span>
                      <span className="text-xs text-[#586875] block font-medium truncate">
                        {option.destinationHub}
                      </span>
                    </div>
                  </div>

                  {/* Smart Ranking Engine Trade-Off & Cost Transparency Banner */}
                  <div className="bg-[#F7F5F0] border border-[#E3E7E5] rounded-xl px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="font-medium text-[#202B33] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#24766F] shrink-0" />
                      <span>
                        {(option as any).tradeOffs?.tradeOffSummary ||
                          (option.category === 'CHEAPEST'
                            ? 'Lowest verified door-to-door cost across all modes.'
                            : option.category === 'FASTEST'
                            ? `Shortest travel time (${Math.floor(option.durationMinutes / 60)}h ${option.durationMinutes % 60}m).`
                            : 'Optimal balance of cost, transit time, and convenience.')}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#586875] font-semibold">
                      Convenience: {((option as any).tradeOffs?.convenienceRating ?? (option.mode === 'FLIGHT' ? 9 : 8))}/10
                    </span>
                  </div>

                  {/* Transfer Details / Real Cost Callout */}
                  {option.transferDetails && (
                    <div className="bg-[#F7F5F0] rounded-xl p-2.5 mb-3 text-[11px] text-[#586875] flex items-center justify-between border border-[#E3E7E5]">
                      <span>
                        Door-to-Door Transfer: {option.transferDetails.description}
                      </span>
                      <span className="font-bold text-[#202B33]">
                        +₹
                        {(
                          option.transferDetails.firstMileCostInr +
                          option.transferDetails.lastMileCostInr
                        ).toLocaleString('en-IN')}{' '}
                        est.
                      </span>
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="pt-3 border-t border-[#E3E7E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#142B3B]">
                          ₹{option.totalCostInr.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-[#586875]">/ person (all taxes incl.)</span>
                      </div>
                      {count > 1 && (
                        <span className="text-[11px] text-[#586875] block font-medium">
                          Total for {count} travelers: ₹{partyTotal.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onGenerateItineraryForOption(option)}
                        className="px-4 py-2 rounded-xl border border-[#24766F] text-[#24766F] hover:bg-[#F0F8F7] text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#24766F]" />
                        <span>Build Itinerary</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedForBooking(option)}
                        className="px-5 py-2 rounded-xl bg-[#24766F] hover:bg-[#1D605A] active:bg-[#174C47] text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <span>Book on {option.attribution.provider}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>

      {/* Redirection Modal */}
      {selectedForBooking && (
        <BookingRedirectModal
          option={selectedForBooking}
          travelers={searchQuery.travelers}
          onClose={() => setSelectedForBooking(null)}
        />
      )}
    </div>
  );
};
