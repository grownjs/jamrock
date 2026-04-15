import {
  createWindow, vstack, hstack, label, button, entry,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const notes = signal([
  { id: 1, title: 'Welcome', content: 'This is your first note!' },
  { id: 2, title: 'Tip', content: 'Click a note to view it' },
]);
const selected = signal(null);
const editing = signal(false);
const editTitle = signal('');
const editContent = signal('');

function selectNote(note) {
  selected.value = note;
  editing.value = false;
}

function startEdit() {
  if (selected.value) {
    editTitle.value = selected.value.title;
    editContent.value = selected.value.content;
    editing.value = true;
  }
}

function saveEdit() {
  if (selected.value) {
    notes.value = notes.value.map(n =>
      n.id === selected.value.id
        ? { ...n, title: editTitle.value, content: editContent.value }
        : n
    );
    selected.value = { ...selected.value, title: editTitle.value, content: editContent.value };
    editing.value = false;
  }
}

function cancelEdit() {
  editing.value = false;
}

function newNote() {
  const note = { id: Date.now(), title: 'New Note', content: '' };
  notes.value = [note, ...notes.value];
  selected.value = note;
  editTitle.value = note.title;
  editContent.value = note.content;
  editing.value = true;
}

function deleteNote() {
  if (selected.value) {
    notes.value = notes.value.filter(n => n.id !== selected.value.id);
    selected.value = null;
  }
}

const { open, close, win } = createWindow({ title: 'Notes App', width: 450, height: 400 });

attachDevTools(win, { signals: { notes, selected, editing, editTitle, editContent } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Notes App'),
  hstack([
    button('+ New', { onClick: newNote }),
    selected.value ? button('Edit', { onClick: startEdit }) : null,
    selected.value ? button('Delete', { onClick: deleteNote }) : null,
  ].filter(Boolean)),
  hstack([
    vstack([
      label(`Notes (${notes.value.length})`),
      ...notes.value.map(note => button(note.title, { onClick: () => selectNote(note) })),
    ]),
    vstack([
      selected.value
        ? editing.value
          ? vstack([
              label('Editing:'),
              entry('Title', { onChange: e => { editTitle.value = e.value; } }),
              entry('Content', { onChange: e => { editContent.value = e.value; } }),
              hstack([
                button('Save', { onClick: saveEdit }),
                button('Cancel', { onClick: cancelEdit }),
              ]),
            ])
          : vstack([
              label(selected.value.title),
              label(selected.value.content),
            ])
        : label('Select a note'),
    ]),
  ]),
]));
