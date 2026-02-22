import Less from 'less/dist/less.js';
import { createGenerator } from '@unocss/core';

const lessResult = await Less.render('.foo { .bar { color: red; } }');
const lessOk = lessResult.css.includes('color: red');
console.log('less.js:', lessOk ? 'PASS' : 'FAIL');

const uno = createGenerator({ rules: [['text-red', { color: 'red' }]] });
const { css } = await uno.generate('text-red');
const unoOk = css.includes('color: red');
console.log('@unocss/core:', unoOk ? 'PASS' : 'FAIL');

if (lessOk && unoOk) {
  console.log('All CSS tests passed');
}
