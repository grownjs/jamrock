const { spawn } = require('child_process');
const fs = require('fs-extra');

function clean(text) {
  return text.replace(/\r?\n/g, '\n');
}

function failure(data) {
  const error = new Error('Server failure');
  error.sample = data.toString();
  return error;
}

async function evaluate(cwd, payload) {
  fs.ensureDir(cwd);

  Object.keys(payload.files).forEach(name => {
    const input = clean(payload.files[name]);
    const dest = `${cwd}/${name}`;
    const old = fs.existsSync(dest)
      ? fs.readFileSync(dest).toString()
      : '';

    if (old !== input || name.indexOf('pages/') === 0) {
      fs.outputFileSync(dest, input);
    }
  });

  fs.outputFileSync(`${cwd}/server.js`, '');

  const url = `http://localhost:${payload.port}${payload.path}`;

  if (!process[`server:${payload.port}`]) {
    const server = [
      require.resolve('jamrock/bin/cli'),
      's', 'up', '--watch', '--no-redis', '--no-upload', '--app', 'server.js', '--port', payload.port,
    ];

    const child = spawn(server[0], server.slice(1), { cwd });

    process[`server:${payload.port}`] = child;

    return new Promise((ok, not) => {
      child.stderr.on('data', data => {
        delete process[`server:${payload.port}`];
        child.kill();
        process.stderr.write(data);
        not(failure(data));
      });

      let ready;
      child.stdout.on('data', data => {
        if (data.includes('[server] (Error)')) {
          delete process[`server:${payload.port}`];
          child.kill();
          process.stderr.write(data);
          not(failure(data));
        }
        if (!ready && data.includes('ready at')) {
          ready = true;
          ok(url);
        }
        if (ready) {
          process.stdout.write(data);
        }
      });
    });
  }
  return url;
}

module.exports = {
  evaluate,
};
