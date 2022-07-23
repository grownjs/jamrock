import './runtime.mjs';

import * as path from 'path';

import { Template, Compiler } from '../../dist/main.mjs';
import { createCompiler } from '../shared.mjs';

export const compile = createCompiler({ Template, Compiler, path });
