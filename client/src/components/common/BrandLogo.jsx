const BrandLogo = ({
  size = "md",
  showText = false,
  className = "",
  textClassName = "",
  subtitle,
}) => {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Geometric Dual-Prism Logo matching reference design and browser tab favicon */}
      <div
        className={`relative flex ${currentSize} shrink-0 items-center justify-center rounded-2xl bg-[#0B132B] shadow-md shadow-emerald-500/10 border border-[#1E293B] p-1.5 transition-transform hover:scale-105`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          {/* Top-Left Emerald Wing */}
          <path
            d="M 10 10 L 26 10 C 27.65 10 28.5 11.95 27.4 13.2 L 20.6 22.8 C 19.8 23.9 18.2 24 17.2 23.2 L 9.2 14.8 C 8.2 13.7 8.8 10 10 10 Z"
            fill="#10B981"
          />

          {/* Bottom-Right Coral Wing */}
          <path
            d="M 38 38 L 22 38 C 20.35 38 19.5 36.05 20.6 34.8 L 27.4 25.2 C 28.2 24.1 29.8 24 30.8 24.8 L 38.8 33.2 C 39.8 34.3 39.2 38 38 38 Z"
            fill="#F43F5E"
          />
        </svg>
      </div>

      {/* Optional Branding Text */}
      {showText && (
        <div className="flex flex-col text-left">
          <span
            className={`text-lg font-black tracking-tight text-[var(--text-primary)] ${textClassName}`}
          >
            Chat<span className="text-[var(--accent-primary)]">App</span>
          </span>
          {subtitle && (
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
