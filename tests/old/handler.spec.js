// const td = require('testdouble');
// const path = require('path');
// const { expect } = require('chai');

// const { decode } = require('../src/render/util');
// const { handle } = require('../src/jamrock/handler');
// const { Template } = require('../src/jamrock/template');

// Template.valid = obj => (
//   obj !== null && typeof obj === 'object' && obj._tpl && obj._tpl.name === 'c$$'
// );

// function end(ctx) {
//   return (err, buffer, status) => {
//     ctx.status_code = status;
//     ctx.resp_body = buffer || err.sample || err.toString();
//   };
// }

// function view(x) {
//   return async ctx => {
//     const opts = {
//       jamrock: path.resolve(__dirname, '../dist/shared'),
//       dest: 'generated',
//       reload: true,
//       build: true,
//       quiet: true,
//     };

//     const tpl = await Template.compile(`${x}.html`, `${__dirname}/fixtures/${x}.html`, opts, '/tmp');

//     return handle(tpl.destination, opts)(ctx, null, [], end(ctx));
//   };
// }

// /* global beforeEach, afterEach, describe, it */

// describe('handler', () => {
//   let ctx;
//   function reset() {
//     ctx = {
//       req: {
//         url: '/',
//       },
//       cache: {
//         get: () => null,
//         set: () => null,
//       },
//       get_flash: () => [],
//       put_session: () => {},
//       session: {},
//       cookies: {},
//       body_params: {},
//       query_params: {},
//       method: 'GET',
//       path_info: [],
//       req_headers: {},
//       request_path: '/',
//       current_module: 'test',
//     };
//     td.replace(console, 'log', td.func('log'));
//   }
//   beforeEach(reset);
//   afterEach(() => {
//     td.reset();
//   });

//   it('should render on requests', async () => {
//     await view('components')(ctx);

//     expect(ctx.resp_body).to.contains('</html>');
//     expect(ctx.resp_body).to.contains('<!DOCTYPE');
//     expect(ctx.resp_body).to.contains('<h1>Hi, Hank.</h1>');
//   });

//   it('should respond to http-verbs', async () => {
//     await view('handlers')(ctx);
//     expect(ctx.resp_body).to.contains('<b>GET: default</b>');

//     reset();
//     ctx.method = 'POST';
//     await view('handlers')(ctx);

//     reset();
//     ctx.method = 'POST';
//     await view('handlers')(ctx);
//     expect(ctx.resp_body).to.contains('<b>POST: posted</b>');
//   });

//   it('should respond to dynamic routes', async () => {
//     ctx.method = 'DELETE /x';
//     await view('handlers')(ctx);
//     expect(ctx.resp_body).to.contains('<b>DELETE: default</b>');
//   });

//   it('should respond to function handlers', async () => {
//     await handle(`${__dirname}/fixtures/handler.js`, {})(ctx, null, [], end(ctx));

//     expect(ctx.resp_body).to.eql('/');
//   });

//   it('should respond to object handlers', async () => {
//     ctx.method = 'POST';
//     ctx.path_info = ['test'];
//     ctx.request_path = '/test';
//     await handle(`${__dirname}/fixtures/handlers.js`, {})(ctx, null, [], end(ctx));
//     expect(ctx.resp_body).to.eql('OSOM');
//   });

//   it('should responds from strings', async () => {
//     await handle(`${__dirname}/fixtures/strings.js`, {})(ctx, null, [], end(ctx));
//     expect(ctx.resp_body).to.eql('GET /');
//   });

//   it('should handle failures', async () => {
//     await handle(`${__dirname}/fixtures/errored.js`, {})(ctx, null, [], end(ctx));
//     expect(decode(ctx.resp_body)).to.contains('&#x26A0;    1 | module.exports = () => &grave;${undef}&grave;;'); // eslint-disable-line
//     expect(ctx.resp_body).to.contains('      -~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^');
//   });
// });
