import fs from 'fs';
import path from 'path';
import util from 'util';

// FIXME: reorganize & clean... do not re-export single methods from built-in module
const RE_SPLIT_LINES = /(?<=\n)/;

export function split(value) {
  return String(value).split(RE_SPLIT_LINES);
}

export function unlink(filepath) {
  return fs.unlinkSync(filepath);
}
export function exists(filepath) {
  return fs.existsSync(filepath);
}

export function inspect(value) {
  return util.inspect(value, { depth: Infinity, colors: process.env.NODE_ENV !== 'test' });
}

export function realpath(file) {
  return path.resolve(file);
}

export function join(...args) {
  return path.join(...args);
}

export function nodir(value) {
  return path.basename(value);
}

export function nofile(value) {
  return path.dirname(value);
}

export function status(text) {
  process.stdout.write(` \x1b[90m${text}\x1b[0m\x1b[K\n`);
}

export function hasChanged(source, dest) {
  if (!fs.existsSync(dest)) return true;
  return fs.statSync(source).mtime > fs.statSync(dest).mtime;
}

export function writeFile(dest, source) {
  fs.writeFileSync(dest, source);
}

export function mtime(source) {
  return fs.existsSync(source) && fs.statSync(source).mtime;
}

export function filename(value) {
  return value.replace(/^.*?([^/]+)\.\w+$/, '$1');
}
