/**
 * @remix-vue/dev v0.0.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
'use strict';

function isValidServerMode(mode) {
  return mode === "development" || mode === "production" || mode === "test";
}

exports.isValidServerMode = isValidServerMode;
//# sourceMappingURL=serverModes.js.map
