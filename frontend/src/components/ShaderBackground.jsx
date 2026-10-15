import { useEffect, useRef } from 'react';

const VERTEX_SOURCE = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT_SOURCE = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform vec2 u_focus;
uniform float u_light;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(12.7, 8.3);
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  vec2 focus = vec2(u_focus.x * u_resolution.x / max(u_resolution.y, 1.0), 1.0 - u_focus.y);
  float t = u_time;
  vec2 q = p - focus;
  vec2 flow = vec2(fbm(p * 2.4 + vec2(t * 0.13, -t * 0.10)),
                   fbm(p * 2.4 + vec2(-t * 0.11, t * 0.15) + 7.2));
  vec2 warped = q + (flow - 0.5) * 0.66;
  float d = length(warped * vec2(0.92, 1.10));
  float ridges = fbm(p * 4.1 + flow * 2.0 + vec2(t * 0.12, -t * 0.09));
  float shape = (1.0 - smoothstep(0.13, 0.88, d + (ridges - 0.5) * 0.30));
  float core = (1.0 - smoothstep(0.05, 0.58, d + (ridges - 0.5) * 0.22));
  float folds = smoothstep(0.38, 0.78, ridges);
  float rim = smoothstep(0.25, 0.62, shape) * (1.0 - smoothstep(0.75, 1.0, shape));
  float alpha = clamp((shape * (0.46 + 0.24 * folds) + core * 0.20 + rim * 0.22) * u_intensity, 0.0, 0.94);
  vec3 deep = vec3(0.21, 0.035, 0.49);
  vec3 violet = vec3(0.48, 0.14, 0.90);
  vec3 bright = vec3(0.76, 0.45, 1.0);
  vec3 color = mix(deep, violet, clamp(shape + folds * 0.24, 0.0, 1.0));
  color = mix(color, bright, clamp(core * 0.52 + rim * 0.48, 0.0, 0.85));
  color *= mix(1.0, 0.70, u_light);
  gl_FragColor = vec4(color, alpha);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Feature shader compilation failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function ShaderBackground({
  intensity = 1,
  speed = 0.5,
  focusX = 0.75,
  focusY = 0.75,
  reducedMotion = false,
}) {
  const canvasRef = useRef(null);
  const fallbackRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Feature shader link failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) { gl.deleteProgram(program); return; }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const time = gl.getUniformLocation(program, 'u_time');
    const strength = gl.getUniformLocation(program, 'u_intensity');
    const focus = gl.getUniformLocation(program, 'u_focus');
    const light = gl.getUniformLocation(program, 'u_light');
    let frame = 0;
    let elapsed = 0;
    let lastTime = 0;
    let visible = false;
    let pageVisible = !document.hidden;
    let lost = false;
    const themeObserver = new MutationObserver(drawStatic);
    const themeRoot = document.documentElement;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * (window.innerWidth < 768 ? 0.65 : 0.85);
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    }

    function drawStatic() {
      if (lost || !gl.isProgram(program)) return;
      resize();
      gl.useProgram(program);
      const isLight = themeRoot.getAttribute('data-theme') === 'light';
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, elapsed * speed);
      gl.uniform1f(strength, intensity);
      gl.uniform2f(focus, focusX, focusY);
      gl.uniform1f(light, isLight ? 1 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (fallback) fallback.style.opacity = '0';
    }

    function tick(now) {
      frame = 0;
      if (lost || reducedMotion || !visible || !pageVisible) return;
      if (lastTime) elapsed += Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      drawStatic();
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      if (lost) return;
      if (visible && pageVisible && !reducedMotion) frame = requestAnimationFrame(tick);
      else if (visible) drawStatic();
    }

    function visibilityChanged() { pageVisible = !document.hidden; sync(); }
    function contextLost(event) {
      event.preventDefault();
      lost = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (fallback) fallback.style.opacity = '1';
    }
    function contextRestored() {
      // Recreate GPU resources by remounting the component if context restoration is required.
      // Keep the CSS fallback visible rather than using invalid old resources.
      lost = true;
      if (fallback) fallback.style.opacity = '1';
    }

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.01 });
    intersection.observe(canvas);
    const resizeObserver = new ResizeObserver(() => { if (visible) drawStatic(); });
    resizeObserver.observe(canvas);
    themeObserver.observe(themeRoot, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', visibilityChanged);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    drawStatic();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      intersection.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      if (!lost) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      }
    };
  }, [intensity, speed, focusX, focusY, reducedMotion]);

  return (
    <div className="shader-bg-root" aria-hidden="true">
      <div className="shader-bg-fallback" ref={fallbackRef} style={{ '--sh-fx': `${focusX * 100}%`, '--sh-fy': `${focusY * 100}%`, '--sh-op': intensity }} />
      <canvas className="shader-bg-canvas" ref={canvasRef} />
    </div>
  );
}
