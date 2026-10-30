import React from 'react';
import {
  BookmarkCheck,
  Users,
  Trash2,
  ArrowRight,
  Sparkles,
  Clock,
  Copy,
} from 'lucide-react';
import type { SavedTrip } from '@safar-saarthi/shared';
import { ModeBadge } from '../components/common/Badge';

interface SavedTripsPageProps {
  savedTrips: SavedTrip[];
  onOpenTrip: (trip: SavedTrip) => void;
  onDuplicateTrip?: (tripId: string) => void;
  onDeleteTrip: (tripId: string) => void;
  onStartNewSearch: () => void;
}

export const SavedTripsPage: React.FC<SavedTripsPageProps> = ({
  savedTrips,
  onOpenTrip,
  onDuplicateTrip,
  onDeleteTrip,
  onStartNewSearch,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E7E5]">
        <div>
          <span className="text-[#24766F] text-xs font-bold uppercase tracking-wider block">
            Personal Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#142B3B] tracking-tight">
            Saved Trips &amp; Itineraries
          </h1>
          <p className="text-xs text-[#586875] mt-1">
            Access your saved multi-modal transport routes and synthesized itineraries.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewSearch}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#24766F] hover:bg-[#1D605A] text-white text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <span>Plan New Journey</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Empty State vs List */}
      {savedTrips.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 sm:p-14 text-center border border-[#E3E7E5] max-w-xl mx-auto space-y-4 my-8">
          <div className="w-14 h-14 rounded-xl bg-[#F0F8F7] text-[#24766F] border border-[#B4DAD4] flex items-center justify-center mx-auto">
            <BookmarkCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#142B3B]">No Saved Trips Yet</h3>
            <p className="text-xs text-[#586875] max-w-sm mx-auto leading-relaxed">
              When you explore journeys and save day-wise itineraries, they will appear here with
              saved fares and accommodation picks.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartNewSearch}
            className="px-5 py-2.5 rounded-xl bg-[#142B3B] hover:bg-[#1B3242] text-white text-xs font-bold transition-colors inline-flex items-center gap-2"
          >
            <span>Start Searching Corridors</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedTrips.map((trip) => {
            const dateStr = new Date(trip.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={trip.id}
                className="bg-white rounded-2xl p-5 border border-[#E3E7E5] hover:border-[#BDCDDB] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <ModeBadge mode={trip.transportMode} />
                    <span className="text-[11px] text-[#586875] flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-[#586875]" /> Saved {dateStr}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-[#142B3B] tracking-tight">
                      {trip.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#586875] font-semibold mt-1">
                      <span>{trip.origin}</span>
                      <ArrowRight className="w-3 h-3 text-[#24766F]" />
                      <span>{trip.destination}</span>
                    </div>
                  </div>

                  <div className="bg-[#F7F5F0] rounded-xl p-3 border border-[#E3E7E5] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#586875] block font-medium">Travelers</span>
                      <span className="font-bold text-[#202B33] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#586875]" /> {trip.travelers}{' '}
                        {trip.travelers === 1 ? 'Person' : 'People'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#586875] block font-medium">Est. Budget</span>
                      <span className="font-bold text-[#24766F]">
                        ₹{trip.estimatedTotalInr.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E3E7E5] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDeleteTrip(trip.id)}
                      className="p-1.5 rounded-lg text-[#586875] hover:text-rose-600 hover:bg-[#FDF2F2] transition-colors"
                      title="Delete saved trip"
                      aria-label="Delete saved trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {onDuplicateTrip && (
                      <button
                        type="button"
                        onClick={() => onDuplicateTrip(trip.id)}
                        className="p-1.5 rounded-lg text-[#586875] hover:text-[#24766F] hover:bg-[#F0F8F7] transition-colors"
                        title="Duplicate and customize trip"
                        aria-label="Duplicate and customize trip"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenTrip(trip)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#142B3B] hover:bg-[#1B3242] text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>View Itinerary</span>
                    <Sparkles className="w-3 h-3 text-[#D7A45B]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
