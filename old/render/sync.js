import { empty } from '../shared/utils.js';
import { render } from './block.js';

function exec(chunk, self, ctx, or) {
  if (empty(chunk)) return or || chunk;
  if (typeof chunk === 'function') chunk = chunk.call(self, ctx);
  if (Array.isArray(chunk)) chunk = chunk.map(x => exec(x, self, ctx));
  return chunk;
}

export const renderSync = (chunk, data, cb) => render(chunk, data, exec, cb);
