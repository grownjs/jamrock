// const td = require('testdouble');
// const { expect } = require('chai');
// const { req, match } = require('../src/jamrock/matcher');

// /* global beforeEach, describe, it */
// /* eslint-disable no-unused-expressions */

// describe('matcher', () => {
//   let ctx;

//   beforeEach(() => {
//     ctx = {
//       method: 'GET',
//       params: {},
//       req: {
//         params: {},
//       },
//       path_info: [],
//       request_path: '/',
//     };
//   });

//   describe('req', () => {
//     const actions = {
//       ['GET /']: td.func('GET /'),
//       ['POST /']: td.func('POST /'),
//       ['PATCH /x']: td.func('PATCH /x'),
//       ['GET /:id']: td.func('GET /:id'),
//       ['GET /:id/*']: td.func('GET /:id/*'),
//       ['GET /:id/edit']: td.func('GET /:id/edit'),
//       ['GET /:id/:action']: td.func('GET /:id/:action'),
//     };

//     it('would invoke matching methods', async () => {
//       await req(ctx, null, actions);
//       expect(td.explain(actions['GET /']).callCount).to.eql(1);

//       ctx.method = 'POST';
//       await req(ctx, null, actions);
//       expect(td.explain(actions['POST /']).callCount).to.eql(1);
//     });

//     it('would invoke matching routes', async () => {
//       ctx.method = 'PATCH';
//       ctx.path_info = ['x'];
//       ctx.request_path = '/x';

//       await req(ctx, null, actions);
//       expect(td.explain(actions['PATCH /x']).callCount).to.eql(1);
//     });

//     it('would invoke multiple routes', async () => {
//       ctx.method = 'GET';
//       ctx.path_info = ['42', 'edit'];
//       ctx.request_path = '/42/edit';
//       await req(ctx, null, actions);

//       expect(td.explain(actions['GET /:id']).callCount).to.eql(1);
//       expect(td.explain(actions['GET /:id/*']).callCount).to.eql(1);
//       expect(td.explain(actions['GET /:id/edit']).callCount).to.eql(1);
//       expect(td.explain(actions['GET /:id/:action']).callCount).to.eql(1);
//       expect(td.explain(actions['GET /:id/anything']).callCount).to.eql(0);
//     });

//     it('would throw otherwise', async () => {
//       ctx.current_module = 'a.html';
//       ctx.method = 'DELETE';

//       let error;
//       try {
//         await req(ctx, null, actions);
//       } catch (e) {
//         error = e;
//       }

//       expect(error).not.to.be.undefined;
//       expect(error.message).to.contains('Route not found in a.html');

//       error = undefined;
//       ctx.method = 'PUT';
//       ctx.path_info = ['not_found'];
//       ctx.request_path = '/not_found';

//       try {
//         await req(ctx, null, { foo: () => {} });
//       } catch (e) {
//         error = e;
//       }

//       expect(error).not.to.be.undefined;
//       expect(error.message).to.contains('Route not found in a.html');
//     });
//   });

//   describe('match', () => {
//     it('should test http-verbs', () => {
//       expect(match(ctx, 'GET /')).to.eql('GET /');
//       expect(match(ctx, 'POST /')).to.be.undefined;

//       ctx.method = 'PATCH';
//       expect(match(ctx, 'PATCH /')).to.eql('PATCH /');
//     });

//     it('should test routes from path_info', () => {
//       expect(match(ctx, '')).to.be.undefined;
//       expect(match(ctx, '/')).to.eql('/');
//       expect(match(ctx, '/x')).to.be.undefined;

//       ctx.request_path = '/x';
//       ctx.path_info = ['x'];

//       expect(match(ctx, '')).to.be.undefined;
//       expect(match(ctx, '/')).to.be.undefined;
//       expect(match(ctx, '/x')).to.eql('/x');
//     });

//     it('should capture :x and *y parameters', () => {
//       ctx.request_path = '/a/b/c';
//       ctx.path_info = ['a', 'b', 'c'];

//       expect(match(ctx, '/*')).to.eql('/*');
//       expect(ctx.req.params._).to.eql(['a', 'b', 'c']);

//       expect(match(ctx, '/*x')).to.eql('/*x');
//       expect(ctx.req.params.x).to.eql(['a', 'b', 'c']);

//       expect(match(ctx, '/a', true)).to.eql('/a');
//       expect(match(ctx, '/a/b', true)).to.eql('/a/b');
//       expect(match(ctx, '/a/b/c')).to.eql('/a/b/c');

//       expect(match(ctx, '/:x/*y')).to.eql('/:x/*y');
//       expect(ctx.req.params.x).to.eql('a');
//       expect(ctx.req.params.y).to.eql(['b', 'c']);

//       expect(match(ctx, '/:x/:y/:z')).to.eql('/:x/:y/:z');
//       expect(ctx.req.params.x).to.eql('a');
//       expect(ctx.req.params.y).to.eql('b');
//       expect(ctx.req.params.z).to.eql('c');
//     });
//   });
// });
