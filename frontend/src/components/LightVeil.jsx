import GradientASCII from './GradientASCII';
import './LightVeil.css';

/**
 * LightVeil — ambient background for the homepage in light mode.
 * Uses GradientASCII (WebGL2 + ASCII characters) with a light-mode
 * palette and a semi-transparent scrim so page content stays readable.
 * Mounted via portal into document.body in Hero.jsx, same as DarkVeil.
 */
export default function LightVeil() {
  return (
    <div className="lightveil-root" aria-hidden="true">
      <GradientASCII
        colors={['#6d28d9', '#a78bfa', '#c4b5fd', '#ede9fe', '#f5f3ff']}
        shape="horizon"
        characters=" .:=+xX0#"
        cellSize={18}
        density={0.75}
        glyphOpacity={0.80}
        glow={0.15}
        depthOfField={0}
        flicker={0.15}
        softness={0.55}
        scale={1}
        flow={0.45}
        speed={0.9}
        gradientOpacity={0.85}
        grain={0.06}
        variation={0}
        mouseInteraction={true}
        scrambleRadius={0.1}
        clickEffect="wave"
        intro={true}
        lightMode={true}
      />
      {/* Scrim keeps content contrast; tweak rgba alpha in LightVeil.css */}
      <div className="lightveil-scrim" />
    </div>
  );
}
