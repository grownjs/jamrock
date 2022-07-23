import { expect } from '@japa/expect';
import { pathToFileURL } from 'node:url';
import { specReporter } from '@japa/spec-reporter';
import { processCliArgs, configure, run } from '@japa/runner';

configure({
  ...processCliArgs(process.argv.slice(2)),
  ...{
    files: ['tests/**/*.spec.mjs'],
    plugins: [expect()],
    reporters: [specReporter()],
    importer: filePath => import(pathToFileURL(filePath).href),
  },
});
run();
