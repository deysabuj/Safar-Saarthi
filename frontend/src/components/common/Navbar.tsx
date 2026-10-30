import React, { useState } from 'react';
import { Menu, X, BookmarkCheck, ArrowRight, Sparkles, Navigation, User as UserIcon, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { ProfileModal } from '../auth/ProfileModal';
import { SafarMark } from './SafarLogo';

export type NavTab = 'LANDING' | 'COMPARISON' | 'ITINERARY' | 'SAVED_TRIPS';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedTripsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  savedTripsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const { user, isAuthenticated } = useAuth();

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#142B3B] text-white border-b border-[#263E4E] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo & Brand Identity */}
          <div
            onClick={() => handleNavClick('LANDING')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1B3242] border border-[#263E4E] flex items-center justify-center transition-transform group-hover:scale-105">
              <SafarMark size={28} inverted />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Safar<span className="text-[#84C0B6]">Saarthi</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#174C47] text-[#84C0B6] border border-[#1D605A] uppercase tracking-wider">
                  India
                </span>
              </div>
              <span className="text-[11px] block text-[#93ADBE] font-medium tracking-wide">
                Multi-Modal Travel & AI Planner
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleNavClick('LANDING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'LANDING'
                  ? 'bg-[#1B3242] text-[#84C0B6] border border-[#263E4E]'
                  : 'text-[#BDCDDB] hover:text-white hover:bg-[#1B3242]/50'
              }`}
            >
              Search & Explore
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('COMPARISON')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentTab === 'COMPARISON'
                  ? 'bg-[#1B3242] text-[#84C0B6] border border-[#263E4E]'
                  : 'text-[#BDCDDB] hover:text-white hover:bg-[#1B3242]/50'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-[#84C0B6]" />
              Compare Transport
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('ITINERARY')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentTab === 'ITINERARY'
                  ? 'bg-[#1B3242] text-[#84C0B6] border border-[#263E4E]'
                  : 'text-[#BDCDDB] hover:text-white hover:bg-[#1B3242]/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D7A45B]" />
              AI Itinerary
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('SAVED_TRIPS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentTab === 'SAVED_TRIPS'
                  ? 'bg-[#1B3242] text-[#84C0B6] border border-[#263E4E]'
                  : 'text-[#BDCDDB] hover:text-white hover:bg-[#1B3242]/50'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-[#84C0B6]" />
              Saved Trips
              {savedTripsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-extrabold bg-[#24766F] text-white rounded-full">
                  {savedTripsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Quick Action, Auth & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* User Account / Sign In */}
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1B3242] border border-[#263E4E] hover:border-[#4FA095] transition-all text-xs font-semibold text-slate-200"
              >
                <div className="w-6 h-6 rounded-lg bg-[#24766F]/30 text-[#84C0B6] border border-[#24766F]/50 flex items-center justify-center font-bold text-[11px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B3242] border border-[#263E4E] hover:border-[#4FA095] transition-all text-xs font-semibold text-[#84C0B6]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNavClick('COMPARISON')}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#24766F] hover:bg-[#1D605A] active:bg-[#174C47] text-white text-xs font-bold transition-colors"
            >
              <span>Instant Compare</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#BDCDDB] hover:text-white hover:bg-[#1B3242] focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#142B3B] border-b border-[#263E4E] px-4 pt-3 pb-5 space-y-2">
          {isAuthenticated && user ? (
            <button
              type="button"
              onClick={() => {
                setProfileModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1B3242] text-[#84C0B6] border border-[#263E4E] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-[#84C0B6]" />
                <span>My Profile ({user.name})</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#93ADBE]">Settings</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold bg-[#24766F] text-white flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleNavClick('LANDING')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold ${
              currentTab === 'LANDING'
                ? 'bg-[#1B3242] text-[#84C0B6] border border-[#263E4E]'
                : 'text-[#BDCDDB] hover:bg-[#1B3242]/50'
            }`}
          >
            Search & Explore
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('COMPARISON')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              currentTab === 'COMPARISON'
                ? 'bg-[#1B3242] text-[#84C0B6] border border-[#263E4E]'
                : 'text-[#BDCDDB] hover:bg-[#1B3242]/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#84C0B6]" /> Compare Transport
            </span>
            <span className="text-[11px] text-[#93ADBE]">Flights · Trains · Buses</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('ITINERARY')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              currentTab === 'ITINERARY'
                ? 'bg-[#1B3242] text-[#84C0B6] border border-[#263E4E]'
                : 'text-[#BDCDDB] hover:bg-[#1B3242]/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D7A45B]" /> AI Itinerary
            </span>
            <span className="text-[11px] text-[#84C0B6]">Agent Powered</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('SAVED_TRIPS')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              currentTab === 'SAVED_TRIPS'
                ? 'bg-[#1B3242] text-[#84C0B6] border border-[#263E4E]'
                : 'text-[#BDCDDB] hover:bg-[#1B3242]/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-[#84C0B6]" /> Saved Trips
            </span>
            {savedTripsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#24766F] text-white rounded-full">
                {savedTripsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Auth Modal & Profile Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </header>
  );
};
