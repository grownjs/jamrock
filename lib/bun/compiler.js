import './runtime.js';

import path from 'node:path';

import { Template, Compiler } from '../../dist/main.mjs';
import { createCompiler } from '../shared.mjs';

export const compile = createCompiler({ Template, Compiler, path });
