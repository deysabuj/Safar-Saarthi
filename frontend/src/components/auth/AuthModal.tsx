import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, LogIn, UserPlus, AlertCircle, Sparkles } from 'lucide-react';
import { SafarMark } from '../common/SafarLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'LOGIN',
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pace, setPace] = useState<'RELAXED' | 'MODERATE' | 'FAST_PACED'>('MODERATE');
  const [dietary, setDietary] = useState<'VEG' | 'JAIN' | 'NON_VEG'>('VEG');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'LOGIN') {
        await login(email, password);
      } else {
        await register(email, password, name, {
          defaultPace: pace,
          dietary,
          defaultTravelStyle: 'MID_RANGE',
          preferredTransportModes: ['TRAIN', 'FLIGHT', 'BUS'],
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B3B]/60 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-xl border border-[#E3E7E5] space-y-5 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#586875] hover:text-[#202B33] hover:bg-[#F7F5F0] transition"
        >
          <X className="w-5 h-5 lucide-x" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0F8F7] border border-[#B4DAD4] flex items-center justify-center">
              <SafarMark size={22} />
            </div>
            <h3 className="text-xl font-bold text-[#142B3B]">
              {mode === 'LOGIN' ? 'Sign In to Safar Saarthi' : 'Create Your Travel Account'}
            </h3>
          </div>
          <p className="text-xs text-[#586875] leading-relaxed">
            {mode === 'LOGIN'
              ? 'Access your private itineraries, personalized travel preferences, and saved corridors.'
              : 'Save trips across devices, duplicate plans, and set personalized transit preferences.'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-[#F7F5F0] p-1 rounded-xl border border-[#E3E7E5] text-xs font-bold text-[#586875]">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              mode === 'LOGIN' ? 'bg-white text-[#142B3B] shadow-sm' : 'hover:text-[#142B3B]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              mode === 'REGISTER' ? 'bg-white text-[#142B3B] shadow-sm' : 'hover:text-[#142B3B]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-[#FDF2F2] border border-[#F8D7DA] rounded-xl flex items-start gap-2 text-xs text-[#9E2A2B]">
            <AlertCircle className="w-4 h-4 text-[#9E2A2B] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold text-[#202B33]">
          {mode === 'REGISTER' && (
            <div>
              <label className="block mb-1 text-[11px] uppercase tracking-wider text-[#586875]">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] bg-[#F7F5F0]/50 focus:outline-none focus:border-[#24766F] focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block mb-1 text-[11px] uppercase tracking-wider text-[#586875]">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] bg-[#F7F5F0]/50 focus:outline-none focus:border-[#24766F] focus:bg-white"
            />
          </div>

          <div>
            <label className="block mb-1 text-[11px] uppercase tracking-wider text-[#586875]">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] bg-[#F7F5F0]/50 focus:outline-none focus:border-[#24766F] focus:bg-white"
            />
          </div>

          {mode === 'REGISTER' && (
            <div className="pt-2 border-t border-[#E3E7E5] space-y-2.5">
              <span className="text-[11px] font-bold text-[#24766F] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Set Initial Travel Persona
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-[10px] uppercase text-[#586875]">Pace</label>
                  <select
                    value={pace}
                    onChange={(e) => setPace(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] bg-white"
                  >
                    <option value="RELAXED">Relaxed</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="FAST_PACED">Fast-Paced</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-[10px] uppercase text-[#586875]">Dietary</label>
                  <select
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#E3E7E5] text-xs text-[#202B33] bg-white"
                  >
                    <option value="VEG">Vegetarian</option>
                    <option value="JAIN">Jain Pure</option>
                    <option value="NON_VEG">Non-Veg</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#24766F] hover:bg-[#1D605A] active:bg-[#174C47] text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : mode === 'LOGIN' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
