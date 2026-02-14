import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'node:child_process';

exec('cp -r types/* dist/');

const mainFile = 'dist/main.mjs';

let code = readFileSync(mainFile).toString();

// this makes the `process` object available cross-platform
const prefix = 'export const process={};';
if (!code.includes(prefix)) writeFileSync(mainFile, prefix + code);

const serverFile = 'dist/server.mjs';

code = readFileSync(serverFile).toString();
code = code.replace(/"\/~\/(\w+)\.[jt]s"/g, '"./$1.mjs"');

writeFileSync(serverFile, code);
