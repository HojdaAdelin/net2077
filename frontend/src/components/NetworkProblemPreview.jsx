import { CheckCircle2, Zap } from 'lucide-react';
import NetworkDeviceArtwork from './NetworkDeviceArtwork';
import { portPosition, cablePath } from '../utils/networkTopology';

export default function NetworkProblemPreview({ problem }) {
  const devices = problem.topology.devices;
  const left = Math.min(...devices.map(item => item.x)) - 30, top = Math.min(...devices.map(item => item.y)) - 40;
  const width = Math.max(...devices.map(item => item.x + 160)) - left + 30;
  const height = Math.max(...devices.map(item => item.y + 210)) - top;
  return <article className="nlp-definition-preview">
    <div className="nlp-problem-badges"><span className={`nlp-difficulty ${problem.difficulty}`}>{problem.difficulty}</span><span className="nlp-xp"><Zap size={14} />{problem.xp} XP</span><span className="nlp-badge">{problem.published ? 'Published' : 'Draft'}</span></div>
    <h3>{problem.title}</h3><p className="nlp-preview-summary">{problem.summary}</p><p className="nlp-preview-description">{problem.description}</p>
    <div className="nlp-tags">{problem.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    <svg className="nlp-topology-preview" viewBox={`${left} ${top} ${width} ${Math.max(height, 200)}`} role="img" aria-label={`Starting topology for ${problem.title}`}>
      {problem.topology.cables.map(cable => { const from = devices.find(item => item.id === cable.from.deviceId), to = devices.find(item => item.id === cable.to.deviceId); return <path key={cable.id} d={cablePath(portPosition(from, cable.from.portId), portPosition(to, cable.to.portId))} />; })}
      {devices.map(device => <g key={device.id} transform={`translate(${device.x} ${device.y})`}><NetworkDeviceArtwork type={device.type} width="160" height="112" /><text x="80" y="-12" textAnchor="middle">{device.name}</text><text className="nlp-preview-device-note" x="80" y="150" textAnchor="middle">{problem.permissions.configure.includes(device.id) ? 'Editable' : 'Preset'}</text></g>)}
    </svg>
    <div className="nlp-preview-objectives"><h4>{problem.objectives.length} objectives</h4>{problem.objectives.map(goal => <p key={goal.id}><CheckCircle2 size={14} />{goal.label}</p>)}</div>
    {problem.hints.length > 0 && <details className="nlp-preview-hints"><summary>{problem.hints.length} hints available</summary><ul>{problem.hints.map((hint, index) => <li key={index}>{hint}</li>)}</ul></details>}
    <p className="nlp-preview-note">{devices.length} devices · {problem.topology.cables.length} cables · {problem.permissions.cables ? 'Connections editable' : 'Connections locked'} · {problem.permissions.devices ? 'Extra devices allowed' : 'Starting devices only'}</p>
  </article>;
}
