import { WebContainer } from '@webcontainer/api';

import { AnsiUp } from 'ansi_up';
import untar from 'js-untar';
import xterm from 'xterm';
import pako from 'pako';

let jamfiles;
fetch('jamrock-0.0.0.tgz').then(res => res.arrayBuffer())
  .then(pako.inflate)
  .then(arr => arr.buffer)
  .then(untar)
  .then(_files => {
    jamfiles = _files;
  });

const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

let theme = window.localStorage.theme || '';
function loadTheme() {
  document.documentElement.setAttribute('theme', theme);
  if (theme === (isDark ? 'dark' : 'light')) {
    delete window.localStorage.theme;
  }
}

window.toggle = () => {
  theme = theme === 'light' ? 'dark' : 'light';
  window.localStorage.theme = theme;
  loadTheme();
};

if (!theme) {
  if (isDark) {
    theme = 'dark';
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    theme = e.matches ? 'dark' : 'light';
    loadTheme();
  });
}
loadTheme();

const tree = document.querySelector('[data-tree="/"]');
const selected = tree.dataset.selected;
const files = {};

function walkNodes(root, parent) {
  root.childNodes.forEach(node => {
    if (node.tagName === 'LI') {
      if (node.dataset.leaf) {
        const contents = node.firstElementChild.querySelector('span').dataset.body;

        parent[node.dataset.leaf.split('/').pop()] = { file: { contents } };
      } else {
        const tree = node.firstElementChild.querySelector('details > ul[data-tree]');
        const directory = {};

        parent[tree.dataset.tree] = { directory };
        walkNodes(tree, directory);
      }
    }
  });
}
walkNodes(tree, files);

const editor = window.ace.edit('input');

editor.session.setTabSize(2);
editor.setShowPrintMargin(false);
editor.session.setUseWorker(false);

editor.setValue(files[selected].file.contents);
editor.clearSelection();
editor.gotoLine(1);
editor.focus();

editor.setTheme('ace/theme/pastel_on_dark');
editor.session.setMode(selected.includes('.html')
  ? 'ace/mode/html'
  : selected.includes('.json')
    ? 'ace/mode/json'
    : selected.includes('.css')
      ? 'ace/mode/css'
      : 'ace/mode/javascript');

let webcontainerInstance;

const src = document.querySelector('.files');
const stdout = document.querySelector('.stdout');
const iframeEl = document.querySelector('iframe');

let current = `./${selected}`;
src.addEventListener('click', e => {
  if (!current) return;
  if (e.target.tagName === 'INPUT') {
    current = null;
    editor.setReadOnly(true);

    const file = e.target.value.replace(location.origin, '.');

    if (webcontainerInstance) {
      webcontainerInstance.fs.readFile(file)
        .then(bytes => {
          if (file.includes('.html')) {
            editor.session.setMode('ace/mode/html');
          } else if (file.includes('.css')) {
            editor.session.setMode('ace/mode/css');
          } else if (file.includes('.json')) {
            editor.session.setMode('ace/mode/json');
          } else if (file.includes('.js')) {
            editor.session.setMode('ace/mode/javascript');
          }

          editor.setValue(String.fromCharCode.apply(null, new Uint16Array(bytes)));
          editor.clearSelection();
          editor.setReadOnly(false);
          editor.gotoLine(1);

          setTimeout(() => {
            current = file;
          }, 200);
        });
    } else {
      current = file;
    }
  }
});

const dimmed = {
  foreground: '#b9bcba',
  background: '#1f1f1f',
  cursor: '#f83e19',

  black: '#3a3d43',
  brightBlack: '#888987',

  red: '#be3f48',
  brightRed: '#fb001f',

  green: '#879a3b',
  brightGreen: '#0f722f',

  yellow: '#c5a635',
  brightYellow: '#c47033',

  blue: '#4f76a1',
  brightBlue: '#186de3',

  magenta: '#855c8d',
  brightMagenta: '#fb0067',

  cyan: '#578fa4',
  brightCyan: '#2e706d',

  white: '#b9bcba',
  brightWhite: '#fdffb9'
};

const terminal = new xterm.Terminal({
  disableStdin: true,
  convertEol: true,
  fontSize: 12,
  theme: dimmed,
});
terminal.open(xterminal);

const up = new AnsiUp();

function debug(message) {
  terminal.write(message);
  stdout.innerHTML = up.ansi_to_html(message.trim()) || '...';
}

async function writeFile(filepath, content) {
  await webcontainerInstance.fs.writeFile(filepath, content);
}

async function installDependencies(args = []) {
  const installProcess = await webcontainerInstance.spawn('npm', ['install', ...args]);

  installProcess.output.pipeTo(new WritableStream({
    write(data) {
      debug(data);
    },
  }));

  return installProcess.exit;
}

let baseUrl;
let appProcess;
async function startDevServer() {
  if (appProcess) appProcess.kill();

  appProcess = await webcontainerInstance.spawn('npm', ['start']);
  appProcess.output.pipeTo(new WritableStream({
    write(data) {
      debug(data);
    },
  }));
  webcontainerInstance.on('server-ready', (port, url) => {
    console.log({url});
    iframeEl.src = url;
    baseUrl = url;
  });
}

function gotoPage(url) {
  if (!baseUrl) return;
  const root = iframeEl.parentNode;
  root.removeChild(iframeEl);
  iframeEl.src = baseUrl + url + '#' + Math.random();
  root.appendChild(iframeEl);
}

window.addEventListener('load', async () => {
  navigate.addEventListener('submit', e => {
    e.preventDefault();
    gotoPage(urlbar.value || '/');
  });
  reload.addEventListener('click', () => {
    gotoPage(urlbar.value || '/');
  });

  debug('Initializing web container...\n');
  editor.container.style.opacity = 1;
  webcontainerInstance = await WebContainer.boot();

  debug('Initializing file system...\n');

  await webcontainerInstance.mount(files);

  let t;
  editor.session.on('change', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (current) {
        writeFile(current, editor.getValue());

        if (current.includes('.js')) {
          debug('Restarting server...\n');
          startDevServer();
        }
      }
    }, 1260);
  });

  const exitCode = await installDependencies();

  if (exitCode !== 0) {
    throw new Error('Installation failed');
  }

  await installDependencies(['@grown/static', 'grown', 'mortero', 'chokidar', 'open-editor', 'undici', 'fast-glob']);
  await webcontainerInstance.fs.writeFile('package.json', files['package.json'].file.contents);

  debug('Installing jamrock modules...\n');

  await webcontainerInstance.fs.mkdir('node_modules/jamrock/lib/nodejs', { recursive: true });
  await webcontainerInstance.fs.mkdir('node_modules/jamrock/dist');

  await Promise.all(jamfiles.map(file => {
    if (file.name.includes('deno') || file.name.includes('bun')) return;
    return webcontainerInstance.fs.writeFile(file.name.replace('package', 'node_modules/jamrock'), new Uint8Array(file.buffer));
  }));

  debug('Starting dev server...\n');

  startDevServer();
});
