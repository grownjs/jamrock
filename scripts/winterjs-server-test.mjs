#!/usr/bin/env winterjs
// Integration test: verifies that fetch handler works in WinterJS runtime.
//
// Usage:
//   make winterjs-server-test  (via Makefile)
//
// This script is run by WinterJS via wasmer. The test is performed by
// making an external HTTP request (via curl) to verify the server responds.
//
// PASS = request completed and got a response (any HTTP status)
// FAIL = unexpected error

addEventListener('fetch', event => {
  event.respondWith((async () => {
    const { request } = event;
    const url = new URL(request.url);
    const body = `WinterJS HTTP test - ${request.method} ${url.pathname}`;
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  })());
});
