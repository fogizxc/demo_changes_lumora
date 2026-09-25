import React from 'react';
import {
  Zap,
  CheckCircle2,
  Flame,
} from 'lucide-react';

export const FunkyBackgroundTypography: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-5 select-none">

      {/* ========================================================================= */}
      {/* 10 FUNKY TAGS - ALL POSITIONED OUTSIDE / AWAY FROM "BUILD FOR A BETTER"   */}
      {/* ZERO TEXTS BEHIND "BUILD FOR A BETTER TOMORROW" OR BEHIND THE NODES       */}
      {/* ZERO TEXTS ON THE LEFT SIDE OF THE LOGIN BLOCK                             */}
      {/* ========================================================================= */}

      {/* TAG 1: "Cha-Ching! $99.00 💸" (High Extreme Top-Right Corner) */}
      <div className="absolute top-[2.5%] right-[3%] sm:right-[5%] rotate-[-11deg] opacity-95">
        <span className="font-pacifico text-base sm:text-xl lg:text-2xl text-[#9E1B32] drop-shadow-[0_2px_8px_rgba(158,27,50,0.25)] flex items-center gap-1.5 sm:gap-2 bg-[#FFF4F2] px-3 py-1 rounded-xl border-2 border-[#9E1B32] shadow-[3px_3px_0px_#9E1B32]">
          Cha-Ching!
          <span className="text-[10px] sm:text-xs font-mono font-black bg-[#9E1B32] text-white px-1.5 py-0.5 rounded-md rotate-[6deg] shadow-xs">
            $99.00
          </span>
        </span>
      </div>

      {/* TAG 2: "The Art of Commerce ~" (Far Outer Right Margin) */}
      <div className="hidden sm:block absolute top-[15%] right-[2%] sm:right-[3.5%] rotate-[-4deg] opacity-90">
        <span className="font-calligraphy text-xl sm:text-2xl lg:text-3xl text-[#4A141E] tracking-wide font-bold drop-shadow-[0_2px_6px_rgba(74,20,30,0.2)]">
          The Art of Commerce ~
        </span>
      </div>

      {/* TAG 3: "RING IT UP! ⚡" (Far Outer Right Margin) */}
      <div className="absolute top-[26%] right-[2%] sm:right-[3.5%] rotate-[12deg] opacity-95">
        <span className="font-marker text-sm sm:text-lg lg:text-xl text-[#0B3C68] bg-[#E8F4FA] px-3 py-1 rounded-xl border-2 border-[#0B3C68] shadow-[3px_3px_0px_#0B3C68] flex items-center gap-1">
          RING IT UP! <span className="text-amber-500">⚡</span>
        </span>
      </div>

      {/* TAG 4: "Zero Glitch Zone 🔥" (Far Outer Right Margin) */}
      <div className="hidden sm:flex absolute top-[37%] right-[2%] sm:right-[3.5%] rotate-[6deg] opacity-90 items-center gap-1.5 px-3 py-1 rounded-full border-2 border-dashed border-[#B32638] bg-[#FFF0F2] shadow-[3px_3px_0px_#B32638]">
        <Flame className="w-3.5 h-3.5 text-[#B32638] fill-[#B32638]" />
        <span className="font-righteous text-xs sm:text-sm text-[#8A1828] tracking-widest uppercase font-bold">
          Zero Glitch Zone 🔥
        </span>
      </div>

      {/* TAG 5: "Stocked & Loaded ✨" (Far Outer Right Flank) */}
      <div className="hidden md:block absolute top-[47%] right-[2%] sm:right-[3.5%] rotate-[-8deg] opacity-95">
        <span className="font-satisfy text-2xl lg:text-3xl text-[#085375] font-bold drop-shadow-[0_2px_8px_rgba(8,83,117,0.25)]">
          Stocked &amp; Loaded ✨
        </span>
      </div>

      {/* TAG 6: "Barcodes & Coffee Sips ☕" (Lower-Mid Canvas, Well Below Tagline) */}
      <div className="hidden sm:block absolute top-[57%] right-[10%] sm:right-[14%] xl:right-[18%] rotate-[-6deg] opacity-95">
        <span className="font-marker text-xs sm:text-sm lg:text-base text-[#4A1E14] flex items-center gap-1.5 bg-[#FFF8E6] px-3 py-1.5 rounded-xl border-2 border-[#D9822B] shadow-[3px_3px_0px_#D9822B]">
          Barcodes &amp; Coffee Sips ☕
        </span>
      </div>

      {/* TAG 7: "HIGH VELOCITY POS ⚡" (Lower Outer Flank) */}
      <div className="hidden sm:block absolute top-[66%] right-[2%] sm:right-[3.5%] rotate-[8deg] opacity-90">
        <span className="font-righteous text-xs sm:text-sm lg:text-base text-[#0F2838] bg-[#DBEAF4] px-3.5 py-1.5 rounded-xl border-2 border-[#20587D] shadow-[3px_3px_0px_#20587D] flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          HIGH VELOCITY POS
        </span>
      </div>

      {/* TAG 8: "Keep the line moving! 🚀" (Lower Canvas, Far Below Tagline) */}
      <div className="absolute top-[75%] right-[14%] sm:right-[18%] xl:right-[22%] rotate-[-5deg] opacity-90">
        <span className="font-pacifico text-base sm:text-xl lg:text-2xl text-[#8A1426] drop-shadow-[0_2px_6px_rgba(138,20,38,0.2)]">
          Keep the line moving! 🚀
        </span>
      </div>

      {/* TAG 9: "NO DOWNTIME. EVER. 🔥" (Bottom Outer Right Margin) */}
      <div className="hidden sm:block absolute top-[84%] right-[2%] sm:right-[3.5%] rotate-[7deg] opacity-95">
        <span className="font-marker text-xs sm:text-sm text-white bg-[#D62828] px-3 py-1 rounded-xl border-2 border-[#911313] shadow-[3px_3px_0px_#6E0808] flex items-center gap-1.5">
          NO DOWNTIME. EVER. 🔥
        </span>
      </div>

      {/* TAG 10: "Tap. Beep. Done! ✔" (Deep Bottom Right Canvas) */}
      <div className="absolute bottom-[3%] right-[10%] sm:right-[14%] xl:right-[18%] rotate-[-6deg] opacity-95">
        <span className="font-marker text-xs sm:text-sm lg:text-base text-[#5A101C] bg-[#FFF2F0] px-3 py-1 rounded-xl border-2 border-[#5A101C] shadow-[3px_3px_0px_#5A101C] flex items-center gap-1.5">
          Tap. Beep. Done! <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
        </span>
      </div>

    </div>
  );
};
