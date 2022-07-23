import createContainer from 'grown';
import { createServer } from '../lib/nodejs/server.mjs';
import { Handler } from '../dist/main.mjs';

const Grown = createContainer();

Grown.use(import('@grown/conn'));

async function main() {
  const handler = await createServer({ dest: 'generated/output' });

  Grown.ready(() => {
    const app = new Grown();

    Handler.setup(app, null, 2000);

    app.plug(Grown.Conn);
    app.mount(conn => {
      conn.sockets = () => app.clients();
    });
    app.mount(handler);
    app.listen(8080).then(({ location }) => {
      console.debug('Listening on', location.href);
    });
  });
}
main();
