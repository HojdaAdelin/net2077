import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const badgeName = /^terminal_[a-z\d][a-z\d_. -]{0,150}\.(png|jpe?g|webp|avif|gif|svg)$/i;
export function listTerminalBadges(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && badgeName.test(entry.name))
    .map(entry => entry.name).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

// The public directory belongs to the frontend deployment, not the API server.
export function terminalBadgesPlugin() {
  const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
  const virtualId = 'virtual:terminal-badges';
  const resolvedId = `\0${virtualId}`;
  return {
    name: 'terminal-badge-catalog',
    resolveId(id) { if (id === virtualId) return resolvedId; },
    load(id) {
      if (id === resolvedId) return `export default ${JSON.stringify(listTerminalBadges(publicDirectory))};`;
    },
    configureServer(server) {
      const refresh = file => {
        if (path.resolve(path.dirname(file)) !== path.resolve(publicDirectory) || !badgeName.test(path.basename(file))) return;
        const module = server.moduleGraph.getModuleById(resolvedId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
      server.httpServer?.once('close', () => {
        server.watcher.off('add', refresh);
        server.watcher.off('unlink', refresh);
      });
    },
  };
}
