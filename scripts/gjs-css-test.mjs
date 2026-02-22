import Less from '../lib/vendor/less.js';
import { createGenerator } from '../lib/vendor/unocss-core.js';

const lessResult = await Less.render('.foo { .bar { color: red; } }');
const lessOk = lessResult.css.includes('color: red');
console.log('less.js:', lessOk ? 'PASS' : 'FAIL');

const uno = await createGenerator({ rules: [['text-red', { color: 'red' }]] });
const { css } = await uno.generate('text-red');
const unoOk = css.includes('color:red') || css.includes('color: red');
console.log('@unocss/core:', unoOk ? 'PASS' : 'FAIL');

if (lessOk && unoOk) {
  print('All CSS tests passed');
}
