export const templates = {
  'hello-world': {
    name: 'Hello World',
    files: {
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'hello-world',
            version: '1.0.0',
            type: 'module',
            scripts: {
              start: 'node server.mjs',
            },
          }, null, 2),
        },
      },
      'server.mjs': {
        file: {
          contents: `import { createServer } from 'http';

const pages = {
  '/': \`<!DOCTYPE html>
<html>
<head><title>Hello World</title></head>
<body>
  <h1>Hello, World!</h1>
  <p>This is a preview of Jamrock syntax.</p>
</body>
</html>\`,
};

createServer((req, res) => {
  const html = pages[req.url] || pages['/'];
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}).listen(3000, () => console.log('Server running on port 3000'));
`,
        },
      },
      'pages': {
        directory: {
          'index+page.html': {
            file: {
              contents: `<script>
  export default {
    GET() {
      console.log('Hello from the server!');
    },
  };
</script>

<head>
  <title>Hello World</title>
</head>

<main>
  <h1>Hello, Jamrock!</h1>
  <p>This is your first Jamrock app.</p>
  <p><em>Note: This is a syntax preview. Jamrock is not yet published to npm.</em></p>
</main>

<style>
  main {
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }
  h1 {
    color: #79C551;
  }
</style>
`,
            },
          },
        },
      },
    },
  },

  counter: {
    name: 'Counter (Actions)',
    files: {
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'counter',
            version: '1.0.0',
            type: 'module',
            scripts: {
              start: 'node server.mjs',
            },
          }, null, 2),
        },
      },
      'server.mjs': {
        file: {
          contents: `import { createServer } from 'http';

let count = 0;

createServer((req, res) => {
  if (req.method === 'POST') {
    count++;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(\`<!DOCTYPE html>
<html>
<head><title>Counter</title></head>
<body>
  <h1>Counter: \${count}</h1>
  <form method="POST"><button>+1</button></form>
</body>
</html>\`);
}).listen(3000, () => console.log('Server running on port 3000'));
`,
        },
      },
      'pages': {
        directory: {
          'index+page.html': {
            file: {
              contents: `<script>
  let count = 0;

  export default {
    POST: true,

    increment() {
      count++;
    },

    decrement() {
      count--;
    },
  };
</script>

<head>
  <title>Counter</title>
</head>

<main>
  <h1>Counter: {count}</h1>

  <form method="POST" action="?/decrement">
    <button type="submit">-1</button>
  </form>

  <form method="POST" action="?/increment">
    <button type="submit">+1</button>
  </form>
</main>

<style>
  main {
    padding: 2rem;
    font-family: system-ui, sans-serif;
    text-align: center;
  }
  h1 {
    color: #79C551;
    font-size: 2rem;
  }
  form {
    display: inline-block;
    margin: 0.5rem;
  }
  button {
    padding: 0.5rem 1rem;
    font-size: 1.5rem;
    cursor: pointer;
    background: #13272D;
    color: #79C551;
    border: 1px solid #79C551;
    border-radius: 4px;
  }
  button:hover {
    background: #79C551;
    color: #01111F;
  }
</style>
`,
            },
          },
        },
      },
    },
  },

  todo: {
    name: 'Todo App',
    files: {
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'todo',
            version: '1.0.0',
            type: 'module',
            scripts: {
              start: 'node server.mjs',
            },
          }, null, 2),
        },
      },
      'server.mjs': {
        file: {
          contents: `import { createServer } from 'http';

let todos = [];

createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  const list = todos.map(t => \`<li>\${t.text}</li>\`).join('');
  res.end(\`<!DOCTYPE html>
<html>
<head><title>Todo</title></head>
<body>
  <h1>Todo List</h1>
  <ul>\${list}</ul>
  <p><em>Static preview - Jamrock syntax demo</em></p>
</body>
</html>\`);
}).listen(3000, () => console.log('Server running on port 3000'));
`,
        },
      },
      'pages': {
        directory: {
          'index+page.html': {
            file: {
              contents: `<script>
  let todos = [];
  let newTodo = '';

  export default {
    POST: true,

    add() {
      if (newTodo.trim()) {
        todos = [...todos, { id: Date.now(), text: newTodo.trim(), done: false }];
        newTodo = '';
      }
    },

    toggle(id) {
      todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    },

    remove(id) {
      todos = todos.filter(t => t.id !== id);
    },
  };
</script>

<head>
  <title>Todo App</title>
</head>

<main>
  <h1>Todo List</h1>

  <form method="POST" action="?/add">
    <input type="text" name="newTodo" bind:value={newTodo} placeholder="Add a todo..." />
    <button type="submit">Add</button>
  </form>

  <ul>
    {#each todos as todo}
      <li class:done={todo.done}>
        <form method="POST" action="?/toggle" style="display:inline">
          <input type="hidden" name="id" value={todo.id} />
          <button type="submit">{todo.done ? '✓' : '○'}</button>
        </form>
        <span>{todo.text}</span>
        <form method="POST" action="?/remove" style="display:inline">
          <input type="hidden" name="id" value={todo.id} />
          <button type="submit">×</button>
        </form>
      </li>
    {/each}
  </ul>

  <p>{todos.length} items, {todos.filter(t => t.done).length} done</p>
</main>

<style>
  main {
    padding: 2rem;
    font-family: system-ui, sans-serif;
    max-width: 400px;
    margin: 0 auto;
  }
  h1 {
    color: #79C551;
  }
  input[type="text"] {
    padding: 0.5rem;
    width: 70%;
    border: 1px solid #13272D;
    border-radius: 4px;
  }
  button {
    padding: 0.5rem 1rem;
    background: #13272D;
    color: #79C551;
    border: 1px solid #79C551;
    border-radius: 4px;
    cursor: pointer;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid #13272D;
  }
  li.done span {
    text-decoration: line-through;
    opacity: 0.6;
  }
</style>
`,
            },
          },
        },
      },
    },
  },
};
