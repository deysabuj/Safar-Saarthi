import React, { useState } from 'react';
import {
  ExternalLink,
  AlertTriangle,
  X,
  Clock,
} from 'lucide-react';
import type { TransportOption } from '@safar-saarthi/shared';
import { ModeBadge, DataSourceBadge } from './Badge';

interface BookingRedirectModalProps {
  option: TransportOption | null;
  travelers: number;
  onClose: () => void;
}

export const BookingRedirectModal: React.FC<BookingRedirectModalProps> = ({
  option,
  travelers,
  onClose,
}) => {
  const [redirecting, setRedirecting] = useState(false);

  if (!option) return null;

  const count = Math.max(1, travelers);
  const totalBase = option.baseFareInr * count;
  const totalTaxes = option.taxesAndFeesInr * count;
  const grandTotal = option.totalCostInr * count;

  const handleProceed = () => {
    setRedirecting(true);
    setTimeout(() => {
      window.open(option.attribution.officialBookingUrl, '_blank', 'noopener,noreferrer');
      setRedirecting(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B3B]/60 backdrop-blur-[2px]">
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-[#E3E7E5] relative overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#586875] hover:text-[#202B33] hover:bg-[#F7F5F0] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 mb-5">
          <div className="flex items-center gap-2">
            <ModeBadge mode={option.mode} />
            <DataSourceBadge
              source={option.attribution.dataSource}
              lastChecked={option.attribution.lastCheckedTimestamp}
            />
          </div>
          <h3 className="text-xl font-bold text-[#142B3B] tracking-tight">
            Booking Redirection via {option.attribution.displayName}
          </h3>
          <p className="text-xs text-[#586875]">
            Official ticketing &amp; reservation partner for {option.operator}
          </p>
        </div>

        {/* Route Details Card */}
        <div className="bg-[#F7F5F0] border border-[#E3E7E5] rounded-xl p-4 mb-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-[#202B33]">
            <span>{option.identifier}</span>
            <span className="text-[11px] text-[#586875] font-medium">{option.seatClass || 'Standard'}</span>
          </div>

          <div className="grid grid-cols-3 items-center text-center py-2 border-y border-[#E3E7E5]">
            <div className="text-left">
              <span className="block text-base font-extrabold text-[#142B3B]">
                {option.departureTime}
              </span>
              <span className="text-[11px] text-[#586875] block truncate">
                {option.originHub}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-[#586875]">
                {Math.floor(option.durationMinutes / 60)}h {option.durationMinutes % 60}m
              </span>
              <div className="w-16 h-0.5 bg-[#BDCDDB] relative my-1">
                <div className="w-1.5 h-1.5 bg-[#24766F] rounded-full absolute right-0 -top-0.5" />
              </div>
              <span className="text-[10px] text-[#24766F] font-bold">Direct</span>
            </div>

            <div className="text-right">
              <span className="block text-base font-extrabold text-[#142B3B]">
                {option.arrivalTime}
              </span>
              <span className="text-[11px] text-[#586875] block truncate">
                {option.destinationHub}
              </span>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-1 text-xs text-[#586875] pt-1">
            <div className="flex justify-between">
              <span>
                Base Fare ({count} {count > 1 ? 'travelers' : 'traveler'}):
              </span>
              <span className="font-semibold text-[#202B33]">₹{totalBase.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes, IRCTC/Airline Charges &amp; Fees:</span>
              <span className="font-semibold text-[#202B33]">₹{totalTaxes.toLocaleString('en-IN')}</span>
            </div>
            {option.transferDetails && (
              <div className="flex justify-between text-[#586875]">
                <span>Est. First &amp; Last Mile Transfers:</span>
                <span>
                  +₹
                  {(
                    option.transferDetails.firstMileCostInr +
                    option.transferDetails.lastMileCostInr
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div className="border-t border-[#E3E7E5] pt-2 flex justify-between text-sm font-bold text-[#142B3B]">
              <span>Estimated Direct Ticket Total:</span>
              <span className="text-[#24766F] text-base font-extrabold">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Attribution & Transparency Alert */}
        <div className="bg-[#FAF5EA] border border-[#EBD5A4] rounded-xl p-3 mb-5 flex gap-2.5 text-xs text-[#7A541A]">
          <AlertTriangle className="w-4 h-4 text-[#D7A45B] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-[#7A541A]">Transparent Redirection Guarantee</p>
            <p className="text-[11px] text-[#7A541A]/90 leading-relaxed">
              You will be redirected directly to the official {option.attribution.displayName} platform. Safar Saarthi does not charge convenience surcharges or capture sensitive payment credentials.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[#E3E7E5] text-[#586875] text-xs font-semibold hover:bg-[#F7F5F0] hover:text-[#202B33] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleProceed}
            disabled={redirecting}
            className="flex-2 py-2.5 px-5 rounded-xl bg-[#24766F] hover:bg-[#1D605A] active:bg-[#174C47] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-75"
          >
            {redirecting ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Redirecting to Provider...</span>
              </>
            ) : (
              <>
                <span>Continue to {option.attribution.provider}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
