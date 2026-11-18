import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Loader2, ArrowRight, ShieldCheck, Sparkles, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";
import BrandLogo from "../components/common/BrandLogo";
import AuthBackground from "../components/common/AuthBackground";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await login(formData.email, formData.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <Seo
        title="Sign in"
        description="Sign in to ChatApp and continue your real-time conversations."
        path="/login"
      />

      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-card)]/95 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row transition-all">
        {/* Left Side: Modern Visual Graphics & Brand Showcase */}
        <div className="relative hidden md:flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-rose-500/10 p-10 border-r border-[var(--border-color)]">
          {/* Ambient Glows */}
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

          {/* Top Brand Tag */}
          <div className="relative z-10 flex items-center justify-between">
            <BrandLogo size="md" showText subtitle="Real-time workspace messaging" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)]/80 px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)] backdrop-blur-sm">
              <Sparkles size={12} className="text-amber-500" />
              v2.0 Workspace
            </span>
          </div>

          {/* Center Graphic: Floating Chat UI Mockup */}
          <div className="relative z-10 my-10 space-y-4 max-w-md mx-auto w-full">
            {/* Incoming message preview bubble */}
            <div className="flex items-start gap-3 animate-in fade-in slide-in-from-left duration-300">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-600 font-bold text-white text-xs shadow-md">
                SA
              </div>
              <div className="flex-1 rounded-[22px] rounded-tl-sm border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-md backdrop-blur-md">
                <p className="text-[11px] font-bold text-[var(--accent-primary)] mb-0.5">Sanjeev</p>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                  Hey! The new multi-column workspace with custom color themes is live 🚀
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>10:42 AM</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 font-medium text-xs">
                    👍 2
                  </span>
                </div>
              </div>
            </div>

            {/* Outgoing message preview bubble */}
            <div className="flex items-start gap-3 justify-end animate-in fade-in slide-in-from-right duration-400">
              <div className="flex-1 max-w-[85%] rounded-[22px] rounded-tr-sm border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 p-4 shadow-md">
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                  That looks super clean! Loved the light & dark mode palette options! ✨
                </p>
                <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-muted)]">
                  <span>10:43 AM</span>
                  <CheckCheck size={14} className="text-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security / Trust Badges */}
          <div className="relative z-10 flex items-center justify-between border-t border-[var(--border-color)] pt-6 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Encrypted & secure real-time sessions</span>
            </div>
            <span className="font-semibold text-[var(--text-secondary)]">Cloudinary Media</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 md:p-12">
          {/* Card Header with Visible Brand Logo on all viewports */}
          <div className="mb-8 flex items-center gap-3.5">
            <BrandLogo size="md" />
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Welcome back
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                Enter your credentials to continue your conversations
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500 animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-app)] py-3 pl-11 pr-4 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/70 outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-app)] py-3 pl-11 pr-11 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/70 outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[var(--accent-primary)]/25 transition hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-8 text-center text-xs sm:text-sm text-[var(--text-secondary)]">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-bold text-[var(--accent-primary)] hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Login;
