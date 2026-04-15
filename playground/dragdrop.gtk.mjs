import {
  createWindow, vstack, hstack, label, button,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const items = signal([
  { id: 1, name: 'Item 1', color: '🔴' },
  { id: 2, name: 'Item 2', color: '🟢' },
  { id: 3, name: 'Item 3', color: '🔵' },
  { id: 4, name: 'Item 4', color: '🟡' },
  { id: 5, name: 'Item 5', color: '🟣' },
]);

const draggedItem = signal(null);
const dropCount = signal(0);

function startDrag(item) {
  draggedItem.value = item;
}

function endDrag() {
  draggedItem.value = null;
}

function onDrop(targetId) {
  if (draggedItem.value && draggedItem.value.id !== targetId) {
    dropCount.value += 1;
    const itemIds = items.value.map(i => i.id);
    const dragIdx = itemIds.indexOf(draggedItem.value.id);
    const targetIdx = itemIds.indexOf(targetId);

    const newItems = [...items.value];
    [newItems[dragIdx], newItems[targetIdx]] = [newItems[targetIdx], newItems[dragIdx]];
    items.value = newItems;
  }
  draggedItem.value = null;
}

const { open, close, win } = createWindow({ title: 'Drag & Drop Demo', width: 350, height: 400 });

attachDevTools(win, { signals: { items, draggedItem, dropCount } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Drag & Drop Demo'),
  label('Click to select, then click another to swap'),
  label(`Drops: ${dropCount.value}`),
  draggedItem.value
    ? label(`Dragging: ${draggedItem.value.color} ${draggedItem.value.name}`)
    : label('Select an item to drag'),
  ...items.value.map(item => hstack([
    button(`${item.color} ${item.name}`, {
      onClick: () => draggedItem.value ? onDrop(item.id) : startDrag(item),
    }),
    draggedItem.value && draggedItem.value.id !== item.id
      ? button('Drop Here', { onClick: () => onDrop(item.id) })
      : null,
  ].filter(Boolean))),
  button('Cancel Drag', { onClick: endDrag }),
]));
