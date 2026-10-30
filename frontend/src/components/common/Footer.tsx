import React from 'react';
import { ShieldCheck, Train, Plane, Bus, Heart } from 'lucide-react';
import { SafarMark } from './SafarLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#142B3B] border-t border-[#263E4E] text-[#93ADBE] pt-12 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1B3242] border border-[#263E4E] flex items-center justify-center">
                <SafarMark size={22} inverted />
              </div>
              <span className="font-extrabold text-lg text-white">
                Safar<span className="text-[#84C0B6]">Saarthi</span>
              </span>
            </div>
            <p className="text-xs text-[#93ADBE] leading-relaxed">
              India's autonomous multi-agent travel intelligence platform. Unifying Indian Railways, domestic air routes, and intercity buses with transparent pricing and itinerary synthesis.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#84C0B6] font-medium">
              <ShieldCheck className="w-4 h-4 text-[#84C0B6]" />
              <span>Official Provider Redirection</span>
            </div>
          </div>

          {/* Transport Networks */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Covered Networks
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-[#93ADBE] hover:text-[#84C0B6]">
                <Train className="w-3.5 h-3.5 text-[#D7A45B]" />
                <span>Indian Railways (IRCTC e-Ticketing)</span>
              </li>
              <li className="flex items-center gap-2 text-[#93ADBE] hover:text-[#84C0B6]">
                <Plane className="w-3.5 h-3.5 text-[#84C0B6]" />
                <span>IndiGo, Air India, SpiceJet, Akasa Air</span>
              </li>
              <li className="flex items-center gap-2 text-[#93ADBE] hover:text-[#84C0B6]">
                <Bus className="w-3.5 h-3.5 text-[#4FA095]" />
                <span>State RTCs (KSRTC, UPSRTC, RSRTC, Zingbus)</span>
              </li>
            </ul>
          </div>

          {/* Agent Architecture */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Multi-Agent Engine
            </h4>
            <ul className="space-y-2 text-xs text-[#93ADBE]">
              <li>• Multi-Modal Route Coordinator</li>
              <li>• Transport Recommendation Agent</li>
              <li>• Heritage &amp; Stay Specialist</li>
              <li>• Activity &amp; Cultural Pacing Agent</li>
              <li>• Hard Budget &amp; Transfer Validator</li>
            </ul>
          </div>

          {/* Transparency & Disclaimer */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Provider Integrity
            </h4>
            <p className="text-[11px] leading-relaxed text-[#688A9F]">
              Safar Saarthi redirects travelers to authorized booking engines and airlines. Fares in demonstration mode represent calibrated historical benchmarks and are never fabricated as live transaction promises.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#263E4E] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#688A9F]">
          <p>© {new Date().getFullYear()} Safar Saarthi (सफ़र सारथी). Crafted for Indian Journeys.</p>
          <div className="flex items-center gap-1 text-[#688A9F] text-xs">
            <span>Built with precision for travelers across India</span>
            <Heart className="w-3.5 h-3.5 text-[#24766F] fill-[#24766F] ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
};
