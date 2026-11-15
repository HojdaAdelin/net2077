const roleLabel = (port, mode) => mode === 'stp' && ['alternate', 'backup'].includes(port.role) ? 'Non-designated' : port.role[0].toUpperCase() + port.role.slice(1);

export default function NetworkStpStatus({ device, state, vlan = 1, onVlanChange }) {
  const bridge = state.devices[device.id];
  if (!bridge) return null;
  const instance = bridge.vlans[vlan], choices = Object.keys(bridge.vlans).map(Number).sort((a, b) => a - b);
  return <section className="nl-stp-status"><header><h4>Spanning tree</h4><span>{bridge.enabled ? bridge.mode.toUpperCase() : 'Disabled'}</span></header>
    {!bridge.enabled ? <p>Loop protection is disabled. Enable STP/RSTP in Configure device to protect redundant Layer 2 paths.</p> : <>
      <label className="nl-stp-status-vlan">VLAN<select aria-label="Spanning-tree VLAN" value={vlan} onChange={e => onVlanChange?.(Number(e.target.value))}>{!choices.includes(vlan) && <option value={vlan}>{vlan} (not active here)</option>}{choices.map(id => <option key={id} value={id}>{id}</option>)}</select></label>
      {instance ? <><dl><div><dt>Root bridge</dt><dd>{instance.rootName}{instance.isRoot && <b className="nl-stp-root-tag">This switch</b>}</dd></div><div><dt>Root path cost</dt><dd>{instance.rootCost}</dd></div><div><dt>Root port</dt><dd>{instance.rootPort || 'None · root bridge'}</dd></div><div><dt>Bridge ID</dt><dd>{instance.bridgeId}</dd></div><div><dt>Root ID</dt><dd>{instance.rootBridgeId}</dd></div></dl>
        {instance.errors.map(error => <p className="nl-stp-warning" key={error}>{error}</p>)}
        <div className="nl-stp-status-table" tabIndex={0} role="region" aria-label="Spanning-tree port roles"><table><thead><tr><th>Port</th><th>Role / state</th><th>Cost</th></tr></thead><tbody>{instance.ports.map(port => <tr key={port.port} title={port.reason} className={['blocking', 'discarding'].includes(port.state) ? 'is-blocked' : ''}><td>{port.port}</td><td>{roleLabel(port, port.effectiveMode)}<small>{port.state}{port.edge ? ' · edge' : ''}{port.effectiveMode !== bridge.mode ? ' · STP compatibility' : ''}</small></td><td>{port.cost}</td></tr>)}</tbody></table></div><p className="nl-stp-status-note">Amber links are standby paths, not broken cables. Hover a port row for the election reason.</p>
      </> : <p>This switch is not participating in VLAN {vlan}. Choose another VLAN or check its VLAN database.</p>}
    </>}
    {state.warnings.filter(warning => warning.includes(`${device.name} `)).map(warning => <p className="nl-stp-warning" key={warning}>{warning}</p>)}
  </section>;
}
