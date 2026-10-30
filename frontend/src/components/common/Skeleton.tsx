import React from 'react';

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3E7E5] shadow-sm animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-5 bg-[#E3E7E5] rounded-md w-1/4" />
        <div className="h-5 bg-[#E3E7E5] rounded-full w-20" />
      </div>
      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="space-y-2">
          <div className="h-6 bg-[#E3E7E5] rounded w-16" />
          <div className="h-4 bg-[#F7F5F0] rounded w-24" />
        </div>
        <div className="flex flex-col items-center justify-center space-y-1">
          <div className="h-3 bg-[#E3E7E5] rounded w-16" />
          <div className="w-full h-1 bg-[#E3E7E5] rounded" />
          <div className="h-3 bg-[#F7F5F0] rounded w-12" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-6 bg-[#E3E7E5] rounded w-16 ml-auto" />
          <div className="h-4 bg-[#F7F5F0] rounded w-24 ml-auto" />
        </div>
      </div>
      <div className="border-t border-[#E3E7E5] pt-3 flex justify-between items-center">
        <div className="h-6 bg-[#E3E7E5] rounded w-28" />
        <div className="h-9 bg-[#E3E7E5] rounded-xl w-32" />
      </div>
    </div>
  );
};

export const ItinerarySkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-[#E3E7E5] rounded-lg w-1/3" />
      <div className="h-32 bg-[#E3E7E5] rounded-2xl w-full" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#E3E7E5] space-y-3">
            <div className="flex justify-between">
              <div className="h-5 bg-[#E3E7E5] rounded w-1/4" />
              <div className="h-5 bg-[#F7F5F0] rounded w-16" />
            </div>
            <div className="h-4 bg-[#F7F5F0] rounded w-3/4" />
            <div className="h-4 bg-[#F7F5F0] rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
};
