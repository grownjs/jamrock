import { WebContainer } from 'https://cdn.skypack.dev/@webcontainer/api';

import xterm from 'https://cdn.skypack.dev/xterm';
import AnsiUp from 'https://cdn.skypack.dev/ansi_up';
import untar from 'https://cdn.skypack.dev/js-untar';
import pako from 'https://cdn.skypack.dev/pako';

//  FIXME: generate these files through .html sources...
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

// we can build out this tree with pure js...
const files = {
  src: {
    directory: {
      'loops+page.html': {
        file: {
          contents: `<script>
function randomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function createIterator(max, limit) {
  const l = limit || randomIntFromInterval(3, 5);
  const c = max || randomIntFromInterval(10, 15);

  let i = 0;
  const it = async function* loop() {
    for (;;) {
      yield i++;
      if (i >= c) break;
    }
  };

  return [it, l, c];
}

const [data, limit, count] = createIterator(10);
</script>
<style>ul{margin:0;display:flex;padding:0;list-style:none;flex-wrap:wrap} ul > .red{color:red}.odd{color:blue}</style>
<style>
.rev{display:flex;flex-wrap:wrap-reverse;flex-direction:row-reverse;}
</style>

<style global>
@keyframes fade-in {
  from { opacity: 0; }
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes slide-from-right {
  from { transform: translateX(30px); }
}

@keyframes slide-to-left {
  to { transform: translateX(-30px); }
}

::view-transition-old(root) {
  animation: 90ms cubic-bezier(0.4, 0, 1, 1) both fade-out,
    300ms cubic-bezier(0.4, 0, 0.2, 1) both slide-to-left;
}

::view-transition-new(root) {
  animation: 210ms cubic-bezier(0, 0, 0.2, 1) 90ms both fade-in,
    300ms cubic-bezier(0.4, 0, 0.2, 1) both slide-from-right;
}

iframe {
  outline: 1px dashed silver;
  width: 100%;
}
</style>

<textarea @wait=1200>STATIC &lt;b&gt;OSOM&lt;/b&gt;</textarea>

<button onclick="Jamrock.Browser.reload()">Jamrock reload!</button>

<a href="/loops" target="_self">Browser reload...</a>

<p>{limit} - {count}</p>
<fragment tag="ul" name="data" interval="20" limit={limit}>
{#each data as x}
  <li class:red="{x < limit}" class:odd="{x % 2 === 0}">{x + 1}{x < count - 1 ? ',' : ''}&nbsp;</li>
{/each}
</fragment>
`,
          },
        },
        'index+page.html': {
          file: {
            contents: `<script>
  import { method, request } from 'jamrock:conn';

  export let data;

  export default {
    use: ['csrf'],
    POST: true,
  };
</script>

<head>
  <title>OSOM</title>
</head>

<form @multipart>
  <input type="text" name="f" />
  <input type="submit" />
</form>

<pre>{JSON.stringify(data,null,2)}</pre>

<button onclick="Jamrock.Browser.reload()">Jamrock reload!</button>
<button onclick="location.reload()">Browser reload!</button>
`,
          },
        },
      },
    },

    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'example-app',
          main: 'index.js',
          engines: {
            node: '>=18.12.1',
          },
          type: 'module',
          scripts: {
            start: 'node .',
          },
        }, null, 2),
      },
    },

    'index.js': {
      file: {
        contents: `import env from 'jamrock/nodejs';

env({
  uws: false,
  watch: true,
  redis: false,
  fswatch: false,
  src: './src',
  dest: './dist',
}).serve();
`.replaceAll('//cdn.skypack.dev/', ''),
    },
  },
};

// below, all this boilerplate can be done apart.. and then,
// discover stuff from the actual page...

let jamfiles;
fetch('jamrock-0.0.0.tgz').then(res => res.arrayBuffer())
  .then(pako.inflate)
  .then(arr => arr.buffer)
  .then(untar)
  .then(_files => {
    jamfiles = _files;
  });

const editor = window.ace.edit('input');

editor.session.setTabSize(2);
editor.setShowPrintMargin(false);
editor.session.setUseWorker(false);

editor.setValue(files.src.directory['index+page.html'].file.contents);
editor.clearSelection();
editor.gotoLine(1);
editor.focus();

editor.setTheme('ace/theme/pastel_on_dark');
editor.session.setMode('ace/mode/html');

let webcontainerInstance;

const src = document.querySelector('.files');
const stdout = document.querySelector('.stdout');
const iframeEl = document.querySelector('iframe');

let current = './src/index+page.html';
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

  appProcess = await webcontainerInstance.spawn('node', ['.']);
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
    }, 120);
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
