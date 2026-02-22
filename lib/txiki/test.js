// Test sandbox for txiki.js runtime
import * as path from 'tjs:path';

print('=== txiki.js Runtime Test ===');
print(`tjs available: ${typeof tjs}`);
print(`tjs.fs available: ${typeof tjs?.fs}`);
print(`tjs.listen available: ${typeof tjs?.listen}`);
print(`crypto available: ${typeof crypto}`);
print(`TextEncoder available: ${typeof TextEncoder}`);

// Test file system
try {
  const testPath = './package.json';
  const exists = tjs.fs.existsSync(testPath);
  print(`fs.existsSync(${testPath}): ${exists}`);
} catch (e) {
  print(`fs test: FAILED - ${e.message}`);
}

// Test path module
try {
  const joined = path.join('foo', 'bar');
  print(`path.join("foo", "bar"): ${joined}`);
} catch (e) {
  print(`path test: FAILED - ${e.message}`);
}

// Test process stub
print(`process.env available: ${typeof process?.env}`);
print(`process.argv available: ${typeof process?.argv}`);

print('\n=== txiki.js Runtime Test Complete ===');
