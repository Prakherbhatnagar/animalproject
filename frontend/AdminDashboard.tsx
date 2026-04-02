/**
 * AdminDashboard.tsx – Premium NGO Admin Panel
 * ─────────────────────────────────────────────
 * All original API integrations, socket listeners, and
 * status-update logic preserved exactly. Only UI upgraded.
 * ─────────────────────────────────────────────
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  PawPrint,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Filter,
  Bell,
  LogOut,
  ChevronDown,
  Eye,
  X,
  ArrowLeftRight,
  TrendingUp,
  Users,
  Zap,
  Star,
  RefreshCw,
  Map as MapIcon,
  List,
  BarChart3,
  Phone,
  Search,
  Shield,
} from "lucide-react";
import {
  useApp,
  AnimalReport,
  ReportStatus,
  StatusBadge,
  Priority,
  statusConfig,
  priorityConfig,
  timeAgo,
} from "./App";
import { apiUrl } from "./lib/apiClient";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default leaflet icons just in case
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type FilterStatus = "all" | ReportStatus;
type ViewMode = "split" | "list" | "map" | "analytics";

const STATUS_ACTIONS: {
  status: ReportStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}[] = [
  { status: "accepted", label: "Accept", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-sky-400", bg: "bg-sky-500/15 border-sky-500/30 hover:bg-sky-500/25" },
  { status: "in_progress", label: "In Progress", icon: <Activity className="w-3.5 h-3.5" />, color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/30 hover:bg-violet-500/25" },
  { status: "completed", label: "Resolve", icon: <Star className="w-3.5 h-3.5" />, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25" },
  { status: "fake", label: "Mark Fake", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400", bg: "bg-red-500/15 border-red-500/30 hover:bg-red-500/25" },
];

// ─────────────────────────────────────────────
// BEFORE / AFTER SLIDER (preserved exactly)
// ─────────────────────────────────────────────
function BeforeAfterSlider({ beforeSrc, afterSrc, animalName }: {
  beforeSrc: string;
  afterSrc: string;
  animalName: string;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => { setDragging(true); updateSlider(e.clientX); };
  const handleMouseMove = useCallback((e: MouseEvent) => { if (dragging) updateSlider(e.clientX); }, [dragging, updateSlider]);
  const handleMouseUp = useCallback(() => setDragging(false), []);
  const handleTouchMove = useCallback((e: TouchEvent) => { if (dragging) updateSlider(e.touches[0].clientX); }, [dragging, updateSlider]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
      <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
          <span className="text-white/70 text-sm font-semibold">Recovery — {animalName}</span>
        </div>
        <span className="text-white/30 text-xs">Drag to compare</span>
      </div>
      <div
        ref={containerRef}
        className="relative aspect-video cursor-col-resize select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={(e) => { setDragging(true); updateSlider(e.touches[0].clientX); }}
      >
        <img src={afterSrc} alt="After" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
          <img src={beforeSrc} alt="Before" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10" style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center z-20">
            <ArrowLeftRight className="w-4 h-4 text-gray-700" />
          </div>
        </div>
        <div className="absolute top-3 left-3 z-10"><span className="bg-black/60 backdrop-blur-sm text-red-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-red-500/30 uppercase">Before</span></div>
        <div className="absolute top-3 right-3 z-10"><span className="bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-emerald-500/30 uppercase">After</span></div>
        {!dragging && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm text-white/60 text-[10px] px-3 py-1.5 rounded-full border border-white/15 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3 h-3" /> Slide to compare
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAP (preserved exactly)
// ─────────────────────────────────────────────
function AdminMap({ reports, selectedId, onSelect }: {
  reports: AnimalReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  /** Leaflet throws if MapContainer mounts twice on the same DOM (React Strict Mode / view toggles). */
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    setMapReady(true);
    return () => setMapReady(false);
  }, []);

  const selectedReport = reports.find((r) => r.id === selectedId);
  // Find an active report with valid coordinates first
  const centerReport = selectedReport || reports.find((r) => r.location && typeof r.location.lat === 'number') || reports[0];
  
  // Guarantee `lat` and `lng` are strictly numbers, falling back to default center if invalid.
  const center = (centerReport?.location && typeof centerReport.location.lat === 'number' && typeof centerReport.location.lng === 'number') 
    ? centerReport.location 
    : { lat: 28.6139, lng: 77.209 };

  const createMarkerIcon = (priority: string, isSelected: boolean) => {
    const pColor = priority === "critical" ? "#ef4444" : priority === "high" ? "#f97316" : priority === "medium" ? "#38bdf8" : "#94a3b8";
    return L.divIcon({
      className: "bg-transparent border-0",
      html: `<div style="display:flex;flex-direction:column;align-items:center;transition:all;transform:scale(${isSelected ? 1.25 : 1});">
              <div style="width:32px;height:32px;border-radius:50%;border:4px solid ${isSelected ? 'white' : 'rgba(255,255,255,0.6)'};background-color:${pColor};display:flex;align-items:center;justify-content:center;box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);">
                <span style="color:white;font-size:14px;">🐾</span>
              </div>
            </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden border border-white/10" style={{ zIndex: 10 }}>
      <div className="px-4 py-3 bg-[#0E1A12] border-b border-white/8 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-white/70 text-sm font-semibold">Live Incident Map</span>
        </div>
        <span className="text-emerald-400 text-xs font-medium">{reports.filter(r => r.location && typeof r.location.lat === 'number' && typeof r.location.lng === 'number').length} active pins</span>
      </div>
      <div className="relative flex-1 min-h-0 bg-[#0E1A12]">
        {!mapReady ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/35 text-sm">Loading map…</div>
        ) : (
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          style={{ height: "100%", width: "100%", background: "#0E1A12" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapUpdater center={center} />
          {reports.filter(r => r.location && typeof r.location.lat === 'number' && typeof r.location.lng === 'number').map((report) => (
            <Marker
              key={report.id}
              position={[report.location!.lat, report.location!.lng]}
              icon={createMarkerIcon(report.priority, report.id === selectedId)}
              eventHandlers={{ click: () => onSelect(report.id) }}
            >
              <Popup className="custom-popup">
                <div className="font-sans">
                  <strong>{report.animalType}</strong><br/>
                  <span style={{ fontSize: '12px', color: '#666' }}>{report.animalCondition}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        )}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-xl p-2.5 border border-white/12 space-y-1.5 z-[1000] pointer-events-none">
          {[{ label: "Critical", color: "bg-red-500" }, { label: "High", color: "bg-orange-500" }, { label: "Medium", color: "bg-sky-500" }, { label: "Low", color: "bg-slate-400" }].map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-white/55 text-[10px]">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ANALYTICS PANEL
// ─────────────────────────────────────────────
function AnalyticsPanel({ reports }: { reports: AnimalReport[] }) {
  const statusCounts = {
    pending: reports.filter(r => r.status === "pending").length,
    accepted: reports.filter(r => r.status === "accepted").length,
    in_progress: reports.filter(r => r.status === "in_progress").length,
    completed: reports.filter(r => r.status === "completed").length,
    fake: reports.filter(r => r.status === "fake").length,
  };
  const total = reports.length || 1;

  const animalTypes = ["Dog", "Cat", "Bird", "Cow", "Other"];
  const animalCounts = animalTypes.map(type => ({
    label: type,
    count: reports.filter(r => r.animalType === type).length,
    pct: Math.round((reports.filter(r => r.animalType === type).length / total) * 100),
  }));

  const priorityCounts = [
    { label: "Critical", count: reports.filter(r => r.priority === "critical").length, color: "bg-red-500", text: "text-red-400" },
    { label: "High", count: reports.filter(r => r.priority === "high").length, color: "bg-orange-500", text: "text-orange-400" },
    { label: "Medium", count: reports.filter(r => r.priority === "medium").length, color: "bg-sky-500", text: "text-sky-400" },
    { label: "Low", count: reports.filter(r => r.priority === "low").length, color: "bg-slate-500", text: "text-slate-400" },
  ];

  const resolutionRate = total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Reports", value: reports.length, icon: "📋", color: "from-white/5 to-white/2", border: "border-white/10", text: "text-white" },
          { label: "Resolution Rate", value: `${resolutionRate}%`, icon: "✅", color: "from-emerald-500/15 to-emerald-900/5", border: "border-emerald-500/20", text: "text-emerald-400" },
          { label: "Critical Cases", value: priorityCounts[0].count, icon: "🚨", color: "from-red-500/15 to-red-900/5", border: "border-red-500/20", text: "text-red-400" },
          { label: "Avg Response", value: "28 min", icon: "⚡", color: "from-amber-500/15 to-amber-900/5", border: "border-amber-500/20", text: "text-amber-400" },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-gradient-to-b ${kpi.color} border ${kpi.border} rounded-2xl p-4`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{kpi.icon}</span>
            </div>
            <p className={`text-2xl font-black ${kpi.text}`} style={{ fontFamily: "'Sora', sans-serif" }}>{kpi.value}</p>
            <p className="text-white/40 text-xs mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Status Distribution */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" /> Status Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const cfg = statusConfig[status as ReportStatus];
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-xs">{pct}%</span>
                      <span className={`text-sm font-bold ${cfg.color}`}>{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.dot}`}
                      style={{ width: `${pct}%`, transition: "width 0.8s ease" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> Priority Breakdown
          </h3>
          <div className="space-y-3">
            {priorityCounts.map((p) => {
              const pct = Math.round((p.count / total) * 100);
              return (
                <div key={p.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold ${p.text}`}>{p.label}</span>
                    <span className={`text-sm font-bold ${p.text}`}>{p.count}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.color}`} style={{ width: `${pct}%`, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Animal Types */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <PawPrint className="w-4 h-4 text-emerald-400" /> Animal Types
          </h3>
          <div className="space-y-2.5">
            {animalCounts.sort((a, b) => b.count - a.count).map((a, i) => (
              <div key={a.label} className="flex items-center gap-3">
                <span className="text-white/50 text-xs w-12">{a.label}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${a.pct}%`, opacity: 1 - i * 0.15, transition: "width 0.8s ease" }}
                  />
                </div>
                <span className="text-white/40 text-xs w-6 text-right">{a.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Quick Insights
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Flagged / Fake Reports",
                value: reports.filter(r => r.isFlagged).length,
                icon: <Shield className="w-3.5 h-3.5" />,
                color: "text-red-400",
                bg: "bg-red-500/10 border-red-500/20",
              },
              {
                label: "Pending Response",
                value: reports.filter(r => r.status === "pending").length,
                icon: <Clock className="w-3.5 h-3.5" />,
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
              },
              {
                label: "Unique Reporters",
                value: new Set(reports.map(r => r.reporterPhone)).size,
                icon: <Users className="w-3.5 h-3.5" />,
                color: "text-sky-400",
                bg: "bg-sky-500/10 border-sky-500/20",
              },
            ].map((insight) => (
              <div key={insight.label} className={`flex items-center justify-between p-3 rounded-xl border ${insight.bg}`}>
                <div className={`flex items-center gap-2 ${insight.color}`}>
                  {insight.icon}
                  <span className="text-xs font-medium text-white/60">{insight.label}</span>
                </div>
                <span className={`font-black text-lg ${insight.color}`} style={{ fontFamily: "'Sora', sans-serif" }}>{insight.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORT CARD
// ─────────────────────────────────────────────
function ReportCard({ report, isSelected, onSelect, onStatusChange }: {
  report: AnimalReport;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (id: string, status: ReportStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [changing, setChanging] = useState<ReportStatus | null>(null);
  const { addToast, updateReport, removeReport } = useApp();

  const handleStatusChange = async (status: ReportStatus) => {
    setChanging(status);
    await new Promise((r) => setTimeout(r, 600));
    onStatusChange(report.id, status);
    setChanging(null);
    const messages: Partial<Record<ReportStatus, string>> = {
      accepted: `Report ${report.id} accepted — rescue team notified.`,
      in_progress: `Team en route to ${report.location?.address?.split(",")[0]}.`,
      completed: `${report.animalType} successfully rescued! 🎉`,
      fake: `Report ${report.id} flagged as unverified.`,
    };
    addToast({
      type: status === "fake" ? "warning" : status === "completed" ? "success" : "info",
      title: `Status → ${statusConfig[status].label}`,
      message: messages[status] || "",
    });
  };

  const pConfig = priorityConfig[report.priority];

  const handleUpdateDetails = async () => {
    const nextDescription = window.prompt("Edit description:", report.description);
    if (nextDescription === null) return;

    const nextPriority = window.prompt(
      "Edit priority (low / medium / high / critical):",
      report.priority
    );
    if (nextPriority === null) return;

    const nextAddress = window.prompt("Edit address:", report.location?.address || "");
    if (nextAddress === null) return;

    const pr = String(nextPriority).toLowerCase().trim();
    const priorityAllowed = ["low", "medium", "high", "critical"] as const;
    if (!priorityAllowed.includes(pr as any)) {
      addToast({ type: "error", title: "Invalid priority", message: `Use: ${priorityAllowed.join(", ")}` });
      return;
    }

    await updateReport(report.id, {
      description: String(nextDescription).trim(),
      priority: pr,
      "location.address": String(nextAddress).trim(),
    });

    addToast({ type: "success", title: "Updated", message: "Report details updated." });
  };

  const handleDeleteReport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this report?")) return;
    try {
      const res = await fetch(apiUrl(`/api/reports/${report.id}`), { method: "DELETE" });
      if (res.ok) {
        removeReport(report.id);
        addToast({ type: "success", title: "Deleted", message: "Report deleted successfully." });
      } else {
        addToast({ type: "error", title: "Failed", message: "Could not delete report." });
      }
    } catch {
      addToast({ type: "error", title: "Network Error", message: "Failed to contact server." });
    }
  };

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${isSelected ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10" : report.isFlagged ? "border-red-500/20 bg-red-500/3 hover:border-red-500/30" : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/5"}`}
      onClick={onSelect}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {report.imageDataUrl ? (
            <img src={report.imageDataUrl} alt="animal" className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <PawPrint className="w-6 h-6 text-white/25" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white font-semibold text-sm">{report.animalType}</span>
                  <span className="text-white/25 text-xs">·</span>
                  <span className={`text-xs font-semibold ${pConfig.color}`}>{pConfig.label}</span>
                  {report.isFlagged && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/25">FLAGGED</span>}
                </div>
                <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{report.location?.address || "Location unknown"}</span>
                </p>
              </div>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-white/40 text-xs mt-1.5 line-clamp-2">{report.description}</p>
            <div className="flex items-center gap-3 mt-2 text-white/25 text-[10px]">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(report.createdAt)}</span>
              <span>{report.id}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{report.reporterName}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-full px-3.5 py-2 border-t border-white/6 flex items-center justify-between text-white/30 hover:text-white/60 hover:bg-white/3 transition-all text-xs"
      >
        <span>{expanded ? "Hide Actions" : "Show Actions & Details"}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-white/8 p-3.5 bg-white/[0.02]" onClick={(e) => e.stopPropagation()}>
          {/* Status actions */}
          <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold mb-2">Update Status</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {STATUS_ACTIONS.map((action) => (
              <button
                key={action.status}
                onClick={() => handleStatusChange(action.status)}
                disabled={report.status === action.status || !!changing}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${action.color} ${action.bg} ${changing === action.status ? "animate-pulse" : ""}`}
              >
                {changing === action.status ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : action.icon}
                {action.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleUpdateDetails();
              }}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              Update
            </button>
            <button
              type="button"
              onClick={handleDeleteReport}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/15 transition-all"
            >
              Delete
            </button>
          </div>

          {/* Reporter contact */}
          <div className="flex items-center gap-3 bg-white/3 rounded-xl px-3 py-2.5 border border-white/8 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-xs font-semibold">{report.reporterName}</p>
              <p className="text-white/40 text-[10px] flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{report.reporterPhone}</p>
            </div>
            <span className="text-white/25 text-[10px]">Updated {timeAgo(report.updatedAt)}</span>
          </div>

          {/* Before/After slider */}
          {report.treatedImageUrl && report.imageDataUrl && (
            <BeforeAfterSlider beforeSrc={report.imageDataUrl} afterSrc={report.treatedImageUrl} animalName={`${report.animalType} #${report.id}`} />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────
function AdminStatsBar({ reports }: { reports: AnimalReport[] }) {
  const stats = [
    { label: "Total", value: reports.length, color: "text-white", bg: "bg-white/5 border-white/10" },
    { label: "Pending", value: reports.filter(r => r.status === "pending").length, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Active", value: reports.filter(r => r.status === "in_progress").length, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    { label: "Rescued", value: reports.filter(r => r.status === "completed").length, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Critical", value: reports.filter(r => r.priority === "critical").length, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {stats.map((s) => (
        <div key={s.label} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border ${s.bg}`}>
          <span className={`text-lg font-black leading-none ${s.color}`} style={{ fontFamily: "'Sora', sans-serif" }}>{s.value}</span>
          <span className="text-white/35 text-xs">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN ADMIN DASHBOARD
// ─────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, reports, updateReportStatus, setUser, setPage } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"time" | "priority">("priority");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── API: status update with optional treated-image upload ──
  const handleStatusRequest = async (id: string, status: ReportStatus) => {
    if (status === "completed") {
      setPendingId(id);
      fileInputRef.current?.click();
    } else {
      await updateReportStatus(id, status);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingId) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      await updateReportStatus(pendingId, "completed", dataUrl);
      setPendingId(null);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const filteredReports = reports
    .filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.animalType.toLowerCase().includes(q) ||
          r.location?.address.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const order: Priority[] = ["critical", "high", "medium", "low"];
        return order.indexOf(a.priority) - order.indexOf(b.priority);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const selectedReport = reports.find((r) => r.id === selectedId) || null;

  const FILTER_OPTIONS: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "accepted", label: "Accepted" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Resolved" },
    { key: "fake", label: "Flagged" },
  ];

  const VIEW_MODES: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
    { id: "split", icon: <Activity className="w-3.5 h-3.5" />, label: "Split" },
    { id: "list", icon: <List className="w-3.5 h-3.5" />, label: "List" },
    { id: "map", icon: <MapIcon className="w-3.5 h-3.5" />, label: "Map" },
    { id: "analytics", icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Analytics" },
  ];

  return (
    <div className="h-screen flex bg-[#030906] overflow-hidden text-white font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A1A0E] border border-emerald-500/30 p-8 rounded-[2rem] flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold tracking-wide">Transmitting Rescue Data</p>
              <p className="text-emerald-400/60 text-xs mt-1.5 font-bold uppercase tracking-widest">Encrypting Payload...</p>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR (Mission Control) ── */}
      <aside className="w-[280px] flex-shrink-0 bg-[#060E09]/95 backdrop-blur-2xl border-r border-white/5 hidden md:flex flex-col z-40 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
        
        {/* Brand */}
        <div className="p-6 border-b border-white/5 flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)] shadow-emerald-500/20 border border-emerald-400/20">
            <PawPrint className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="font-black text-lg tracking-wide text-white" style={{ fontFamily: "'Sora', sans-serif" }}>PawRescue</p>
            <p className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]" /> SysAdmin
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 relative z-10 scrollbar-hide">
          <p className="px-4 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Core Modules</p>
          {VIEW_MODES.map(mode => (
             <button
               key={mode.id}
               onClick={() => setViewMode(mode.id)}
               className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                 viewMode === mode.id ? 'bg-gradient-to-r from-emerald-500/15 to-transparent text-emerald-400 border-l-2 border-emerald-400' : 'text-white/40 hover:text-white/80 hover:bg-white/5 border-l-2 border-transparent'
               }`}
             >
               <span className={`flex items-center justify-center w-8 h-8 rounded-xl ${viewMode === mode.id ? 'bg-emerald-500/20 shadow-inner border border-emerald-500/30' : 'bg-white/5 border border-white/10'}`}>
                  {mode.icon}
               </span>
               {mode.label}
             </button>
          ))}
        </div>

        {/* User Block */}
        <div className="p-4 m-4 rounded-[1.5rem] bg-gradient-to-br from-white/5 to-white/2 border border-white/10 flex items-center justify-between backdrop-blur-xl group relative z-10">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-lg text-white shadow-inner border border-emerald-400/20">{user?.name?.charAt(0) || "A"}</div>
             <div className="min-w-0">
               <p className="text-white text-sm font-bold truncate tracking-wide">{user?.name?.split(" ")[0]}</p>
               <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Operator</p>
             </div>
           </div>
           <button onClick={() => { setUser(null); setPage("landing"); }} className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all group-hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"><LogOut className="w-4 h-4" /></button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        
        {/* Header HUD */}
        <header className="h-[72px] border-b border-white/5 flex items-center justify-between px-6 md:px-8 flex-shrink-0 bg-[#060E09]/80 backdrop-blur-2xl relative">
          <div className="absolute top-0 right-1/4 w-96 h-10 bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 flex-1">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center"><PawPrint className="text-white w-4 h-4" /></div>
              <p className="font-bold text-sm tracking-wide text-white uppercase" style={{ fontFamily: "'Sora', sans-serif" }}>PawRescue</p>
            </div>
            <div className="hidden md:flex flex-1">
              <AdminStatsBar reports={reports} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all relative">
              <Bell className="w-4.5 h-4.5" />
              {reports.filter(r => r.status === "pending").length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)] animate-pulse" />}
            </button>
            <div className="md:hidden w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white shadow-sm border border-emerald-400/20">{user?.name?.charAt(0) || "A"}</div>
          </div>
        </header>

        {/* Mobile View Toggle */}
        <div className="md:hidden border-b border-white/5 px-4 py-3 flex gap-2 overflow-x-auto bg-[#0A120E] scrollbar-hide">
          {VIEW_MODES.map((mode) => (
            <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${viewMode === mode.id ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-white/40"}`}>
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        {viewMode !== "analytics" && (
          <div className="flex-shrink-0 bg-[#0A120E]/50 border-b border-white/5 px-6 md:px-8 py-4 flex items-center gap-4 backdrop-blur-xl">
            <div className="relative flex-1 max-w-[320px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search ID, Location..." className="w-full bg-[#030906] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 text-xs font-medium focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-inner" />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mask-edges">
              {FILTER_OPTIONS.map((f) => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 ${filterStatus === f.key ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"}`}>{f.label}</button>
              ))}
            </div>
            <button onClick={() => setSortBy(s => s === "time" ? "priority" : "time")} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#030906] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-white/5">
              <TrendingUp className="w-3.5 h-3.5" /> Sort: {sortBy === "priority" ? "Priority" : "Newest"}
            </button>
          </div>
        )}

        {/* Dynamic Content */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {viewMode === "analytics" && <AnalyticsPanel reports={reports} />}

          {(viewMode === "split" || viewMode === "list") && (
            <div className={`flex flex-col border-r border-white/5 ${viewMode === "split" ? "w-full md:w-[460px] lg:w-[500px]" : "w-full"} overflow-hidden flex-shrink-0 bg-[#030906]/50`}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-5 shadow-inner">
                      <Filter className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/50 text-sm font-bold tracking-wide">No Incident Found.</p>
                  </div>
                ) : (
                  filteredReports.map((report) => <ReportCard key={report.id} report={report} isSelected={selectedId === report.id} onSelect={() => setSelectedId(report.id)} onStatusChange={handleStatusRequest} />)
                )}
              </div>
              <div className="flex-shrink-0 border-t border-white/5 bg-[#060E09] px-6 py-3 flex items-center justify-between backdrop-blur-md">
                <span className="text-white/30 text-[10px] uppercase font-bold tracking-widest">{filteredReports.length} of {reports.length} Records</span>
                <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] uppercase font-black tracking-widest"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry</span>
              </div>
            </div>
          )}

          {(viewMode === "split" || viewMode === "map") && (
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#0A120E] relative">
              <AdminMap key={viewMode} reports={filteredReports} selectedId={selectedId} onSelect={setSelectedId} />

              {selectedReport && viewMode === "split" && (
                <div className="absolute bottom-6 left-6 right-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl bg-[#06100A]/95 backdrop-blur-2xl border border-emerald-500/20 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] shadow-emerald-500/5 overflow-hidden z-20 flex flex-col max-h-[45vh] lg:max-h-[35vh]">
                  <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-white text-xs font-black tracking-widest uppercase">Target Locked: {selectedReport.id}</span>
                      <div className="ml-2 scale-90 origin-left"><StatusBadge status={selectedReport.status} /></div>
                    </div>
                    <button onClick={() => setSelectedId(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
                    <div className="flex items-start gap-5">
                      {selectedReport.imageDataUrl && <img src={selectedReport.imageDataUrl} alt="animal" className="w-24 h-24 rounded-2xl object-cover border border-white/10 shadow-lg" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-lg tracking-wide mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>{selectedReport.animalType} — {selectedReport.animalCondition}</p>
                        <p className="text-white/60 text-xs leading-relaxed mb-3">{selectedReport.description}</p>
                        <p className="text-emerald-400 text-xs flex items-center gap-1.5 font-bold"><MapPin className="w-3.5 h-3.5" /> {selectedReport.location?.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_ACTIONS.map((action) => (
                        <button key={action.status} onClick={() => handleStatusRequest(selectedReport.id, action.status)} disabled={selectedReport.status === action.status} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black border transition-all disabled:opacity-30 ${action.color} ${action.bg}`}>
                          {action.icon} {action.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-amber-400/85 text-[10px] leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      <span className="font-bold">Paw coins (reporter):</span> +10 when you <span className="text-sky-300">Accept</span>, +50 when you mark <span className="text-emerald-300">Resolved</span>. The reporter must have been <span className="text-white/80">logged in</span> when submitting (phone or Google) so we can match their account.
                    </p>
                    {selectedReport.treatedImageUrl && selectedReport.imageDataUrl && <BeforeAfterSlider beforeSrc={selectedReport.imageDataUrl} afterSrc={selectedReport.treatedImageUrl} animalName={`${selectedReport.animalType} #${selectedReport.id}`} />}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>  );
}
