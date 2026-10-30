import React from 'react';
import {
  Plane,
  Train,
  Bus,
  Zap,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import type {
  TravelMode,
  TransportCategory,
  OfferDataSource,
  DataQualityRating,
} from '@safar-saarthi/shared';

export interface ModeBadgeProps {
  mode: TravelMode;
  className?: string;
}

export const ModeBadge: React.FC<ModeBadgeProps> = ({ mode, className = '' }) => {
  switch (mode) {
    case 'FLIGHT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F2F5F8] text-[#142B3B] border border-[#BDCDDB] ${className}`}
        >
          <Plane className="w-3.5 h-3.5 text-[#355366]" />
          <span>Flight</span>
        </span>
      );
    case 'TRAIN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF5EA] text-[#7A541A] border border-[#EBD5A4] ${className}`}
        >
          <Train className="w-3.5 h-3.5 text-[#D7A45B]" />
          <span>Train (IRCTC)</span>
        </span>
      );
    case 'BUS':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0F8F7] text-[#174C47] border border-[#B4DAD4] ${className}`}
        >
          <Bus className="w-3.5 h-3.5 text-[#24766F]" />
          <span>Intercity Bus</span>
        </span>
      );
    case 'CAB_TRANSFER':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F7F5F0] text-[#202B33] border border-[#E3E7E5] ${className}`}
        >
          <span>Cab Transfer</span>
        </span>
      );
    default:
      return null;
  }
};

export interface CategoryBadgeProps {
  category: TransportCategory;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className = '' }) => {
  switch (category) {
    case 'CHEAPEST':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0F8F7] text-[#174C47] border border-[#B4DAD4] ${className}`}
        >
          <Zap className="w-3 h-3 text-[#24766F] fill-[#24766F]" />
          <span>Cheapest</span>
        </span>
      );
    case 'FASTEST':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F2F5F8] text-[#142B3B] border border-[#BDCDDB] ${className}`}
        >
          <Clock className="w-3 h-3 text-[#355366]" />
          <span>Fastest</span>
        </span>
      );
    case 'BEST_VALUE':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF5EA] text-[#7A541A] border border-[#EBD5A4] ${className}`}
        >
          <Sparkles className="w-3 h-3 text-[#D7A45B] fill-[#D7A45B]" />
          <span>Best Value</span>
        </span>
      );
    default:
      return null;
  }
};

export interface DataQualityBadgeProps {
  quality?: DataQualityRating;
  className?: string;
}

export const DataQualityBadge: React.FC<DataQualityBadgeProps> = ({ quality, className = '' }) => {
  if (!quality) return null;

  switch (quality) {
    case 'VERIFIED_COMPLETE':
      return (
        <span
          title="Fully verified fare, mandatory taxes, and confirmed availability"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0F8F7] text-[#174C47] border border-[#B4DAD4] ${className}`}
        >
          <ShieldCheck className="w-3 h-3 text-[#24766F]" />
          <span>Verified Total</span>
        </span>
      );
    case 'VERIFIED_PARTIAL':
      return (
        <span
          title="Verified ticket fare, transfers estimated"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F2F5F8] text-[#142B3B] border border-[#BDCDDB] ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-[#355366]" />
          <span>Verified Fare</span>
        </span>
      );
    case 'CACHED':
      return (
        <span
          title="Recent cached quote from provider search"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#F7F5F0] text-[#586875] border border-[#E3E7E5] ${className}`}
        >
          <Clock className="w-3 h-3 text-[#586875]" />
          <span>Cached Rate</span>
        </span>
      );
    case 'ESTIMATED':
      return (
        <span
          title="Corridor benchmark estimate for typical journeys"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAF5EA] text-[#7A541A] border border-[#EBD5A4] ${className}`}
        >
          <HelpCircle className="w-3 h-3 text-[#D7A45B]" />
          <span>Est. Benchmark</span>
        </span>
      );
    case 'INCOMPLETE':
      return (
        <span
          title="Missing mandatory cost components; not eligible for verified cheapest"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDF2F2] text-[#9E2A2B] border border-[#F8D7DA] ${className}`}
        >
          <AlertCircle className="w-3 h-3 text-[#9E2A2B]" />
          <span>Incomplete Cost</span>
        </span>
      );
    default:
      return null;
  }
};

export interface DataSourceBadgeProps {
  source: OfferDataSource;
  lastChecked?: string;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ source, lastChecked }) => {
  switch (source) {
    case 'LIVE':
      return (
        <span
          title="Direct live rate from provider API"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0F8F7] text-[#174C47] border border-[#B4DAD4]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#24766F] animate-pulse" />
          Live Price
        </span>
      );
    case 'CACHED':
      return (
        <span
          title={lastChecked ? `Cached: ${new Date(lastChecked).toLocaleTimeString()}` : 'Cached offer'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F7F5F0] text-[#586875] border border-[#E3E7E5]"
        >
          <Clock className="w-3 h-3 text-[#586875]" />
          Cached
        </span>
      );
    case 'DEMO':
      return (
        <span
          title="Demonstration estimate for testing. Not a live booking quote."
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FAF5EA] text-[#7A541A] border border-[#EBD5A4]"
        >
          <AlertCircle className="w-3 h-3 text-[#D7A45B]" />
          Demo Benchmark
        </span>
      );
    default:
      return null;
  }
};
