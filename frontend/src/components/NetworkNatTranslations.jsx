export default function NetworkNatTranslations({ result }) {
  const rows = result?.natTranslations || [];
  if (!rows.length) return null;
  const endpoint = (ip, port) => `${ip}${port == null ? '' : `:${port}`}`;
  return <section className="nl-nat-translations" aria-label="NAT translations for this simulation"><h3>NAT / PAT translations</h3><p>Observed in this simulation. ICMP uses identifiers instead of transport ports.</p><div className="nl-nat-table-scroll" tabIndex={0} role="region" aria-label="NAT translation table, scroll for all columns"><table><thead><tr><th>Router / type</th><th>Protocol</th><th>Inside local</th><th>Inside global</th><th>Outside host</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><td><strong>{row.deviceName}</strong><small>{row.kind}</small></td><td>{row.protocol.toUpperCase()}</td><td>{endpoint(row.insideLocal, row.localPort)}</td><td>{endpoint(row.insideGlobal, row.globalPort)}</td><td>{endpoint(row.outsideGlobal, row.remotePort)}</td></tr>)}</tbody></table></div></section>;
}
