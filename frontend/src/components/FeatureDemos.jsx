import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Monitor, Router, Server, Send, Terminal, Network, Cpu } from 'lucide-react';
import { simulatePing } from '../utils/networkSimulation';
import { demoNetwork, formatDemoPermissions } from '../utils/featureDemoLogic';
import './FeatureDemos.css';

function LinuxDemo() {
  const [permissions, setPermissions] = useState([7, 5, 0]);
  const { octal, symbolic } = formatDemoPermissions(permissions);
  const toggle = (index, bit) => setPermissions(previous => previous.map((value, i) => i === index ? value ^ bit : value));
  return <div className="fd-demo fd-linux">
    <div className="fd-label"><Terminal size={14} /><span>01 / FILE PERMISSIONS</span></div>
    <h3 className="fd-heading">Who gets access?</h3>
    <div className="fd-terminal"><span className="fd-terminal-path">student@net2077:~</span><code><span>$</span> chmod <b>{octal}</b> project/</code><div className="fd-ls"><code>d{symbolic}</code><span>project/</span></div></div>
    <div className="fd-permissions">{['Owner', 'Group', 'Others'].map((label, index) => <div className="fd-permission-group" key={label}><span>{label}</span><div role="group" aria-label={`${label} permissions`}>{[[4, 'r', 'read'], [2, 'w', 'write'], [1, 'x', 'execute']].map(([bit, letter, name]) => <button type="button" key={bit} aria-label={`${label}: ${name}`} aria-pressed={Boolean(permissions[index] & bit)} onClick={() => toggle(index, bit)}>{letter}</button>)}</div><small>{permissions[index]}</small></div>)}</div>
    <div className="fd-footnote"><span>Toggle a permission. Watch the command.</span><Link className="fd-cta" to="/terminal">Try terminal problems<ArrowRight size={15} /></Link></div>
  </div>;
}

function NetworkDemo({ reducedMotion }) {
  const [gateway, setGateway] = useState('192.168.10.254');
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const send = () => {
    setResult(simulatePing(demoNetwork(gateway), 'client', '192.168.20.80'));
    setAttempt(value => value + 1);
  };
  return <div className={`fd-demo fd-network${result ? result.ok ? ' is-connected' : ' is-blocked' : ''}`}>
    <div className="fd-label"><Network size={14} /><span>02 / DEFAULT GATEWAY</span></div>
    <h3 className="fd-heading">Why no reply?</h3>
    <div className="fd-network-diagram">
      <svg viewBox="0 0 360 125" fill="none" aria-hidden="true"><path className="fd-network-wire" d="M64 46H166M194 46H296" />{result?.ok && !reducedMotion && <circle key={attempt} r="3" className="fd-packet"><animateMotion dur="1.2s" path="M64 46H296" repeatCount="1" fill="freeze" /></circle>}</svg>
      <div className="fd-network-nodes"><div><span><Monitor size={25} /></span><strong>PC</strong><small>192.168.10.10</small></div><div><span><Router size={27} /></span><strong>Router</strong><small>192.168.10.1</small></div><div><span><Server size={25} /></span><strong>Server</strong><small>192.168.20.80</small></div></div>
    </div>
    <div className="fd-gateway"><label htmlFor="feature-demo-gateway">PC gateway</label><select id="feature-demo-gateway" value={gateway} onChange={event => { setGateway(event.target.value); setResult(null); }}><option value="192.168.10.254">192.168.10.254</option><option value="192.168.10.1">192.168.10.1</option></select><button type="button" onClick={send}><Send size={13} />Ping</button></div>
    <div className={`fd-ping-output${result ? result.ok ? ' is-success' : ' is-error' : ''}`} role="status"><span className="fd-output-prompt">&gt;</span><code>{result ? result.ok ? 'Reply from 192.168.20.80' : `No reply. Gateway ${gateway} is unreachable.` : 'ping 192.168.20.80'}</code></div>
    <div className="fd-footnote"><span>Try Ping, then change the gateway.</span><Link className="fd-cta" to="/network-lab">Open Network Lab<ArrowRight size={15} /></Link></div>
  </div>;
}

function EmbeddedDemo() {
  const [high, setHigh] = useState(false);
  return <div className={`fd-demo fd-embedded${high ? ' is-high' : ''}`}>
    <div className="fd-label"><Cpu size={14} /><span>03 / DIGITAL OUTPUT</span></div>
    <h3 className="fd-heading">Set the pin. Check the LED.</h3>
    <div className="fd-circuit" role="img" aria-label={`Arduino Uno digital pin 13 is ${high ? 'HIGH; the LED is on' : 'LOW; the LED is off'}`}>
      <svg viewBox="0 0 400 140" fill="none" aria-hidden="true">
        <rect className="fd-board" x="20" y="18" width="140" height="105" rx="8" />
        <rect className="fd-chip" x="63" y="44" width="44" height="37" rx="3" />
        {[0, 1, 2, 3, 4].map(pin => <g key={pin}><path className="fd-chip-pin" d={`M55 ${49 + pin * 7}H63M107 ${49 + pin * 7}H115`} /><circle className="fd-board-pad" cx={35 + pin * 24} cy="28" r="2" /><circle className="fd-board-pad" cx={35 + pin * 24} cy="113" r="2" /></g>)}
        <path className="fd-signal-wire" d="M160 62H206M238 62H308" /><path className="fd-resistor" d="M206 62L210 54L216 70L222 54L228 70L234 54L238 62" />
        <path className="fd-return-wire" d="M308 85V114H176V84H160" />
        <circle className="fd-led-glow" cx="308" cy="65" r="28" /><circle className="fd-led" cx="308" cy="65" r="15" /><path className="fd-led-shine" d="M301 61C301 57 304 56 307 56" />
        <text x="84" y="99" textAnchor="middle">UNO</text><text x="165" y="49">D13</text><text x="165" y="99">GND</text><text x="308" y="21" textAnchor="middle">{high ? 'LED ON' : 'LED OFF'}</text>
      </svg>
    </div>
    <div className="fd-pin-controls"><span>Pin output</span><div role="group" aria-label="Digital output level"><button type="button" aria-pressed={!high} onClick={() => setHigh(false)}>LOW <small>0</small></button><button type="button" aria-pressed={high} onClick={() => setHigh(true)}>HIGH <small>1</small></button></div></div>
    <div className="fd-code"><code><span>pinMode</span>(LED_BUILTIN, OUTPUT);<br /><span>digitalWrite</span>(LED_BUILTIN, <b>{high ? 'HIGH' : 'LOW'}</b>);</code></div>
    <div className="fd-footnote"><span>Illustration · Arduino Uno</span><Link to="/grile?filter=all">Arduino &amp; ESP32 questions<ArrowRight size={13} /></Link></div>
  </div>;
}

export default function FeatureDemo({ kind, reducedMotion }) {
  if (kind === 'linux') return <LinuxDemo />;
  if (kind === 'network') return <NetworkDemo reducedMotion={reducedMotion} />;
  return <EmbeddedDemo />;
}
