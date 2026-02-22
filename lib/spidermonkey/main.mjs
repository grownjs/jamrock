import { loadRelativeToScript } from './deps.js';

export const getUnoCSSModule = () => import('@unocss/core');
export const getLessModule = () => Promise.resolve(null);

function loadModule(relativePath) {
  try {
    return loadRelativeToScript(relativePath);
  } catch (error) {
    throw new Error(`Failed to load module ${relativePath}: ${error.message}`);
  }
}

export default function createSpiderMonkeyEnvironment() {
  return {
    getUnoCSSModule,
    getLessModule,
    serve() {
      throw new Error('[spidermonkey] serve() is not implemented yet. SpiderMonkey shell has no built-in HTTP server.');
    },
    build() {
      // Load the main server module and call its build function
      const serverModule = loadModule('../dist/server.mjs');

      // Jamrock expects a build function that takes options
      // We'll pass minimal options for build-only mode
      const buildOptions = {
        // No server options needed for build-only
      };

      // Call the build function from the server module
      return serverModule.build(buildOptions);
    },
    static() {
      throw new Error('[spidermonkey] static() is not implemented yet.');
    },
  };
}
