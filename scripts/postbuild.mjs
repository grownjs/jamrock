import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'node:child_process';

exec('cp -r types/* dist/');

const mainFile = 'dist/main.mjs';

let code = readFileSync(mainFile).toString();

// this makes the `process` object available cross-platform
// Only add if not already present
if (!code.startsWith('export const process={env:{}}')) {
  // Remove any existing process exports and add our own at the start
  code = code.replace(/export const process=\{[^}]*\};/g, '');
  code = 'export const process={env:{}};' + code;
  writeFileSync(mainFile, code);
}

const serverFile = 'dist/server.mjs';

code = readFileSync(serverFile).toString();
code = code.replace(/"\/~\/(\w+)\.[jt]s"/g, '"./$1.mjs"');

writeFileSync(serverFile, code);
