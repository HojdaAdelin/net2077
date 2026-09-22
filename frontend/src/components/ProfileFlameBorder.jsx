import { useRef, useEffect, useState } from 'react';

/**
 * ProfileFlameBorder
 *
 * Wraps a card element with an animated "travelling fire line" that traces
 * the full perimeter of the card, going around continuously.
 *
 * Usage:
 *   <ProfileFlameBorder>
 *     <div className="user-profile-header">...</div>
 *   </ProfileFlameBorder>
 */

const TRAIL_LENGTH = 0.18;  // fraction of perimeter that the trail covers
const SPEED        = 0.00035; // fraction of perimeter per ms
const LINE_WIDTH   = 2.5;
const GLOW_WIDTH   = 8;

export default function ProfileFlameBorder({ children }) {
  const wrapperRef = useRef(null);
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const stateRef   = useRef({ pos: 0, lastTs: null });
  const [size, setSize] = useState({ w: 0, h: 0, r: 12 });

  // Observe size changes
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const style = getComputedStyle(el);
      const r = parseFloat(style.borderRadius) || 12;
      setSize({ w: el.offsetWidth, h: el.offsetHeight, r });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;

    canvas.width  = size.w;
    canvas.height = size.h;

    const ctx    = canvas.getContext('2d');
    const { w, h, r } = size;

    // Build the perimeter path as a list of points sampled at ~1px resolution
    // Rounded-rect: top, right, bottom, left edges + 4 quarter-circle corners
    const points = buildPerimeterPoints(w, h, r);
    const total  = points.length;

    const draw = (ts) => {
      if (stateRef.current.lastTs !== null) {
        const dt = ts - stateRef.current.lastTs;
        stateRef.current.pos = (stateRef.current.pos + SPEED * dt) % 1;
      }
      stateRef.current.lastTs = ts;

      ctx.clearRect(0, 0, w, h);

      const headIdx  = Math.floor(stateRef.current.pos * total);
      const trailLen = Math.floor(TRAIL_LENGTH * total);

      // Draw trail segments back from head, fading out
      for (let i = 0; i < trailLen; i++) {
        const idx  = (headIdx - i + total) % total;
        const idx2 = (idx - 1 + total) % total;
        const t    = 1 - i / trailLen; // 1 at head, 0 at tail

        // Color: yellow at head → orange → red → transparent at tail
        const alpha = t * 0.95;
        const g     = Math.round(220 * t * t);
        const color = `rgba(255,${g},0,${alpha})`;

        // Glow pass
        ctx.beginPath();
        ctx.moveTo(points[idx2].x, points[idx2].y);
        ctx.lineTo(points[idx].x,  points[idx].y);
        ctx.strokeStyle = `rgba(255,${Math.round(g * 0.5)},0,${alpha * 0.4})`;
        ctx.lineWidth   = GLOW_WIDTH * t;
        ctx.lineCap     = 'round';
        ctx.stroke();

        // Core line
        ctx.beginPath();
        ctx.moveTo(points[idx2].x, points[idx2].y);
        ctx.lineTo(points[idx].x,  points[idx].y);
        ctx.strokeStyle = color;
        ctx.lineWidth   = LINE_WIDTH * (0.5 + t * 0.5);
        ctx.lineCap     = 'round';
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          position:      'absolute',
          inset:         0,
          pointerEvents: 'none',
          zIndex:        10,
          borderRadius:  size.r,
        }}
      />
      {children}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPerimeterPoints(w, h, r) {
  const pts = [];
  const step = 1; // ~1px per sample

  // Clamp radius
  const rc = Math.min(r, w / 2, h / 2);

  // Top edge: left to right (after top-left corner, before top-right corner)
  for (let x = rc; x <= w - rc; x += step) pts.push({ x, y: 0 });

  // Top-right corner
  arcPoints(w - rc, rc, rc, -Math.PI / 2, 0, pts);

  // Right edge: top to bottom
  for (let y = rc; y <= h - rc; y += step) pts.push({ x: w, y });

  // Bottom-right corner
  arcPoints(w - rc, h - rc, rc, 0, Math.PI / 2, pts);

  // Bottom edge: right to left
  for (let x = w - rc; x >= rc; x -= step) pts.push({ x, y: h });

  // Bottom-left corner
  arcPoints(rc, h - rc, rc, Math.PI / 2, Math.PI, pts);

  // Left edge: bottom to top
  for (let y = h - rc; y >= rc; y -= step) pts.push({ x: 0, y });

  // Top-left corner
  arcPoints(rc, rc, rc, Math.PI, Math.PI * 1.5, pts);

  return pts;
}

function arcPoints(cx, cy, r, startAngle, endAngle, pts) {
  const steps = Math.max(4, Math.round(r * Math.abs(endAngle - startAngle)));
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / steps);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
}
