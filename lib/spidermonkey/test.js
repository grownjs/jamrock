// Test sandbox for SpiderMonkey runtime
// Provides createSandbox() function for unit tests

function createSandbox() {
  // SpiderMonkey shell globals (no setTimeout/setInterval in shell)
  const globals = {
    console,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    RegExp,
    Error,
    TypeError,
    RangeError,
    URIError,
    ReferenceError,
    SyntaxError,
    Promise,
    Symbol,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array,
    ArrayBuffer,
    SharedArrayBuffer,
    DataView,
    Atomics,
    WebAssembly,
    // SpiderMonkey-specific
    os,
    loadRelativeToScript,
  };

  return {
    globals,
    // File system APIs using os.system() for file operations
    fs: {
      existsSync(path) {
        const result = os.system(`test -e "${path}"`);
        return result === 0;
      },
      readFileSync(path) {
        const result = os.system(`cat "${path}"`);
        if (result !== 0) {
          throw new Error(`Failed to read file: ${path}`);
        }
        return result;
      },
      writeFileSync(path, content) {
        const tmpPath = `${path}.tmp`;
        os.system(`echo -n "${content.replace(/"/g, '\\"')}" > "${tmpPath}"`);
        os.system(`mv "${tmpPath}" "${path}"`);
      },
      mkdirSync(path) {
        os.system(`mkdir -p "${path}"`);
      },
      readdirSync(path) {
        const output = os.system(`ls "${path}"`);
        if (output === 0 || !output) return [];
        return output.trim().split('\n').filter(x => x);
      },
    },
    path: {
      join(...parts) {
        return parts.join('/');
      },
      dirname(filePath) {
        const parts = filePath.split('/');
        parts.pop();
        return parts.join('/');
      },
      basename(filePath) {
        const parts = filePath.split('/');
        return parts[parts.length - 1];
      },
      resolve(...paths) {
        return paths.join('/');
      },
    },
    // Mock test utilities
    test: {
      pin(fn) {
        return fn();
      },
      skip(fn) {
        console.log('[skip]', fn.name);
        return () => null;
      },
      group(name, tests) {
        console.log('[group]', name);
        tests();
      },
    },
  };
}

// Test by running: js lib/spidermonkey/test.js
print('=== SpiderMonkey Runtime Test ===');
print(`createSandbox is available: ${typeof createSandbox}`);

// Test file I/O capabilities
const sandbox = createSandbox();
print('\n=== Testing File I/O ===');

// Test readFileSync - read package.json
try {
  const pkg = sandbox.fs.readFileSync('./package.json');
  print(`readFileSync ./package.json: OK (${pkg.length} bytes)`);
} catch (e) {
  print(`readFileSync ./package.json: FAILED - ${e.message}`);
}

// Test existsSync
try {
  const exists = sandbox.fs.existsSync('./package.json');
  print(`existsSync ./package.json: ${exists}`);
  const notExists = sandbox.fs.existsSync('./nonexistent.txt');
  print(`existsSync ./nonexistent.txt: ${notExists}`);
} catch (e) {
  print(`existsSync: FAILED - ${e.message}`);
}

// Test path utilities
print('\n=== Testing Path Utils ===');
print(`path.join("a", "b"): ${sandbox.path.join('a', 'b')}`);
print(`path.dirname("/foo/bar/baz.txt"): ${sandbox.path.dirname('/foo/bar/baz.txt')}`);
print(`path.basename("/foo/bar/baz.txt"): ${sandbox.path.basename('/foo/bar/baz.txt')}`);

print('\n=== SpiderMonkey Runtime Test Complete ===');
