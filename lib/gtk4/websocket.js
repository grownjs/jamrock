import { Soup } from './deps.js';

function wrapSoupWebSocket(connection, clients, events) {
  const _events = {
    error: () => null,
    message: () => null,
    request: () => null,
    disconnect: () => null,
  };

  let ws = null;

  connection.connect('message', (conn, type, message) => {
    const data = message.get_data();
    const text = new TextDecoder('utf-8').decode(data);
    _events.message(text);
  });

  connection.connect('closed', () => {
    const idx = clients.indexOf(ws);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }
    events.close(ws);
    _events.disconnect();
  });

  connection.connect('error', (conn, error) => {
    _events.error(error);
  });

  ws = {
    send(data) {
      if (typeof data === 'string') {
        connection.send_text(data);
      } else {
        const bytes = new TextEncoder().encode(data);
        connection.send_binary(bytes);
      }
    },
    close(code, reason) {
      connection.close(code || 1000, reason || '');
    },
    on(event, callback) {
      if (_events[event] !== undefined) {
        _events[event] = callback;
      }
    },
    emit(event, ...args) {
      if (_events[event]) {
        _events[event](...args);
      }
    },
  };

  return ws;
}

export { wrapSoupWebSocket };
