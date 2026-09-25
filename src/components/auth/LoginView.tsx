import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shop } from '../../types';
import burgundySilkImg from '../../assets/images/burgundy_silk_wave_1790000040651.jpg';
import { BrandLogo } from '../common/BrandLogo';
import { FunkyBackgroundTypography } from './FunkyBackgroundTypography';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Cloud,
  Shield,
  ChevronRight,
  Zap,
  Layers,
  Sparkles,
  Check,
  X,
  Store,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginAdmin, loginEmployee, switchRole } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);

  // Form inputs
  const [identifier, setIdentifier] = useState('superadmin@pos-erp.com');
  const [password, setPassword] = useState('SuperAdmin123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState('shop_1');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [activeFeatureModal, setActiveFeatureModal] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/test/shops')
      .then((r) => r.json())
      .then((d) => {
        if (d.shops && d.shops.length > 0) {
          setShops(d.shops);
          setSelectedShopId(d.shops[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setForgotMessage(null);

    const trimmedId = identifier.trim();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      setError('Please enter your email or username and password.');
      setLoading(false);
      return;
    }

    try {
      if (
        trimmedId.toUpperCase().startsWith('EMP-') ||
        (/^\d{2,4}$/.test(trimmedPass) && !trimmedId.includes('@'))
      ) {
        await loginEmployee(selectedShopId, trimmedId.toUpperCase(), trimmedPass);
      } else {
        await loginAdmin(trimmedId, trimmedPass);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = async (targetRole: 'SUPER_ADMIN' | 'SHOP_ADMIN' | 'SHIFT_LEAD' | 'CASHIER') => {
    setLoading(true);
    setError(null);
    try {
      await switchRole(targetRole);
    } catch (err: any) {
      setError(err.message || 'Role switch failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectIndustryLogin = async (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setLoading(true);
    setError(null);
    try {
      await loginAdmin(email, pass);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#F8F4EE] text-[#191919] flex flex-col justify-between select-none font-sans">
      
      {/* ========================================================================= */}
      {/* 1. LUXURY BACKGROUND: MARBLE VEINS, SILK CURVES, SPHERES, RINGS          */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Warm ivory canvas with subtle natural marble gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF6F0] via-[#F6F1EA] to-[#EEE7DD]" />

        {/* Natural Marble Veining Texture (SVG) */}
        <svg
          className="absolute inset-0 w-full h-full opacity-35 mix-blend-multiply"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M -100 240 Q 350 170, 650 310 T 1250 230 Q 1550 270, 1950 170"
            fill="none"
            stroke="#DFD2C0"
            strokeWidth="1.2"
          />
          <path
            d="M 180 40 Q 480 170, 780 110 T 1380 270 Q 1680 140, 2000 210"
            fill="none"
            stroke="#D8C8B4"
            strokeWidth="0.9"
          />
          <path
            d="M 80 740 Q 480 610, 880 770 T 1680 670"
            fill="none"
            stroke="#DDD0BF"
            strokeWidth="1.2"
          />
          <path
            d="M 500 850 Q 800 700, 1100 820 T 1800 720"
            fill="none"
            stroke="#E4D8C8"
            strokeWidth="0.8"
          />
        </svg>

        {/* TOP-RIGHT: TRANSLUCENT PEACH/ROSE RINGS & AMBIENT GLOW */}
        <div className="absolute -top-24 -right-24 sm:-top-28 sm:-right-28 w-[380px] sm:w-[580px] h-[380px] sm:h-[580px] pointer-events-none">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-[#E5D2C5]/60" />
          <div className="absolute inset-12 sm:inset-16 rounded-full border border-[#DCBEAD]/45" />
          <div className="absolute inset-24 sm:inset-32 rounded-full bg-gradient-to-br from-[#F5E2D7]/40 to-transparent blur-xl" />
        </div>

        {/* 3D Floating Metallic Rose-Gold Orb with Specular Highlight */}
        <div className="absolute top-[6%] right-[24%] sm:right-[32%] xl:right-[38%] w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#FFF0E6] via-[#D89F82] to-[#7C4832] shadow-[0_8px_18px_rgba(124,72,50,0.38)] border border-[#FFE4D3]/80 pointer-events-none" />

        {/* Large sweeping circular arc in top-center */}
        <div className="hidden sm:block absolute -top-36 left-[42%] w-[720px] h-[720px] rounded-full border border-[#E5D5C4]/50 pointer-events-none" />

        {/* ======================================================================= */}
        {/* BOTTOM-LEFT: AUTHENTIC PHOTOGRAPHIC BURGUNDY SATIN SILK DRAPE           */}
        {/* Seamless feathered mask flowing from bottom-left with zero hard edges   */}
        {/* ======================================================================= */}
        <div
          className="absolute -bottom-6 -left-6 sm:-bottom-10 sm:-left-10 w-[300px] sm:w-[460px] xl:w-[580px] h-[280px] sm:h-[420px] xl:h-[520px] pointer-events-none z-0 overflow-hidden"
          style={{
            maskImage: 'radial-gradient(circle at 10% 90%, rgba(0,0,0,1) 42%, rgba(0,0,0,0.75) 65%, transparent 88%)',
            WebkitMaskImage: 'radial-gradient(circle at 10% 90%, rgba(0,0,0,1) 42%, rgba(0,0,0,0.75) 65%, transparent 88%)',
          }}
        >
          {/* Ambient rich crimson glow backing */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#38040C] via-[#65101E]/80 to-transparent" />

          {/* Genuine photographic satin silk image */}
          <img
            src={burgundySilkImg}
            alt=""
            className="w-full h-full object-cover object-left-bottom mix-blend-multiply opacity-95 transform -scale-x-100 rotate-[8deg] contrast-[1.12]"
            referrerPolicy="no-referrer"
          />

          {/* Subtle liquid gold specular highlight overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#F7D8B5]/20 to-transparent mix-blend-overlay" />
        </div>

        {/* BOTTOM-RIGHT: TROPICAL FOLIAGE SILHOUETTE CASTING SOFT SHADOW */}
        <div className="absolute -bottom-10 -right-6 w-44 sm:w-64 h-52 sm:h-72 pointer-events-none opacity-25 filter blur-[1.5px] mix-blend-multiply">
          <svg viewBox="0 0 200 240" fill="#2A221C" xmlns="http://www.w3.org/2000/svg">
            <path d="M 220 240 C 180 180, 160 120, 150 40 C 130 90, 90 130, 40 160 C 90 160, 130 180, 160 240 Z" />
            <path d="M 220 200 C 170 160, 120 120, 70 80 C 110 110, 150 140, 180 200 Z" />
            <path d="M 200 240 C 170 190, 130 160, 80 140 C 120 170, 160 200, 190 240 Z" />
            <path d="M 210 140 C 170 110, 140 70, 110 10 C 130 50, 160 90, 190 130 Z" />
          </svg>
        </div>

        {/* BOTTOM-RIGHT: DOTTED MATRIX PATTERN (6x6) */}
        <div className="hidden sm:block absolute bottom-12 right-12 pointer-events-none opacity-35">
          <div className="grid grid-cols-6 gap-2.5">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i} className="w-1 h-1 rounded-full bg-[#C4B4A2]" />
            ))}
          </div>
        </div>

        {/* FUNKY & CALLIGRAPHIC BACKGROUND TYPOGRAPHY CANVAS */}
        <FunkyBackgroundTypography />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP HEADER ROW + UPPER ACCENT CALLOUT                                   */}
      {/* ========================================================================= */}
      <header className="relative z-20 w-full flex items-center justify-between px-5 sm:px-10 xl:px-14 pt-4 sm:pt-6 pb-2 shrink-0">
        
        {/* Brand Logo: Authentic LUMORA with Signature Red Arc "O" & Tagline */}
        <BrandLogo
          size="md"
          variant="dark"
          showTagline={true}
          taglineText="ONE SYSTEM. MORE POSSIBILITIES."
        />

        {/* Right Header: SIMPLE | SECURE | SMART */}
        <div className="flex items-center space-x-2 sm:space-x-4 text-[8.5px] sm:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.24em] text-[#423C36] uppercase bg-white/40 sm:bg-transparent px-3 py-1 sm:p-0 rounded-full border border-black/5 sm:border-none shadow-2xs sm:shadow-none">
          <span className="hover:text-[#681822] transition cursor-default">Simple</span>
          <span className="text-[#BFB4A7]">|</span>
          <span className="hover:text-[#681822] transition cursor-default">Secure</span>
          <span className="text-[#BFB4A7]">|</span>
          <span className="hover:text-[#681822] transition cursor-default">Smart</span>
        </div>

      </header>

      {/* ========================================================================= */}
      {/* 2.5 EDITORIAL ZONE: IN THE LEFT CORNER UNDER LOGO (ALL SCREEN SIZES)       */}
      {/* Positioned under logo with ~10 cm spacing across mobile, tablet & desktop */}
      {/* ========================================================================= */}
      <div className="relative z-20 w-full px-5 sm:px-8 md:px-0 md:absolute md:top-[260px] lg:top-[285px] xl:top-[295px] 2xl:top-[320px] md:left-6 lg:left-8 xl:left-10 2xl:left-14 text-left shrink-0 max-w-sm mt-12 sm:mt-16 md:mt-0">
        <span className="text-[9px] sm:text-[9.5px] md:text-[10px] font-bold tracking-[0.3em] text-[#7A1D2B] uppercase block mb-1">
          More Than A POS
        </span>

        <h1
          className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-bold text-[#141414] leading-[1.02] tracking-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Everything
          <br className="hidden sm:inline" />{' '}
          <span className="text-[#6B1724]">Connected.</span>
        </h1>

        <div className="mt-1.5 space-y-0.5 text-[8px] sm:text-[8.5px] md:text-[9px] font-bold tracking-[0.2em] text-[#4A433D] uppercase">
          <p>Manage. Monitor. Grow.</p>
          <p>All in one place.</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CENTRAL STAGE (BALANCED CENTERED BILATERAL NETWORK)               */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-start md:justify-center px-4 sm:px-8 xl:px-14 pt-1 pb-4 md:py-2 my-0 md:my-auto max-w-[1500px] mx-auto">

        {/* FAR-LEFT BOTTOM ACCENT (TECHNOLOGY THAT MOVES YOUR BUSINESS FORWARD) */}
        <div className="hidden xl:block absolute bottom-10 sm:bottom-12 left-8 sm:left-12 xl:left-16 text-left z-20 pointer-events-none">
          <div className="w-7 h-[1.5px] bg-[#6B1724] mb-1.5" />
          <div className="text-[9px] font-bold tracking-[0.22em] text-[#3D3732] uppercase space-y-0.5">
            <p>Technology That Moves</p>
            <p className="text-[#6B1724]">Your Business Forward.</p>
          </div>
          <div className="text-[8px] font-bold tracking-[0.26em] text-[#7A7167] uppercase mt-1">
            People • Products • Progress
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* CENTRAL NEURAL HUB: [LEFT NODES] + [RED CIRCUIT] + [DEVICE] + [CYAN CIRCUIT] + [RIGHT NODES] */}
        {/* Shifted concurrently 1.5 cm downwards with Login Card & "Build for a Better Tomorrow" */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex flex-col xl:flex-row items-center justify-center relative z-20 w-full max-w-[1050px] mx-auto translate-y-8 sm:translate-y-6 md:translate-y-4 lg:translate-y-0 xl:-translate-y-2 2xl:-translate-y-2">
          
          {/* LEFT 3 FEATURE NODES (BORDERLESS, NO TEXT, PRECISION-ALIGNED WITH CIRCUIT PATHS) */}
          <div className="hidden xl:block relative h-[360px] w-12 shrink-0 z-20">
            {/* Node 1: Inventory (Aligned with circuit wire at Y=50) */}
            <button
              type="button"
              onClick={() => setActiveFeatureModal('inventory')}
              title="Inventory"
              className="group absolute top-[26px] left-0 w-12 h-12 rounded-full bg-[#6B1724] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer border-none outline-none hover:shadow-[0_0_20px_rgba(230,90,108,0.6)]"
            >
              <span className="absolute inset-0 rounded-full bg-[#E65A6C]/30 animate-ping opacity-25 pointer-events-none" style={{ animationDuration: '3.2s' }} />
              <Package className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </button>

            {/* Node 2: Sales (Aligned with circuit wire at Y=180) */}
            <button
              type="button"
              onClick={() => setActiveFeatureModal('sales')}
              title="Sales"
              className="group absolute top-[156px] left-0 w-12 h-12 rounded-full bg-[#6B1724] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer border-none outline-none hover:shadow-[0_0_20px_rgba(230,90,108,0.6)]"
            >
              <span className="absolute inset-0 rounded-full bg-[#E65A6C]/30 animate-ping opacity-25 pointer-events-none" style={{ animationDuration: '2.5s', animationDelay: '0.6s' }} />
              <ShoppingCart className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </button>

            {/* Node 3: Customers (Aligned with circuit wire at Y=310) */}
            <button
              type="button"
              onClick={() => setActiveFeatureModal('customers')}
              title="Customers"
              className="group absolute top-[286px] left-0 w-12 h-12 rounded-full bg-[#6B1724] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer border-none outline-none hover:shadow-[0_0_20px_rgba(230,90,108,0.6)]"
            >
              <span className="absolute inset-0 rounded-full bg-[#E65A6C]/30 animate-ping opacity-25 pointer-events-none" style={{ animationDuration: '3.5s', animationDelay: '1.2s' }} />
              <Users className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </button>
          </div>

          {/* LEFT CIRCUIT SVG CONNECTOR (ANIMATED CRIMSON/CORAL STRINGS & DATA PARTICLES) */}
          <div className="hidden xl:block w-[85px] xl:w-[95px] h-[360px] shrink-0 relative z-25 pointer-events-none">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 90 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="glowRedHalo" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Base Structural Circuit Strings */}
              <path d="M 0 50 C 40 50, 55 125, 90 180" stroke="#3D0B12" strokeWidth="1.8" />
              <path d="M 0 180 C 35 180, 55 180, 90 180" stroke="#3D0B12" strokeWidth="1.8" />
              <path d="M 0 310 C 40 310, 55 235, 90 180" stroke="#3D0B12" strokeWidth="1.8" />

              {/* Animated Flowing Data Streams (Stroke Pulses toward Login Card) */}
              <path
                d="M 0 50 C 40 50, 55 125, 90 180"
                stroke="#E63946"
                strokeWidth="2.2"
                strokeDasharray="22 130"
                strokeLinecap="round"
                opacity="0.85"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="152"
                  to="0"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </path>

              <path
                d="M 0 180 C 35 180, 55 180, 90 180"
                stroke="#E63946"
                strokeWidth="2.2"
                strokeDasharray="18 100"
                strokeLinecap="round"
                opacity="0.85"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="118"
                  to="0"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </path>

              <path
                d="M 0 310 C 40 310, 55 235, 90 180"
                stroke="#E63946"
                strokeWidth="2.2"
                strokeDasharray="22 130"
                strokeLinecap="round"
                opacity="0.85"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="152"
                  to="0"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </path>

              {/* Traveling Glowing Photons along the Strings */}
              <circle r="3.4" fill="#FF4D64" filter="url(#glowRedHalo)">
                <animateMotion
                  path="M 0 50 C 40 50, 55 125, 90 180"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="1.6" fill="#FFFFFF">
                <animateMotion
                  path="M 0 50 C 40 50, 55 125, 90 180"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>

              <circle r="3.4" fill="#FF4D64" filter="url(#glowRedHalo)">
                <animateMotion
                  path="M 0 180 C 35 180, 55 180, 90 180"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="1.6" fill="#FFFFFF">
                <animateMotion
                  path="M 0 180 C 35 180, 55 180, 90 180"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>

              <circle r="3.4" fill="#FF4D64" filter="url(#glowRedHalo)">
                <animateMotion
                  path="M 0 310 C 40 310, 55 235, 90 180"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="1.6" fill="#FFFFFF">
                <animateMotion
                  path="M 0 310 C 40 310, 55 235, 90 180"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Pulsing Glowing Crimson Junction Nodes */}
              <circle cx="12" cy="50" r="8" fill="#E65A6C" opacity="0.35" filter="url(#glowRedHalo)">
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="12" cy="50" r="5" stroke="#E65A6C" strokeWidth="1.2" fill="none" />
              <circle cx="12" cy="50" r="3" fill="#8C1C2A" />

              <circle cx="48" cy="90" r="10" fill="#E65A6C" opacity="0.4" filter="url(#glowRedHalo)">
                <animate attributeName="r" values="8;11;8" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0.6;0.25" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="48" cy="90" r="6" stroke="#E65A6C" strokeWidth="1.5" fill="none" />
              <circle cx="48" cy="90" r="3.5" fill="#B32638" />

              <circle cx="12" cy="180" r="8" fill="#E65A6C" opacity="0.35" filter="url(#glowRedHalo)">
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="12" cy="180" r="5" stroke="#E65A6C" strokeWidth="1.2" fill="none" />
              <circle cx="12" cy="180" r="3" fill="#8C1C2A" />

              <circle cx="50" cy="180" r="10" fill="#E65A6C" opacity="0.4" filter="url(#glowRedHalo)">
                <animate attributeName="r" values="8;11;8" dur="2.1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0.6;0.25" dur="2.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="50" cy="180" r="6" stroke="#E65A6C" strokeWidth="1.5" fill="none" />
              <circle cx="50" cy="180" r="3.5" fill="#B32638" />

              <circle cx="12" cy="310" r="8" fill="#E65A6C" opacity="0.35" filter="url(#glowRedHalo)">
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="12" cy="310" r="5" stroke="#E65A6C" strokeWidth="1.2" fill="none" />
              <circle cx="12" cy="310" r="3" fill="#8C1C2A" />

              <circle cx="48" cy="270" r="10" fill="#E65A6C" opacity="0.4" filter="url(#glowRedHalo)">
                <animate attributeName="r" values="8;11;8" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0.6;0.25" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="48" cy="270" r="6" stroke="#E65A6C" strokeWidth="1.5" fill="none" />
              <circle cx="48" cy="270" r="3.5" fill="#B32638" />

              <circle cx="85" cy="180" r="11" fill="#E65A6C" opacity="0.45" filter="url(#glowRedHalo)">
                <animate attributeName="r" values="9;12;9" dur="2.0s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.0s" repeatCount="indefinite" />
              </circle>
              <circle cx="85" cy="180" r="7" stroke="#E65A6C" strokeWidth="1.5" fill="none" />
              <circle cx="85" cy="180" r="4" fill="#C92A3E" />
            </svg>
          </div>

          {/* CENTER DARK DEVICE: SLATE PHONE CARD (SHIFTED UPWARDS IN SYNC WITH TAGLINE ACROSS ALL SCREENS) */}
          <div className="w-full max-w-[340px] sm:max-w-[370px] xl:max-w-[355px] shrink-0 z-20 mt-1 sm:mt-2 md:mt-0 mb-2 xl:my-0 relative">
            
            {/* HERO SCRIPT TAGLINE: "Build for a Better Tomorrow." (DOMINANT VISUAL ANCHOR) */}
            <div
              className="absolute bottom-full mb-2.5 sm:mb-3.5 md:bottom-auto md:top-[-10px] lg:top-[-18px] right-1 sm:right-3 md:right-auto md:left-[calc(100%+16px)] lg:left-[calc(100%+24px)] xl:left-[calc(104%+32px)] z-40 pointer-events-none select-none text-right md:text-left -rotate-[4deg] sm:-rotate-[6deg] md:-rotate-[8deg] origin-bottom-right md:origin-bottom-left"
            >
              {/* Grand Cursive Display */}
              <div
                className="text-2xl sm:text-3xl md:text-4xl lg:text-[48px] xl:text-[56px] 2xl:text-[62px] text-[#550B16] font-extrabold leading-[0.98] tracking-tight drop-shadow-[0_4px_16px_rgba(85,11,22,0.28)]"
                style={{
                  fontFamily: "'Caveat', cursive, sans-serif",
                  fontWeight: 700,
                  WebkitTextStroke: '0.6px #4A0812',
                }}
              >
                <span className="block whitespace-nowrap bg-gradient-to-r from-[#4A0812] via-[#6B1724] to-[#8A1E2E] bg-clip-text text-transparent">
                  Build for a Better
                </span>
                <span className="block whitespace-nowrap pr-1 md:pr-0 md:pl-2 bg-gradient-to-r from-[#6B1724] via-[#8A1E2E] to-[#B32638] bg-clip-text text-transparent">
                  Tomorrow. ✨
                </span>
              </div>

              {/* Bold Double Layered Brush Underline */}
              <div className="flex flex-col items-end md:items-start gap-1 mt-1.5">
                <div className="w-20 sm:w-28 md:w-36 lg:w-48 xl:w-56 h-[3px] md:h-[4px] bg-gradient-to-r from-[#6B1724] via-[#B32638] to-[#E65A6C] rounded-full shadow-xs" />
                <div className="w-12 sm:w-16 md:w-24 lg:w-32 h-[1.5px] bg-[#6B1724]/60 rounded-full" />
              </div>
            </div>

            <div className="w-full bg-gradient-to-b from-[#0D1B2A] via-[#0B1724] to-[#08121D] rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 text-white shadow-[0_20px_50px_-10px_rgba(8,18,29,0.7)] border border-[#1E334A] relative">
              
              {/* Device Header Brand (Authentic LUMORA Logo on Dark) */}
              <div className="flex flex-col items-center justify-center text-center mb-2">
                <BrandLogo
                  size="xs"
                  variant="on-dark"
                  align="center"
                  showTagline={true}
                  taglineText="ONE SYSTEM. MORE POSSIBILITIES."
                />
              </div>

              {/* Title Section */}
              <div className="text-center mb-3">
                <span className="text-[9px] sm:text-[9.5px] tracking-[0.24em] text-[#9EAFC2] uppercase block font-medium mb-0.5">
                  Welcome Back
                </span>
                <h2
                  className="text-2xl sm:text-[28px] font-serif font-bold text-white tracking-tight leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Sign In
                </h2>
                <div className="w-6 h-[1.5px] bg-[#6B1724] mx-auto mt-1 mb-1.5" />
                <p className="text-[10px] sm:text-[10.5px] text-[#8C9EB3] max-w-[240px] mx-auto leading-normal">
                  Access your dashboard and keep your business moving.
                </p>
              </div>

              {/* Feedback Error / Toast */}
              {error && (
                <div className="mb-2.5 p-2 bg-red-950/70 border border-red-800/80 text-red-200 rounded-xl text-xs font-medium text-center">
                  {error}
                </div>
              )}

              {forgotMessage && (
                <div className="mb-2.5 p-2 bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 rounded-xl text-xs font-medium text-center">
                  {forgotMessage}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSignIn} className="space-y-2.5">
                
                {/* Email or Username */}
                <div className="relative flex items-center bg-[#132233] border border-[#23384F] focus-within:border-[#8A1F30] rounded-xl transition-all">
                  <div className="pl-3 pr-2 text-[#7C90A6]">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Email or Username"
                    className="w-full py-2 sm:py-2.5 pr-3 bg-transparent text-xs text-white placeholder-[#687C91] font-medium focus:outline-hidden"
                  />
                </div>

                {/* Password */}
                <div className="relative flex items-center bg-[#132233] border border-[#23384F] focus-within:border-[#8A1F30] rounded-xl transition-all">
                  <div className="pl-3 pr-2 text-[#7C90A6]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full py-2 sm:py-2.5 pr-2 bg-transparent text-xs text-white placeholder-[#687C91] font-medium focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-3 text-[#7C90A6] hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Checkbox & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center space-x-2 text-[#9FB1C4] cursor-pointer font-medium select-none"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-[4px] flex items-center justify-center transition ${
                        rememberMe ? 'bg-[#7A1D2B] text-white' : 'border border-[#354960] bg-[#132233]'
                      }`}
                    >
                      {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span className="text-[10px] sm:text-[10.5px]">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setForgotMessage('Password reset instructions sent to your email.')}
                    className="text-[10px] sm:text-[10.5px] text-[#A2B4C7] hover:text-white cursor-pointer transition"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Action with Subtle Loading Spinner Overlay */}
                <button
                  type="submit"
                  id="lumora-login-submit-button"
                  disabled={loading}
                  className="relative overflow-hidden w-full py-2.5 bg-gradient-to-r from-[#6A1624] to-[#7F1C2C] hover:from-[#58111D] hover:to-[#6E1826] active:scale-[0.99] text-white rounded-xl font-bold text-xs tracking-wider transition-all duration-200 shadow-md disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2 mt-1 select-none"
                >
                  {/* Subtle Loading Spinner Overlay */}
                  {loading && (
                    <span className="absolute inset-0 bg-[#4A0E17]/85 backdrop-blur-[1.5px] flex items-center justify-center space-x-2 z-10 transition-opacity animate-in fade-in duration-150">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white/95" />
                      <span className="text-white text-xs font-semibold tracking-wide">Authenticating...</span>
                    </span>
                  )}

                  <span className={loading ? 'invisible' : 'flex items-center space-x-2'}>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>

              </form>

              {/* OR Divider */}
              <div className="relative my-2.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1C2E42]"></div>
                </div>
                <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-bold">
                  <span className="bg-[#0B1724] px-2.5 text-[#607387]">or</span>
                </div>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={() => handleQuickRole('SHOP_ADMIN')}
                disabled={loading}
                className="w-full py-2 bg-[#132233] hover:bg-[#1A2E44] border border-[#23384F] text-[#DCE5EF] rounded-xl font-semibold text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Instant Demo Accounts Switcher Pill */}
              <div className="mt-3 pt-2.5 border-t border-[#1C2E42]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] sm:text-[8.5px] font-bold uppercase tracking-wider text-[#A0B2C4] flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-[#D9485C]" />
                    <span>Test Isolated Architecture Portals</span>
                  </span>
                  <span className="text-[8px] text-[#607387]">1-Tap Logins</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-white/10">
                  <button
                    type="button"
                    onClick={() => handleQuickRole('SUPER_ADMIN')}
                    className="p-1.5 text-left rounded-lg border border-[#7A1D2B]/50 bg-[#7A1D2B]/20 hover:bg-[#7A1D2B]/35 transition cursor-pointer"
                  >
                    <span className="font-bold text-white block text-[10px] sm:text-[10.5px]">👑 Super Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-[#BAC9D8]">Platform Hub</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectIndustryLogin('hospital@lumora.com', 'Hospital123!')}
                    className="p-1.5 text-left rounded-lg border border-teal-600/40 bg-teal-950/40 hover:bg-teal-900/50 transition cursor-pointer"
                  >
                    <span className="font-bold text-white block text-[10px] sm:text-[10.5px]">🏥 Hospital Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-[#BAC9D8]">Clinic EHR Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectIndustryLogin('gym@lumora.com', 'Gym123!')}
                    className="p-1.5 text-left rounded-lg border border-amber-600/40 bg-amber-950/40 hover:bg-amber-900/50 transition cursor-pointer"
                  >
                    <span className="font-bold text-white block text-[10px] sm:text-[10.5px]">🏋️ Gym Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-[#BAC9D8]">Members & Plans</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectIndustryLogin('restaurant@lumora.com', 'Restaurant123!')}
                    className="p-1.5 text-left rounded-lg border border-orange-600/40 bg-orange-950/40 hover:bg-orange-900/50 transition cursor-pointer"
                  >
                    <span className="font-bold text-white block text-[10px] sm:text-[10.5px]">🍽️ Dining Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-[#BAC9D8]">Tables & KOT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectIndustryLogin('rental@lumora.com', 'Rental123!')}
                    className="p-1.5 text-left rounded-lg border border-indigo-600/40 bg-indigo-950/40 hover:bg-indigo-900/50 transition cursor-pointer"
                  >
                    <span className="font-bold text-white block text-[10px] sm:text-[10.5px]">🚗 Rental Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-[#BAC9D8]">Fleet & Deposits</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectIndustryLogin('repair@lumora.com', 'Repair123!')}
                    className="p-1.5 text-left rounded-lg border border-cyan-600/40 bg-cyan-950/40 hover:bg-cyan-900/50 transition cursor-pointer"
                  >
                    <span className="font-bold text-white block text-[10px] sm:text-[10.5px]">🔧 Repair Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-[#BAC9D8]">Lab & Job Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickRole('SHOP_ADMIN')}
                    className="p-1.5 text-left rounded-lg border border-sky-600/40 bg-sky-950/40 hover:bg-sky-900/50 transition cursor-pointer"
                  >
                    <span className="font-bold text-white block text-[10px] sm:text-[10.5px]">🛒 Grocery Admin</span>
                    <span className="text-[7.5px] sm:text-[8px] text-[#BAC9D8]">Retail POS Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickRole('CASHIER')}
                    className="p-1.5 text-left rounded-lg border border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/50 transition cursor-pointer"
                  >
                    <span className="font-bold text-white block text-[10px] sm:text-[10.5px]">⚡ Cashier</span>
                    <span className="text-[7.5px] sm:text-[8px] text-[#BAC9D8]">Fast Terminal Till</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT CIRCUIT SVG CONNECTOR (ANIMATED CYAN STRINGS & DATA PARTICLES) */}
          <div className="hidden xl:block w-[85px] xl:w-[95px] h-[360px] shrink-0 relative z-25 pointer-events-none">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 90 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="glowCyanHalo" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Base Structural Circuit Strings */}
              <path d="M 0 180 C 35 125, 50 50, 90 50" stroke="#081E33" strokeWidth="1.8" />
              <path d="M 0 180 C 35 180, 55 180, 90 180" stroke="#081E33" strokeWidth="1.8" />
              <path d="M 0 180 C 35 235, 50 310, 90 310" stroke="#081E33" strokeWidth="1.8" />

              {/* Animated Flowing Data Streams (Stroke Pulses toward Outward Nodes) */}
              <path
                d="M 0 180 C 35 125, 50 50, 90 50"
                stroke="#38BDF8"
                strokeWidth="2.2"
                strokeDasharray="22 130"
                strokeLinecap="round"
                opacity="0.9"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="152"
                  to="0"
                  dur="2.3s"
                  repeatCount="indefinite"
                />
              </path>

              <path
                d="M 0 180 C 35 180, 55 180, 90 180"
                stroke="#38BDF8"
                strokeWidth="2.2"
                strokeDasharray="18 100"
                strokeLinecap="round"
                opacity="0.9"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="118"
                  to="0"
                  dur="1.9s"
                  repeatCount="indefinite"
                />
              </path>

              <path
                d="M 0 180 C 35 235, 50 310, 90 310"
                stroke="#38BDF8"
                strokeWidth="2.2"
                strokeDasharray="22 130"
                strokeLinecap="round"
                opacity="0.9"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="152"
                  to="0"
                  dur="2.7s"
                  repeatCount="indefinite"
                />
              </path>

              {/* Traveling Glowing Photons along the Strings */}
              <circle r="3.4" fill="#38BDF8" filter="url(#glowCyanHalo)">
                <animateMotion
                  path="M 0 180 C 35 125, 50 50, 90 50"
                  dur="2.3s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="1.6" fill="#FFFFFF">
                <animateMotion
                  path="M 0 180 C 35 125, 50 50, 90 50"
                  dur="2.3s"
                  repeatCount="indefinite"
                />
              </circle>

              <circle r="3.4" fill="#38BDF8" filter="url(#glowCyanHalo)">
                <animateMotion
                  path="M 0 180 C 35 180, 55 180, 90 180"
                  dur="1.9s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="1.6" fill="#FFFFFF">
                <animateMotion
                  path="M 0 180 C 35 180, 55 180, 90 180"
                  dur="1.9s"
                  repeatCount="indefinite"
                />
              </circle>

              <circle r="3.4" fill="#38BDF8" filter="url(#glowCyanHalo)">
                <animateMotion
                  path="M 0 180 C 35 235, 50 310, 90 310"
                  dur="2.7s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="1.6" fill="#FFFFFF">
                <animateMotion
                  path="M 0 180 C 35 235, 50 310, 90 310"
                  dur="2.7s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Pulsing Glowing Cyan Junction Nodes */}
              <circle cx="5" cy="180" r="11" fill="#00A3C4" opacity="0.45" filter="url(#glowCyanHalo)">
                <animate attributeName="r" values="9;12;9" dur="2.1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="5" cy="180" r="7" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
              <circle cx="5" cy="180" r="4" fill="#0284C7" />

              <circle cx="42" cy="90" r="10" fill="#00A3C4" opacity="0.4" filter="url(#glowCyanHalo)">
                <animate attributeName="r" values="8;11;8" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="42" cy="90" r="6" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
              <circle cx="42" cy="90" r="3.5" fill="#0284C7" />

              <circle cx="78" cy="50" r="8" fill="#00A3C4" opacity="0.35" filter="url(#glowCyanHalo)">
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2.3s" repeatCount="indefinite" />
              </circle>
              <circle cx="78" cy="50" r="5" stroke="#38BDF8" strokeWidth="1.2" fill="none" />
              <circle cx="78" cy="50" r="3" fill="#0369A1" />

              <circle cx="40" cy="180" r="10" fill="#00A3C4" opacity="0.4" filter="url(#glowCyanHalo)">
                <animate attributeName="r" values="8;11;8" dur="2.0s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2.0s" repeatCount="indefinite" />
              </circle>
              <circle cx="40" cy="180" r="6" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
              <circle cx="40" cy="180" r="3.5" fill="#0284C7" />

              <circle cx="78" cy="180" r="8" fill="#00A3C4" opacity="0.35" filter="url(#glowCyanHalo)">
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="1.9s" repeatCount="indefinite" />
              </circle>
              <circle cx="78" cy="180" r="5" stroke="#38BDF8" strokeWidth="1.2" fill="none" />
              <circle cx="78" cy="180" r="3" fill="#0369A1" />

              <circle cx="42" cy="270" r="10" fill="#00A3C4" opacity="0.4" filter="url(#glowCyanHalo)">
                <animate attributeName="r" values="8;11;8" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="42" cy="270" r="6" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
              <circle cx="42" cy="270" r="3.5" fill="#0284C7" />

              <circle cx="78" cy="310" r="8" fill="#00A3C4" opacity="0.35" filter="url(#glowCyanHalo)">
                <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2.7s" repeatCount="indefinite" />
              </circle>
              <circle cx="78" cy="310" r="5" stroke="#38BDF8" strokeWidth="1.2" fill="none" />
              <circle cx="78" cy="310" r="3" fill="#0369A1" />
            </svg>
          </div>

          {/* RIGHT 3 FEATURE NODES (BORDERLESS, NO TEXT, PRECISION-ALIGNED WITH CIRCUIT PATHS) */}
          <div className="hidden xl:block relative h-[360px] w-12 shrink-0 z-20">
            {/* Node 1: Settings (Aligned with circuit wire at Y=50) */}
            <button
              type="button"
              onClick={() => setActiveFeatureModal('settings')}
              title="Settings"
              className="group absolute top-[26px] left-0 w-12 h-12 rounded-full bg-[#0D1E30] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer border-none outline-none hover:shadow-[0_0_20px_rgba(56,189,248,0.6)]"
            >
              <span className="absolute inset-0 rounded-full bg-[#38BDF8]/30 animate-ping opacity-25 pointer-events-none" style={{ animationDuration: '3.1s' }} />
              <Settings className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </button>

            {/* Node 2: Cloud Sync (Aligned with circuit wire at Y=180) */}
            <button
              type="button"
              onClick={() => setActiveFeatureModal('cloud')}
              title="Cloud Sync"
              className="group absolute top-[156px] left-0 w-12 h-12 rounded-full bg-[#0D1E30] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer border-none outline-none hover:shadow-[0_0_20px_rgba(56,189,248,0.6)]"
            >
              <span className="absolute inset-0 rounded-full bg-[#38BDF8]/30 animate-ping opacity-25 pointer-events-none" style={{ animationDuration: '2.4s', animationDelay: '0.5s' }} />
              <Cloud className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </button>

            {/* Node 3: Security (Aligned with circuit wire at Y=310) */}
            <button
              type="button"
              onClick={() => setActiveFeatureModal('security')}
              title="Security"
              className="group absolute top-[286px] left-0 w-12 h-12 rounded-full bg-[#0D1E30] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer border-none outline-none hover:shadow-[0_0_20px_rgba(56,189,248,0.6)]"
            >
              <span className="absolute inset-0 rounded-full bg-[#38BDF8]/30 animate-ping opacity-25 pointer-events-none" style={{ animationDuration: '3.4s', animationDelay: '1.1s' }} />
              <Shield className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </button>
          </div>

        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RESPONSIVE FEATURE NODES (BORDERLESS, NO TEXT FOR SMARTPHONES & TABLETS) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="xl:hidden w-full max-w-sm mx-auto mt-4 mb-2 z-20 flex items-center justify-center gap-3 translate-y-8 sm:translate-y-6 md:translate-y-4 lg:translate-y-0">
          <button
            type="button"
            onClick={() => setActiveFeatureModal('inventory')}
            title="Inventory"
            className="w-10 h-10 rounded-full bg-[#6B1724] text-white flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer border-none outline-none"
          >
            <Package className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveFeatureModal('sales')}
            title="Sales"
            className="w-10 h-10 rounded-full bg-[#6B1724] text-white flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer border-none outline-none"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveFeatureModal('customers')}
            title="Customers"
            className="w-10 h-10 rounded-full bg-[#6B1724] text-white flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer border-none outline-none"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveFeatureModal('settings')}
            title="Settings"
            className="w-10 h-10 rounded-full bg-[#0D1E30] text-white flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer border-none outline-none"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveFeatureModal('cloud')}
            title="Cloud Sync"
            className="w-10 h-10 rounded-full bg-[#0D1E30] text-white flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer border-none outline-none"
          >
            <Cloud className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveFeatureModal('security')}
            title="Security"
            className="w-10 h-10 rounded-full bg-[#0D1E30] text-white flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer border-none outline-none"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* C. FAR-RIGHT BOTTOM TAGLINE (ONE SYSTEM. MORE POSSIBILITIES. DOWNWARDS) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="hidden xl:block absolute bottom-10 sm:bottom-12 right-8 sm:right-12 xl:right-16 text-right z-20 pointer-events-none">
          <div className="w-7 h-[1.5px] bg-[#7A1D2B] ml-auto mb-1.5" />
          <div className="text-[9px] font-bold tracking-[0.24em] text-[#3E3832] uppercase space-y-0.5">
            <p>One System.</p>
            <p className="text-[#655E56]">More Possibilities.</p>
          </div>
        </div>

      </main>

      {/* ========================================================================= */}
      {/* 4. BOTTOM VALUE BAR: RELIABLE | SECURE | SCALABLE                         */}
      {/* ========================================================================= */}
      <footer className="relative z-20 w-full flex items-center justify-center py-3 sm:py-4 pr-[74px] sm:pr-[80px] md:pr-[86px] shrink-0 border-t border-black/5 sm:border-none">
        <div className="flex items-center space-x-3 sm:space-x-7 text-[9.5px] sm:text-[10.5px] font-bold tracking-[0.16em] sm:tracking-[0.2em] text-[#2C2723] uppercase">
          
          {/* Reliable */}
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-[#191919] fill-[#191919]" />
            <span>Reliable</span>
          </div>

          <div className="w-[1px] h-3.5 bg-[#BFB2A2]" />

          {/* Secure */}
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-[#191919]" />
            <span>Secure</span>
          </div>

          <div className="w-[1px] h-3.5 bg-[#BFB2A2]" />

          {/* Scalable */}
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-[#191919]" />
            <span>Scalable</span>
          </div>

        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 5. FEATURE CARD MODAL PREVIEW                                             */}
      {/* ========================================================================= */}
      {activeFeatureModal && (
        <div
          onClick={() => setActiveFeatureModal(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF7F2] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E6DDD2] relative"
          >
            <button
              onClick={() => setActiveFeatureModal(null)}
              className="absolute top-4 right-4 text-[#8C8377] hover:text-[#141414] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {activeFeatureModal === 'inventory' && (
              <div>
                <div className="w-10 h-10 rounded-full bg-[#6B1724] text-white flex items-center justify-center mb-3 shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#141414]">Real-time Inventory</h3>
                <p className="text-xs text-[#6B6258] mt-1.5 leading-relaxed">
                  Automatic low-stock reorders, batch expiration alerts, multi-warehouse transfers, and unified barcode scanning.
                </p>
              </div>
            )}

            {activeFeatureModal === 'sales' && (
              <div>
                <div className="w-10 h-10 rounded-full bg-[#6B1724] text-white flex items-center justify-center mb-3 shadow-xs">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#141414]">Smart Sales Engine</h3>
                <p className="text-xs text-[#6B6258] mt-1.5 leading-relaxed">
                  Instant barcode checkout, offline transaction sync, split bill payments, and real-time revenue analytics.
                </p>
              </div>
            )}

            {activeFeatureModal === 'customers' && (
              <div>
                <div className="w-10 h-10 rounded-full bg-[#6B1724] text-white flex items-center justify-center mb-3 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#141414]">Customer Loyalty</h3>
                <p className="text-xs text-[#6B6258] mt-1.5 leading-relaxed">
                  Loyalty point tiers, customer purchasing history, custom store credit accounts, and targeted promotions.
                </p>
              </div>
            )}

            {activeFeatureModal === 'settings' && (
              <div>
                <div className="w-10 h-10 rounded-full bg-[#0D1E30] text-white flex items-center justify-center mb-3 shadow-xs">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#141414]">Enterprise Configuration</h3>
                <p className="text-xs text-[#6B6258] mt-1.5 leading-relaxed">
                  Tax rule engines (GST/VAT), receipt printer configurations, employee permission matrices, and payment gateway rules.
                </p>
              </div>
            )}

            {activeFeatureModal === 'cloud' && (
              <div>
                <div className="w-10 h-10 rounded-full bg-[#0D1E30] text-white flex items-center justify-center mb-3 shadow-xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#141414]">Cloud Synchronization</h3>
                <p className="text-xs text-[#6B6258] mt-1.5 leading-relaxed">
                  Sub-second cloud mirroring across all POS hardware and admin portals, with offline-first failover resilience.
                </p>
              </div>
            )}

            {activeFeatureModal === 'security' && (
              <div>
                <div className="w-10 h-10 rounded-full bg-[#0D1E30] text-white flex items-center justify-center mb-3 shadow-xs">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#141414]">Bank-Grade Security</h3>
                <p className="text-xs text-[#6B6258] mt-1.5 leading-relaxed">
                  End-to-end encrypted employee PIN sessions, role-based access control, tamper-evident audit logs, and PCI-DSS compliance.
                </p>
              </div>
            )}

            <button
              onClick={() => setActiveFeatureModal(null)}
              className="w-full mt-4 py-2 bg-[#1C1815] text-white rounded-xl text-xs font-semibold hover:bg-black transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
