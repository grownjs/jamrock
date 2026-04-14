const existsSync = (p) => {
  try {
    require('fs').existsSync(p);
  } catch {
    return false;
  }
};

const readFileSync = (p, encoding) => {
  return require('fs').readFileSync(p, encoding);
};

const writeFileSync = (p, data) => {
  return require('fs').writeFileSync(p, data);
};

const mkdirSync = (p, options) => {
  return require('fs').mkdirSync(p, options);
};

const readdirSync = (p, options) => {
  return require('fs').readdirSync(p, options);
};

const statSync = (p) => {
  return require('fs').statSync(p);
};

const unlinkSync = (p) => {
  return require('fs').unlinkSync(p);
};

const rmSync = (p, options) => {
  return require('fs').rmSync(p, options);
};

const rmdirSync = (p) => {
  return require('fs').rmdirSync(p);
};

const copyFileSync = (src, dest) => {
  return require('fs').copyFileSync(src, dest);
};

const renameSync = (oldPath, newPath) => {
  return require('fs').renameSync(oldPath, newPath);
};

export default {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmSync,
  rmdirSync,
  copyFileSync,
  renameSync,
  promises: {},
  constants: {},
  Stats: class Stats {
    isFile() { return true; }
    isDirectory() { return false; }
  },
};
