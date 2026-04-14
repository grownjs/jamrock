const _modules = new Map();

export function registerModule(name, module) {
  _modules.set(name, module);
}

export function getModule(name) {
  return _modules.get(name);
}

export function hasModule(name) {
  return _modules.has(name);
}
