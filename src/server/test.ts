import { Runtime, Render } from '../main.ts';

const all: any[] = [{ on: [], off: [], test: [] }];

let depth = 0;
let errors = 0;
let options: any;

async function run(main: any, stack: any): Promise<void> {
  const debug = process.argv.slice(2).includes('--stack');

  try {
    (Render as any).enable(options);

    // @ts-expect-error
    window.Jamrock = { Runtime: { ...Runtime } };

    // @ts-expect-error
    Object.assign(window.Jamrock.Runtime, Render, (Render as any).createRender());

    const tabs = Array.from({ length: depth }).join('  ');

    if (stack.t) console.log(tabs + stack.t);

    try {
      await main(window);
      await Promise.all(stack.on.map((fn: any) => fn()));

      console.log(`1..${stack.test.length}`);

      for (const { t, fn } of stack.test) {
        let ok;
        try {
          await fn(window);
          ok = true;
        } finally {
          if (t) console.log(`${tabs}  ${ok ? 'ok' : 'not ok'} - ${t}`);
        }
      }
    } catch (e: any) {
      console.error((e.matcherResult ? e.matcherResult : e)[debug ? 'stack' : 'message']);
      errors++;
    } finally {
      await Promise.all(stack.off.map((fn: any) => fn()));
    }
  } catch (e) {
    console.error(e);
    errors++;
  } finally {
    (Render as any).disable();
    if (!process.env.HEADLESS) process.exit(errors > 0 ? 1 : 0);
  }
}

export function test(t: string, fn: any): void {
  all[depth].test.push({ t, fn });
}

test.install = (opts: any) => { options = opts; };
test.before = (fn: any) => { all[depth].on.push(fn); };
test.after = (fn: any) => { all[depth].off.push(fn); };

test.group = async (t: string, fn: any) => {
  all.push({ t, on: [], off: [], test: [] });
  depth++;
  await run(fn, all[depth]);
  depth--;
};
