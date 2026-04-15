import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';
import { exec } from 'node:child_process';

exec('cp -r types/* dist/');

const mainFile = 'dist/main.mjs';

if (existsSync(mainFile)) {
  let code = readFileSync(mainFile).toString();

  // this makes the `process` object available cross-platform
  // Only add if not already present
  if (!code.startsWith('export const process={env:{}}')) {
    // Remove any existing process exports and add our own at the start
    code = code.replace(/export const process=\{[^}]*\};/g, '');
    code = `export const process={env:{}};${code}`;
    writeFileSync(mainFile, code);
  }
}

const serverFile = 'dist/server.mjs';

if (existsSync(serverFile)) {
  let code = readFileSync(serverFile).toString();

  // Determine which main module to use based on which file is newer
  // If gtk-main.mjs is newer than main.mjs (or main.mjs doesn't exist), use gtk-main.mjs
  let mainModule = 'main.mjs';
  if (existsSync('dist/gtk-main.mjs')) {
    if (!existsSync('dist/main.mjs')) {
      mainModule = 'gtk-main.mjs';
    } else {
      const gtkMainTime = statSync('dist/gtk-main.mjs').mtimeMs;
      const mainTime = statSync('dist/main.mjs').mtimeMs;
      if (gtkMainTime > mainTime) {
        mainModule = 'gtk-main.mjs';
      }
    }
  }

  code = code.replace(/"\/~\/main\.[jt]s"/g, `"./${mainModule}"`);

  // Fix client.js import for GTK4 build
  if (mainModule === 'gtk-main.mjs') {
    code = code.replace(/"\/~\/client\.js"/g, '"../lib/gtk4/client.js"');
  }

  // Fix other /~/ imports to use .mjs extension
  code = code.replace(/"\/~\/(\w+)\.[jt]s"/g, '"./$1.mjs"');

  writeFileSync(serverFile, code);
}
