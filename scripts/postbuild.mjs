import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'node:child_process';

exec('cp -r types/* dist/');

const mainFile = 'dist/main.mjs';

let code = readFileSync(mainFile).toString();
// eslint-disable-next-line max-len
code = code.replace(/\/\/ node_modules\/svelte\/src\/runtime\/internal\/globals\.js[^]+?(?=\/\/ node_modules\/svelte\/src\/runtime\/store\/index\.js)/, '');

writeFileSync(mainFile, code);

const serverFile = 'dist/server.mjs';

code = readFileSync(serverFile).toString();
code = code.replace(/"jamrock"/g, '"./main.mjs"');
code = code.replace(/"jamrock\/client"/g, '"./client.mjs"');

writeFileSync(serverFile, code);
