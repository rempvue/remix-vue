/**
 * @remix-vue/node v0.0.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
'use strict';

var serverRuntime = require('@remix-vue/server-runtime');
var stream = require('./stream.js');



Object.defineProperty(exports, 'createRequestHandler', {
  enumerable: true,
  get: function () { return serverRuntime.createRequestHandler; }
});
exports.createReadableStreamFromReadable = stream.createReadableStreamFromReadable;
exports.writeReadableStreamToWritable = stream.writeReadableStreamToWritable;
//# sourceMappingURL=index.js.map
