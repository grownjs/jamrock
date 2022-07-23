import { FragmentList } from 'somedom';

export const Fragment = FragmentList;

if (typeof HTMLElement !== 'undefined') {
  class XFragment extends HTMLElement {}

  customElements.define('x-fragment', XFragment);
}
