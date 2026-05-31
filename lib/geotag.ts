/**
 * Client-side geotag watermark — runs in the browser using Canvas API.
 * Overlays a professional stamp on a selfie, mimicking geotag camera apps.
 */

export interface GeotagOptions {
  photoBase64: string;        // data:image/jpeg;base64,... captured from canvas
  latitude: number;
  longitude: number;
  address: string;            // reverse-geocoded human address
  employeeName: string;
  timestamp: Date;
  type: "check-in" | "check-out";
}

/**
 * Apply a geotag watermark to a selfie.
 * Returns a new base64 JPEG string with the stamp baked in.
 */
export function applyGeotagWatermark(opts: GeotagOptions): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;

      // Draw the original photo
      ctx.drawImage(img, 0, 0);

      const W = canvas.width;
      const H = canvas.height;

      // Bar occupies bottom 24% of the image (minimum 52px)
      const barHeight = Math.max(52, Math.round(H * 0.24));
      const barY      = H - barHeight;

      // ── Dark translucent bar ────────────────────────────────────────────
      ctx.fillStyle = "rgba(10, 10, 20, 0.80)";
      ctx.fillRect(0, barY, W, barHeight);

      // ── Colored top accent line (3px) ───────────────────────────────────
      const accentColor = opts.type === "check-in" ? "#10b981" : "#6366f1";
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, barY, W, 3);

      // ── Layout constants ────────────────────────────────────────────────
      const PAD    = Math.round(W * 0.04);   // horizontal padding
      const circleR = Math.round(barHeight * 0.28);
      const circleX = PAD + circleR;
      const circleY = barY + Math.round(barHeight * 0.38);

      // ── Company circle ──────────────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();

      // "A" initial inside circle
      ctx.fillStyle = "#ffffff";
      ctx.font      = `bold ${Math.round(circleR * 1.1)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", circleX, circleY + 1);

      // ── Text columns (right of circle) ─────────────────────────────────
      const textX    = circleX + circleR + PAD;
      const lineBase = barY + Math.round(barHeight * 0.22);
      const fontSize = Math.max(9, Math.round(W * 0.038));

      ctx.textAlign    = "left";
      ctx.textBaseline = "top";

      // Employee name
      ctx.fillStyle = "#ffffff";
      ctx.font      = `600 ${fontSize}px system-ui, sans-serif`;
      ctx.fillText(truncate(opts.employeeName, 24), textX, lineBase);

      // Date / time
      const dt = formatDateTime(opts.timestamp);
      ctx.fillStyle = "#f59e0b";
      ctx.font      = `500 ${Math.round(fontSize * 0.85)}px 'Courier New', monospace`;
      ctx.fillText(dt, textX, lineBase + fontSize * 1.3);

      // Address (up to 2 lines)
      const addrFontSize = Math.round(fontSize * 0.78);
      ctx.fillStyle = "rgba(255,255,255,0.80)";
      ctx.font      = `400 ${addrFontSize}px system-ui, sans-serif`;
      const addrLines = wrapText(ctx, opts.address, W - textX - PAD);
      addrLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, textX, lineBase + fontSize * 2.7 + i * (addrFontSize + 3));
      });

      // ── CHECK-IN / CHECK-OUT badge (bottom-left) ────────────────────────
      const badgeY    = barY + barHeight - Math.round(barHeight * 0.28);
      const badgeText = opts.type === "check-in" ? "● CHECK-IN" : "● CHECK-OUT";
      ctx.fillStyle = accentColor;
      ctx.font      = `700 ${Math.round(fontSize * 0.75)}px system-ui, sans-serif`;
      ctx.fillText(badgeText, PAD, badgeY);

      // ── GPS coordinates (bottom-right) ──────────────────────────────────
      const coordText = `${opts.latitude.toFixed(5)}°, ${opts.longitude.toFixed(5)}°`;
      const coordFontSize = Math.max(8, Math.round(fontSize * 0.72));
      ctx.fillStyle    = "rgba(200,200,220,0.70)";
      ctx.font         = `400 ${coordFontSize}px 'Courier New', monospace`;
      ctx.textAlign    = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(coordText, W - PAD, H - Math.round(barHeight * 0.08));

      // ── Brand watermark (top-right corner of bar) ───────────────────────
      ctx.fillStyle    = "rgba(255,255,255,0.30)";
      ctx.font         = `600 ${Math.round(fontSize * 0.70)}px system-ui, sans-serif`;
      ctx.textAlign    = "right";
      ctx.textBaseline = "top";
      ctx.fillText("Anvesync HRMS", W - PAD, barY + 6);

      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };

    img.onerror = () => resolve(opts.photoBase64); // fallback: return original
    img.src = opts.photoBase64;
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}  ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/[\s,]+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current}, ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Lightweight client-side reverse geocoding using Nominatim.
 * Used in the capture modal for instant address display — not for DB storage.
 */
export async function clientReverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Anvesync HRMS/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.road || a.pedestrian || a.footway || "",
      a.suburb || a.neighbourhood || a.city || a.town || a.village || "",
      a.state || "",
    ].filter(Boolean);
    return parts.length >= 2 ? parts.slice(0, 3).join(", ") : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  }
}
