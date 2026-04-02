/**
 * CameraModule.tsx
 * ─────────────────────────────────────────────────────────
 * Custom camera capture component with:
 *   - Live getUserMedia stream (no file picker)
 *   - Duplicate detection integration
 *   - Geolocation with mini-map preview
 *   - 4-step report submission wizard
 * ─────────────────────────────────────────────────────────
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  Camera,
  CameraOff,
  MapPin,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Zap,
  Heart,
  Navigation,
  FileCheck,
  PawPrint,
  X,
  ArrowRight,
  FlipHorizontal,
  Aperture,
} from "lucide-react";
import { useApp, WizardStep, GeoLocation, AnimalReport, Priority } from "./App";
import { apiUrl } from "./lib/apiClient";
import {
  useImageDuplicateDetector,
  DuplicateStatusBadge,
  DuplicateAwareUploadZone,
  HashDisplay,
} from "./DuplicateDetector";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface ReportForm {
  animalType: string;
  animalCondition: string;
  description: string;
  priority: Priority;
  imageDataUrl: string | null;
  imageHash: string | null;
  location: GeoLocation | null;
}

const ANIMAL_TYPES = ["Dog", "Cat", "Bird", "Cow", "Monkey", "Horse", "Rabbit", "Other"];
const CONDITIONS = ["Injured", "Malnourished", "Sick", "Abandoned", "Trapped", "Healthy (needs shelter)"];
const PRIORITIES: { key: Priority; label: string; desc: string; color: string }[] = [
  { key: "low", label: "Low", desc: "Not urgent", color: "border-slate-500/40 text-slate-400" },
  { key: "medium", label: "Medium", desc: "Needs attention", color: "border-sky-500/40 text-sky-400" },
  { key: "high", label: "High", desc: "Urgent care", color: "border-orange-500/40 text-orange-400" },
  { key: "critical", label: "Critical", desc: "Life-threatening", color: "border-red-500/40 text-red-400" },
];

const WIZARD_STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: "details", label: "Animal", icon: <PawPrint className="w-4 h-4" /> },
  { key: "photo", label: "Photo", icon: <Camera className="w-4 h-4" /> },
  { key: "location", label: "Location", icon: <MapPin className="w-4 h-4" /> },
  { key: "review", label: "Review", icon: <FileCheck className="w-4 h-4" /> },
];

// ─────────────────────────────────────────────
// CAMERA CAPTURE COMPONENT
// ─────────────────────────────────────────────
interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCamera = useCallback(async (mode: "environment" | "user") => {
    // Stop previous stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraReady(false);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "NotAllowedError") {
        setCameraError("Camera access denied. Please allow camera permissions in your browser.");
      } else if (error.name === "NotFoundError") {
        setCameraError("No camera device found on this device.");
      } else {
        setCameraError("Failed to start camera. Please try again.");
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror for front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    onCapture(dataUrl);
  }, [cameraReady, facingMode, onCapture]);

  const startCountdown = () => {
    setCountdown(3);
    const tick = (n: number) => {
      if (n <= 0) {
        setCountdown(null);
        capturePhoto();
        return;
      }
      setTimeout(() => {
        setCountdown(n - 1);
        tick(n - 1);
      }, 1000);
    };
    tick(3);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <CameraOff className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-center text-sm font-medium">{cameraError}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm px-4 py-2 rounded-xl transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Loading overlay */}
            {!cameraReady && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-white/60 text-sm">Starting camera…</p>
                </div>
              </div>
            )}

            {/* Flash overlay */}
            {flash && <div className="absolute inset-0 bg-white opacity-80 pointer-events-none" />}

            {/* Countdown */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  key={countdown}
                  className="text-8xl font-bold text-white/90 drop-shadow-2xl"
                  style={{ fontFamily: "'Sora', sans-serif", animation: "countPop 0.5s ease-out" }}
                >
                  {countdown === 0 ? "📸" : countdown}
                </div>
                <style>{`@keyframes countPop{from{transform:scale(1.8);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
              </div>
            )}

            {/* Camera Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border border-white/15 rounded-2xl" />
              <div className="absolute top-1/3 left-8 right-8 h-px bg-white/8" />
              <div className="absolute top-2/3 left-8 right-8 h-px bg-white/8" />
              <div className="absolute left-1/3 top-8 bottom-8 w-px bg-white/8" />
              <div className="absolute left-2/3 top-8 bottom-8 w-px bg-white/8" />
            </div>

            {/* Top toolbar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white/80 text-xs font-medium">LIVE</span>
              </div>
              <button
                onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition-all"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* File input blocker notice */}
            <div className="absolute bottom-32 left-0 right-0 flex justify-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/15">
                <p className="text-white/50 text-[11px] text-center">
                  📸 Live camera only — file upload disabled
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/90 backdrop-blur-sm border-t border-white/10 px-8 py-6">
        <div className="flex items-center justify-center gap-8">
          {/* Timer shot */}
          <button
            onClick={startCountdown}
            disabled={!cameraReady || countdown !== null}
            className="flex flex-col items-center gap-1 text-white/50 hover:text-white/80 disabled:opacity-30 transition-colors"
          >
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Timer</span>
          </button>

          {/* Main capture button */}
          <button
            onClick={capturePhoto}
            disabled={!cameraReady || countdown !== null}
            className="relative w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center group disabled:opacity-40 hover:border-white/50 transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-white group-hover:bg-white/90 group-active:scale-90 transition-all flex items-center justify-center shadow-lg">
              <Aperture className="w-7 h-7 text-black" />
            </div>
          </button>

          {/* Flip camera */}
          <button
            onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
            className="flex flex-col items-center gap-1 text-white/50 hover:text-white/80 transition-colors"
          >
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
              <FlipHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Flip</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 1: Animal Details
// ─────────────────────────────────────────────
function StepDetails({ form, setForm, onNext }: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  onNext: () => void;
}) {
  const valid = form.animalType && form.animalCondition && form.description.length >= 10;

  return (
    <div className="space-y-5">
      <div>
        <label className="input-label">Animal Type</label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {ANIMAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setForm((f) => ({ ...f, animalType: type }))}
              className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                form.animalType === type
                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300"
                  : "bg-white/4 border-white/10 text-white/60 hover:border-white/25 hover:text-white/80"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">Condition</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {CONDITIONS.map((cond) => (
            <button
              key={cond}
              onClick={() => setForm((f) => ({ ...f, animalCondition: cond }))}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-left transition-all ${
                form.animalCondition === cond
                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300"
                  : "bg-white/4 border-white/10 text-white/60 hover:border-white/25 hover:text-white/80"
              }`}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">Priority Level</label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.key}
              onClick={() => setForm((f) => ({ ...f, priority: p.key }))}
              className={`py-2.5 rounded-xl text-[11px] font-semibold border transition-all ${
                form.priority === p.key
                  ? `bg-white/10 ${p.color} border-opacity-80`
                  : `bg-white/4 border-white/10 text-white/40 hover:border-white/20`
              }`}
            >
              <div className={form.priority === p.key ? p.color.split(" ")[1] : "text-white/50"}>
                {p.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Describe the animal's location and situation... (min. 10 characters)"
          rows={3}
          className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all resize-none"
        />
        <p className={`text-[11px] mt-1 text-right ${form.description.length < 10 ? "text-white/30" : "text-emerald-400/60"}`}>
          {form.description.length} / 10 min chars
        </p>
      </div>

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Next: Take Photo <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 2: Photo Capture
// ─────────────────────────────────────────────
function StepPhoto({ form, setForm, onNext, onBack }: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const { imageHashes, addToast, registerHash } = useApp();
  const [showCamera, setShowCamera] = useState(false);

  const { status, currentHash, checkResult, analyzeImage, reset } = useImageDuplicateDetector({
    knownHashes: imageHashes,
    onDuplicate: (result, hash) => {
      addToast({
        type: "warning",
        title: "Duplicate Photo Detected!",
        icon: "⚠️",
        message:
          result.matchType === "exact"
            ? "This exact photo was already submitted. Please take a new, distinct photo."
            : `A visually similar photo exists (${result.confidence}% match). Please take a different photo.`,
      });
    },
    onUnique: (hash) => {
      setForm((f) => ({ ...f, imageHash: hash.combined }));
      addToast({
        type: "success",
        title: "Photo Verified",
        message: "Unique image fingerprint confirmed. You're good to go!",
      });
    },
  });

  const handleCapture = async (dataUrl: string) => {
    setShowCamera(false);
    setForm((f) => ({ ...f, imageDataUrl: dataUrl, imageHash: null }));
    await analyzeImage(dataUrl);
  };

  const handleRetake = () => {
    setForm((f) => ({ ...f, imageDataUrl: null, imageHash: null }));
    reset();
  };

  const isDuplicate = status === "duplicate";
  const canProceed = form.imageDataUrl && status === "unique" && form.imageHash;

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="space-y-4">
        <DuplicateAwareUploadZone status={status}>
          {form.imageDataUrl ? (
            <div className="relative aspect-video">
              <img
                src={form.imageDataUrl}
                alt="Captured"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={handleRetake}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-black/80 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retake
              </button>
              {status === "hashing" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                    <span className="text-white/80 text-sm">Fingerprinting image…</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowCamera(true)}
              className="w-full aspect-video flex flex-col items-center justify-center gap-4 hover:bg-white/4 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-white/70 font-semibold text-sm">Tap to Open Camera</p>
                <p className="text-white/35 text-xs mt-0.5">Live capture only — no file uploads</p>
              </div>
            </button>
          )}
        </DuplicateAwareUploadZone>

        {/* Status badge */}
        <DuplicateStatusBadge
          status={status}
          checkResult={checkResult}
          onRetake={handleRetake}
        />

        {/* Debug hash display */}
        <HashDisplay hash={currentHash} status={status} />

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl font-semibold text-sm bg-white/6 text-white/70 hover:bg-white/10 border border-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => {
              if (canProceed) {
                registerHash(form.imageHash!);
                onNext();
              }
            }}
            disabled={!canProceed}
            className="flex-[2] py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDuplicate ? "⚠️ Retake Required" : "Next: Add Location"}
            {!isDuplicate && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// STEP 3: Geolocation
// ─────────────────────────────────────────────
function StepLocation({ form, setForm, onNext, onBack }: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const { addToast } = useApp();
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState(form.location?.address || "");

  const fetchLocation = async () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Reverse geocoding via OpenStreetMap Nominatim (free, no key needed)
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          address = data.display_name?.split(",").slice(0, 3).join(", ") || address;
        } catch {
          // Silently use coordinates if geocoding fails
        }

        setForm((f) => ({ ...f, location: { lat, lng, address } }));
        setManualAddress(address);
        setGeoLoading(false);
        addToast({ type: "success", title: "Location Pinned!", message: address });
      },
      (err) => {
        setGeoLoading(false);
        const messages: Record<number, string> = {
          1: "Location access denied. Please enable GPS or enter manually.",
          2: "Location unavailable. Check your GPS signal.",
          3: "Location request timed out. Try again.",
        };
        setGeoError(messages[err.code] || "Failed to get location.");
        addToast({ type: "error", title: "GPS Error", message: messages[err.code] || "Unknown error" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const saveManualAddress = () => {
    setForm((f) => ({
      ...f,
      location: {
        lat: f.location?.lat ?? 28.6139,
        lng: f.location?.lng ?? 77.2090,
        address: manualAddress,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* GPS Fetch Button */}
      <button
        onClick={fetchLocation}
        disabled={geoLoading}
        className="w-full py-4 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 text-emerald-400 font-semibold hover:bg-emerald-500/10 hover:border-emerald-500/60 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
      >
        {geoLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Fetching GPS coordinates…
          </>
        ) : (
          <>
            <Navigation className="w-5 h-5" />
            📍 Fetch My Live GPS Location
          </>
        )}
      </button>

      {geoError && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {geoError}
        </div>
      )}

      {/* Mini Map Preview */}
      {form.location && (
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <div className="relative bg-[#1a2e1a] aspect-[16/7]">
            {/* Stylized map background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950">
              {/* Grid lines */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-white/4" style={{ left: `${i * 12.5}%` }} />
              ))}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-t border-white/4" style={{ top: `${i * 20}%` }} />
              ))}
              {/* Simulated roads */}
              <div className="absolute top-2/5 left-0 right-0 h-px bg-white/15" />
              <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/15" />
              <div className="absolute top-0 bottom-0 right-1/4 w-px bg-white/10" />
              {/* Map iframe for real location */}
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.location.lng - 0.01},${form.location.lat - 0.01},${form.location.lng + 0.01},${form.location.lat + 0.01}&layer=mapnik&marker=${form.location.lat},${form.location.lng}`}
                className="absolute inset-0 w-full h-full opacity-70 border-0"
                title="Location Map"
              />
            </div>
            {/* Pin overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-orange-500 border-4 border-white shadow-lg flex items-center justify-center">
                  <PawPrint className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="w-2 h-2 rounded-full bg-orange-500/40 mt-1 animate-ping" />
              </div>
            </div>
          </div>
          <div className="bg-white/4 px-4 py-3 flex items-center gap-2 border-t border-white/8">
            <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-white/80 text-xs font-medium">{form.location.address}</p>
              <p className="text-white/35 text-[10px] font-mono">
                {form.location.lat.toFixed(6)}, {form.location.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Address Fallback */}
      <div>
        <label className="input-label">Or Enter Address Manually</label>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="e.g., Near Lodhi Garden Gate 2, New Delhi"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
          />
          <button
            onClick={saveManualAddress}
            disabled={!manualAddress.trim()}
            className="px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white/70 hover:text-white hover:bg-white/12 transition-all text-sm font-medium disabled:opacity-40"
          >
            Set
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3.5 rounded-xl font-semibold text-sm bg-white/6 text-white/70 hover:bg-white/10 border border-white/10 hover:text-white transition-all flex items-center justify-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!form.location}
          className="flex-[2] py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Review Report <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 4: Review & Submit
// ─────────────────────────────────────────────
function StepReview({ form, onBack, onSubmit, submitting }: {
  form: ReportForm;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const priorityColors: Record<Priority, string> = {
    low: "text-slate-400 bg-slate-400/15",
    medium: "text-sky-400 bg-sky-400/15",
    high: "text-orange-400 bg-orange-400/15",
    critical: "text-red-400 bg-red-400/15 animate-pulse",
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
        {form.imageDataUrl && (
          <img src={form.imageDataUrl} alt="Animal" className="w-full aspect-video object-cover" />
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-base">{form.animalType}</p>
              <p className="text-white/50 text-sm">{form.animalCondition}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${priorityColors[form.priority]}`}>
              {form.priority.toUpperCase()}
            </span>
          </div>
          <p className="text-white/60 text-sm leading-relaxed border-t border-white/8 pt-3">{form.description}</p>
          {form.location && (
            <div className="flex items-center gap-2 text-white/50 text-sm border-t border-white/8 pt-3">
              <MapPin className="w-4 h-4 text-orange-400" />
              {form.location.address}
            </div>
          )}
          <div className="flex items-center gap-2 text-emerald-400/70 text-xs border-t border-white/8 pt-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Image fingerprint verified — no duplicates detected
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3.5 rounded-xl font-semibold text-sm bg-white/6 text-white/70 hover:bg-white/10 border border-white/10 hover:text-white transition-all flex items-center justify-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Edit
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-[2] py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
          ) : (
            <><Heart className="w-4 h-4" /> Submit Report</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN REPORT WIZARD
// ─────────────────────────────────────────────
export function ReportWizard() {
  const { user, addReport, setPage, addToast } = useApp();
  const [step, setStep] = useState<WizardStep>("details");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ReportForm>({
    animalType: "",
    animalCondition: "",
    description: "",
    priority: "medium",
    imageDataUrl: null,
    imageHash: null,
    location: null,
  });

  const stepOrder: WizardStep[] = ["details", "photo", "location", "review"];
  const currentIdx = stepOrder.indexOf(step);

  const handleSubmit = async () => {
    setSubmitting(true);

    const payload = {
      id: `RPT-${Date.now().toString(36).toUpperCase()}`,
      animalType: form.animalType,
      animalCondition: form.animalCondition,
      description: form.description,
      imageDataUrl: form.imageDataUrl,
      imageHash: form.imageHash,
      location: form.location,
      reporterName: user?.name || "Anonymous",
      reporterPhone: user?.phone || "",
      reporterId: user?.id || undefined,
      reporterEmail: user?.email?.trim() || undefined,
      priority: form.priority,
    };

    try {
      const res = await fetch(apiUrl("/api/reports"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSubmitting(false);

      if (res.ok) {
        // Socket.io natively distributes this, but we can optimistically local update too if needed. 
        // For now, let's rely on standard socket pipeline if connected, otherwise manual fallback:
        // addReport(data);
        
        addToast({
          type: "success",
          title: "Report Submitted! 🐾",
          message: `Your ${form.animalType} report has been actively routed to nearby NGOs.`,
        });
        setPage("reporter");
      } else {
        addToast({
          type: "error",
          title: "Submission Refused",
          message: data.message || "Failed to process the report.",
        });
      }
    } catch {
      setSubmitting(false);
      addToast({
        type: "error",
        title: "Network Offline",
        message: "We couldn't reach the animal rescue servers right now.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F0D]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0A0F0D]/90 backdrop-blur-xl border-b border-white/8 px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-white font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>
              Report Stray Animal
            </h1>
            <button
              onClick={() => setPage("reporter")}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Step progress */}
          <div className="flex items-center gap-0">
            {WIZARD_STEPS.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border transition-all ${
                        done
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : active
                          ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                          : "bg-white/5 border-white/15 text-white/25"
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : s.icon}
                    </div>
                    <span className={`text-[9px] mt-1 font-medium ${active ? "text-emerald-400" : done ? "text-emerald-500/50" : "text-white/20"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < WIZARD_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-3.5 mx-1 rounded-full transition-all ${done ? "bg-emerald-500/50" : "bg-white/8"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 py-6 pb-28">
        <style>{`
          .input-label { display:block; color:rgba(255,255,255,0.5); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; }
        `}</style>

        {step === "details" && (
          <StepDetails form={form} setForm={setForm} onNext={() => setStep("photo")} />
        )}
        {step === "photo" && (
          <StepPhoto form={form} setForm={setForm} onNext={() => setStep("location")} onBack={() => setStep("details")} />
        )}
        {step === "location" && (
          <StepLocation form={form} setForm={setForm} onNext={() => setStep("review")} onBack={() => setStep("photo")} />
        )}
        {step === "review" && (
          <StepReview form={form} onBack={() => setStep("location")} onSubmit={handleSubmit} submitting={submitting} />
        )}
      </div>
    </div>
  );
}

export default ReportWizard;
