export function _loader(file) {
  return import(file).then(mod => mod.default);
};
