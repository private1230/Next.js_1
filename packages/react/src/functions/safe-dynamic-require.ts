'use strict';

import { Builder } from '@builder.io/sdk';

const noop = () => null;
// Allow us to require things dynamically safe from webpack bundling

export let safeDynamicRequire: typeof require = noop as any;
if (typeof globalThis.require === 'function') {
  safeDynamicRequire = eval('require');
}
safeDynamicRequire = safeDynamicRequire ?? (noop as any);
