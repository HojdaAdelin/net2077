import { useRef, useEffect, cloneElement } from 'react';

// ─── Flame canvas ─────────────────────────────────────────────────────────────

function FlameCanvas({ wrapperRef }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas  = canvasRef.current;
    const wrapper = wrapperRef?.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext('2d');

    const measure = () => {
      const W = wrapper.offsetWidth  || 80;
      const H = Math.round(wrapper.offsetHeight * 1.5);
      canvas.width  = W;
      canvas.height = H;
      return { W, H };
    };

    let { W, H } = measure();

    class Particle {
      constructor(initial) { this.reset(initial); }

      reset(initial = false) {
        this.x     = Math.random() * W;
        this.y     = initial ? Math.random() * H : H;
        this.vy    = -(Math.random() * 0.9 + 0.5);
        this.vx    = (Math.random() - 0.5) * 0.3;
        this.life  = Math.random() * 0.55 + 0.45;
        this.decay = Math.random() * 0.013 + 0.007;
        this.size  = Math.random() * 5 + 3;
        this.swayAmp   = Math.random() * 0.55 + 0.2;
        this.swayFreq  = Math.random() * 0.035 + 0.018;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.t = 0;
      }

      update() {
        this.t++;
        this.vx += Math.sin(this.t * this.swayFreq + this.swayPhase) * this.swayAmp * 0.035;
        this.vx *= 0.93;
        this.x  += this.vx;
        this.y  += this.vy;
        this.life -= this.decay;
        this.size *= 0.994;
      }

      draw() {
        if (this.life <= 0) return;
        const p     = 1 - this.life;
        const green = Math.round(200 * (1 - p * 0.9));
        const alpha = Math.max(0, this.life * 0.72);

        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0,   `rgba(255,${green},0,${alpha})`);
        grad.addColorStop(0.5, `rgba(255,${Math.round(green * 0.4)},0,${alpha * 0.5})`);
        grad.addColorStop(1,   `rgba(180,0,0,0)`);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    const makeParticles = () => {
      const count = Math.max(20, Math.round(W / 2.5));
      return Array.from({ length: count }, (_, i) => new Particle(i % 2 === 0));
    };

    let particles = makeParticles();

    const tick = () => {
      if (wrapper.offsetWidth && wrapper.offsetWidth !== W) {
        ({ W, H } = measure());
        particles = makeParticles();
      }

      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        if (p.life <= 0) p.reset(false);
        p.update();
        p.draw();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [wrapperRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        bottom:        '100%',
        left:          0,
        pointerEvents: 'none',
        display:       'block',
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const CANVAS_EFFECTS = new Set(['flame']);

/**
 * NameEffectRenderer
 *
 * Usage:
 *   <NameEffectRenderer effect={user.activeNameEffect}>
 *     <Link className="my-class">username</Link>
 *   </NameEffectRenderer>
 *
 * - CSS effects (e.g. 'autumn-wave'): adds `name-effect-<key>` class to child, no wrapping.
 * - Canvas effects (e.g. 'flame'):    wraps in a relative span + draws particles above.
 * - No effect (null/undefined):       renders child untouched.
 */
export default function NameEffectRenderer({ effect, children }) {
  const wrapperRef = useRef(null);

  if (!effect) return children;

  // CSS-only — inject class directly onto the child element
  if (!CANVAS_EFFECTS.has(effect)) {
    const existing = children.props.className || '';
    const cls = `${existing} name-effect-${effect}`.trim();
    return cloneElement(children, { className: cls });
  }

  // Canvas effect — wrap + overlay canvas
  const existing = children.props.className || '';
  const cls = `${existing} name-effect-${effect}`.trim();

  return (
    <span ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <FlameCanvas wrapperRef={wrapperRef} />
      {cloneElement(children, { className: cls })}
    </span>
  );
}
