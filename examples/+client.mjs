// import { actions } from 'jamrock:browser';
const actions = {};
export function click(node) {
  console.log('[HANDLE]', node);
  async function onClick() {
    // FIXME: probably these should be a map, with all exported
    // actions from the render tree... so we can prevalidate calls
    // and such!
    const result = await actions.callme();
    console.log({ result });
  }
  node.addEventListener('click', onClick);
  return () => node.removeEventListener('click', onClick);
}
