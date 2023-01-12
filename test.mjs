import { expect } from '@japa/expect';
import { pathToFileURL } from 'node:url';
import { specReporter } from '@japa/spec-reporter';
import { processCliArgs, configure, test, run } from '@japa/runner';

const _group = test.group;

test.group = (desc, cb) => {
  _group(desc, group => {
    group.tap(t => {
      if (t.title.includes('skip:')) t.skip();
      if (t.title.includes('pin:')) t.pin();
    });
    cb(group);
  });
};

import {
  fetch,
  Headers,
  Request,
  Response,
} from 'undici';

import {
  ReadableStream,
} from 'node:stream/web';

if (!globalThis.ReadableStream) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.ReadableStream = ReadableStream;
}

configure({
  ...processCliArgs(process.argv.slice(2)),
  ...{
    files: ['tests/**/*.spec.mjs'].concat(process.env.CI ? [] : 'examples/**/*.spec.mjs'),
    plugins: [expect()],
    reporters: [specReporter()],
    importer: filePath => import(pathToFileURL(filePath).href),
  },
});
run();
