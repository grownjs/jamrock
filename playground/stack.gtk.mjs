import {
  createWindow, vstack, hstack, label, button,
  signal,
} from '../dist/gtk.mjs';

const currentPage = signal('home');
const clickCount = signal(0);

function increment() {
  clickCount.value += 1;
}

function setPage(page) {
  currentPage.value = page;
}

const { open } = createWindow({ title: 'Stack Demo', width: 350, height: 350 });

open(() => vstack([
  label('Stack Demo'),
  hstack([
    button('Home', { onClick: () => setPage('home') }),
    button('Settings', { onClick: () => setPage('settings') }),
    button('About', { onClick: () => setPage('about') }),
  ]),
  label(`Current Page: ${currentPage.value}`),
  currentPage.value === 'home'
    ? vstack([
        label('Home Page'),
        label('Welcome to the Stack demo!'),
        label(`Click count: ${clickCount.value}`),
        button('Click Me!', { onClick: increment }),
      ])
    : currentPage.value === 'settings'
      ? vstack([
          label('Settings Page'),
          label('Configure your preferences here'),
          label('Theme: Dark'),
          label('Language: English'),
        ])
      : currentPage.value === 'about'
        ? vstack([
            label('About Page'),
            label('Jamrock GTK4 Explorer'),
            label('Version: 0.0.0'),
            label('Built with GTK4 and GJS'),
          ])
        : label('Unknown page'),
]));
