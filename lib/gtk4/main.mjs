import './runtime.js';

import { fs, path, Gio } from './deps.js';
import { createServer } from './server.js';
import { createEnvironment } from '../../dist/server.mjs';

export const capabilities = { serve: true, build: true, watch: true, init: true, window: true, explorer: true };

function createGioWatcher() {
  const watchers = new Map();
  const events = { change: [] };

  return {
    watch(dir) {
      const file = Gio.File.new_for_path(dir);
      const monitor = file.monitor_directory(Gio.FileMonitorFlags.NONE, null);

      monitor.connect('changed', (mon, file1, file2, eventType) => {
        const _path = file1.get_path();
        for (const cb of events.change) {
          cb(_path, eventType);
        }
      });

      watchers.set(dir, monitor);
      return {
        on(event, cb) {
          if (events[event]) {
            events[event].push(cb);
          }
        },
        close: () => {
          monitor.cancel();
          watchers.delete(dir);
        },
      };
    },
    close: () => {
      for (const mon of watchers.values()) {
        mon.cancel();
      }
      watchers.clear();
    },
  };
}

const getUnoCSSModule = () => import('../vendor/unocss-core.js');
const getLessModule = () => import('../vendor/less.js');

export default options => createEnvironment({ fs, path }, { ...options, target: 'gtk' }, {
  createServer,
  capabilities,
  getLessModule,
  getUnoCSSModule,
  getChokidarModule: createGioWatcher,
});
