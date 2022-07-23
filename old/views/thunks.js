import {
  createRender,
} from '../render/component';

import Fragment from './fragment';

export { registerComponent } from '../render/component';

const _ = createRender(Fragment);

export const $ = _.$;
export const $$ = _.$$;
