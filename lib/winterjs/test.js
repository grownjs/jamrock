// Test sandbox for WinterJS runtime
// WinterJS provides WinterCG globals

print('=== WinterJS Runtime Test ===');
print(`crypto available: ${typeof crypto}`);
print(`fetch available: ${typeof fetch}`);
print(`TextEncoder available: ${typeof TextEncoder}`);

// Test crypto.subtle for session encoding
async function testCrypto() {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode('secret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
    );
    await crypto.subtle.sign('HMAC', key, enc.encode('test'));
    print('crypto.subtle sign: OK');
  } catch (e) {
    print(`crypto.subtle: FAILED - ${e.message}`);
  }
}

testCrypto();

// Test Service Worker event pattern (stub)
print(`addEventListener available: ${typeof addEventListener}`);

// Test process stub
print(`process.env available: ${typeof process?.env}`);
print(`process.argv available: ${typeof process?.argv}`);

print('\n=== WinterJS Runtime Test Complete ===');
