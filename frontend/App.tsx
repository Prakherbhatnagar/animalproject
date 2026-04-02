import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import {
  PawPrint,
  MapPin,
  Bell,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Activity,
  ArrowRight,
  Heart,
  Coins,
  Search,
  Users,
  Building2,
  Gift,
  Star,
  Zap,
  Camera,
  Navigation,
  HandHeart,
  TrendingUp,
  Award,
  Phone,
  Mail,
  Instagram,
  Twitter,
  Facebook,
  ChevronDown,
  LayoutDashboard,
  Compass,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { apiUrl, getSocketOrigin } from "./lib/apiClient";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type ReportStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "fake";
export type Priority = "low" | "medium" | "high" | "critical";
export type Page =
  | "landing"
  | "login"
  | "reporter"
  | "report-form"
  | "dashboard"
  | "admin"
  | "discover"
  | "ngo"
  | "rewards";
export type AuthMode = "google" | "otp";
export type WizardStep = "details" | "photo" | "location" | "review";

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface AnimalReport {
  id: string;
  /** Client report id (e.g. RPT-xxx); may differ from Mongo `id` in API payloads */
  originalId?: string;
  animalType: string;
  animalCondition: string;
  description: string;
  imageDataUrl: string | null;
  imageHash: string | null;
  treatedImageUrl: string | null;
  location: GeoLocation | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
  reporterName: string;
  reporterPhone: string;
  priority: Priority;
  isFlagged: boolean;
}

export interface ToastItem {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  icon?: string;
}

export interface AppUser {
  /** Mongo user id — sent on login; used to link reports for rewards */
  id?: string;
  name: string;
  phone: string;
  email?: string;
  role: "reporter" | "admin";
  avatar?: string;
}

function rewardsQueryString(user: AppUser | null): string | null {
  if (!user) return null;
  if (user.id) return `userId=${encodeURIComponent(user.id)}`;
  if (user.phone) return `phone=${encodeURIComponent(user.phone)}`;
  if (user.email) return `email=${encodeURIComponent(user.email)}`;
  return null;
}

function formatRewardReason(reason: string): string {
  if (reason === "report_accepted") return "Report accepted";
  if (reason === "report_completed") return "Animal rescued!";
  if (reason === "claimed_to_wallet") return "Claimed to Wallet";
  if (reason.startsWith("redeem:")) return `Redeemed (${reason.slice(7)})`;
  return reason;
}

/** Ledger: credits +N, debits −N (clearer than raw negative numbers in the list) */
function formatLedgerCoins(amount: number): string {
  const n = Math.abs(amount);
  if (amount > 0) return `+${n}`;
  if (amount < 0) return `−${n}`;
  return "0";
}

function reportMatchesSocketId(r: AnimalReport, socketId: string): boolean {
  const pid = String(socketId);
  if (String(r.id) === pid) return true;
  if (r.originalId != null && String(r.originalId) === pid) return true;
  return false;
}

const DEFAULT_MAP_LAT = 28.6139;
const DEFAULT_MAP_LNG = 77.209;

function useNearbyCoords() {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_MAP_LAT,
    lng: DEFAULT_MAP_LNG,
  });
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 15_000 }
    );
  }, []);
  return coords;
}

function normalizeReportPayload(r: Record<string, unknown>): AnimalReport {
  const id = String(r.id ?? r._id ?? r.originalId ?? "");
  const originalId = r.originalId != null ? String(r.originalId) : undefined;
  return {
    ...(r as unknown as AnimalReport),
    id,
    originalId,
    createdAt: r.createdAt ? new Date(r.createdAt as string) : new Date(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt as string) : new Date(),
  };
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────
interface AppContextType {
  page: Page;
  setPage: (p: Page) => void;
  user: AppUser | null;
  setUser: (u: AppUser | null) => void;
  reports: AnimalReport[];
  addReport: (r: AnimalReport) => void;
  removeReport: (id: string) => void;
  updateReportStatus: (id: string, status: ReportStatus, treatedImageDataUrl?: string) => Promise<void>;
  updateReport: (id: string, updateData: Record<string, unknown>) => Promise<void>;
  /** Bumps when reports change over the socket so rewards balance refetches reliably */
  ledgerEpoch: number;
  toasts: ToastItem[];
  addToast: (t: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  imageHashes: Set<string>;
  registerHash: (hash: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

// ─────────────────────────────────────────────
// SCROLL REVEAL HOOK
// ─────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────
const toastConfig = {
  success: { bg: "bg-emerald-950/95", border: "border-emerald-500/40", icon: "✅", bar: "bg-emerald-500", title: "text-emerald-300" },
  warning: { bg: "bg-amber-950/95", border: "border-amber-500/40", icon: "⚠️", bar: "bg-amber-500", title: "text-amber-300" },
  error: { bg: "bg-red-950/95", border: "border-red-500/40", icon: "🚨", bar: "bg-red-500", title: "text-red-300" },
  info: { bg: "bg-sky-950/95", border: "border-sky-500/40", icon: "ℹ️", bar: "bg-sky-500", title: "text-sky-300" },
};

function ToastNotification({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const cfg = toastConfig[toast.type];
  useEffect(() => {
    const t = setTimeout(onRemove, 4500);
    return () => clearTimeout(t);
  }, [onRemove]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-2xl shadow-2xl ${cfg.bg} ${cfg.border} p-4 min-w-[300px] max-w-sm`}
      style={{ animation: "slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{toast.icon || cfg.icon}</span>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${cfg.title}`}>{toast.title}</p>
          <p className="text-white/65 text-xs mt-0.5 leading-relaxed">{toast.message}</p>
        </div>
        <button onClick={onRemove} className="text-white/35 hover:text-white/70 transition-colors text-lg leading-none">×</button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/8">
        <div className={`h-full ${cfg.bar} origin-left`} style={{ animation: "shrink 4.5s linear forwards" }} />
      </div>
    </div>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useApp();
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastNotification toast={t} onRemove={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// STATUS UTILITIES
// ─────────────────────────────────────────────
export const statusConfig: Record<ReportStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/15 border-amber-400/30", dot: "bg-amber-400" },
  accepted: { label: "Accepted", color: "text-sky-400", bg: "bg-sky-400/15 border-sky-400/30", dot: "bg-sky-400" },
  in_progress: { label: "In Progress", color: "text-violet-400", bg: "bg-violet-400/15 border-violet-400/30", dot: "bg-violet-400" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/15 border-emerald-400/30", dot: "bg-emerald-400" },
  fake: { label: "Fake Report", color: "text-red-400", bg: "bg-red-400/15 border-red-400/30", dot: "bg-red-400" },
};

export const priorityConfig: Record<Priority, { label: string; color: string }> = {
  low: { label: "Low", color: "text-slate-400" },
  medium: { label: "Medium", color: "text-sky-400" },
  high: { label: "High", color: "text-orange-400" },
  critical: { label: "CRITICAL", color: "text-red-400" },
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

export function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─────────────────────────────────────────────
// LANDING PAGE
// ─────────────────────────────────────────────
const FEATURES = [
  { icon: "🤖", title: "AI-Powered Matching", desc: "Smart algorithms match lost pets with found reports instantly using image recognition." },
  { icon: "📡", title: "Real-Time Tracking", desc: "Watch your report go from submission to rescue in real-time with live status updates." },
  { icon: "🪙", title: "Reward System", desc: "Earn coins for every rescue report. Redeem them for NGO donations and exclusive badges." },
  { icon: "✅", title: "Verified NGOs", desc: "Every partner NGO is verified, rated, and monitored for response time and transparency." },
  { icon: "⚡", title: "Fast Response", desc: "Average NGO response time under 45 minutes for critical cases in covered areas." },
  { icon: "🗺️", title: "GPS Precision", desc: "Auto-detect your location with reverse geocoding for pinpoint-accurate rescue dispatching." },
];

const TESTIMONIALS = [
  { name: "Priya Mehta", role: "Animal Welfare Volunteer", city: "Delhi", text: "PawRescue changed how our NGO operates. Reports come in structured, with photos and GPS — we've cut response time by 60%.", avatar: "PM" },
  { name: "Arjun Kapoor", role: "Rescue Reporter", city: "Mumbai", text: "I reported an injured dog and within 30 minutes the NGO was on-site. The real-time status updates kept me informed throughout.", avatar: "AK" },
  { name: "Sneha Gupta", role: "NGO Director", city: "Bangalore", text: "The duplicate detection system is incredible. No more wasted resources on double-reports. Our efficiency has doubled.", avatar: "SG" },
];

const HOW_IT_WORKS = [
  { step: "01", icon: <Camera className="w-7 h-7" />, title: "Capture & Report", desc: "Spot an animal in distress? Open the app, take a live photo, and auto-detect your GPS location." },
  { step: "02", icon: <Navigation className="w-7 h-7" />, title: "NGO Gets Notified", desc: "Our AI routes your report to the nearest verified NGO instantly via real-time push alerts." },
  { step: "03", icon: <Heart className="w-7 h-7" />, title: "Animal Gets Rescued", desc: "Track the rescue in real-time. Get notified when the animal is treated and safe." },
];

function RevealDiv({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function LandingPage() {
  const { setPage } = useApp();
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [impactStats, setImpactStats] = useState([
    { value: "…", label: "Completed Rescues", color: "text-emerald-400" },
    { value: "…", label: "Partner NGOs", color: "text-orange-400" },
    { value: "…", label: "Adoption Listings", color: "text-sky-400" },
    { value: "…", label: "Active Reporters", color: "text-violet-400" },
  ]);
  const [heroStatLine, setHeroStatLine] = useState("Connecting rescuers, NGOs, and adopters across India");

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/stats"))
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.data) return;
        const x = d.data;
        const fmt = (n: number) => `${Number(n).toLocaleString("en-IN")}+`;
        setImpactStats([
          { value: fmt(x.rescuesCompleted), label: "Completed Rescues", color: "text-emerald-400" },
          { value: fmt(x.ngosCount), label: "Partner NGOs", color: "text-orange-400" },
          { value: fmt(x.adoptionsListed), label: "Adoption Listings", color: "text-sky-400" },
          { value: fmt(x.reportersCount), label: "Active Reporters", color: "text-violet-400" },
        ]);
        setHeroStatLine(
          `${Number(x.rescuesCompleted).toLocaleString("en-IN")}+ completed rescues tracked on PawRescue`
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#06100A] text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#06100A]/80 backdrop-blur-2xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <PawPrint className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="font-bold text-lg text-white" style={{ fontFamily: "'Sora', sans-serif" }}>PawRescue</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#impact" className="hover:text-white transition-colors">Impact</a>
            <a href="#ngos" className="hover:text-white transition-colors">NGOs</a>
          </div>
          <button
            onClick={() => setPage("login")}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40"
          >
            Get Started →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1920&q=80"
            alt="Animal rescue"
            className="w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06100A]/60 via-[#06100A]/40 to-[#06100A]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-orange-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6"
              style={{ animation: "fadeUp 0.6s ease both" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {heroStatLine}
            </div>
            <h1
              className="text-5xl md:text-6xl font-black leading-[1.05] mb-6"
              style={{ fontFamily: "'Sora', sans-serif", animation: "fadeUp 0.7s ease 0.1s both" }}
            >
              Saving Lives,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                One Paw
              </span>
              <br />at a Time
            </h1>
            <p
              className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg"
              style={{ animation: "fadeUp 0.7s ease 0.2s both" }}
            >
              India's first AI-powered animal rescue platform. Report injured strays, connect with verified NGOs, and track every rescue in real-time — together we can make a difference.
            </p>
            <div className="flex flex-wrap gap-3" style={{ animation: "fadeUp 0.7s ease 0.3s both" }}>
              <button
                onClick={() => setPage("login")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-xl shadow-emerald-500/30"
              >
                <AlertTriangle className="w-4 h-4" /> Report Animal
              </button>
              <button
                onClick={() => setPage("login")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/8 border border-white/15 text-white font-semibold hover:bg-white/12 transition-all"
              >
                <Heart className="w-4 h-4 text-pink-400" /> Adopt a Pet
              </button>
              <button
                onClick={() => setPage("login")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold hover:bg-orange-500/20 transition-all"
              >
                <HandHeart className="w-4 h-4" /> Donate
              </button>
            </div>
          </div>

          {/* Floating Stats Cards */}
          <div className="hidden lg:grid grid-cols-2 gap-4" style={{ animation: "fadeUp 0.8s ease 0.4s both" }}>
            {impactStats.map((stat, i) => (
              <div
                key={stat.label}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <p className={`text-3xl font-black mb-1 ${stat.color}`} style={{ fontFamily: "'Sora', sans-serif" }}>{stat.value}</p>
                <p className="text-white/50 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30">
          <span className="text-xs">scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* ── MOBILE STATS ── */}
      <div className="lg:hidden grid grid-cols-2 gap-3 max-w-lg mx-auto px-6 pb-12">
        {impactStats.map((stat) => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${stat.color}`} style={{ fontFamily: "'Sora', sans-serif" }}>{stat.value}</p>
            <p className="text-white/50 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 px-6 max-w-6xl mx-auto">
        <RevealDiv className="text-center mb-16">
          <span className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Simple & Fast</span>
          <h2 className="text-4xl font-black mt-3 mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>How It Works</h2>
          <p className="text-white/50 max-w-lg mx-auto">Three simple steps stand between a stray animal in distress and a life-saving rescue.</p>
        </RevealDiv>
        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <RevealDiv key={step.step} delay={i * 120} className="relative">
              <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 h-full hover:border-emerald-500/30 hover:bg-white/[0.06] transition-all group">
                <div className="absolute -top-3 -left-1 text-7xl font-black text-white/[0.04] leading-none select-none" style={{ fontFamily: "'Sora', sans-serif" }}>{step.step}</div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <h3 className="text-white font-bold text-xl mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>{step.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 z-10 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </div>
              )}
            </RevealDiv>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <RevealDiv className="text-center mb-16">
            <span className="text-orange-400 text-sm font-semibold uppercase tracking-widest">Platform Features</span>
            <h2 className="text-4xl font-black mt-3 mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>Built for Impact</h2>
            <p className="text-white/50 max-w-lg mx-auto">Every feature is designed to make animal rescue faster, smarter, and more transparent.</p>
          </RevealDiv>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, i) => (
              <RevealDiv key={feat.title} delay={i * 80}>
                <div className="bg-[#0A1A0E] border border-white/8 rounded-2xl p-6 hover:border-emerald-500/25 hover:bg-[#0C1E10] transition-all group cursor-default h-full">
                  <div className="text-3xl mb-4">{feat.icon}</div>
                  <h3 className="text-white font-bold mb-2 group-hover:text-emerald-300 transition-colors" style={{ fontFamily: "'Sora', sans-serif" }}>{feat.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <RevealDiv>
            <span className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Why PawRescue</span>
            <h2 className="text-4xl font-black mt-3 mb-6" style={{ fontFamily: "'Sora', sans-serif" }}>The Smarter Way to Rescue</h2>
            <div className="space-y-4">
              {[
                { icon: "🤖", title: "AI Duplicate Detection", desc: "Prevents multiple reporters for the same animal, saving NGO resources." },
                { icon: "🛡️", title: "100% Verified Network", desc: "Every NGO undergoes background checks and performance monitoring." },
                { icon: "📊", title: "Full Transparency", desc: "See exactly where your donation goes with before/after rescue proof." },
                { icon: "🎮", title: "Gamified Engagement", desc: "Earn coins, climb leaderboards, and unlock badges for every rescue." },
              ].map((item, i) => (
                <div key={item.title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </RevealDiv>
          <RevealDiv delay={200}>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80"
                alt="Dog rescue"
                className="w-full rounded-3xl object-cover aspect-square opacity-80"
              />
              <div className="absolute inset-0 rounded-3xl ring-1 ring-white/10" />
              {/* Floating badge */}
              <div className="absolute -bottom-5 -left-5 bg-[#0A1A0E] border border-emerald-500/30 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Dog Rescued!</p>
                    <p className="text-emerald-400 text-xs">28 min response time</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-5 -right-5 bg-[#0A1A0E] border border-orange-500/30 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Award className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">+50 Coins Earned</p>
                    <p className="text-orange-400 text-xs">Rescue reward</p>
                  </div>
                </div>
              </div>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* ── IMPACT STATS BAR ── */}
      <section id="impact" className="py-20 px-6 bg-gradient-to-br from-emerald-950/60 to-[#06100A] border-y border-emerald-500/15">
        <div className="max-w-5xl mx-auto">
          <RevealDiv className="text-center mb-12">
            <h2 className="text-3xl font-black" style={{ fontFamily: "'Sora', sans-serif" }}>Real Impact, Real Numbers</h2>
          </RevealDiv>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {impactStats.map((stat, i) => (
              <RevealDiv key={stat.label} delay={i * 100} className="text-center">
                <p className={`text-4xl font-black mb-2 ${stat.color}`} style={{ fontFamily: "'Sora', sans-serif" }}>{stat.value}</p>
                <p className="text-white/50 text-sm">{stat.label}</p>
              </RevealDiv>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <RevealDiv className="text-center mb-12">
          <span className="text-sky-400 text-sm font-semibold uppercase tracking-widest">Testimonials</span>
          <h2 className="text-4xl font-black mt-3" style={{ fontFamily: "'Sora', sans-serif" }}>Voices of Change</h2>
        </RevealDiv>
        <div className="relative">
          <div className="overflow-hidden rounded-3xl">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 md:p-10"
                style={{
                  display: i === testimonialIdx ? "block" : "none",
                  animation: "fadeUp 0.4s ease both",
                }}
              >
                <div className="flex items-center gap-1 mb-5">
                  {[...Array(5)].map((_, s) => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-white/80 text-lg leading-relaxed mb-8 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">{t.avatar}</div>
                  <div>
                    <p className="text-white font-semibold">{t.name}</p>
                    <p className="text-white/45 text-sm">{t.role} · {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIdx(i)}
                className={`rounded-full transition-all ${i === testimonialIdx ? "w-6 h-2 bg-emerald-500" : "w-2 h-2 bg-white/25"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 px-6">
        <RevealDiv>
          <div className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-12 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-10 -translate-x-10 blur-xl" />
            <div className="relative">
              <div className="text-5xl mb-4">🐾</div>
              <h2 className="text-4xl font-black mb-4 text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
                Every Second Counts
              </h2>
              <p className="text-emerald-100/80 text-lg mb-8 max-w-lg mx-auto">
                An injured animal is waiting for help right now. Join 52,000+ rescuers making a difference today.
              </p>
              <button
                onClick={() => setPage("login")}
                className="px-8 py-4 rounded-xl bg-white text-emerald-700 font-bold text-lg hover:bg-emerald-50 transition-all shadow-xl"
              >
                Start Rescuing Now →
              </button>
            </div>
          </div>
        </RevealDiv>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <PawPrint className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>PawRescue</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">India's AI-powered animal rescue and adoption platform. Connecting hearts, saving lives.</p>
            </div>
            {[
              { title: "Platform", links: ["Report Animal", "Lost & Found", "Adopt a Pet", "NGO Directory"] },
              { title: "Community", links: ["Rewards Program", "Volunteer", "NGO Partner", "Blog"] },
              { title: "Company", links: ["About Us", "Privacy Policy", "Terms of Service", "Contact"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}><button onClick={() => setPage("login")} className="text-white/40 text-sm hover:text-white/70 transition-colors">{link}</button></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-sm">© 2025 PawRescue. Made with 🐾 for animals everywhere.</p>
            <div className="flex items-center gap-4">
              {[<Twitter key="tw" className="w-4 h-4" />, <Instagram key="ig" className="w-4 h-4" />, <Facebook key="fb" className="w-4 h-4" />].map((icon, i) => (
                <button key={i} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/8 transition-all">
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
function LoginPage() {
  const { setUser, setPage, addToast } = useApp();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ngoName, setNgoName] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOtp = async () => {
    if (phone.length < 10) {
      addToast({ type: "error", title: "Invalid Number", message: "Please enter a valid 10-digit phone number." });
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const res = await fetch(apiUrl("/api/auth/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setOtpSent(true);
        addToast({ type: "success", title: "OTP Sent!", message: `A 6-digit code was dispatched to +91 ${phone}` });
      } else {
        addToast({ type: "error", title: "Failed to Send OTP", message: data.message || "Error occurred" });
      }
    } catch {
      setLoading(false);
      addToast({ type: "error", title: "Network Error", message: "Backend is unreachable." });
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      addToast({ type: "warning", title: "Incomplete OTP", message: "Please enter all 6 digits." });
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const res = await fetch(apiUrl("/api/auth/otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code, role: isAdmin ? "admin" : "reporter", name: isAdmin ? ngoName : "" }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        if (data.token) localStorage.setItem("pawrescue_token", data.token);
        const uid = data.user.id ?? data.user._id;
        const loggedUser: AppUser = {
          ...(uid != null && uid !== "" ? { id: String(uid) } : {}),
          name: data.user.name,
          phone: data.user.phone || `+91${phone}`,
          email: data.user.email || "",
          role: (isAdmin ? "admin" : "reporter") as "reporter" | "admin",
        };
        localStorage.setItem("pawrescue_user", JSON.stringify(loggedUser));
        setUser(loggedUser);
        setPage(isAdmin ? "admin" : "reporter");
        addToast({ type: "success", title: "Welcome back! 🐾", message: "Logged in safely." });
      } else {
        addToast({ type: "error", title: "Login Failed", message: data.message || "Invalid OTP code" });
      }
    } catch {
      setLoading(false);
      addToast({ type: "error", title: "Network Error", message: "Could not reach server" });
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential, role: isAdmin ? "admin" : "reporter", name: isAdmin ? ngoName : "" }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        if (data.token) localStorage.setItem("pawrescue_token", data.token);
        const uid = data.user.id ?? data.user._id;
        const loggedUser: AppUser = {
          ...(uid != null && uid !== "" ? { id: String(uid) } : {}),
          name: data.user.name,
          phone: data.user.phone || "",
          email: data.user.email || "",
          role: (data.user.role || "reporter") as "reporter" | "admin",
        };
        localStorage.setItem("pawrescue_user", JSON.stringify(loggedUser));
        setUser(loggedUser);
        setPage(data.user.role === "admin" ? "admin" : "reporter");
        addToast({ type: "success", title: "Welcome back! 🐾", message: "Logged in with Google." });
      } else {
        addToast({ type: "error", title: "Login Failed", message: data.message || "Failed to log in with Google" });
      }
    } catch {
      setLoading(false);
      addToast({ type: "error", title: "Network Error", message: "Could not reach server" });
    }
  };

  return (
    <div className="min-h-screen bg-[#06100A] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=2069" alt="" className="w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-[#06100A]/80" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-orange-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md" style={{ animation: "fadeUp 0.5s ease both" }}>
        {/* Back to landing */}
        <button
          onClick={() => setPage("landing")}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
        >
          ← Back to home
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-4">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>PawRescue</h1>
          <p className="text-emerald-400/80 text-sm mt-1">Every paw print matters</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <div className="mb-5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-amber-100/90 text-xs leading-relaxed">
              Google sign-in needs <span className="font-mono text-amber-200">VITE_GOOGLE_CLIENT_ID</span> in{" "}
              <span className="font-mono text-amber-200">frontend/.env.local</span> (must match backend{" "}
              <span className="font-mono text-amber-200">GOOGLE_CLIENT_ID</span>). OTP still works.
            </div>
          )}
          {/* Role Toggle */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6 border border-white/10">
            <button
              onClick={() => setIsAdmin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isAdmin ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "text-white/50 hover:text-white/70"}`}
            >
              🐾 Reporter
            </button>
            <button
              onClick={() => setIsAdmin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isAdmin ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "text-white/50 hover:text-white/70"}`}
            >
              🏢 NGO Admin
            </button>
          </div>

          <div className="space-y-4">
            {!otpSent ? (
              <>
                {isAdmin && (
                  <div>
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">NGO Name</label>
                    <input
                      type="text"
                      value={ngoName}
                      onChange={(e) => setNgoName(e.target.value)}
                      placeholder="e.g. PawCare NGO"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-orange-500/60 transition-all mb-4"
                    />
                  </div>
                )}
                <div>
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-3 flex items-center text-white/60 text-sm font-medium">+91</div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/, "").slice(0, 10))}
                      placeholder="98765 43210"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-emerald-500/60 transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Sending OTP..." : "Send OTP →"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3 block">Enter 6-digit OTP</label>
                  <div className="flex gap-2">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        type="text"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => e.key === "Backspace" && !digit && i > 0 && otpRefs.current[i - 1]?.focus()}
                        className="w-[45px] h-[45px] text-center text-lg font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/60 transition-all shrink-0 sm:w-12 sm:h-12"
                        maxLength={1}
                      />
                    ))}
                  </div>
                  <p className="text-white/40 text-xs mt-2 text-center">
                    Code sent to +91 {phone}{" "}
                    <button onClick={() => setOtpSent(false)} className="text-emerald-400 hover:underline">Change</button>
                  </p>
                </div>
                <button
                  onClick={verifyOtp}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
              </>
            )}
          </div>

          <div className="mt-6">
            <div className="relative flex items-center mb-5">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink-0 mx-4 text-white/30 text-xs font-semibold uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-white/10" />
            </div>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => addToast({ type: "error", title: "Google Login Error", message: "Pop-up closed or failed." })}
                theme="filled_black"
                shape="rectangular"
                size="large"
              />
            </div>
          </div>

          <p className="text-center text-white/25 text-xs mt-6">
            By continuing, you agree to our{" "}
            <span className="text-emerald-400/60 cursor-pointer hover:text-emerald-400">Terms</span> &{" "}
            <span className="text-emerald-400/60 cursor-pointer hover:text-emerald-400">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORTER HOME DASHBOARD
// ─────────────────────────────────────────────
type NearbyNgoRow = {
  name: string;
  dist: string;
  rating: number;
  status: string;
  reports: number;
  icon: string;
};

function ReporterDashboard() {
  const { user, reports, setPage, addToast, removeReport, updateReport, ledgerEpoch } = useApp();
  const userCoords = useNearbyCoords();

  const userReports = reports.filter((r) => r.reporterName === user?.name);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [nearbyNgos, setNearbyNgos] = useState<NearbyNgoRow[]>([]);

  useEffect(() => {
    const qs = rewardsQueryString(user);
    const fetchBalance = async () => {
      if (!qs) return;
      try {
        const res = await fetch(`${apiUrl("/api/rewards")}?${qs}`);
        const data = await res.json();
        if (data.success) {
          const raw = Number(data.data.totalCoins);
          setCoinBalance(Number.isFinite(raw) ? Math.max(0, raw) : 0);
        }
      } catch (err) {
        console.error("Failed to fetch rewards", err);
      }
    };
    fetchBalance();
  }, [user, reports, ledgerEpoch]);

  useEffect(() => {
    const onFocus = () => {
      const qs = rewardsQueryString(user);
      if (!qs) return;
      fetch(`${apiUrl("/api/rewards")}?${qs}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            const raw = Number(data.data.totalCoins);
            setCoinBalance(Number.isFinite(raw) ? Math.max(0, raw) : 0);
          }
        })
        .catch(() => {});
    };
    const onVis = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  const loadNearbyNgos = useCallback(() => {
    const REF_LAT = userCoords.lat;
    const REF_LNG = userCoords.lng;
    const R = 6371;
    const icons = ["🏥", "🐶", "🚙", "🛡️"];

    fetch(apiUrl(`/api/ngos/nearby?lat=${REF_LAT}&lng=${REF_LNG}`))
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.data?.length) {
          setNearbyNgos([]);
          return;
        }
        const rows: NearbyNgoRow[] = data.data.slice(0, 4).map((n: any, i: number) => {
          const coords = n.location?.coordinates;
          let dist = "Nearby";
          if (coords?.length === 2) {
            const [lng, lat] = coords;
            const dLat = ((lat - REF_LAT) * Math.PI) / 180;
            const dLng = ((lng - REF_LNG) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((REF_LAT * Math.PI) / 180) *
                Math.cos((lat * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
            const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
            dist = `${km.toFixed(1)} km`;
          }
          return {
            name: n.name,
            dist,
            rating: n.rating,
            status: i % 3 === 0 ? "Busy" : "Available",
            reports: n.rescues,
            icon: icons[i % icons.length],
          };
        });
        setNearbyNgos(rows);
      })
      .catch(() => setNearbyNgos([]));
  }, [userCoords.lat, userCoords.lng]);

  useEffect(() => {
    loadNearbyNgos();
  }, [loadNearbyNgos]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") loadNearbyNgos();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadNearbyNgos]);

  const timelineSteps: { key: ReportStatus; label: string; icon: React.ReactNode }[] = [
    { key: "pending", label: "Submitted", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "accepted", label: "Accepted", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: "in_progress", label: "In Progress", icon: <Activity className="w-3.5 h-3.5" /> },
    { key: "completed", label: "Rescued", icon: <PawPrint className="w-3.5 h-3.5" /> },
  ];

  const handleDeleteReport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      const res = await fetch(apiUrl(`/api/reports/${id}`), { method: "DELETE" });
      if (res.ok) {
        removeReport(id);
        addToast({ type: "success", title: "Deleted", message: "Report removed successfully." });
      } else {
        addToast({ type: "error", title: "Failed", message: "Could not delete report." });
      }
    } catch {
      addToast({ type: "error", title: "Network Error", message: "Failed to contact server." });
    }
  };

  const handleEditReport = async (e: React.MouseEvent, report: AnimalReport) => {
    e.stopPropagation();
    if (report.status !== "pending") return;

    const nextDescription = window.prompt("Edit description:", report.description);
    if (nextDescription === null) return; // cancelled

    const nextPriority = window.prompt(
      "Edit priority (low / medium / high / critical):",
      report.priority
    );
    if (nextPriority === null) return; // cancelled

    const priorityAllowed = ["low", "medium", "high", "critical"] as const;
    const pr = String(nextPriority).toLowerCase().trim();
    if (!priorityAllowed.includes(pr as any)) {
      addToast({ type: "error", title: "Invalid priority", message: `Use: ${priorityAllowed.join(", ")}` });
      return;
    }

    const nextAddress = window.prompt(
      "Edit address:",
      report.location?.address || ""
    );
    if (nextAddress === null) return;

    try {
      await updateReport(report.id, {
        description: String(nextDescription).trim(),
        priority: pr,
        "location.address": String(nextAddress).trim(),
      });
      addToast({ type: "success", title: "Updated", message: "Report details updated." });
    } catch {
      addToast({ type: "error", title: "Update failed", message: "Could not update report." });
    }
  };

  const getStepIndex = (status: ReportStatus): number => {
    const order: ReportStatus[] = ["pending", "accepted", "in_progress", "completed"];
    return order.indexOf(status);
  };

  const recentReports = userReports.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0A0F0D] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0F0D]/85 backdrop-blur-2xl border-b border-white/8">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <PawPrint style={{ width: 18, height: 18 }} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm" style={{ fontFamily: "'Sora', sans-serif" }}>PawRescue</p>
              <p className="text-white/40 text-xs">Welcome, {user?.name?.split(" ")[0]} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Coin Balance */}
            <div className="flex items-center gap-1.5 bg-amber-500/12 border border-amber-500/25 rounded-xl px-3 py-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-bold">{coinBalance}</span>
            </div>
            <button className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all relative">
              <Bell className="w-4 h-4" />
              {userReports.some(r => r.status === "pending") && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </div>
      </header>

            <div className="max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ────── LEFT COLUMN (Main Actions & Activity) ────── */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Hero & Coins Row */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Quick Action Hero */}
              <div
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500/20 via-emerald-900/30 to-[#0A0F0D] border border-emerald-500/20 p-6 cursor-pointer hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all group backdrop-blur-3xl"
                onClick={() => setPage("report-form")}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-400/30 transition-all" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative h-full flex flex-col justify-between min-h-[160px]">
                  <div>
                    <h2 className="text-white text-2xl font-black mb-2 shadow-sm" style={{ fontFamily: "'Sora', sans-serif" }}>Report an Animal</h2>
                    <p className="text-emerald-100/60 text-sm font-medium">Spotted an animal in distress? Act fast and save a life today.</p>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">Urgent Rescue</span>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-110 group-hover:-rotate-12 transition-transform flex-shrink-0">
                      <ArrowRight className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coins Banner */}
              <div
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500/15 via-orange-900/20 to-[#0A0F0D] border border-amber-500/25 p-6 cursor-pointer hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group backdrop-blur-3xl"
                onClick={() => setPage("rewards")}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/25 transition-all" />
                <div className="relative h-full flex flex-col justify-between min-h-[160px]">
                  <div>
                    <p className="text-amber-400/80 text-xs font-bold uppercase tracking-widest mb-1 shadow-sm">Your Rewards</p>
                    <h2 className="text-amber-400 text-4xl font-black mb-0 drop-shadow-md" style={{ fontFamily: "'Sora', sans-serif" }}>{coinBalance} <span className="text-2xl ml-1">🪙</span></h2>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-white/50 text-sm font-medium max-w-[140px]">Exchange coins for verified NGO merchandise.</p>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                      View Catalog <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Nav Cards */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "Lost & Found", desc: "AI Visual Match", icon: "🔍", page: "discover", theme: "blue" },
                { label: "Adoption", desc: "Find a friend", icon: "🐾", page: "discover", theme: "pink" },
                { label: "Donate", desc: "Fund a rescue", icon: "❤️", page: "ngo", theme: "orange" },
              ].map((card) => {
                const colors = {
                  blue: { bg: "from-sky-500/10 to-sky-900/5", border: "border-sky-500/20", hover: "hover:border-sky-500/40 hover:shadow-sky-500/10", text: "text-sky-400" },
                  pink: { bg: "from-pink-500/10 to-pink-900/5", border: "border-pink-500/20", hover: "hover:border-pink-500/40 hover:shadow-pink-500/10", text: "text-pink-400" },
                  orange: { bg: "from-orange-500/10 to-orange-900/5", border: "border-orange-500/20", hover: "hover:border-orange-500/40 hover:shadow-orange-500/10", text: "text-orange-400" },
                }[card.theme];
                return (
                  <button
                    key={card.label}
                    onClick={() => setPage(card.page as Page)}
                    className={`bg-gradient-to-tr ${colors.bg} border ${colors.border} rounded-[1.5rem] p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl ${colors.hover} group backdrop-blur-xl relative overflow-hidden`}
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform" />
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-4 border border-white/10 shadow-sm">{card.icon}</div>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${colors.text} mb-1 drop-shadow-sm`}>{card.label}</p>
                    <p className="text-white/40 text-[10px] font-semibold">{card.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* My Reports */}
            <div className="bg-[#0A150D]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden flex-1 min-h-[300px]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none mix-blend-screen" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-white text-lg font-bold flex items-center gap-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                  <Activity className="w-5 h-5 text-emerald-400" /> Active Rescue Missions
                </h3>
                <span className="text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-xs font-bold shadow-sm">{recentReports.length} Reports</span>
              </div>

              {recentReports.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-12 text-center relative z-10">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-4">🐾</div>
                  <p className="text-white text-base font-bold drop-shadow-md">No missions logged yet</p>
                  <p className="text-white/40 text-sm mt-2 mb-6 max-w-sm mx-auto">Step up and make your first report. Every action brings us closer to a safer world for strays.</p>
                  <button onClick={() => setPage("report-form")} className="px-6 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all">Submit A Report →</button>
                </div>
              ) : (
                <div className="space-y-4 relative z-10">
                  {recentReports.map((report) => {
                    const stepIdx = getStepIndex(report.status);
                    return (
                      <div key={report.id} className={`bg-[#060A08]/80 backdrop-blur-md border rounded-[1.5rem] overflow-hidden transition-all hover:bg-white/5 ${report.isFlagged ? "border-red-500/30 shadow-inner shadow-red-500/5" : "border-white/10 shadow-sm"}`}>
                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-4">
                              {report.imageDataUrl ? (
                                <img src={report.imageDataUrl} alt="animal" className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md" />
                              ) : (
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-xl">🐾</div>
                              )}
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-white font-bold text-sm tracking-wide">{report.animalType} — {report.animalCondition}</p>
                                  {report.isFlagged && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest shadow-md border-red-400">Flagged</span>}
                                </div>
                                <p className="text-white/40 text-xs flex items-center gap-1.5 font-medium"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {report.location?.address}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <StatusBadge status={report.status} />
                              {report.status === "pending" && (
                                <div className="flex gap-2 text-white/50 text-xs">
                                  <button
                                    onClick={(e) => handleEditReport(e, report)}
                                    className="hover:text-sky-400"
                                  >
                                    Edit
                                  </button>
                                  <button onClick={(e) => handleDeleteReport(e, report.id)} className="hover:text-red-400">Delete</button>
                                </div>
                              )}
                            </div>
                          </div>

                          {report.status !== "fake" && (
                            <div className="flex items-center pt-1 px-2">
                              {timelineSteps.map((step, i) => {
                                const done = i <= stepIdx;
                                const active = i === stepIdx;
                                return (
                                  <React.Fragment key={step.key}>
                                    <div className="flex flex-col items-center">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all text-xs ${done ? active ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/50 scale-110" : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/20"}`}>
                                        {step.icon}
                                      </div>
                                      <p className={`text-[10px] mt-2 font-bold tracking-wide ${done ? active ? "text-emerald-400" : "text-emerald-500/70" : "text-white/20"}`}>{step.label}</p>
                                    </div>
                                    {i < timelineSteps.length - 1 && (
                                      <div className={`flex-1 h-0.5 mb-5 mx-2 rounded-full transition-all ${done && i < stepIdx ? "bg-gradient-to-r from-emerald-500 to-emerald-500/40 shadow-sm" : "bg-white/10"}`} />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          )}
                          {report.status === "fake" && (
                            <div className="flex items-center gap-2 bg-red-500/10 rounded-xl p-3 border border-red-500/20 text-red-400 text-xs font-semibold shadow-inner shadow-red-500/5">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              This report failed verification and has been marked as invalid by an Admin.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ────── RIGHT COLUMN (Sidebar Layout) ────── */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* KPI Stats Box */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Submitted", value: userReports.length, color: "text-white", bg: "from-white/5 to-white/2", border: "border-white/10" },
                { label: "Active Pursuits", value: userReports.filter((r) => r.status === "in_progress").length, color: "text-violet-400", bg: "from-violet-500/10 to-violet-900/10", border: "border-violet-500/20" },
                { label: "Lives Saved", value: userReports.filter((r) => r.status === "completed").length, color: "text-emerald-400", bg: "from-emerald-500/10 to-emerald-900/10", border: "border-emerald-500/20" },
                { label: "Flagged", value: userReports.filter((r) => r.status === "fake").length, color: "text-red-400", bg: "from-red-500/10 to-red-900/10", border: "border-red-500/20" },
              ].map((s) => (
                <div key={s.label} className={`bg-gradient-to-b ${s.bg} border ${s.border} rounded-3xl p-5 backdrop-blur-xl flex flex-col items-center justify-center text-center shadow-lg`}>
                  <p className={`text-3xl font-black ${s.color} drop-shadow-md`} style={{ fontFamily: "'Sora', sans-serif" }}>{s.value}</p>
                  <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Nearby NGOs Widget */}
            <div className="bg-[#0A150D]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl flex-1 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-bold flex items-center gap-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                  <Building2 className="w-5 h-5 text-emerald-400" /> Ground Units
                </h3>
                <button onClick={() => setPage("ngo")} className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">Directory</button>
              </div>

              <div className="space-y-4 flex-1">
                {nearbyNgos.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">Loading partners…</p>
                ) : (
                  nearbyNgos.map((ngo) => (
                  <div key={ngo.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-[1.2rem] p-3 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer shadow-sm group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-xl group-hover:scale-110 transition-transform shadow-inner">
                      {ngo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate tracking-wide">{ngo.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-emerald-400/80 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{ngo.dist}</span>
                        <span className="text-amber-400 text-[10px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">★ {ngo.rating}</span>
                        <span className="text-white/35 text-[10px]">{ngo.reports} rescues</span>
                      </div>
                    </div>
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${ngo.status === "Available" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"}`} title={ngo.status} />
                  </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500/80" /> 100% Verified Partners</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────
// DISCOVER PAGE (Lost & Found + Adoption)
// ─────────────────────────────────────────────
type AdoptionRow = {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  location: string;
  image: string;
  vaccinated: boolean;
  description?: string;
};

function DiscoverPage() {
  const { setPage, reports } = useApp();
  const [tab, setTab] = useState<"lost" | "adoption">("lost");
  const [filter, setFilter] = useState("All");
  const [selectedPet, setSelectedPet] = useState<AdoptionRow | null>(null);
  const [adoptionPets, setAdoptionPets] = useState<AdoptionRow[]>([]);
  const [adoptionLoading, setAdoptionLoading] = useState(false);
  const [aiMatches, setAiMatches] = useState<any[] | null>(null);
  const [loadingMatch, setLoadingMatch] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "adoption") return;
    setAdoptionLoading(true);
    fetch(apiUrl("/api/adoptions"))
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) setAdoptionPets(d.data);
        else setAdoptionPets([]);
      })
      .catch(() => setAdoptionPets([]))
      .finally(() => setAdoptionLoading(false));
  }, [tab]);

  const filteredAdoption = adoptionPets.filter((pet) => {
    if (filter === "All") return true;
    if (filter === "Dog") return pet.type === "Dog";
    if (filter === "Cat") return pet.type === "Cat";
    if (filter === "Vaccinated") return pet.vaccinated;
    return true;
  });

  useEffect(() => {
    setFilter("All");
  }, [tab]);

  const runAiMatch = async (reportId: string) => {
    setLoadingMatch(reportId);
    try {
      const res = await fetch(apiUrl(`/api/reports/match?reportId=${encodeURIComponent(reportId)}`));
      const data = await res.json();
      if (data.success) {
        setAiMatches(data.aiMatches);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingMatch(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0F0D] pb-24">
      <header className="sticky top-0 z-40 bg-[#0A0F0D]/85 backdrop-blur-2xl border-b border-white/8">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-white font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>Discover</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input placeholder="Search..." className="bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500/50 w-40" />
            </div>
          </div>
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button onClick={() => setTab("lost")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "lost" ? "bg-sky-500 text-white" : "text-white/50"}`}>🔍 Lost & Found</button>
            <button onClick={() => setTab("adoption")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "adoption" ? "bg-pink-500 text-white" : "text-white/50"}`}>🐾 Adoption</button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-5">
        {tab === "lost" ? (
          <>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {["All", "Lost", "Found", "AI Match"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === f ? "bg-sky-500/20 border-sky-500/50 text-sky-300" : "bg-white/4 border-white/10 text-white/45"}`}>
                  {f === "AI Match" ? "🤖 " : ""}{f}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {reports.map((item) => (
                <div key={item.id} className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                  <div className="flex gap-4 p-4">
                    <img src={item.imageDataUrl || "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&q=80"} alt={item.animalType} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${"bg-red-500/20 text-red-400 border border-red-500/25"}`}>
                          REPORTED
                        </span>
                      </div>
                      <p className="text-white font-semibold text-sm">{item.animalType} · {item.priority}</p>
                      <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5"><MapPin className="w-2.5 h-2.5" />{(item as any).location?.address || "Location unknown"}</p>
                      <p className="text-white/55 text-xs mt-1.5 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3 flex gap-2">
                    <button onClick={() => runAiMatch(item.id)} className="flex-1 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-semibold hover:bg-violet-500/30 transition-all flex items-center justify-center gap-1">
                      {loadingMatch === item.id ? "🤖 Scanning..." : "🤖 Run AI Match"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Matches Modal */}
            {aiMatches !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setAiMatches(null)}>
                <div className="bg-[#0A1A0E] border border-emerald-500/30 p-6 rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">🤖 AI Matching Results</h3>
                  {aiMatches.length === 0 ? (
                    <p className="text-white/50 text-center py-4">No matches found in database.</p>
                  ) : (
                    aiMatches.map((match) => (
                      <div key={match.id || match._id} className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-3 flex gap-3 items-center">
                        <img src={match.imageDataUrl} className="w-14 h-14 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-bold truncate">{match.animalType}</p>
                          <p className="text-xs text-white/50 truncate">{match.location?.address}</p>
                        </div>
                        <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg text-xs font-bold">
                          {match.aiConfidence}% Match
                        </div>
                      </div>
                    ))
                  )}
                  <button onClick={() => setAiMatches(null)} className="w-full py-2.5 mt-2 rounded-xl bg-white/10 text-white font-semibold">Close</button>
                </div>
              </div>
            )}
            <button className="w-full mt-4 py-3 rounded-xl bg-white/4 border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/6 transition-all flex items-center justify-center gap-2">
              <PawPrint className="w-4 h-4" /> Report Lost / Found Pet
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {["All", "Dog", "Cat", "Vaccinated"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === f ? "bg-pink-500/20 border-pink-500/50 text-pink-300" : "bg-white/4 border-white/10 text-white/45"}`}>{f}</button>
              ))}
            </div>
            {adoptionLoading ? (
              <p className="text-white/40 text-sm text-center py-12">Loading adoption listings…</p>
            ) : filteredAdoption.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-12">No listings match this filter.</p>
            ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredAdoption.map((pet) => (
                <div key={pet.id} onClick={() => setSelectedPet(pet)} className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden hover:border-pink-500/30 hover:scale-[1.02] transition-all cursor-pointer group">
                  <div className="relative aspect-square">
                    <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {pet.vaccinated && (
                      <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg">✓ Vacc</div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold text-sm">{pet.name}</p>
                      <p className="text-white/60 text-[10px]">{pet.breed} · {pet.age}</p>
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-white/40 text-[10px]"><MapPin className="w-2.5 h-2.5" />{pet.location}</div>
                    <button type="button" className="px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400 text-[10px] font-bold hover:bg-pink-500/30 transition-all">Adopt Me 🐾</button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}
      </div>

      {/* Adoption Modal */}
      {selectedPet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedPet(null)}>
          <div className="bg-[#0E1A12] border border-white/12 rounded-3xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ animation: "fadeUp 0.3s ease both" }}>
            <img src={selectedPet.image} alt={selectedPet.name} className="w-full aspect-video object-cover" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-bold text-xl" style={{ fontFamily: "'Sora', sans-serif" }}>{selectedPet.name}</h3>
                  <p className="text-white/50 text-sm">{selectedPet.breed} · {selectedPet.age}</p>
                </div>
                {selectedPet.vaccinated && <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2 py-1 rounded-lg">✓ Vaccinated</span>}
              </div>
              <p className="text-white/50 text-sm mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-orange-400" />{selectedPet.location}</p>
              {selectedPet.description && (
                <p className="text-white/40 text-xs mb-4 leading-relaxed">{selectedPet.description}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setSelectedPet(null)} className="flex-1 py-3 rounded-xl bg-white/6 border border-white/10 text-white/60 text-sm font-semibold">Close</button>
                <button type="button" className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white text-sm font-bold shadow-lg shadow-pink-500/30">
                  🐾 Adopt {selectedPet.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// NGO & DONATION PAGE
// ─────────────────────────────────────────────
const MOCK_NGOS = [
  { id: 1, name: "Delhi Animal Rescue Trust", city: "New Delhi", dist: "1.2 km", rating: 4.8, rescues: 142, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&q=80", verified: true },
  { id: 2, name: "Paws & Claws Foundation", city: "New Delhi", dist: "2.7 km", rating: 4.6, rescues: 89, image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&q=80", verified: true },
  { id: 3, name: "Stray Help India", city: "New Delhi", dist: "4.1 km", rating: 4.9, rescues: 210, image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&q=80", verified: true },
];

type UpiDonationPayload = {
  referenceId: string;
  upiUri: string;
  qrDataUrl: string;
  payeeName: string;
  payeeVpa: string;
  amount: number;
};

function NGOPage() {
  const { user, addToast } = useApp();
  const userCoords = useNearbyCoords();
  const [donationView, setDonationView] = useState(false);
  const [selectedNGO, setSelectedNGO] = useState<any | null>(null);
  const [amount, setAmount] = useState(500);
  const [donationPhase, setDonationPhase] = useState<"amount" | "upi" | "thanks">("amount");
  const [upiPayload, setUpiPayload] = useState<UpiDonationPayload | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payMethods, setPayMethods] = useState<{ upi: boolean; stripe: boolean }>({ upi: false, stripe: false });
  const [ngos, setNgos] = useState<any[]>(MOCK_NGOS);

  useEffect(() => {
    fetch(apiUrl("/api/donations/methods"))
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) setPayMethods(d.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const { lat, lng } = userCoords;
    const R = 6371;
    fetch(apiUrl(`/api/ngos/nearby?lat=${lat}&lng=${lng}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          const formatted = data.data.map((n: any) => {
            const coords = n.location?.coordinates;
            let dist = "Nearby";
            if (coords?.length === 2) {
              const [clng, clat] = coords;
              const dLat = ((clat - lat) * Math.PI) / 180;
              const dLng = ((clng - lng) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos((lat * Math.PI) / 180) *
                  Math.cos((clat * Math.PI) / 180) *
                  Math.sin(dLng / 2) ** 2;
              const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
              dist = `${km.toFixed(1)} km`;
            }
            return {
              id: n._id,
              name: n.name,
              city: n.city,
              dist,
              rating: n.rating,
              rescues: n.rescues,
              image: n.image,
              verified: n.verified,
            };
          });
          setNgos(formatted);
        }
      })
      .catch(console.error);
  }, [userCoords.lat, userCoords.lng]);

  const openDonation = (ngo: any) => {
    setSelectedNGO(ngo);
    setDonationPhase("amount");
    setUpiPayload(null);
    setDonationView(true);
  };

  const closeDonation = () => {
    setDonationView(false);
    setDonationPhase("amount");
    setUpiPayload(null);
  };

  const startUpiDonation = async () => {
    if (!selectedNGO || amount < 1) return;
    const phone = user?.phone?.trim();
    if (!phone) {
      addToast({ type: "warning", title: "Phone required", message: "Add your phone on login so we can match your donation." });
      return;
    }
    setPayBusy(true);
    try {
      const res = await fetch(apiUrl("/api/donations/upi"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          donorPhone: phone,
          donorName: user?.name || "Supporter",
          ngoId: selectedNGO.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setUpiPayload(data.data);
        setDonationPhase("upi");
        addToast({ type: "info", title: "Complete in your UPI app", message: "Pay ₹" + amount + ", then tap I’ve paid." });
      } else {
        addToast({ type: "error", title: "UPI unavailable", message: data.message || "Configure PLATFORM_UPI_ID in backend/.env" });
      }
    } catch {
      addToast({ type: "error", title: "Network error", message: "Could not start UPI payment." });
    } finally {
      setPayBusy(false);
    }
  };

  const confirmUpiPaid = async () => {
    if (!upiPayload) return;
    setPayBusy(true);
    try {
      const res = await fetch(apiUrl("/api/donations/upi/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId: upiPayload.referenceId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDonationPhase("thanks");
        addToast({ type: "success", title: "Thank you", message: "Donation recorded." });
      } else {
        addToast({ type: "error", title: "Could not confirm", message: data.message || "Try again" });
      }
    } catch {
      addToast({ type: "error", title: "Network error", message: "Confirmation failed" });
    } finally {
      setPayBusy(false);
    }
  };

  const startStripeDonation = async () => {
    if (!selectedNGO) return;
    const phone = user?.phone?.trim() || "0000000000";
    setPayBusy(true);
    try {
      const res = await fetch(apiUrl("/api/donations/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          donorPhone: phone,
          donorName: user?.name,
          ngoId: selectedNGO.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        addToast({ type: "error", title: "Card payment", message: data.message || "Stripe not configured" });
      }
    } catch {
      addToast({ type: "error", title: "Failed", message: "Network error" });
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F0D] pb-24">
      <header className="sticky top-0 z-40 bg-[#0A0F0D]/85 backdrop-blur-2xl border-b border-white/8">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <h1 className="text-white font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>NGOs & Donate</h1>
          <p className="text-white/40 text-xs mt-0.5">Verified animal welfare organizations near you</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-5 space-y-4">
        {/* Impact banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500/15 to-red-500/10 border border-orange-500/25 p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">❤️</div>
            <div>
              <p className="text-white font-semibold text-sm">Your donations save lives</p>
              <p className="text-white/50 text-xs mt-0.5">100% transparent — see where every rupee goes</p>
            </div>
          </div>
        </div>

        {/* NGO Cards */}
        {ngos.map((ngo) => (
          <div key={ngo.id} className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
            <div className="flex gap-4 p-4">
              <img src={ngo.image} alt={ngo.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-white font-bold text-sm truncate">{ngo.name}</p>
                  {ngo.verified && <span className="text-sky-400 text-[10px]">✓</span>}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/40">
                  <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{ngo.dist}</span>
                  <span className="text-amber-400">★ {ngo.rating}</span>
                  <span>{ngo.rescues} rescues</span>
                </div>
              </div>
            </div>
            {/* Transparency bar */}
            <div className="px-4 pb-2">
              <p className="text-white/30 text-[10px] mb-1.5">Fund allocation</p>
              <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 rounded-full" style={{ width: "60%" }} />
                <div className="bg-sky-500 rounded-full" style={{ width: "25%" }} />
                <div className="bg-orange-500 rounded-full" style={{ width: "15%" }} />
              </div>
              <div className="flex gap-4 mt-1.5 text-[9px] text-white/35">
                <span><span className="text-emerald-400">●</span> 60% Medical</span>
                <span><span className="text-sky-400">●</span> 25% Shelter</span>
                <span><span className="text-orange-400">●</span> 15% Ops</span>
              </div>
            </div>
            <div className="px-4 pb-4 flex gap-2">
              <button className="flex-1 py-2 rounded-xl bg-white/6 border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/10 transition-all">View Profile</button>
              <button
                type="button"
                onClick={() => openDonation(ngo)}
                className="flex-1 py-2 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold hover:bg-orange-500/30 transition-all flex items-center justify-center gap-1"
              >
                <HandHeart className="w-3.5 h-3.5" /> Donate
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Donation Modal — UPI first (instant app handoff), Stripe optional */}
      {donationView && selectedNGO && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeDonation}>
          <div className="bg-[#0E1A12] border border-white/12 rounded-3xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ animation: "fadeUp 0.3s ease both" }}>
            {donationPhase === "thanks" ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-white font-bold text-xl mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>Thank you</h3>
                <p className="text-emerald-400 text-sm">₹{amount} — recorded for {selectedNGO.name}</p>
                <button type="button" onClick={closeDonation} className="mt-6 w-full py-3 rounded-xl bg-white/10 text-white text-sm font-semibold">Close</button>
              </div>
            ) : donationPhase === "upi" && upiPayload ? (
              <>
                <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>Pay with UPI</h3>
                <p className="text-white/45 text-xs mb-1">To: {upiPayload.payeeName}</p>
                <p className="text-white/35 text-[11px] font-mono mb-4 break-all">{upiPayload.payeeVpa}</p>
                <p className="text-amber-400 text-2xl font-black mb-4">₹{upiPayload.amount}</p>
                <div className="flex justify-center mb-4 rounded-2xl bg-white p-3">
                  <img src={upiPayload.qrDataUrl} alt="UPI QR" className="w-44 h-44 object-contain" />
                </div>
                <p className="text-white/40 text-[11px] mb-3">Ref: {upiPayload.referenceId}</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={payBusy}
                    onClick={() => { window.location.href = upiPayload.upiUri; }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold"
                  >
                    Open UPI app
                  </button>
                  <button
                    type="button"
                    onClick={() => { void navigator.clipboard.writeText(upiPayload.upiUri); addToast({ type: "success", title: "Copied", message: "Paste in UPI app if needed." }); }}
                    className="w-full py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/80 text-xs font-semibold"
                  >
                    Copy UPI link
                  </button>
                  <button
                    type="button"
                    disabled={payBusy}
                    onClick={() => void confirmUpiPaid()}
                    className="w-full py-3 rounded-xl bg-orange-500/25 border border-orange-500/40 text-orange-300 text-sm font-bold"
                  >
                    I’ve paid — record donation
                  </button>
                  <button type="button" onClick={() => setDonationPhase("amount")} className="text-white/40 text-xs py-2">← Change amount</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>Donate to NGO</h3>
                <p className="text-white/50 text-sm mb-4">{selectedNGO.name}</p>
                <p className="text-white/35 text-[11px] mb-4 leading-relaxed">
                  Online donation uses UPI (PhonePe / GPay / Paytm). Add <span className="text-white/55">PLATFORM_UPI_ID</span> in backend <code className="text-emerald-400/90">.env</code> if you see errors.
                </p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[100, 250, 500, 1000].map((a) => (
                    <button key={a} type="button" onClick={() => setAmount(a)} className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${amount === a ? "bg-orange-500/25 border-orange-500/50 text-orange-300" : "bg-white/5 border-white/10 text-white/50"}`}>
                      ₹{a}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 mb-4"
                  placeholder="Amount (₹)"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={payBusy || amount < 1}
                    onClick={() => void startUpiDonation()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/30 disabled:opacity-50"
                  >
                    Pay ₹{amount} with UPI
                  </button>
                  {payMethods.stripe && (
                    <button
                      type="button"
                      disabled={payBusy || amount < 1}
                      onClick={() => void startStripeDonation()}
                      className="w-full py-3 rounded-xl bg-white/8 border border-white/15 text-white/85 text-sm font-semibold"
                    >
                      Pay with card (Stripe)
                    </button>
                  )}
                  <button type="button" onClick={closeDonation} className="py-2 text-white/45 text-sm">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// REWARDS PAGE
// ─────────────────────────────────────────────
function RewardsPage() {
  const { user, reports, addToast, ledgerEpoch } = useApp();
  const userReports = reports.filter((r) => r.reporterName === user?.name);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [rewardHistory, setRewardHistory] = useState<{ action: string; coins: string; time: string }[]>([]);
  const [rewardInfo, setRewardInfo] = useState<{
    reportAcceptedCoins: number;
    reportCompletedCoins: number;
    rupeesPerCoin: number;
    coinsPerRupee: number;
  } | null>(null);
  const [supportUpi, setSupportUpi] = useState<{ upiUri: string; qrDataUrl: string; amount: number } | null>(null);

  useEffect(() => {
    fetch(apiUrl("/api/rewards/info"))
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) setRewardInfo(d.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const qs = rewardsQueryString(user);
    const fetchRewards = async () => {
      if (!qs) {
        setCoinBalance(0);
        setWalletBalance(0);
        setRewardHistory([]);
        return;
      }
      try {
        const res = await fetch(`${apiUrl("/api/rewards")}?${qs}`);
        const data = await res.json();
        if (data.success) {
          const raw = Number(data.data.totalCoins);
          setCoinBalance(Number.isFinite(raw) ? Math.max(0, raw) : 0);
          setWalletBalance(data.data.walletBalance ?? 0);
          const history = (data.data.transactions || []).map((t: any) => ({
            action: formatRewardReason(t.reason),
            coins: formatLedgerCoins(Number(t.amount)),
            time: new Date(t.createdAt).toLocaleDateString(),
          }));
          setRewardHistory(
            history.length ? history : [{ action: "No activity yet", coins: "0", time: "—" }]
          );
        }
      } catch (err) {
        console.error("Failed to fetch rewards", err);
      }
    };
    fetchRewards();
  }, [user, reports, ledgerEpoch]);

  const rewardsAuthBody = (): Record<string, string> | null => {
    if (!user) return null;
    if (user.id) return { userId: user.id };
    if (user.phone) return { phone: user.phone };
    if (user.email) return { email: user.email };
    return null;
  };

  const handleClaim = async (amount: number) => {
    const auth = rewardsAuthBody();
    if (!auth) {
      addToast({ type: "warning", title: "Profile", message: "Add a phone number or use Google sign-in for rewards." });
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/rewards/claim"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...auth, amountToClaim: amount }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const t = Number(data.data.tokens);
        setCoinBalance(Number.isFinite(t) ? Math.max(0, t) : 0);
        setWalletBalance(data.data.walletBalance);
        addToast({ type: "success", title: "Claimed!", message: data.message });
      } else {
        addToast({ type: "error", title: "Claim failed", message: data.message });
      }
    } catch {
      addToast({ type: "error", title: "Network Error", message: "Failed to claim tokens" });
    }
  };

  const handleRedeemCatalog = async (reward: { id: number; title: string; cost: number }) => {
    const auth = rewardsAuthBody();
    if (!auth) {
      addToast({ type: "warning", title: "Profile", message: "Sign in with phone or Google to redeem." });
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/rewards/redeem"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...auth,
          cost: reward.cost,
          sku: `catalog_${reward.id}_${reward.title.replace(/\s+/g, "_").slice(0, 24)}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const t = Number(data.data.tokens);
        setCoinBalance(Number.isFinite(t) ? Math.max(0, t) : 0);
        addToast({ type: "success", title: "Redeemed", message: `${reward.cost} coins spent — ${reward.title}.` });
        setSupportUpi(null);
        const tip = await fetch(apiUrl("/api/donations/platform-upi?amount=11&note=redeem-tip"));
        const tipJson = await tip.json();
        if (tip.ok && tipJson.success && tipJson.data) {
          setSupportUpi({ upiUri: tipJson.data.upiUri, qrDataUrl: tipJson.data.qrDataUrl, amount: tipJson.data.amount ?? 11 });
        }
      } else {
        addToast({ type: "error", title: "Redeem failed", message: data.message });
      }
    } catch {
      addToast({ type: "error", title: "Network Error", message: "Failed to redeem" });
    }
  };

  const rewards = [
    { id: 1, title: "NGO boost", desc: "Spend Paw coins to flag support for partner NGOs (ledger only until fulfillment hooks exist).", cost: 100, icon: "❤️" },
    { id: 2, title: "Rescue badge", desc: "Profile badge — we’ll notify you when perks ship.", cost: 250, icon: "🏅" },
    { id: 3, title: "Priority response", desc: "Higher visibility in routing when the feature goes live.", cost: 500, icon: "⚡" },
    { id: 4, title: "VIP rescuer", desc: "Reserved for leaderboard / VIP tiers.", cost: 1000, icon: "👑" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0A0F0D] pb-24">
      <header className="sticky top-0 z-40 bg-[#0A0F0D]/85 backdrop-blur-2xl border-b border-white/8">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <h1 className="text-white font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>Rewards</h1>
          <p className="text-white/40 text-xs mt-0.5">Earn Paw coins → spend or move to ₹ wallet</p>
          {!rewardsQueryString(user) && (
            <p className="text-amber-400/90 text-[11px] mt-2">Sign in with phone or Google to sync coins.</p>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-5 space-y-6">
        {/* How it works */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider">How Paw coins work</p>
          <ul className="text-white/55 text-[13px] space-y-2 leading-relaxed list-disc pl-4">
            <li>
              <span className="text-amber-400/90 font-semibold">Earn</span> when an NGO accepts (+{rewardInfo?.reportAcceptedCoins ?? 10}) or completes (+{rewardInfo?.reportCompletedCoins ?? 50}) your report.
            </li>
            <li>
              <span className="text-sky-400/90 font-semibold">Spend</span> below on perks — coins leave your balance immediately (in-app ledger).
            </li>
            <li>
              <span className="text-emerald-400/90 font-semibold">Wallet</span> — convert coins to rupees ({rewardInfo?.coinsPerRupee ?? 10} coins = ₹1). Real UPI cash-out needs a bank payout integration later.
            </li>
          </ul>
        </div>

        {/* Balances */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-[#0A0F0D] border border-amber-500/25 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
          <div className="relative grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-wide mb-1">Paw coins</p>
              <p className="text-4xl font-black text-amber-400" style={{ fontFamily: "'Sora', sans-serif" }}>{coinBalance}</p>
              <p className="text-white/35 text-[10px] mt-1">for rescues and redemptions</p>
            </div>
            <div className="border-l border-white/10 pl-4">
              <p className="text-white/50 text-[11px] uppercase tracking-wide mb-1">₹ Wallet</p>
              <p className="text-4xl font-black text-emerald-400" style={{ fontFamily: "'Sora', sans-serif" }}>₹{walletBalance.toFixed(2)}</p>
              <p className="text-white/35 text-[10px] mt-1">from converted coins</p>
            </div>
          </div>
          <div className="relative mt-5 pt-5 border-t border-amber-500/20 text-center">
            <p className="text-white/45 text-xs mb-3">
              Convert: {rewardInfo?.coinsPerRupee ?? 10} coins → ₹1 in wallet ({rewardInfo?.rupeesPerCoin ?? 0.1} ₹ per coin)
            </p>
            <button
              type="button"
              onClick={() => handleClaim(50)}
              disabled={coinBalance < 50 || !rewardsQueryString(user)}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl font-bold text-xs hover:from-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              Convert 50 coins → ₹{(50 * (rewardInfo?.rupeesPerCoin ?? 0.1)).toFixed(2)} wallet
            </button>
          </div>
          <div className="relative grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Your reports", value: userReports.length, hint: "submitted" },
              { label: "Rescued", value: userReports.filter((r) => r.status === "completed").length, hint: "completed" },
              { label: "Streak", value: "—", hint: "soon" },
            ].map((s) => (
              <div key={s.label} className="bg-black/20 border border-white/8 rounded-xl p-3 text-center">
                <p className="text-white font-bold text-sm">{s.value}</p>
                <p className="text-white/40 text-[10px]">{s.label}</p>
                <p className="text-white/25 text-[9px] mt-0.5">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Redeem Options */}
        <div>
          <h3 className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Spend Paw coins</h3>
          <p className="text-white/35 text-[11px] mb-3">Redemption is instant in the app (coins deducted). Optional ₹ support via UPI may appear after you redeem.</p>
          <div className="grid grid-cols-2 gap-3">
            {rewards.map((reward) => {
              const canRedeem = coinBalance >= reward.cost && !!rewardsQueryString(user);
              return (
                <div key={reward.id} className={`border rounded-2xl p-4 transition-all ${canRedeem ? "bg-white/[0.04] border-white/10 hover:border-amber-500/30" : "bg-white/2 border-white/6 opacity-60"}`}>
                  <div className="text-3xl mb-3">{reward.icon}</div>
                  <p className="text-white font-bold text-sm mb-1">{reward.title}</p>
                  <p className="text-white/40 text-xs mb-3 leading-relaxed">{reward.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 text-xs font-bold">🪙 {reward.cost}</span>
                    <button
                      type="button"
                      disabled={!canRedeem}
                      onClick={() => canRedeem && handleRedeemCatalog(reward)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${canRedeem ? "bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30" : "bg-white/5 text-white/25 border border-white/8"}`}
                    >
                      {canRedeem ? "Redeem" : "Locked"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* History */}
        <div>
          <h3 className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">Coin History</h3>
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl overflow-hidden">
            {rewardHistory.map((h, i) => {
              const isNeutral = h.action === "No activity yet";
              const isCredit = h.coins.startsWith("+");
              return (
                <div key={i} className={`flex items-center justify-between px-4 py-3.5 ${i < rewardHistory.length - 1 ? "border-b border-white/6" : ""}`}>
                  <div>
                    <p className="text-white text-sm font-medium">{h.action}</p>
                    <p className="text-white/35 text-xs">{h.time}</p>
                  </div>
                  <span className={`font-bold text-sm ${isNeutral ? "text-white/35" : isCredit ? "text-emerald-400" : "text-rose-400/90"}`}>{h.coins}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard Teaser */}
        <div className="bg-gradient-to-r from-violet-500/10 to-sky-500/10 border border-violet-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-sm">Community Leaderboard</p>
              <p className="text-white/50 text-xs mt-0.5">Coming soon — ranks will use verified rescues</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-400" />
            </div>
          </div>
        </div>

        {supportUpi && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog">
            <div className="bg-[#0E1A12] border border-white/12 rounded-3xl max-w-sm w-full p-5">
              <p className="text-white font-bold text-sm mb-1">Optional: support PawRescue</p>
              <p className="text-white/45 text-xs mb-4">UPI opens in your bank app. This is separate from Paw coins.</p>
              <div className="flex justify-center mb-3 rounded-xl bg-white p-2">
                <img src={supportUpi.qrDataUrl} alt="UPI" className="w-40 h-40 object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold"
                  onClick={() => { window.location.href = supportUpi.upiUri; }}
                >
                  Pay ₹{supportUpi.amount} with UPI
                </button>
                <button type="button" className="text-white/45 text-sm py-2" onClick={() => setSupportUpi(null)}>
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────
function BottomNav({ role }: { role: "reporter" | "admin" }) {
  const { page, setPage, setUser, user, reports } = useApp();
  const userReports = reports.filter((r) => r.reporterName === user?.name);

  const reporterItems = [
    { id: "reporter" as Page, label: "Home", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "discover" as Page, label: "Discover", icon: <Compass className="w-5 h-5" /> },
    { id: "report-form" as Page, label: "Report", icon: <AlertTriangle className="w-5 h-5" />, featured: true },
    { id: "ngo" as Page, label: "NGOs", icon: <Building2 className="w-5 h-5" /> },
    { id: "rewards" as Page, label: "Rewards", icon: <Coins className="w-5 h-5" /> },
  ];

  const adminItems = [
    { id: "admin" as Page, label: "Dashboard", icon: <Activity className="w-5 h-5" /> },
  ];

  const items = role === "reporter" ? reporterItems : adminItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0F0D]/92 backdrop-blur-2xl border-t border-white/8 z-50">
      <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-around">
        {items.map((item) =>
          (item as any).featured ? (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className="flex flex-col items-center gap-0.5 relative -top-3"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${page === item.id ? "bg-emerald-400 shadow-emerald-400/50" : "bg-emerald-500 shadow-emerald-500/40 hover:bg-emerald-400"}`}>
                {item.icon}
              </div>
              <span className="text-[9px] font-bold text-emerald-400">{item.label}</span>
            </button>
          ) : (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all relative ${page === item.id ? "text-emerald-400" : "text-white/30 hover:text-white/60"}`}
            >
              {item.icon}
              <span className="text-[9px] font-semibold">{item.label}</span>
              {item.id === "reporter" && userReports.some(r => r.status === "pending") && (
                <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
              {page === item.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />}
            </button>
          )
        )}
        <button
          onClick={() => {
            localStorage.removeItem("pawrescue_token");
            localStorage.removeItem("pawrescue_user");
            setUser(null);
            setPage("landing");
            window.location.reload();
          }}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-white/30 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] font-semibold">Logout</span>
        </button>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// PAGE LOADER
// ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0A0F0D] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <PawPrint className="w-6 h-6 text-emerald-400 animate-bounce" />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-emerald-500/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────────
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'white' }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error?.message}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────
// APP PROVIDER & ROOT ROUTER
// ─────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const pageMap: Record<string, Page> = {
    '/': 'landing',
    '/login': 'login',
    '/reporter': 'reporter',
    '/report-form': 'report-form',
    '/dashboard': 'dashboard',
    '/discover': 'discover',
    '/ngo': 'ngo',
    '/rewards': 'rewards',
    '/admin': 'admin'
  };

  const page = pageMap[location.pathname] || 'landing';

  const setPage = useCallback((p: Page) => {
    const reverseMap: Record<Page, string> = {
      'landing': '/',
      'login': '/login',
      'reporter': '/reporter',
      'report-form': '/report-form',
      'dashboard': '/dashboard',
      'discover': '/discover',
      'ngo': '/ngo',
      'rewards': '/rewards',
      'admin': '/admin'
    };
    navigate(reverseMap[p] || '/');
  }, [navigate]);

  const [user, setUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("pawrescue_user");
    if (saved) { try { return JSON.parse(saved); } catch { return null; } }
    return null;
  });

  const [reports, setReports] = useState<AnimalReport[]>([]);
  const [ledgerEpoch, setLedgerEpoch] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [imageHashes, setImageHashes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/login') {
      const saved = localStorage.getItem("pawrescue_user");
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u.role && user) {
            navigate(u.role === "admin" ? "/admin" : "/reporter", { replace: true });
          }
        } catch { /* empty */ }
      }
    }
  }, [location.pathname, navigate, user]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(apiUrl("/api/reports"));
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const formatted = data.map((r: Record<string, unknown>) => normalizeReportPayload(r));
        setReports(formatted);
        setImageHashes(new Set(formatted.filter((r) => r.imageHash).map((r) => r.imageHash as string)));
      } catch (err) {
        console.error("Failed to fetch reports", err);
      }
    };
    fetchReports();

    const socket = io(getSocketOrigin(), {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socket.on("new_report", (newReport: Record<string, unknown>) => {
      const formatted = normalizeReportPayload(newReport);
      setReports((prev) => [formatted, ...prev]);
      if (formatted.imageHash) setImageHashes((prev) => new Set(prev).add(formatted.imageHash as string));
    });

    socket.on("status_update", (payload: { id: string; status: ReportStatus; treatedImageUrl?: string }) => {
      const pid = String(payload.id);
      setReports((prev) =>
        prev.map((r) =>
          reportMatchesSocketId(r, pid)
            ? {
                ...r,
                status: payload.status,
                treatedImageUrl: payload.treatedImageUrl || r.treatedImageUrl,
                isFlagged: payload.status === "fake",
                updatedAt: new Date(),
              }
            : r
        )
      );
      setLedgerEpoch((e) => e + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const addToast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addReport = useCallback((r: AnimalReport) => {
    setReports((prev) => [r, ...prev]);
  }, []);

  const removeReport = useCallback((id: string) => {
    const sid = String(id);
    setReports((prev) => prev.filter((r) => String(r.id) !== sid));
  }, []);

  const updateReportStatus = useCallback(async (id: string, status: ReportStatus, treatedImageDataUrl?: string) => {
    try {
      const res = await fetch(apiUrl(`/api/reports/${id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, treatedImageDataUrl }),
      });
      if (res.ok) {
        const updatedReport = await res.json();
        const norm = normalizeReportPayload(updatedReport);
        setReports((prev) =>
          prev.map((r) =>
            String(r.id) === String(id)
              ? { ...r, ...norm, status, isFlagged: status === "fake", updatedAt: new Date() }
              : r
          )
        );
      }
    } catch (err) {
      console.error("Failed to patch status:", err);
    }
  }, []);

  const updateReport = useCallback(async (id: string, updateData: Record<string, unknown>) => {
    try {
      const res = await fetch(apiUrl(`/api/reports/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) return;

      const updatedReport = await res.json();
      const norm = normalizeReportPayload(updatedReport);

      setReports((prev) =>
        prev.map((r) =>
          String(r.id) === String(id)
            ? { ...r, ...norm, updatedAt: new Date() }
            : r
        )
      );
      setLedgerEpoch((e) => e + 1);
    } catch (err) {
      console.error("Failed to update report:", err);
    }
  }, []);

  const registerHash = useCallback((hash: string) => {
    setImageHashes((prev) => new Set(prev).add(hash));
  }, []);

  const AdminDashboard = React.lazy(() => import("./AdminDashboard"));
  const ReportWizard = React.lazy(() => import("./CameraModule").then((m) => ({ default: m.ReportWizard })));

  const renderPage = () => {
    if (!user) {
      if (page === "login") return <LoginPage />;
      return <LandingPage />;
    }
    if (user.role === "admin") {
      return (
        <ErrorBoundary>
          <React.Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </React.Suspense>
        </ErrorBoundary>
      );
    }
    // Reporter pages
    const withNav = (content: React.ReactNode) => (
      <>
        {content}
        <BottomNav role={user.role} />
      </>
    );

    switch (page) {
      case "reporter": return withNav(<ReporterDashboard />);
      case "report-form": return withNav(<React.Suspense fallback={<PageLoader />}><ReportWizard /></React.Suspense>);
      case "discover": return withNav(<DiscoverPage />);
      case "ngo": return withNav(<NGOPage />);
      case "rewards": return withNav(<RewardsPage />);
      default: return withNav(<ReporterDashboard />);
    }
  };

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
        user,
        setUser,
        reports,
        addReport,
        removeReport,
        updateReportStatus,
        updateReport,
        ledgerEpoch,
        toasts,
        addToast,
        removeToast,
        imageHashes,
        registerHash,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; background: #0A0F0D; }
        @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes countPop { from { transform: scale(1.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
      {renderPage()}
      <ToastContainer />
    </AppContext.Provider>
  );
}
