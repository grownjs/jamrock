import { signal, computed } from '../dist/gtk.mjs';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    print('  OK: ' + msg);
    passed++;
  } else {
    print('  FAIL: ' + msg);
    failed++;
  }
}

print('Signal tests:');
const count = signal(0);
assert(count.value === 0, 'signal initial value');
count.value = 5;
assert(count.value === 5, 'signal set value');

print('Computed tests:');
const doubled = computed(() => count.value * 2);
assert(doubled.value === 10, 'computed reacts to signal');
count.value = 3;
assert(doubled.value === 6, 'computed updates on signal change');

print('Signal mutation from callback:');
const open = signal(false);
function toggle() { open.value = !open.value; }
assert(open.value === false, 'signal false initial');
toggle();
assert(open.value === true, 'signal true after toggle');
toggle();
assert(open.value === false, 'signal false after second toggle');

print('Computed with conditionals:');
const label = computed(() => {
  if (count.value === 0) return 'zero';
  if (count.value === 1) return 'one';
  return 'many';
});
count.value = 0;
assert(label.value === 'zero', 'computed if branch');
count.value = 1;
assert(label.value === 'one', 'computed else-if branch');
count.value = 7;
assert(label.value === 'many', 'computed else branch');

print('Signal array mutations:');
const items = signal(['a', 'b', 'c']);
assert(items.value.length === 3, 'signal array initial length');
items.value = [...items.value, 'd'];
assert(items.value.length === 4, 'signal array push');
items.value = items.value.slice(0, -1);
assert(items.value.length === 3, 'signal array pop');

print('\nResults: ' + passed + ' passed, ' + failed + ' failed');
