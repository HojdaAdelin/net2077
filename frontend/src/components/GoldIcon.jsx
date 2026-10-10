/**
 * GoldIcon — drop-in replacement for <Coins /> from lucide-react.
 * Renders gold.png at the same pixel size as the lucide icon it replaces.
 */
export default function GoldIcon({ size = 16, className = '', style = {} }) {
  return (
    <img
      src="/gold.png"
      alt="gold"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', objectFit: 'contain', flexShrink: 0, ...style }}
    />
  );
}
