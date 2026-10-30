import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  SlidersHorizontal,
  LogOut,
  Save,
  CheckCircle2,
  Heart,
  Plane,
  Train,
  Bus,
} from 'lucide-react';
import type { TravelMode } from '@safar-saarthi/shared';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, logout, updatePreferences } = useAuth();

  const prefs = user?.preferences || {};
  const [pace, setPace] = useState(prefs.defaultPace || 'MODERATE');
  const [dietary, setDietary] = useState(prefs.dietary || 'VEG');
  const [style, setStyle] = useState(prefs.defaultTravelStyle || 'MID_RANGE');
  const [budgetLimit, setBudgetLimit] = useState(prefs.budgetLimitInr ? String(prefs.budgetLimitInr) : '');
  const [modes, setModes] = useState<TravelMode[]>(prefs.preferredTransportModes || ['TRAIN', 'FLIGHT', 'BUS']);
  const [favoriteInput, setFavoriteInput] = useState('');
  const [favorites, setFavorites] = useState<string[]>(prefs.favoriteDestinations || ['Jaipur', 'Goa', 'Agra']);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen || !user) return null;

  const toggleMode = (m: TravelMode) => {
    if (modes.includes(m)) {
      if (modes.length > 1) setModes(modes.filter((item) => item !== m));
    } else {
      setModes([...modes, m]);
    }
  };

  const handleAddFavorite = () => {
    if (!favoriteInput.trim()) return;
    const clean = favoriteInput.trim();
    if (!favorites.includes(clean)) {
      setFavorites([...favorites, clean]);
    }
    setFavoriteInput('');
  };

  const handleRemoveFavorite = (dest: string) => {
    setFavorites(favorites.filter((f) => f !== dest));
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({
        defaultPace: pace as any,
        dietary: dietary as any,
        defaultTravelStyle: style as any,
        budgetLimitInr: budgetLimit ? Number(budgetLimit) : undefined,
        preferredTransportModes: modes,
        favoriteDestinations: favorites,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B3B]/60 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-[#E3E7E5] space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#586875] hover:text-[#202B33] hover:bg-[#F7F5F0] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#24766F] text-white flex items-center justify-center font-black text-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#142B3B]">{user.name}</h3>
            <span className="text-xs text-[#586875] block">{user.email}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F7F5F0] text-[#586875] border border-[#E3E7E5] inline-block mt-0.5">
              Verified Traveler ({user.role})
            </span>
          </div>
        </div>

        {/* Preferences Form */}
        <div className="space-y-4 pt-2 border-t border-[#E3E7E5]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#142B3B] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#24766F]" /> Travel Persona &amp; Preferences
            </h4>
            {isSaved && (
              <span className="text-xs text-[#24766F] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block mb-1 text-[11px] font-semibold text-[#586875]">Pacing Preference</label>
              <select
                value={pace}
                onChange={(e) => setPace(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] bg-[#F7F5F0]/50 text-[#202B33] font-medium"
              >
                <option value="RELAXED">Relaxed (1-2 stops/day)</option>
                <option value="MODERATE">Moderate (3-4 stops/day)</option>
                <option value="FAST_PACED">Fast-Paced (Intense)</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-semibold text-[#586875]">Dietary Needs</label>
              <select
                value={dietary}
                onChange={(e) => setDietary(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] bg-[#F7F5F0]/50 text-[#202B33] font-medium"
              >
                <option value="VEG">Vegetarian Only</option>
                <option value="JAIN">Jain Pure (No root veg)</option>
                <option value="NON_VEG">Non-Vegetarian</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block mb-1 text-[11px] font-semibold text-[#586875]">Travel Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] bg-[#F7F5F0]/50 text-[#202B33] font-medium"
              >
                <option value="BUDGET">Budget Conscious</option>
                <option value="MID_RANGE">Mid-Range Comfort</option>
                <option value="LUXURY">Heritage &amp; Luxury</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-semibold text-[#586875]">Default Budget Ceiling (₹)</label>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full px-3 py-2 rounded-xl border border-[#E3E7E5] bg-[#F7F5F0]/50 text-[#202B33] font-medium"
              />
            </div>
          </div>

          {/* Preferred Modes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-[#586875]">Preferred Transport Modes</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleMode('TRAIN')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  modes.includes('TRAIN')
                    ? 'border-[#EBD5A4] bg-[#FAF5EA] text-[#7A541A]'
                    : 'border-[#E3E7E5] bg-[#F7F5F0] text-[#586875]'
                }`}
              >
                <Train className="w-3.5 h-3.5 text-[#D7A45B]" /> Trains
              </button>
              <button
                type="button"
                onClick={() => toggleMode('FLIGHT')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  modes.includes('FLIGHT')
                    ? 'border-[#BDCDDB] bg-[#F2F5F8] text-[#142B3B]'
                    : 'border-[#E3E7E5] bg-[#F7F5F0] text-[#586875]'
                }`}
              >
                <Plane className="w-3.5 h-3.5 text-[#355366]" /> Flights
              </button>
              <button
                type="button"
                onClick={() => toggleMode('BUS')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  modes.includes('BUS')
                    ? 'border-[#B4DAD4] bg-[#F0F8F7] text-[#174C47]'
                    : 'border-[#E3E7E5] bg-[#F7F5F0] text-[#586875]'
                }`}
              >
                <Bus className="w-3.5 h-3.5 text-[#24766F]" /> Buses
              </button>
            </div>
          </div>

          {/* Favorite Destinations */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-[#586875]">Favorite Indian Destinations</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add destination (e.g. Udaipur, Shimla)"
                value={favoriteInput}
                onChange={(e) => setFavoriteInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFavorite())}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#E3E7E5] bg-[#F7F5F0]/50 text-[#202B33]"
              />
              <button
                type="button"
                onClick={handleAddFavorite}
                className="px-3 py-1.5 rounded-xl bg-[#142B3B] text-white text-xs font-bold hover:bg-[#1B3242]"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {favorites.map((dest, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0F8F7] text-[#174C47] border border-[#B4DAD4]"
                >
                  <Heart className="w-3 h-3 text-[#24766F] fill-[#24766F]" />
                  <span>{dest}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(dest)}
                    className="hover:text-rose-600 font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-[#E3E7E5] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={logout}
            className="px-3.5 py-2 rounded-xl border border-[#E3E7E5] text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-[#24766F] hover:bg-[#1D605A] text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
