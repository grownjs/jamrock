import { renderGtk, createGtkApp } from '../lib/gtk4/renderer.js';

const template = [
  'div', { class: 'container', orientation: 'vertical' }, [
    ['h1', { label: 'Hello from Jamrock!' }],
    ['button', { onclick: () => doSomething() }, 'Click Me'],
  ]
];

const { window, widget } = createGtkApp(template, {
  title: 'My App',
  width: 800,
  height: 600
});
