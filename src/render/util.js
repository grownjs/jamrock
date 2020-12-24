function empty(value) {
  if (Array.isArray(value)) return value.every(empty);
  if (typeof value === 'undefined' || value === null) return true;
  return typeof value === 'string' && value.trim() === '';
}

function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function encode(value, unsafe) {
  return unsafe
    ? value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

module.exports = {
  empty,
  decode,
  encode,
  isObject,
};
