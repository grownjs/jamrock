import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'node:child_process';

exec('cp -r types/* dist/');

const destFile = 'dist/main.mjs';

let code = readFileSync(destFile).toString();
code = code.replace(/var resolved_promise[^]+?(?=\/\/ node_modules)/, '\n');

writeFileSync(destFile, code);
