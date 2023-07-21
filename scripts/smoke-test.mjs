export function run(test, driver, expect, createSandbox) {
  test.group('ssr/dom testing support', ({ Event }) => {
    let env;
    test.before(async () => {
      env = await createSandbox({ dest: 'build/output' });
    });

    test(`${driver}: ensure client-side components can be rendered`, async () => {
      console.log(env);
      const mod = env.lookup('main.html');
      const el = await env.mount(mod, {
        props: {
          markup: '<b>OSOM</b>',
        },
        slots: {
          default: [Math.random()],
          before: [['span', { '@html': '<b>RAW</b>' }]],
          after: [['em', null, 'B']],
        },
      });

      expect([...el.querySelectorAll('button')].map(x => x.outerHTML.replace(/jam-\w+/g, 'jam-x'))).toEqual([
        '<button class="jam-x">insight</button>',
        '<button class="jam-x">truth</button>',
      ]);
      expect(el.outerHTML).toContain('<root><div');
      expect(el.outerHTML).toContain('<b>OSOM</b>');
      expect(el.outerHTML).not.toContain('<x-fragment>');
      expect(el.outerHTML).toContain('Your answer: FIXME');

      const button = el.querySelector('button:nth-child(3)');

      button.dispatchEvent(new Event('click'));

      await new Promise(ok => setTimeout(ok));

      expect(el.outerHTML).toContain('Your answer: OSOM');
      expect(el.outerHTML).toContain('</h1><b>OSOM</b></div>');

      const p = el.querySelector('p');

      p.dispatchEvent(new Event('somethingelse'));

      await new Promise(ok => setTimeout(ok));

      expect(el.outerHTML).toContain('</h1><em>OSOM</em></div>');
    });
  });
}
