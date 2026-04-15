import {
  createWindow, vstack, hstack, label, button, entry, progress, range, revealer,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const page = signal('home');
const searchQuery = signal('');
const selectedIcon = signal('None');
const selectedFruit = signal('None');
const progressVal = signal(0.5);
const revealText = signal(true);
const entryText = signal('');

function navigate(p) {
  page.value = p;
}

function selectIcon(name) {
  selectedIcon.value = name;
}

function selectFruit(name) {
  selectedFruit.value = name;
}

function toggleReveal() {
  revealText.value = !revealText.value;
}

const { open, close, win } = createWindow({ title: 'Multi-Page App', width: 400, height: 500 });

attachDevTools(win, { signals: { page, searchQuery, selectedIcon, selectedFruit, progressVal, revealText, entryText } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Multi-Page App'),
  hstack([
    button('Home', { onClick: () => navigate('home') }),
    button('Widgets', { onClick: () => navigate('widgets') }),
    button('Layout', { onClick: () => navigate('layout') }),
    button('Lists', { onClick: () => navigate('lists') }),
  ]),
  entry('Search...', { onChange: e => { searchQuery.value = e.value; } }),
  page.value === 'home'
    ? vstack([
        label('Welcome to Jamrock GTK4!'),
        label('Build native desktop apps with HTML-like syntax'),
        label('Features:'),
        label('• Reactive signals for live updates'),
        label('• All GTK4 widgets available'),
        label('• Hot reload during development'),
        label('• Cross-platform (Linux, macOS)'),
      ])
    : page.value === 'widgets'
      ? vstack([
          label('Widget Showcase'),
          label(`Selected Icon: ${selectedIcon.value}`),
          hstack([
            button('Info', { onClick: () => selectIcon('Info') }),
            button('Warning', { onClick: () => selectIcon('Warning') }),
            button('Error', { onClick: () => selectIcon('Error') }),
            button('Success', { onClick: () => selectIcon('Success') }),
          ]),
          label(`Selected Fruit: ${selectedFruit.value}`),
          hstack([
            button('Apple', { onClick: () => selectFruit('Apple') }),
            button('Orange', { onClick: () => selectFruit('Orange') }),
            button('Banana', { onClick: () => selectFruit('Banana') }),
          ]),
          label(`Entry: ${entryText.value}`),
          entry('Type and press Enter...', { onChange: e => { entryText.value = e.value; } }),
        ])
      : page.value === 'layout'
        ? vstack([
            label('Layout Demo'),
            label(`Progress: ${Math.round(progressVal.value * 100)}%`),
            progress(progressVal.value),
            range(progressVal.value * 100, { onChange: e => { progressVal.value = e.value / 100; } }),
            label(`Revealer: ${revealText.value ? 'Visible' : 'Hidden'}`),
            button(revealText.value ? 'Hide' : 'Show', { onClick: toggleReveal }),
            revealText.value ? label('This text is revealed!') : null,
          ].filter(Boolean))
        : page.value === 'lists'
          ? vstack([
              label('List Demo'),
              label('Use #each to render lists'),
              ...['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'].map(item => label(`• ${item}`)),
            ])
          : label('Unknown page'),
].filter(Boolean)));
