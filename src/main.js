export const VERSION = process.env.VERSION;

export * as Store from './reactor/store.mjs';
export * as Markup from './markup/index.mjs';
export * as Render from './render/index.mjs';
export * as Handler from './handler/index.mjs';
export * as Reactor from './reactor/index.mjs';
export * as Runtime from './client/runtime.mjs';
export * as Compiler from './templ/compile.mjs';

import * as _utils from './templ/index.mjs';
import { Template as _template } from './templ/main.mjs';

export const Template = Object.assign(_template, _utils);
