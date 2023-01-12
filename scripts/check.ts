import { expect } from 'expect';

import type { Application } from './main.d.ts';

import { configureApplication } from '../lib/main.mjs';

async function main() {
  const { env, test, routes } = await configureApplication<Application>();

  expect(routes.getHomePage.url()).toEqual('/');
  expect(routes.login_page.url()).toEqual('/login');
  expect(routes.get.Article.url({ slug: 'osom' })).toEqual('/article/osom');

  const home = env.lookup('index+page.html');

  test.group('rendering components', () => {
    test('it should work!', async () => {
      const el = await env.mount(home);

      expect(el.innerHTML).toEqual('<h1>It works.</h1>');
    });
  });
}
main();
