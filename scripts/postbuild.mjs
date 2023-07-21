import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'node:child_process';

exec('cp -r types/* dist/');

const mainFile = 'dist/main.mjs';

let code = readFileSync(mainFile).toString();

// this makes the `process` object available cross-platform
const fix = "import*as process from'node:process'";
if (!code.includes(fix)) writeFileSync(mainFile, `${fix};${code.replace(/export\s?{/, '$&process,')}`);

const serverFile = 'dist/server.mjs';

code = readFileSync(serverFile).toString();
code = code.replace(/"jamrock\/core"/g, '"./main.mjs"');
code = code.replace(/"jamrock\/client"/g, '"./client.mjs"');

writeFileSync(serverFile, code);
