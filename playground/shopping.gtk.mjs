import {
  createWindow, vstack, hstack, label, button, entry,
  signal,
} from '../dist/gtk.mjs';

const items = signal([
  { id: 1, name: 'Apple', price: 1.99 },
  { id: 2, name: 'Banana', price: 0.99 },
  { id: 3, name: 'Orange', price: 1.49 },
  { id: 4, name: 'Mango', price: 2.99 },
  { id: 5, name: 'Grapes', price: 3.99 },
]);

const selectedItem = signal(null);
const newItemName = signal('');
const newItemPrice = signal('');

function selectItem(item) {
  selectedItem.value = item;
}

function addItem() {
  if (newItemName.value && newItemPrice.value) {
    const newId = Math.max(...items.value.map(i => i.id)) + 1;
    items.value = [...items.value, {
      id: newId,
      name: newItemName.value,
      price: parseFloat(newItemPrice.value),
    }];
    newItemName.value = '';
    newItemPrice.value = '';
  }
}

function removeItem(id) {
  items.value = items.value.filter(i => i.id !== id);
  if (selectedItem.value && selectedItem.value.id === id) {
    selectedItem.value = null;
  }
}

const { open } = createWindow({ title: 'Shopping List', width: 500, height: 400 });

open(() => vstack([
  label('Shopping List'),
  hstack([
    vstack([
      label(`Items (${items.value.length})`),
      ...items.value.map(item => hstack([
        button(item.name, { onClick: () => selectItem(item) }),
        label(`$${item.price.toFixed(2)}`),
      ])),
    ]),
    vstack([
      label('Selected Item'),
      selectedItem.value
        ? vstack([
            label(selectedItem.value.name),
            label(`$${selectedItem.value.price.toFixed(2)}`),
            button('Remove', { onClick: () => removeItem(selectedItem.value.id) }),
          ])
        : label('No item selected'),
    ]),
  ]),
  label('Add New Item'),
  hstack([
    entry('Item name', { onChange: e => { newItemName.value = e.value; } }),
    entry('Price', { onChange: e => { newItemPrice.value = e.value; } }),
    button('Add', { onClick: addItem }),
  ]),
]));
