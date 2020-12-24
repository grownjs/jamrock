function toArray(value) {
  return ((!Array.isArray(value) && value) ? [value] : value || [])
    .reduce((memo, cur) => memo.concat(typeof cur === 'string' ? cur.split(',') : []), []);
}

function toFlag(key, values) {
  return values.reduce((memo, x) => memo.concat(key + x), []);
}

module.exports = {
  toArray,
  toFlag,
};
