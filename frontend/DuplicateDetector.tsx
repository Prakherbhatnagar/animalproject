/**
 * DuplicateDetector.tsx
 * ─────────────────────────────────────────────────────────
 * Client-side duplicate image prevention system using:
 *   1. SHA-256 cryptographic hash (exact duplicate detection)
 *   2. Average Perceptual Hash / aHash (near-duplicate detection)
 *
 * Combining both ensures we catch:
 *   - Exact byte-for-byte identical images (same file resubmitted)
 *   - Perceptually similar images (same photo, different compression)
 * ─────────────────────────────────────────────────────────
 */

import React, { useCallback, useRef } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export interface HashResult {
  sha256: string;
  perceptual: string;
  combined: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: "none" | "exact" | "perceptual" | "both";
  matchedHash?: string;
  confidence: number; // 0–100
}

export type HashingStatus = "idle" | "hashing" | "duplicate" | "unique" | "error";

// ─────────────────────────────────────────────
// SHA-256 via SubtleCrypto API
// ─────────────────────────────────────────────
/**
 * Generates a SHA-256 hash of raw image bytes.
 * This is a cryptographic hash — identical for byte-perfect duplicates only.
 */
export async function computeSHA256(dataUrl: string): Promise<string> {
  try {
    // Convert base64 data URL to ArrayBuffer
    const base64 = dataUrl.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes.buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.error("[DuplicateDetector] SHA-256 failed:", err);
    throw err;
  }
}

// ─────────────────────────────────────────────
// Average Perceptual Hash (aHash)
// ─────────────────────────────────────────────
/**
 * Generates a perceptual hash by:
 *   1. Drawing the image on a tiny 16×16 canvas (reduces detail)
 *   2. Converting each pixel to grayscale
 *   3. Computing the average grayscale value
 *   4. Creating a binary fingerprint: 1 if pixel >= avg, 0 otherwise
 *   5. Encoding the binary string as a hex hash
 *
 * Result: Two visually similar images will produce nearly identical hashes.
 * Hamming distance is used to compare how "close" two hashes are.
 */
export function computePerceptualHash(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const SIZE = 16; // Reduce to 16×16 grid
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        canvas.width = SIZE;
        canvas.height = SIZE;

        // Draw image scaled down to SIZE×SIZE
        ctx.drawImage(img, 0, 0, SIZE, SIZE);

        const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
        const pixels = imageData.data; // RGBA flat array

        // Convert to grayscale values
        const grayValues: number[] = [];
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          // Luminance formula (perceptually weighted)
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          grayValues.push(gray);
        }

        // Compute mean
        const mean = grayValues.reduce((a, b) => a + b, 0) / grayValues.length;

        // Build binary fingerprint
        const binaryString = grayValues.map((v) => (v >= mean ? "1" : "0")).join("");

        // Pack binary into hex (every 4 bits = 1 hex char)
        let hex = "";
        for (let i = 0; i < binaryString.length; i += 4) {
          const nibble = binaryString.slice(i, i + 4);
          hex += parseInt(nibble, 2).toString(16);
        }

        resolve(hex);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error("Image failed to load for hashing"));
    img.src = dataUrl;
  });
}

// ─────────────────────────────────────────────
// HAMMING DISTANCE (for perceptual comparison)
// ─────────────────────────────────────────────
/**
 * Computes the Hamming distance between two hex hash strings.
 * Lower distance = more similar. 0 = identical.
 * Threshold ≤ 10 is generally considered a near-duplicate.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const a = parseInt(hash1[i], 16);
    const b = parseInt(hash2[i], 16);
    // XOR and count set bits (1s)
    let xor = a ^ b;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

// ─────────────────────────────────────────────
// COMBINED HASH GENERATOR
// ─────────────────────────────────────────────
export async function generateImageHash(dataUrl: string): Promise<HashResult> {
  const [sha256, perceptual] = await Promise.all([
    computeSHA256(dataUrl),
    computePerceptualHash(dataUrl),
  ]);
  // Combined fingerprint for storage key
  const combined = `sha:${sha256.slice(0, 16)}_p:${perceptual.slice(0, 16)}`;
  return { sha256, perceptual, combined };
}

// ─────────────────────────────────────────────
// DUPLICATE CHECKER (against known hashes)
// ─────────────────────────────────────────────
const PERCEPTUAL_THRESHOLD = 8; // Max Hamming distance to consider a near-duplicate

export function checkDuplicateAgainstSet(
  newHash: HashResult,
  knownHashes: Set<string>, // stores "sha:xxx_p:yyy" combined keys
  knownPerceptualHashes: string[] // stores raw perceptual hashes for Hamming comparison
): DuplicateCheckResult {
  // 1. Exact SHA-256 match
  for (const known of knownHashes) {
    if (known.includes(`sha:${newHash.sha256.slice(0, 16)}`)) {
      return {
        isDuplicate: true,
        matchType: "exact",
        matchedHash: known,
        confidence: 100,
      };
    }
  }

  // 2. Near-duplicate via perceptual hash Hamming distance
  for (const knownPerceptual of knownPerceptualHashes) {
    const dist = hammingDistance(newHash.perceptual, knownPerceptual);
    if (dist <= PERCEPTUAL_THRESHOLD) {
      const confidence = Math.round(100 - (dist / PERCEPTUAL_THRESHOLD) * 100);
      return {
        isDuplicate: true,
        matchType: "perceptual",
        matchedHash: knownPerceptual,
        confidence,
      };
    }
  }

  return {
    isDuplicate: false,
    matchType: "none",
    confidence: 0,
  };
}

// ─────────────────────────────────────────────
// HOOK: useImageDuplicateDetector
// ─────────────────────────────────────────────
interface UseDuplicateDetectorOptions {
  knownHashes: Set<string>;
  onDuplicate?: (result: DuplicateCheckResult, hash: HashResult) => void;
  onUnique?: (hash: HashResult) => void;
}

export function useImageDuplicateDetector({
  knownHashes,
  onDuplicate,
  onUnique,
}: UseDuplicateDetectorOptions) {
  const [status, setStatus] = React.useState<HashingStatus>("idle");
  const [currentHash, setCurrentHash] = React.useState<HashResult | null>(null);
  const [checkResult, setCheckResult] = React.useState<DuplicateCheckResult | null>(null);
  const knownPerceptualRef = useRef<string[]>([]);

  // Extract perceptual hashes from the combined keys on mount
  React.useEffect(() => {
    const perceptuals: string[] = [];
    for (const key of knownHashes) {
      const match = key.match(/_p:([a-f0-9]+)/);
      if (match) perceptuals.push(match[1]);
    }
    knownPerceptualRef.current = perceptuals;
  }, [knownHashes]);

  const analyzeImage = useCallback(
    async (dataUrl: string) => {
      setStatus("hashing");
      setCurrentHash(null);
      setCheckResult(null);

      try {
        const hash = await generateImageHash(dataUrl);
        setCurrentHash(hash);

        const result = checkDuplicateAgainstSet(
          hash,
          knownHashes,
          knownPerceptualRef.current
        );

        setCheckResult(result);

        if (result.isDuplicate) {
          setStatus("duplicate");
          onDuplicate?.(result, hash);
        } else {
          setStatus("unique");
          onUnique?.(hash);
        }
      } catch (err) {
        console.error("[DuplicateDetector] Analysis failed:", err);
        setStatus("error");
      }
    },
    [knownHashes, onDuplicate, onUnique]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setCurrentHash(null);
    setCheckResult(null);
  }, []);

  return { status, currentHash, checkResult, analyzeImage, reset };
}

// ─────────────────────────────────────────────
// UI COMPONENT: DuplicateStatusBadge
// ─────────────────────────────────────────────
interface DuplicateStatusBadgeProps {
  status: HashingStatus;
  checkResult?: DuplicateCheckResult | null;
  onRetake?: () => void;
  className?: string;
}

export function DuplicateStatusBadge({
  status,
  checkResult,
  onRetake,
  className = "",
}: DuplicateStatusBadgeProps) {
  if (status === "idle") return null;

  if (status === "hashing") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 text-sm ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        <span>Analyzing image fingerprint...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm ${className}`}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>Hash analysis failed. Please retake.</span>
      </div>
    );
  }

  if (status === "unique") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm ${className}`}>
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <span>Photo verified — unique image fingerprint</span>
      </div>
    );
  }

  if (status === "duplicate" && checkResult) {
    return (
      <div className={`rounded-xl bg-amber-500/10 border-2 border-amber-500/50 overflow-hidden ${className}`}>
        <div className="flex items-start gap-3 p-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 font-semibold text-sm">
              ⚠️ A report with an identical photo already exists!
            </p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              {checkResult.matchType === "exact"
                ? "This is an exact duplicate photo (100% match). "
                : `Near-duplicate detected — ${checkResult.confidence}% visual similarity. `}
              Please take a new, distinct photo to submit your report.
            </p>
          </div>
        </div>
        {onRetake && (
          <div className="border-t border-amber-500/20 px-3 py-2">
            <button
              onClick={onRetake}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retake Photo
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────
// UI COMPONENT: DuplicateAwareUploadZone
// (Highlights upload area with amber border on duplicate)
// ─────────────────────────────────────────────
interface DuplicateAwareUploadZoneProps {
  status: HashingStatus;
  children: React.ReactNode;
  className?: string;
}

export function DuplicateAwareUploadZone({
  status,
  children,
  className = "",
}: DuplicateAwareUploadZoneProps) {
  const borderClass =
    status === "duplicate"
      ? "border-amber-500/70 shadow-lg shadow-amber-500/20 bg-amber-500/5"
      : status === "unique"
      ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
      : status === "hashing"
      ? "border-sky-500/40"
      : "border-white/10";

  return (
    <div
      className={`relative border-2 rounded-2xl overflow-hidden transition-all duration-300 ${borderClass} ${className}`}
    >
      {/* Duplicate amber shimmer overlay */}
      {status === "duplicate" && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div
            className="absolute inset-0 bg-amber-500/5 animate-pulse"
            style={{ animationDuration: "1.5s" }}
          />
          <div className="absolute top-2 right-2">
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Duplicate!
            </span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// HASH DISPLAY (dev-mode debug panel)
// ─────────────────────────────────────────────
interface HashDisplayProps {
  hash: HashResult | null;
  status: HashingStatus;
}

export function HashDisplay({ hash, status }: HashDisplayProps) {
  if (!hash || (status !== "unique" && status !== "duplicate")) return null;

  return (
    <div className="mt-2 p-3 bg-black/30 rounded-xl border border-white/8 font-mono text-[10px] text-white/30 space-y-1 overflow-hidden">
      <div className="flex items-center gap-2">
        <span className="text-emerald-400/60 flex-shrink-0">SHA-256</span>
        <span className="truncate">{hash.sha256.slice(0, 32)}…</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-violet-400/60 flex-shrink-0">pHash</span>
        <span className="truncate">{hash.perceptual}</span>
      </div>
    </div>
  );
}

export default { useImageDuplicateDetector, computeSHA256, computePerceptualHash, hammingDistance, generateImageHash };
