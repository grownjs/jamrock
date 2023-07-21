export const VERSION = process.env.VERSION;

export * as Util from './utils/server.mjs';
export * as Render from './render/index.mjs';
export * as Markup from './markup/index.mjs';
export * as Handler from './handler/index.mjs';
export * as Runtime from './render/runtime.mjs';

import * as _utils from './templ/index.mjs';
import { Template as _template } from './templ/main.mjs';

export const Template = Object.assign(_template, _utils);
