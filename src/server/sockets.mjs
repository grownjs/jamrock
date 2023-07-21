// FIXME: this could be an extension...
//    const self = Object.assign(context || {}, {
//      filepath,
//      callbacks: [],
//      streams: new Map(),
//      chunks: new Map(),
//      depth: 0,
//      send: async (key, data, uuid, chunk, source, params, result) => {
//        try {
//          const children = await invoke(self, chunk, { ...result, [key]: data });
//
//          serialize(children, null, (_, x) => decorate(self, _, x));
//
//          if (self.socket.identity === uuid) {
//            self.socket.emit('update', source, params, children);
//          }
//        } catch (e) {
//          // ctx.socket.emit('error', e);
//          console.error('E_SEND', e);
//        }
//      },
//      emit: async (data, uuid, path, source, target) => {
//        if (self.streams.has(path)) {
//          const { locals, calls } = self.streams.get(path);
//          const handler = self.streams.get(`${path}?handler`);
//
//          if (calls[source]) {
//            const result = calls[source](data);
//            const depth = +path.split('/').pop();
//            const key = target || source;
//
//            let _props;
//            let chunk;
//            let name;
//            for (const frag in handler.fragments) {
//              if (handler.fragments[frag].scope && handler.fragments[frag].scope.includes(key)) {
//                _props = await invoke(self, { render: handler.fragments[frag].attributes, depth }, locals);
//                chunk = { slots: handler.component._slots, render: handler.fragments[frag].template };
//                name = frag;
//                break;
//              }
//            }
//
//            const push = item => self.send(key, [item], uuid, chunk, `${path}/${name}`, _props, locals);
//
//            if (Is.iterable(result)) {
//              for await (const item of result) await push(item);
//            } else {
//              await push(result);
//            }
//          }
//        }
//      },
//      accept: (src, key, _depth, _handler, _socket) => {
//        self.streams.set(`${src}/${_depth}?handler`, _handler);
//        self.streams.set(`${src}/${_depth}/${key}?socket`, _socket);
//
//        if (_socket.streams) _socket.streams.add(`${src}/${_depth}/${key}`);
//        if (!_socket.context) _socket.context = self;
//      },
//      connect: (src, key, _depth, _socket) => {
//        if (self.streams.has(`${src}/${_depth}/${key}`)) {
//          return self.streams.get(`${src}/${_depth}/${key}`).accept(_socket);
//        }
//      },
//      subscribe: (src, key, params, _depth) => {
//        self.streams.set(`${src}/${_depth}/${key}`, params);
//      },
//      unsubscribe: (src, key, _depth) => {
//        self.streams.delete(`${src}/${_depth}?handler`);
//        self.streams.delete(`${src}/${_depth}/${key}`);
//        self.streams.delete(`${src}/${_depth}/${key}?socket`);
//      },
//    });
//
//    if (Is.func(self.clients) && !self.socket) {
//      let _socket;
//      Object.defineProperty(self, 'socket', {
//        get: () => {
//          // eslint-disable-next-line no-return-assign
//          return _socket || (_socket = self.clients().find(x => x.identity === self.uuid));
//        },
//        set: v => {
//          _socket = v;
//        },
//      });
//    }
