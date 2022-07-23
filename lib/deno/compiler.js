import './runtime.js';

import * as path from 'https://deno.land/std/path/mod.ts';

import { Template, Compiler } from '../../dist/main.mjs';
import { createCompiler } from '../shared.mjs';

export const compile = createCompiler({ Template, Compiler, path });
