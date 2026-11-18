import { MessageCircle, CheckCheck, Shield, Sparkles, Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const AuthBackground = ({ children }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-4 sm:p-6 md:p-10 select-none transition-colors duration-300">
      {/* 1. Enhanced Floating Theme Mode Switcher (Top Right) */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-50 flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)]/90 p-1.5 sm:px-3 sm:py-1.5 shadow-xl backdrop-blur-xl transition-all duration-200 hover:scale-105 active:scale-95 hover:border-[var(--accent-primary)] group cursor-pointer"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {/* Glowing circular icon pill */}
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
            isDark
              ? "bg-amber-400/20 text-amber-400 shadow-sm shadow-amber-400/30"
              : "bg-indigo-500/15 text-indigo-600 shadow-sm shadow-indigo-500/20"
          }`}
        >
          {isDark ? (
            <Sun size={15} className="transition-transform group-hover:rotate-45" />
          ) : (
            <Moon size={15} className="transition-transform group-hover:-rotate-12" />
          )}
        </div>

        {/* Text and Active Indicator (expanded on tablet & desktop) */}
        <div className="hidden sm:flex flex-col text-left pr-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {isDark ? "Dark" : "Light"}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          </div>
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">
            {isDark ? "Switch to Light" : "Switch to Dark"}
          </span>
        </div>
      </button>

      {/* 2. Vibrant Atmospheric Multi-Color Gradient Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-Left Emerald & Teal Orb */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-tr from-emerald-400/25 to-teal-500/20 blur-[90px] animate-pulse" />

        {/* Top-Right Coral & Rose Orb */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-bl from-rose-400/25 to-pink-500/20 blur-[90px] animate-pulse" />

        {/* Bottom-Left Violet & Purple Orb */}
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-tr from-violet-500/20 to-purple-400/15 blur-[100px]" />

        {/* Bottom-Right Amber & Cyan Orb */}
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-tl from-amber-400/20 via-teal-400/15 to-cyan-400/20 blur-[100px]" />

        {/* Center Subtle Dynamic Radiance */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[var(--accent-primary)]/5 blur-[120px]" />

        {/* Elegant Dot-Matrix Tech Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.25] dark:opacity-[0.15]"
          style={{
            backgroundImage: `radial-gradient(var(--text-muted) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
      </div>

      {/* 3. Floating Graphic Badges in the Canvas */}
      {/* Floating Pill Top Left */}
      <div className="absolute top-12 left-6 lg:left-16 z-10 hidden xl:flex items-center gap-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/75 px-4 py-2.5 shadow-xl backdrop-blur-md animate-float-slow">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
          <MessageCircle size={15} />
        </div>
        <div className="text-left">
          <p className="text-[11px] font-bold text-[var(--text-primary)]">Real-time Presence</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-emerald-500 font-semibold">Active now</span>
          </div>
        </div>
      </div>

      {/* Floating Pill Top Right */}
      <div className="absolute top-16 right-6 lg:right-28 z-10 hidden xl:flex items-center gap-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/75 px-4 py-2.5 shadow-xl backdrop-blur-md animate-float-reverse">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
          <CheckCheck size={16} />
        </div>
        <div className="text-left">
          <p className="text-[11px] font-bold text-[var(--text-primary)]">Read Receipts</p>
          <p className="text-[10px] text-[var(--text-muted)]">Double blue verification</p>
        </div>
      </div>

      {/* Floating Pill Bottom Left */}
      <div className="absolute bottom-12 left-8 lg:left-20 z-10 hidden xl:flex items-center gap-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/75 px-4 py-2.5 shadow-xl backdrop-blur-md animate-float-reverse">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
          <Shield size={15} />
        </div>
        <div className="text-left">
          <p className="text-[11px] font-bold text-[var(--text-primary)]">Secure Cloud Storage</p>
          <p className="text-[10px] text-[var(--text-muted)]">Cloudinary Media Powered</p>
        </div>
      </div>

      {/* Floating Pill Bottom Right */}
      <div className="absolute bottom-16 right-8 lg:right-20 z-10 hidden xl:flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/75 px-3.5 py-2 shadow-xl backdrop-blur-md animate-float-slow">
        <span className="text-base">🚀</span>
        <span className="text-base">❤️</span>
        <span className="text-base">👍</span>
        <span className="text-xs font-semibold text-[var(--text-primary)] ml-1">Live Reactions</span>
      </div>

      {/* 4. Main Wrapped Content Card */}
      <div className="relative z-20 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuthBackground;
