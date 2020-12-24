const { empty } = require('./util');
const renderBlock = require('./block');

async function exec(chunk, self, ctx, or) {
  let result = await Promise.resolve(chunk);
  if (empty(result)) return or || result;
  if (typeof result === 'function') result = await result.call(self, ctx);
  if (Array.isArray(result)) {
    const output = [];

    for (const item of result) {
      output.push(await exec(item, self, ctx));
    }
    return output;
  }
  return result;
}

module.exports = (chunk, data, cb) => renderBlock(chunk, data, exec, cb);
