export function parseAddress(value) {
  if (typeof value !== 'string') return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    const octets = value.split('.').map(Number);
    if (octets.some(part => part > 255)) return null;
    return { family: 4, bits: 32, number: octets.reduce((sum, part) => (sum << 8n) + BigInt(part), 0n) };
  }
  if (!value.includes(':') || /[%\s\[\]]/.test(value)) return null;
  let text = value.toLowerCase();
  if (text.includes('.')) {
    const split = text.lastIndexOf(':');
    const tail = parseAddress(text.slice(split + 1));
    if (tail?.family !== 4) return null;
    text = `${text.slice(0, split)}:${(tail.number >> 16n).toString(16)}:${(tail.number & 65535n).toString(16)}`;
  }
  if ((text.match(/::/g) || []).length > 1) return null;
  let parts;
  if (text.includes('::')) {
    const [a, b] = text.split('::');
    const left = a ? a.split(':') : [], right = b ? b.split(':') : [];
    if (left.length + right.length >= 8) return null;
    parts = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  } else parts = text.split(':');
  if (parts.length !== 8 || parts.some(part => !/^[a-f0-9]{1,4}$/.test(part))) return null;
  return { family: 6, bits: 128, number: parts.reduce((sum, part) => (sum << 16n) + BigInt(`0x${part}`), 0n) };
}

export const ipv6 = value => { const address = parseAddress(value); return address?.family === 6 ? address.number : null; };
export const sameAddress = (a, b) => { const left = parseAddress(a), right = parseAddress(b); return Boolean(left && right && left.family === right.family && left.number === right.number); };
export const validPrefix6 = value => Number.isInteger(value) && value >= 0 && value <= 128;

export function formatIPv6(number) {
  const groups = Array.from({ length: 8 }, (_, index) => Number((number >> BigInt((7 - index) * 16)) & 65535n).toString(16));
  let start = -1, length = 0;
  for (let i = 0; i < 8;) {
    if (groups[i] !== '0') { i++; continue; }
    let end = i; while (end < 8 && groups[end] === '0') end++;
    if (end - i > length && end - i >= 2) { start = i; length = end - i; }
    i = end;
  }
  return start < 0 ? groups.join(':') : `${groups.slice(0, start).join(':')}::${groups.slice(start + length).join(':')}`;
}

export function parseNetwork(value, requireNetwork = true) {
  if (typeof value !== 'string') return null;
  const [ip, size, extra] = value.split('/'), address = parseAddress(ip);
  if (!address || extra !== undefined || !/^\d{1,3}$/.test(size || '')) return null;
  const prefix = Number(size);
  if (prefix > address.bits) return null;
  const shift = BigInt(address.bits - prefix), network = (address.number >> shift) << shift;
  if (requireNetwork && network !== address.number) return null;
  return { ...address, prefix, network };
}

export function addressInNetwork(ip, network) {
  const address = parseAddress(ip), parsed = typeof network === 'string' ? parseNetwork(network, false) : network;
  return Boolean(address && parsed && address.family === parsed.family &&
    (address.number >> BigInt(address.bits - parsed.prefix)) === (parsed.network >> BigInt(address.bits - parsed.prefix)));
}

export function networkFor(ip, prefix) {
  const address = parseAddress(ip);
  if (!address || !Number.isInteger(prefix) || prefix < 0 || prefix > address.bits) return null;
  const number = (address.number >> BigInt(address.bits - prefix)) << BigInt(address.bits - prefix);
  const text = address.family === 6 ? formatIPv6(number) : [24n, 16n, 8n, 0n].map(shift => Number((number >> shift) & 255n)).join('.');
  return `${text}/${prefix}`;
}

export function validUnicast6(value) {
  const number = ipv6(value);
  return number !== null && number !== 0n && number !== 1n && (number >> 120n) !== 255n;
}
