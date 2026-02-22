#!/usr/bin/env -S gjs -m
// Quick diagnostic: test the encode chain from lib/gtk4/server.js
import GLib from 'gi://GLib';

const enc = new TextEncoder();
const dec = new TextDecoder();

print('=== Testing encode chain from lib/gtk4/server.js ===');

// Simulate crypto.subtle.sign mock
// Try: 4 args with length=-1 (null-terminated)
try {
  const key = '__UNSAFE__';
  const result = GLib.compute_hmac_for_string(GLib.ChecksumType.SHA1, key, '1234567890', -1);
  print('1. hmac hex string OK:', result.substring(0, 10) + '...');

  try {
    const arr = new Uint8Array(result);
    print('2. new Uint8Array(hexStr) → length=' + arr.length + ' [0]=' + arr[0] + ' [1]=' + arr[1]);

    try {
      const b64 = btoa(String.fromCharCode(...arr));
      print('3. btoa OK:', b64.substring(0, 20) + '...');
    } catch (e) {
      print('3. btoa THROWS:', e.message);
    }
  } catch (e) {
    print('2. Uint8Array THROWS:', e.message);
  }
} catch (e) {
  print('1. compute_hmac_for_string THROWS:', e.message);
}

// Also test enc.encode with number
try {
  const v = enc.encode(Date.now());
  print('4. enc.encode(Date.now()) length=' + v.length + ' OK');
  const decoded = dec.decode(v);
  print('5. decoded back:', decoded.substring(0, 15));
} catch (e) {
  print('4. enc.encode(number) THROWS:', e.message);
}

// Simulate the full async encode
(async () => {
  try {
    const key = await Promise.resolve({ keyData: enc.encode('__UNSAFE__') });
    const sig = await (async () => {
      const keyStr = dec.decode(key.keyData);
      const dataStr = dec.decode(enc.encode(Date.now()));
      return GLib.compute_hmac_for_string(GLib.ChecksumType.SHA1, keyStr, dataStr);
    })();
    print('6. async sig type:', typeof sig, 'preview:', sig.substring(0, 10) + '...');
    const result = btoa(String.fromCharCode(...new Uint8Array(sig)));
    print('7. full encode result:', result.substring(0, 20) + '...');
  } catch (e) {
    print('FULL ENCODE ERROR:', e.message);
  }
  print('Done.');
})();
