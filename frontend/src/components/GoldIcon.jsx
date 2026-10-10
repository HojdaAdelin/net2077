/**
 * GoldIcon — drop-in replacement for <Coins /> from lucide-react.
 * Renders gold.png at the same pixel size as the lucide icon it replaces.
 * The image is preloaded via index.html so it's always cached by first render.
 */
export default function GoldIcon({ size = 16, className = '', style = {} }) {
  return (
    <img
      src="/gold.png"
      alt="gold"
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      className={className}
      style={{ display: 'inline-block', objectFit: 'contain', flexShrink: 0, ...style }}
    />
  );
}
