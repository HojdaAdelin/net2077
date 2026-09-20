import { User } from 'lucide-react';

// frameKey format: '<rarity>-season<N>'
// Image files live in /public/
function frameSrc(frameKey) {
  if (!frameKey) return null;
  return `/${frameKey}.png`;
}

// Preload all known season frames at module import time
const KNOWN_FRAMES = ['silver-season1', 'gold-season1', 'diamond-season1'];
KNOWN_FRAMES.forEach((key) => {
  const img = new Image();
  img.src = frameSrc(key);
});

/**
 * AvatarFrame — circular avatar + optional season frame overlay.
 *
 * Props:
 *   frame     — frameKey string e.g. 'silver-season1' | null
 *   size      — diameter in px (default 80)
 *   iconSize  — lucide User icon size (default ~55% of size)
 *   className — extra wrapper class
 */
export default function AvatarFrame({ frame = null, size = 80, iconSize, className = '' }) {
  const icon = iconSize ?? Math.round(size * 0.55);
  const src  = frameSrc(frame);

  return (
    <div
      className={`avatar-frame-wrap ${className}`}
      style={{ '--af-size': `${size}px` }}
    >
      <div className="avatar-frame-circle">
        <User size={icon} />
      </div>
      {src && (
        <img
          src={src}
          alt={frame}
          className="avatar-frame-img"
          draggable={false}
        />
      )}
    </div>
  );
}
