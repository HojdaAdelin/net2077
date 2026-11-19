import GradientASCII from './GradientASCII';
import './DarkASCII.css';

/**
 * DarkASCII — ambient background for the homepage in dark mode.
 * Alternative to DarkVeil; uses GradientASCII with a purple palette.
 * Mounted via portal into document.body in Hero.jsx.
 */
export default function DarkASCII() {
  return (
    <div className="darkascii-root" aria-hidden="true">
      <GradientASCII
        colors={['#2e1065', '#6d28d9', '#a78bfa', '#c4b5fd', '#ede9fe']}
        shape="horizon"
        characters=" =+xX0S8#@"
        cellSize={18}
        density={0.55}
        glyphOpacity={0.80}
        glow={0.25}
        depthOfField={0}
        flicker={0.2}
        softness={0.5}
        scale={1}
        flow={0.5}
        speed={1}
        gradientOpacity={0.9}
        grain={0.08}
        variation={0}
        mouseInteraction={true}
        scrambleRadius={0.1}
        clickEffect="wave"
        intro={true}
        lightMode={false}
      />
      <div className="darkascii-scrim" />
    </div>
  );
}
