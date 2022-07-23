import { empty } from '../shared/utils.js';
import { render } from './block.js';

async function exec(chunk, self, ctx, or) {
  let result = await Promise.resolve(chunk);
  if (empty(result)) return or || result;
  if (typeof result === 'function') {
    result = await result.call(self, ctx);
  }
  if (Array.isArray(result)) {
    result = await Promise.all(result.map(item => exec(item, self, ctx)));
  }
  return result;
}

export const renderAsync = (chunk, data, cb) => render(chunk, data, exec, cb);
