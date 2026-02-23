import { WebContainer } from '@webcontainer/api';

import { templates } from './templates/index.js';

const statusEl = document.getElementById('status');
const fileTreeEl = document.getElementById('fileTree');
const currentTabEl = document.getElementById('currentTab');
const editorEl = document.getElementById('editor');
const terminalEl = document.getElementById('terminal');
const previewEl = document.getElementById('preview');
const templateSelectEl = document.getElementById('templateSelect');

let webcontainer;
let editor;
let currentFile = null;
let files = {};
let cm;

function log(message) {
  const cleaned = message.replace(/\x1b\[[0-9;]*m/g, '');
  const escaped = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  terminalEl.textContent += escaped;
  terminalEl.scrollTop = terminalEl.scrollHeight;
}

async function initEditor() {
  const { EditorView, basicSetup } = await import(
    'https://esm.sh/codemirror@6.0.1?bundle'
  );

  cm = { EditorView, basicSetup };
}

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function flattenFiles(obj, path = '') {
  const result = {};
  for (const [name, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}/${name}` : name;
    if (value.file) {
      result[fullPath] = value;
    } else if (value.directory) {
      Object.assign(result, flattenFiles(value.directory, fullPath));
    }
  }
  return result;
}

function renderFileTree() {
  fileTreeEl.innerHTML = '';
  const flatFiles = flattenFiles(files);

  for (const [path] of Object.entries(flatFiles)) {
    const li = document.createElement('li');
    li.textContent = path.split('/').pop();
    li.title = path;
    li.dataset.path = path;
    if (path === currentFile) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => openFile(path));
    fileTreeEl.appendChild(li);
  }
}

async function openFile(path) {
  const flatFiles = flattenFiles(files);
  const file = flatFiles[path];
  if (!file || !cm) return;

  currentFile = path;
  currentTabEl.textContent = path.split('/').pop();

  document.querySelectorAll('.file-tree li').forEach(li => {
    li.classList.toggle('active', li.dataset.path === path);
  });

  const content = file.file.contents;

  if (editor) {
    editor.destroy();
  }

  const { EditorView, basicSetup } = cm;

  editor = new EditorView({
    doc: content,
    extensions: [
      basicSetup,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          saveCurrentFile();
        }
      }),
    ],
    parent: editorEl,
  });
}

function saveCurrentFile() {
  if (!currentFile || !editor) return;

  const content = editor.state.doc.toString();
  const parts = currentFile.split('/');
  let current = files;

  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]].directory;
  }

  current[parts[parts.length - 1]] = { file: { contents: content } };

  if (webcontainer) {
    webcontainer.fs.writeFile(currentFile, content);
  }
}

function loadTemplate(name) {
  const template = templates[name];
  if (!template) return;

  files = JSON.parse(JSON.stringify(template.files));
  currentFile = null;
  renderFileTree();

  const flatFiles = flattenFiles(files);
  const firstFile = Object.keys(flatFiles).find(f => f.endsWith('.html'));
  if (firstFile) {
    openFile(firstFile);
  }
}

templateSelectEl.addEventListener('change', e => {
  loadTemplate(e.target.value);
});

async function bootWebContainer() {
  setStatus('Booting WebContainer...');

  try {
    webcontainer = await WebContainer.boot();
    setStatus('WebContainer ready', 'ready');

    await webcontainer.mount(files);

    log('■ WebContainer initialized');

    webcontainer.on('server-ready', (port, url) => {
      log(`■ Server ready on port ${port}`);
      previewEl.src = url;
      setStatus('Server running', 'ready');
    });

    webcontainer.on('error', ({ message }) => {
      log(`✗ Error: ${message}`);
      setStatus(message, 'error');
    });

  } catch (error) {
    setStatus(`Failed to boot: ${error.message}`, 'error');
    log(`✗ ${error.message}`);
  }
}

async function installDependencies() {
  if (!webcontainer) return;

  setStatus('Installing dependencies...');
  log('■ Installing dependencies...');

  const process = await webcontainer.spawn('npm', ['install']);

  process.output.pipeTo(new WritableStream({
    write(data) {
      log(data);
    },
  }));

  const exitCode = await process.exit;

  if (exitCode === 0) {
    log('■ Dependencies installed');
  } else {
    log(`✗ npm install failed with code ${exitCode}`);
    setStatus('Installation failed', 'error');
  }

  return exitCode;
}

async function startDevServer() {
  if (!webcontainer) return;

  setStatus('Starting dev server...');
  log('■ Starting dev server...');

  const process = await webcontainer.spawn('npm', ['start']);

  process.output.pipeTo(new WritableStream({
    write(data) {
      log(data);
    },
  }));
}

async function init() {
  setStatus('Loading editor...');
  await initEditor();

  loadTemplate('hello-world');

  await bootWebContainer();

  if (webcontainer) {
    await installDependencies();
    await startDevServer();
  }
}

init();
