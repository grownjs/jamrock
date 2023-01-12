import { Selector } from 'testcafe';

export const $ = ref => Selector(ref.charAt() === '@' ? `[data-test\\:id="${ref.substr(1)}"]` : ref);

export const $debug = $('@debug');

$debug.clear = $('@debug.clear');
$debug.list = $('@debug.list');
