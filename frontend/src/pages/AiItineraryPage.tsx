import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  MapPin,
  IndianRupee,
  Hotel,
  Train,
  BookmarkCheck,
  Printer,
  SlidersHorizontal,
  Info,
  ExternalLink,
  Car,
  Footprints,
  ShieldCheck,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Trash2,
  Plus,
  Edit3,
  Map as MapIcon,
  List as ListIcon,
  Columns as ColumnsIcon,
} from 'lucide-react';
import type {
  ItineraryPlan,
  ItineraryDay,
  ActivityItem,
  SavedTrip,
} from '@safar-saarthi/shared';
import { ModeBadge } from '../components/common/Badge';
import { TripInteractiveMap } from '../components/map/TripInteractiveMap';

interface AiItineraryPageProps {
  itinerary: ItineraryPlan;
  onSaveTrip: (trip: SavedTrip) => void;
  onRegenerateItinerary?: (preferences: { pace: string; dietary: string; days: number }) => void;
  isTripSaved?: boolean;
}

export const AiItineraryPage: React.FC<AiItineraryPageProps> = ({
  itinerary: initialItinerary,
  onSaveTrip,
  onRegenerateItinerary,
  isTripSaved = false,
}) => {
  const [itinerary, setItinerary] = useState<ItineraryPlan>(initialItinerary);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'TIMELINE' | 'MAP'>('SPLIT');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | undefined>();

  // Add Activity Modal Form state
  const [newTitle, setNewTitle] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('02:00 PM - 03:30 PM');
  const [newLocation, setNewLocation] = useState('');
  const [newFee, setNewFee] = useState('100');
  const [newCategory, setNewCategory] = useState<'HERITAGE' | 'FOOD' | 'NATURE' | 'SHOPPING' | 'CULTURE'>('HERITAGE');

  // Preference Form states
  const [pace, setPace] = useState(itinerary.pace);
  const [dietary, setDietary] = useState(itinerary.dietary);

  const activeDay: ItineraryDay = itinerary.days[activeDayIndex] || itinerary.days[0];

  // Recalculate Budget Deterministically
  const recalculateBudget = (updatedDays: ItineraryDay[]) => {
    const transportTotalInr = Math.round(itinerary.selectedTransport.totalCostInr * itinerary.travelers);
    const rooms = Math.max(1, Math.ceil(itinerary.travelers / 2));
    const stayTotalInr = Math.round(itinerary.recommendedStay.pricePerNightInr * (updatedDays.length - 1 || 1) * rooms);
    const activitiesTotalInr = Math.round(
      updatedDays.reduce(
        (daySum, d) => daySum + d.activities.reduce((actSum, a) => actSum + (a.entryFeeInr || 0), 0),
        0
      ) * itinerary.travelers
    );
    const foodEstimatedInr = Math.round(800 * updatedDays.length * itinerary.travelers);
    const grandTotalInr = transportTotalInr + stayTotalInr + activitiesTotalInr + foodEstimatedInr;

    return {
      transportTotalInr,
      stayTotalInr,
      activitiesTotalInr,
      foodEstimatedInr,
      grandTotalInr,
      userBudgetInr: itinerary.budgetBreakdown.userBudgetInr,
    };
  };

  const handleSave = () => {
    const newSavedTrip: SavedTrip = {
      id: `saved-${Date.now()}`,
      title: itinerary.title,
      origin: itinerary.origin,
      destination: itinerary.destination,
      departureDate: new Date().toISOString().split('T')[0],
      travelers: itinerary.travelers,
      estimatedTotalInr: itinerary.budgetBreakdown.grandTotalInr,
      transportMode: itinerary.selectedTransport.mode,
      createdAt: new Date().toISOString(),
      itineraryPlan: itinerary,
    };
    onSaveTrip(newSavedTrip);
  };

  const handlePrint = () => {
    window.print();
  };

  // Activity Edit Actions
  const handleMoveActivity = (index: number, direction: 'UP' | 'DOWN') => {
    const acts = [...activeDay.activities];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= acts.length) return;

    const temp = acts[index];
    acts[index] = acts[targetIdx];
    acts[targetIdx] = temp;

    const updatedDays = itinerary.days.map((d, idx) =>
      idx === activeDayIndex ? { ...d, activities: acts } : d
    );
    const updatedBudget = recalculateBudget(updatedDays);

    setItinerary({
      ...itinerary,
      days: updatedDays,
      budgetBreakdown: updatedBudget,
      isCustomized: true,
    });
  };

  const handleDeleteActivity = (actId: string) => {
    const acts = activeDay.activities.filter((a) => a.id !== actId);
    const updatedDays = itinerary.days.map((d, idx) =>
      idx === activeDayIndex ? { ...d, activities: acts } : d
    );
    const updatedBudget = recalculateBudget(updatedDays);

    setItinerary({
      ...itinerary,
      days: updatedDays,
      budgetBreakdown: updatedBudget,
      isCustomized: true,
    });
  };

  const handleAddCustomActivity = () => {
    if (!newTitle.trim()) return;

    const newAct: ActivityItem = {
      id: `custom-act-${Date.now()}`,
      title: newTitle,
      timeSlot: newTimeSlot,
      location: newLocation || `${itinerary.destination} City Center`,
      description: 'Custom activity added by traveler.',
      entryFeeInr: Number(newFee) || 0,
      durationMinutes: 90,
      category: newCategory,
      requiresConfirmation: true,
      confirmationNote: 'Custom unverified activity added by traveler.',
    };

    const acts = [...activeDay.activities, newAct];
    const updatedDays = itinerary.days.map((d, idx) =>
      idx === activeDayIndex ? { ...d, activities: acts } : d
    );
    const updatedBudget = recalculateBudget(updatedDays);

    setItinerary({
      ...itinerary,
      days: updatedDays,
      budgetBreakdown: updatedBudget,
      isCustomized: true,
    });

    setNewTitle('');
    setNewLocation('');
    setShowAddActivityModal(false);
  };

  // Budget calculations
  const { grandTotalInr, userBudgetInr, transportTotalInr, stayTotalInr, activitiesTotalInr, foodEstimatedInr } =
    itinerary.budgetBreakdown;

  const budgetUsagePercent = userBudgetInr
    ? Math.min(100, Math.round((grandTotalInr / userBudgetInr) * 100))
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#142B3B] text-white rounded-2xl p-6 sm:p-7 border border-[#263E4E] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1B3242] text-[#84C0B6] border border-[#263E4E] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D7A45B]" /> Multi-Agent Generated
            </span>
            <span className="text-[#BDCDDB]">
              {itinerary.durationDays} Days / {itinerary.durationDays - 1} Nights
            </span>
            <span className="text-[#688A9F]">•</span>
            <span className="text-[#BDCDDB]">{itinerary.travelers} Travelers</span>
            <span className="text-[#688A9F]">•</span>
            <span className="text-[#84C0B6] uppercase tracking-wider">{itinerary.pace} Pace</span>
            {itinerary.isCustomized && (
              <span className="px-2 py-0.5 rounded-full bg-[#FAF5EA] text-[#7A541A] border border-[#EBD5A4]">
                Customized by You
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{itinerary.title}</h1>
          <p className="text-xs sm:text-sm text-[#BDCDDB] leading-relaxed">
            Feasible journey starting from <strong>{itinerary.origin}</strong> to{' '}
            <strong>{itinerary.destination}</strong>. Synchronized with transit arrival times, hotel
            check-in hours, verified museum timings, and anti-backtracking corridor optimization.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row md:flex-col items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isTripSaved}
            className={`w-full px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
              isTripSaved
                ? 'bg-[#174C47] text-[#84C0B6] border border-[#1D605A] cursor-default'
                : 'bg-[#24766F] hover:bg-[#1D605A] text-white'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>{isTripSaved ? 'Saved to My Trips' : 'Save Itinerary'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full px-4 py-2 rounded-xl bg-[#1B3242] hover:bg-[#263E4E] text-[#BDCDDB] hover:text-white text-xs font-semibold border border-[#263E4E] flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className={`w-full px-4 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-colors ${
              isEditing
                ? 'bg-[#D7A45B] text-[#142B3B] border-[#BA893D] font-bold'
                : 'bg-[#1B3242] hover:bg-[#263E4E] text-[#84C0B6] border-[#263E4E]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done Editing' : 'Edit Stops'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreferencesModal(true)}
            className="w-full px-4 py-2 rounded-xl bg-[#1B3242] hover:bg-[#263E4E] text-[#84C0B6] text-xs font-semibold border border-[#263E4E] flex items-center justify-center gap-2 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tune Preferences</span>
          </button>
        </div>
      </div>

      {/* Validation & Feasibility Status Card */}
      {itinerary.validationReport && (
        <div className="bg-white rounded-2xl p-5 border border-[#E3E7E5] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#24766F]" />
              <div>
                <h4 className="font-extrabold text-sm text-[#142B3B]">Itinerary Feasibility Audit</h4>
                <span className="text-xs text-[#586875]">
                  {itinerary.validationReport.antiBacktrackingSummary}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F0F8F7] text-[#174C47] border border-[#B4DAD4]">
                Score: {itinerary.validationReport.score}/100 Feasible
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#F7F5F0] text-[#586875] border border-[#E3E7E5]">
                {itinerary.validationReport.bufferSummary}
              </span>
            </div>
          </div>

          {/* Validation Warnings if any */}
          {itinerary.validationReport.issues.length > 0 && (
            <div className="pt-2 space-y-1.5 border-t border-[#E3E7E5]">
              {itinerary.validationReport.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`text-[11px] p-2 rounded-xl flex items-start gap-2 ${
                    issue.severity === 'ERROR'
                      ? 'bg-[#FDF2F2] text-[#9E2A2B] border border-[#F8D7DA]'
                      : issue.severity === 'WARNING'
                      ? 'bg-[#FAF5EA] text-[#7A541A] border border-[#EBD5A4]'
                      : 'bg-[#F0F8F7] text-[#174C47] border border-[#B4DAD4]'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D7A45B]" />
                  <span>
                    <strong>Day {issue.dayNumber}:</strong> {issue.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transport & Accommodation Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selected Transport Summary */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E7E5] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E7E5]">
            <span className="text-xs font-bold text-[#586875] uppercase tracking-wider flex items-center gap-1.5">
              <Train className="w-4 h-4 text-[#D7A45B]" /> Coordinated Transit
            </span>
            <ModeBadge mode={itinerary.selectedTransport.mode} />
          </div>

          <div className="flex items-baseline justify-between">
            <h3 className="font-extrabold text-base text-[#142B3B]">
              {itinerary.selectedTransport.identifier}
            </h3>
            <span className="text-sm font-bold text-[#24766F]">
              ₹{itinerary.selectedTransport.totalCostInr.toLocaleString('en-IN')} / person
            </span>
          </div>

          <p className="text-xs text-[#586875] leading-relaxed">
            {itinerary.selectedTransport.departureTime} from {itinerary.selectedTransport.originHub} →{' '}
            {itinerary.selectedTransport.arrivalTime} at{' '}
            {itinerary.selectedTransport.destinationHub}.
          </p>

          <div className="bg-[#F7F5F0] p-2.5 rounded-xl text-[11px] text-[#586875] border border-[#E3E7E5] flex items-center justify-between">
            <span>Official booking partner: {itinerary.selectedTransport.attribution.provider}</span>
            <a
              href={itinerary.selectedTransport.attribution.officialBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#24766F] hover:text-[#1D605A] font-bold inline-flex items-center gap-1"
            >
              Verify Fare <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Accommodation Summary */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E7E5] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E7E5]">
            <span className="text-xs font-bold text-[#586875] uppercase tracking-wider flex items-center gap-1.5">
              <Hotel className="w-4 h-4 text-[#24766F]" /> Curated Stay
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF5EA] text-[#7A541A] border border-[#EBD5A4]">
              ★ {itinerary.recommendedStay.rating} ({itinerary.recommendedStay.reviewsCount} reviews)
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <h3 className="font-extrabold text-base text-[#142B3B]">
              {itinerary.recommendedStay.name}
            </h3>
            <span className="text-sm font-bold text-[#24766F]">
              ₹{itinerary.recommendedStay.pricePerNightInr.toLocaleString('en-IN')} / night
            </span>
          </div>

          <p className="text-xs text-[#586875] leading-relaxed">
            Located in <strong>{itinerary.recommendedStay.neighborhood}</strong>. Proximity:{' '}
            {itinerary.recommendedStay.proximityToHub}.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {itinerary.recommendedStay.amenities.slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F7F5F0] text-[#586875] border border-[#E3E7E5]"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Breakdown & Health Check */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E7E5] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#142B3B] flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-[#24766F]" /> Total Trip Cost Estimate ({itinerary.travelers} Travelers)
            </h3>
            <span className="text-xs text-[#586875]">
              Deterministic calculation covering Transit, Stay, Sightseeing, &amp; Local Food
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#142B3B]">
              ₹{grandTotalInr.toLocaleString('en-IN')}
            </span>
            {userBudgetInr && (
              <span className="text-xs text-[#586875] block">
                Target Budget: ₹{userBudgetInr.toLocaleString('en-IN')} ({budgetUsagePercent}% used)
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {userBudgetInr && (
          <div className="w-full bg-[#EFECE3] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetUsagePercent! <= 85
                  ? 'bg-[#24766F]'
                  : budgetUsagePercent! <= 100
                  ? 'bg-[#D7A45B]'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, budgetUsagePercent!)}%` }}
            />
          </div>
        )}

        {/* Grid of 4 budget pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-[#F7F5F0] p-3 rounded-xl border border-[#E3E7E5]">
            <span className="text-[11px] text-[#586875] block font-medium">Transport (All-in)</span>
            <span className="text-sm font-bold text-[#142B3B]">
              ₹{transportTotalInr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-[#F7F5F0] p-3 rounded-xl border border-[#E3E7E5]">
            <span className="text-[11px] text-[#586875] block font-medium">Accommodations</span>
            <span className="text-sm font-bold text-[#142B3B]">
              ₹{stayTotalInr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-[#F7F5F0] p-3 rounded-xl border border-[#E3E7E5]">
            <span className="text-[11px] text-[#586875] block font-medium">Activities &amp; Entries</span>
            <span className="text-sm font-bold text-[#142B3B]">
              ₹{activitiesTotalInr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-[#F7F5F0] p-3 rounded-xl border border-[#E3E7E5]">
            <span className="text-[11px] text-[#586875] block font-medium">Food &amp; Dining Est.</span>
            <span className="text-sm font-bold text-[#142B3B]">
              ₹{foodEstimatedInr.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* View Mode Switcher Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Day Selector Tabs */}
        <div className="flex bg-[#EFECE3] p-1 rounded-xl border border-[#E3E7E5] overflow-x-auto text-xs font-bold text-[#586875]">
          {itinerary.days.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveDayIndex(idx)}
              className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
                activeDayIndex === idx
                  ? 'bg-[#142B3B] text-white shadow-sm'
                  : 'hover:text-[#142B3B]'
              }`}
            >
              <span>Day {day.dayNumber}</span>
              <span className="text-[10px] opacity-75 font-normal">({day.theme.split(' ')[0]})</span>
            </button>
          ))}
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center gap-1 bg-[#EFECE3] p-1 rounded-xl border border-[#E3E7E5] text-xs font-semibold text-[#586875]">
          <button
            type="button"
            onClick={() => setViewMode('SPLIT')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              viewMode === 'SPLIT' ? 'bg-white text-[#142B3B] shadow-sm font-bold border border-[#E3E7E5]' : 'hover:text-[#142B3B]'
            }`}
          >
            <ColumnsIcon className="w-3.5 h-3.5 text-[#24766F]" /> Split
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TIMELINE')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              viewMode === 'TIMELINE' ? 'bg-white text-[#142B3B] shadow-sm font-bold border border-[#E3E7E5]' : 'hover:text-[#142B3B]'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5 text-[#24766F]" /> Timeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('MAP')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              viewMode === 'MAP' ? 'bg-white text-[#142B3B] shadow-sm font-bold border border-[#E3E7E5]' : 'hover:text-[#142B3B]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5 text-[#24766F]" /> Map
          </button>
        </div>
      </div>

      {/* Main View Area (Timeline, Map, or Split) */}
      <div
        className={`grid gap-6 ${
          viewMode === 'SPLIT'
            ? 'grid-cols-1 lg:grid-cols-12'
            : viewMode === 'MAP'
            ? 'grid-cols-1'
            : 'grid-cols-1'
        }`}
      >
        {/* Timeline Column */}
        {(viewMode === 'SPLIT' || viewMode === 'TIMELINE') && (
          <div className={`space-y-4 ${viewMode === 'SPLIT' ? 'lg:col-span-7' : 'w-full'}`}>
            {/* Active Day Card Banner */}
            <div className="bg-[#F0F8F7] border border-[#B4DAD4] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[#174C47] text-[11px] font-bold uppercase tracking-wider block">
                  Day {activeDay.dayNumber} Focus
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-[#142B3B]">{activeDay.theme}</h3>
                {activeDay.localTransportTip && (
                  <p className="text-xs text-[#1D605A] mt-0.5">
                    <strong>Transit Tip:</strong> {activeDay.localTransportTip}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-bold text-[#174C47] bg-white px-3 py-1.5 rounded-xl border border-[#B4DAD4]">
                  Est. Day Budget: ₹{activeDay.dailyBudgetEstimateInr.toLocaleString('en-IN')}
                </span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setShowAddActivityModal(true)}
                    className="p-1.5 rounded-xl bg-[#24766F] hover:bg-[#1D605A] text-white font-bold flex items-center gap-1 text-xs transition-colors"
                    title="Add Custom Activity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Hotel Check-in Event on Day 1 */}
            {activeDay.checkInEvent && (
              <div className="bg-[#FAF5EA] border border-[#EBD5A4] rounded-xl p-3 flex items-center gap-3 text-xs text-[#7A541A]">
                <Hotel className="w-5 h-5 text-[#D7A45B] shrink-0" />
                <div className="flex-1">
                  <strong>Hotel Check-in:</strong> {activeDay.checkInEvent.hotelName} ({activeDay.checkInEvent.timeSlot}).
                  <span className="block text-[11px] text-[#7A541A]/90 mt-0.5">{activeDay.checkInEvent.note}</span>
                </div>
              </div>
            )}

            {/* Timeline of Activities */}
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-[#E3E7E5]">
              {activeDay.activities.map((act, idx) => (
                <React.Fragment key={act.id}>
                  {/* Ground Transfer Banner Between Stops */}
                  {act.transferFromPrevious && idx > 0 && (
                    <div className="relative pl-12 pr-2 py-0.5 flex items-center gap-2 text-[11px] text-[#586875]">
                      <div className="flex items-center gap-1.5 bg-[#F7F5F0] px-3 py-1.5 rounded-xl border border-[#E3E7E5]">
                        {act.transferFromPrevious.mode === 'WALK' ? (
                          <Footprints className="w-3.5 h-3.5 text-[#24766F]" />
                        ) : (
                          <Car className="w-3.5 h-3.5 text-[#24766F]" />
                        )}
                        <span className="font-semibold text-[#202B33]">
                          {act.transferFromPrevious.distanceKm} km ({act.transferFromPrevious.estimatedDurationMinutes} min transfer)
                        </span>
                        {act.transferFromPrevious.estimatedCostInr > 0 && (
                          <span className="text-[#586875] font-medium">
                            • ~₹{act.transferFromPrevious.estimatedCostInr}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#586875] italic">
                        (Est. traffic)
                      </span>
                    </div>
                  )}

                  <div className="relative flex items-start gap-4">
                    {/* Stepper Dot */}
                    <div
                      onClick={() => setSelectedMarkerId(`marker-act-${activeDay.dayNumber}-${idx}-${act.id}`)}
                      className="w-10 h-10 rounded-xl bg-[#142B3B] border-2 border-white text-[#84C0B6] flex items-center justify-center font-bold text-xs shrink-0 z-10 cursor-pointer hover:bg-[#24766F] hover:text-white transition-colors"
                    >
                      {idx + 1}
                    </div>

                    {/* Activity Card */}
                    <div className="flex-1 bg-white rounded-2xl p-5 border border-[#E3E7E5] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#202B33] bg-[#F7F5F0] px-3 py-1 rounded-full border border-[#E3E7E5]">
                          <Clock className="w-3.5 h-3.5 text-[#24766F]" /> {act.timeSlot}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#142B3B]">
                            {act.entryFeeInr === 0 ? 'Free Entry' : `₹${act.entryFeeInr} entry / ticket`}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7F5F0] text-[#586875] uppercase border border-[#E3E7E5]">
                            {act.category}
                          </span>
                          {/* Edit Buttons */}
                          {isEditing && (
                            <div className="flex items-center gap-1 border-l border-[#E3E7E5] pl-2">
                              <button
                                type="button"
                                title="Move Up"
                                onClick={() => handleMoveActivity(idx, 'UP')}
                                disabled={idx === 0}
                                className="p-1 rounded text-[#586875] hover:text-[#142B3B] disabled:opacity-30"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Move Down"
                                onClick={() => handleMoveActivity(idx, 'DOWN')}
                                disabled={idx === activeDay.activities.length - 1}
                                className="p-1 rounded text-[#586875] hover:text-[#142B3B] disabled:opacity-30"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete Stop"
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-1 rounded text-rose-600 hover:text-rose-800"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-base text-[#142B3B]">{act.title}</h4>
                        <span className="text-xs text-[#586875] flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#586875]" /> {act.location}
                        </span>
                      </div>

                      <p className="text-xs text-[#586875] leading-relaxed">{act.description}</p>

                      {/* Confirmation Required Alert */}
                      {act.requiresConfirmation && (
                        <div className="bg-[#FAF5EA] border border-[#EBD5A4] rounded-xl p-2.5 text-[11px] text-[#7A541A] flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D7A45B] shrink-0 mt-0.5" />
                          <span>
                            <strong>Notice:</strong> {act.confirmationNote || 'Operating hours or entry tickets require local confirmation.'}
                          </span>
                        </div>
                      )}

                      {act.insiderTip && (
                        <div className="bg-[#F0F8F7] border border-[#B4DAD4] rounded-xl p-2.5 text-[11px] text-[#174C47] flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-[#24766F] shrink-0 mt-0.5" />
                          <span>
                            <strong>Agent Insider Hack:</strong> {act.insiderTip}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Hotel Check-out Event on Final Day */}
            {activeDay.checkOutEvent && (
              <div className="bg-[#F7F5F0] border border-[#E3E7E5] rounded-xl p-3 flex items-center gap-3 text-xs text-[#202B33] mt-4">
                <Hotel className="w-5 h-5 text-[#586875] shrink-0" />
                <div className="flex-1">
                  <strong>Hotel Check-out:</strong> {activeDay.checkOutEvent.hotelName} ({activeDay.checkOutEvent.timeSlot}).
                  <span className="block text-[11px] text-[#586875] mt-0.5">{activeDay.checkOutEvent.note}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map Column */}
        {(viewMode === 'SPLIT' || viewMode === 'MAP') && (
          <div className={`${viewMode === 'SPLIT' ? 'lg:col-span-5' : 'w-full'} sticky top-6`}>
            <TripInteractiveMap
              mapData={itinerary.mapData}
              activeDayNumber={activeDay.dayNumber}
              onSelectDay={(dayNum) => {
                const targetIdx = itinerary.days.findIndex((d) => d.dayNumber === dayNum);
                if (targetIdx !== -1) setActiveDayIndex(targetIdx);
              }}
              selectedMarkerId={selectedMarkerId}
            />
          </div>
        )}
      </div>

      {/* Add Custom Activity Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B3B]/60 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3E7E5] space-y-4">
            <h3 className="text-base font-bold text-[#142B3B] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#24766F]" /> Add Custom Stop to Day {activeDay.dayNumber}
            </h3>

            <div className="space-y-3 text-xs font-semibold text-[#202B33]">
              <div>
                <label className="block mb-1 text-[11px] text-[#586875]">Place / Activity Name</label>
                <input
                  type="text"
                  placeholder="e.g. Laxmi Mishthan Bhandar (LMB)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] focus:outline-none focus:border-[#24766F] bg-[#F7F5F0]/50"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] text-[#586875]">Location / Street</label>
                <input
                  type="text"
                  placeholder="e.g. Johari Bazaar, Pink City"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] focus:outline-none focus:border-[#24766F] bg-[#F7F5F0]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-[11px] text-[#586875]">Time Slot</label>
                  <input
                    type="text"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] bg-[#F7F5F0]/50"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] text-[#586875]">Entry Fee (₹)</label>
                  <input
                    type="number"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] bg-[#F7F5F0]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[11px] text-[#586875]">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] bg-white"
                >
                  <option value="HERITAGE">Heritage</option>
                  <option value="FOOD">Food &amp; Dining</option>
                  <option value="CULTURE">Culture</option>
                  <option value="SHOPPING">Shopping</option>
                  <option value="NATURE">Nature</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddActivityModal(false)}
                className="flex-1 py-2 px-4 rounded-xl border border-[#E3E7E5] text-xs font-semibold text-[#586875] hover:bg-[#F7F5F0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomActivity}
                className="flex-1 py-2 px-4 rounded-xl bg-[#24766F] hover:bg-[#1D605A] text-white font-bold text-xs transition-colors"
              >
                Add Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editable Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B3B]/60 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E3E7E5] space-y-4">
            <h3 className="text-base font-bold text-[#142B3B] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#24766F]" /> Personalize AI Planner
            </h3>
            <p className="text-xs text-[#586875]">
              Tune your traveler persona to dynamically adjust activity pace and dietary options.
            </p>

            <div className="space-y-3.5 text-xs font-semibold text-[#202B33]">
              <div>
                <label className="block mb-1.5 font-bold uppercase tracking-wider text-[11px] text-[#586875]">
                  Travel Pace
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['RELAXED', 'MODERATE', 'FAST_PACED'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPace(p)}
                      className={`py-2 px-2 rounded-xl border text-center font-bold text-xs capitalize transition-colors ${
                        pace === p
                          ? 'border-[#24766F] bg-[#F0F8F7] text-[#174C47]'
                          : 'border-[#E3E7E5] text-[#586875] hover:bg-[#F7F5F0]'
                      }`}
                    >
                      {p.replace('_', ' ').toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-bold uppercase tracking-wider text-[11px] text-[#586875]">
                  Dietary Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['VEG', 'JAIN', 'NON_VEG'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDietary(d)}
                      className={`py-2 px-2 rounded-xl border text-center font-bold text-xs capitalize transition-colors ${
                        dietary === d
                          ? 'border-[#24766F] bg-[#F0F8F7] text-[#174C47]'
                          : 'border-[#E3E7E5] text-[#586875] hover:bg-[#F7F5F0]'
                      }`}
                    >
                      {d.replace('_', ' ').toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="flex-1 py-2 px-4 rounded-xl border border-[#E3E7E5] text-xs font-semibold text-[#586875] hover:bg-[#F7F5F0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setItinerary((prev) => ({
                    ...prev,
                    pace,
                    dietary,
                  }));
                  if (onRegenerateItinerary) {
                    onRegenerateItinerary({ pace, dietary, days: itinerary.durationDays });
                  }
                  setShowPreferencesModal(false);
                }}
                className="flex-1 py-2 px-4 rounded-xl bg-[#24766F] hover:bg-[#1D605A] text-white font-bold text-xs transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
