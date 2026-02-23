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
//
// This test runs the full Jamrock pipeline:
// 1. createEnvironment with createServer
// 2. env.serve() → compiler.reload() (loads routes into memory)
// 3. Real HTTP request through createHandler → createResponse

import '../lib/winterjs/runtime.js';
import { createServer } from '../lib/winterjs/server.js';
import { createEnvironment } from '../dist/server.mjs';
import { fs, path } from '../lib/winterjs/deps.js';

const options = {
  src: 'x-gtk-sandbox',
  dest: 'dist',
  port: 8080,
  quiet: false,
  prefix: '@',
  public: 'public',
};

const env = createEnvironment({ fs, path }, options, {
  createServer,
});

env.serve().catch(console.error);
