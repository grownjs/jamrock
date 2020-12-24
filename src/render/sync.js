const { empty } = require('./util');
const renderBlock = require('./block');

function exec(chunk, self, ctx, or) {
  if (empty(chunk)) return or || chunk;
  if (typeof chunk === 'function') chunk = chunk.call(self, ctx);
  if (Array.isArray(chunk)) chunk = chunk.map(x => exec(x, self, ctx));
  return chunk;
}

module.exports = (chunk, data, cb) => renderBlock(chunk, data, exec, cb);
