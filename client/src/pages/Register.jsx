import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Sparkles, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";
import BrandLogo from "../components/common/BrandLogo";
import AuthBackground from "../components/common/AuthBackground";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
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
    const { name, email, password } = formData;

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await register(name.trim(), email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <Seo
        title="Create account"
        description="Create your ChatApp account to start secure real-time conversations."
        path="/register"
      />

      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-card)]/95 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row transition-all">
        {/* Left Side: Modern Visual Graphics & Feature Highlights */}
        <div className="relative hidden md:flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-rose-500/10 p-10 border-r border-[var(--border-color)]">
          {/* Ambient Glows */}
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

          {/* Top Brand Tag */}
          <div className="relative z-10 flex items-center justify-between">
            <BrandLogo size="md" showText subtitle="Instant team communication" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)]/80 px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)] backdrop-blur-sm">
              <Sparkles size={12} className="text-amber-500" />
              Join in seconds
            </span>
          </div>

          {/* Center Graphic: Feature Showcase Cards */}
          <div className="relative z-10 my-10 space-y-3 max-w-md mx-auto w-full">
            <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/90 p-4 shadow-sm backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Real-Time Messaging</h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Single, double grey, and double blue delivery & read receipts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/90 p-4 shadow-sm backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Group Chats & Mentions</h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Create groups, mention members with @, and collaborate effortlessly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/90 p-4 shadow-sm backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Rich Media via Cloudinary</h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Share photos, videos, documents, and voice notes with preview.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 flex items-center justify-between border-t border-[var(--border-color)] pt-6 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Private & secure communications</span>
            </div>
            <span className="font-semibold text-[var(--text-secondary)]">Custom Themes</span>
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 md:p-12">
          {/* Card Header with Visible Brand Logo on all viewports */}
          <div className="mb-8 flex items-center gap-3.5">
            <BrandLogo size="md" />
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Create an account
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                Sign up to start connecting with your contacts
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500 animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Sanjeev Kumar"
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-app)] py-3 pl-11 pr-4 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/70 outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                />
              </div>
            </div>

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
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Password (min. 6 characters)
              </label>
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-8 text-center text-xs sm:text-sm text-[var(--text-secondary)]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-[var(--accent-primary)] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Register;
