// @ts-nocheck
export const VERSION = process?.env?.VERSION || '0.0.0';

export const process = {
  env: process?.env || {},
};

export * as Util from './utils/server.ts';
export * as Render from './render/index.ts';
export * as Markup from './markup/index.ts';
export * as Handler from './handler/index.ts';
export * as Runtime from './render/runtime.ts';
import * as _utils from './templ/index.ts';

import { Template as _template } from './templ/main.ts';
export const Template = Object.assign(_template, _utils);
