import { FragmentList } from 'somedom';

const Fragment = FragmentList;

class XFragment extends HTMLElement {}

customElements.define('x-fragment', XFragment);

export default Fragment;
