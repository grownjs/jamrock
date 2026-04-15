import {
  createWindow, vstack, hstack, label, button, entry,
  signal,
} from '../dist/gtk.mjs';

const currentPath = signal('/');
const selectedItem = signal(null);
const viewMode = signal('list');
const searchFilter = signal('');

const files = signal([
  { name: 'Documents', type: 'folder', size: '-' },
  { name: 'Downloads', type: 'folder', size: '-' },
  { name: 'Pictures', type: 'folder', size: '-' },
  { name: 'Music', type: 'folder', size: '-' },
  { name: 'Videos', type: 'folder', size: '-' },
  { name: 'readme.txt', type: 'file', size: '2 KB' },
  { name: 'config.json', type: 'file', size: '1 KB' },
  { name: 'app.log', type: 'file', size: '15 KB' },
]);

function selectItem(item) {
  selectedItem.value = item;
}

function goUp() {
  const parts = currentPath.value.split('/').filter(Boolean);
  parts.pop();
  currentPath.value = '/' + parts.join('/');
}

function toggleView() {
  viewMode.value = viewMode.value === 'list' ? 'grid' : 'list';
}

function getFilteredFiles() {
  if (!searchFilter.value) return files.value;
  return files.value.filter(f => f.name.toLowerCase().includes(searchFilter.value));
}

const { open } = createWindow({ title: 'File Browser', width: 400, height: 450 });

open(() => vstack([
  label('File Browser'),
  hstack([
    button('Up', { onClick: goUp }),
    label(`Path: ${currentPath.value}`),
  ]),
  hstack([
    entry('Search files...', { onChange: e => { searchFilter.value = e.value.toLowerCase(); } }),
    button(viewMode.value === 'list' ? 'List' : 'Grid', { onClick: toggleView }),
  ]),
  label(`Files (${files.value.length})`),
  ...getFilteredFiles().map(file => hstack([
    button(`${file.type === 'folder' ? '📁' : '📄'} ${file.name}`, { onClick: () => selectItem(file) }),
    label(file.size),
  ])),
  selectedItem.value
    ? vstack([
        label(`Selected: ${selectedItem.value.name}`),
        label(`Type: ${selectedItem.value.type}`),
        label(`Size: ${selectedItem.value.size}`),
      ])
    : label('No file selected'),
]));
