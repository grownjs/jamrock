// /* eslint-disable no-unused-expressions */

// const { expect } = require('chai');
// const Mortero = require('mortero');
// const path = require('path');
// const fs = require('fs-extra');
// const s = require('tiny-dedent');
// const mock = require('mock-require');

// const useWindow = require('../test');
// const transpile = require('../src/render/transpile');
// const { taggify } = require('../src/markup/html');

// const TEMP_DIR = path.resolve('tmp');

// function fixture(str, ...splat) {
//   const buffer = [];
//   for (let i = 0; i < str.length; i += 1) {
//     buffer.push(str[i], splat[i]);
//   }
//   const text = buffer.join('');
//   const [file, ...result] = text.split('\n');
//   const dest = file.replace(/^\./, TEMP_DIR);
//   const out = s(result.join('\n'));

//   if (fs.existsSync(dest) && out === fs.readFileSync(dest).toString()) return;
//   fs.outputFileSync(dest, out);
// }

// async function partial(code, options) {
//   const file = `${TEMP_DIR}/script.js`;
//   const result = await Mortero.parse('.js', code, { ...options, write: false, rewrite: transpile.rewrite })();

//   fs.outputFileSync(file, result.source);
//   delete require.cache[require.resolve(file)];
//   return file;
// }

// Mortero.use([{
//   name: 'Jamrock',
//   run: ({ register }) => {
//     register(['sandbox'], (params, done) => {
//       transpile.render(transpile.parts(params.source, params.filepath), result => {
//         params._bundle = true;
//         params.source = result.source;
//         params.children.push(...result.children);
//         done();
//       });
//     });
//   },
// }]);

// /* global beforeEach, afterEach, describe, it */

// const props = {
//   markup: '<b>HTML</b>',
//   slots: {
//     default: ['DEFAULT'],
//     before: ['BEFORE'],
//     after: ['AFTER'],
//   },
// };

// fixture`./empty.sandbox
//   Just an empty component
// `;

// fixture`./main.sandbox
//   <script>
//     import { onError, useRef, useState, useEffect } from 'jamrock';

//     import Empty from './empty';

//     export let message = 'Really?';
//     export let answer = 'OSOM';
//     export let markup = '';

//     const [fun, check] = useState('FIXME');

//     const ref = useRef();

//     onError(e => {
//       if (confirm('Are you OK?')) {
//         check('Thank you!');
//       } else {
//         check(':(');
//       }
//     });

//     useEffect(() => {
//       if (fun === 'D:') throw new Error(fun);
//       if (fun === '42') alert(ref.current.outerHTML);
//     }, [fun]);

//     if (markup.includes('HTML')) {
//       markup += '!!';
//     }
//   </script>

//   <div>
//     <slot name="before" />
//     <button on:click="{() => check(prompt(message))}">insight</button>
//     <button on:click="{() => check(answer)}">truth</button>
//     <p {ref}>Your answer: {fun}</p>
//     <Empty />
//     [<slot />:<slot name="after" />]
//     {@raw ['h1', null, 'It works.']}
//     {@html markup}
//   </div>

//   <style scoped>
//     button { color: red };
//   </style>
// `;

// describe('render', () => {
//   beforeEach(async () => {
//     mock('jamrock', require('../src/jamrock'));
//   });
//   afterEach(() => {
//     mock.stopAll();
//   });

//   it('should allow to render client-side components (headless)', async () => {
//     const filepath = await partial(`export { default } from '${TEMP_DIR}/main'`, {
//       bundle: true,
//       format: 'cjs',
//       external: ['jamrock'],
//     });

//     const Elem = require(filepath).default;
//     const html = taggify(Elem.render(props));

//     expect(html).to.contains('BEFORE');
//     expect(html).to.contains('<b>HTML</b>!!');
//     expect(html).to.contains('[DEFAULT:AFTER]');
//     expect(html).to.contains('Your answer: FIXME');
//     expect(Elem.stylesheet).to.contains('color: red');
//   });

//   it('should allow to render client-side components (window)', async () => {
//     const filepath = await partial(`export { default } from '${TEMP_DIR}/main'`, {
//       bundle: true,
//       format: 'iife',
//       aliases: {
//         jamrock: require.resolve('../browser'),
//       },
//     });

//     await useWindow(async el => {
//       require(filepath);

//       const base = path.basename(process.cwd());
//       const Elem = await el(`${base}:main`, props);
//       const html = Elem.source.target.innerHTML;

//       expect(html).to.contains('BEFORE');
//       expect(html).to.contains('<b>HTML</b>!!');
//       expect(html).to.contains('[DEFAULT:AFTER]');
//       expect(html).to.contains('Your answer: FIXME');
//     });
//   });
// });
