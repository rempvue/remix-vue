/**
 * @remix-vue/express v0.0.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
'use strict';

var node = require('@remix-vue/node');

function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}) {
  let handleRequest = node.createRequestHandler(build, mode);

  return async (req, res, next) => {
    try {
      let request = createRemixVueRequest(req, res);
      let loadContext = await getLoadContext?.(req, res);

      let response = await handleRequest(request, loadContext);

      await sendRemixVueResponse(res, response);
    } catch (error) {
      // Express doesn't support async functions, so we have to pass along the
      // error manually using next().
      next(error);
    }
  };
}

function createRemixVueHeaders(requestHeaders) {
  let headers = new Headers();

  for (let [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (let value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return headers;
}

function createRemixVueRequest(req, res) {
  // req.hostname doesn't include port information so grab that from
  // `X-Forwarded-Host` or `Host`
  let [, hostnamePort] = req.get("X-Forwarded-Host")?.split(":") ?? [];
  let [, hostPort] = req.get("host")?.split(":") ?? [];
  let port = hostnamePort || hostPort;
  // Use req.hostname here as it respects the "trust proxy" setting
  let resolvedHost = `${req.hostname}${port ? `:${port}` : ""}`;
  let url = new URL(`${req.protocol}://${resolvedHost}${req.url}`);

  // Abort action/loaders once we can no longer write a response
  let controller = new AbortController();
  res.on("close", () => controller.abort());

  let init = {
    method: req.method,
    headers: createRemixVueHeaders(req.headers),
    signal: controller.signal,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = node.createReadableStreamFromReadable(req);
    init.duplex = "half";
  }

  return new Request(url.href, init);
}

async function sendRemixVueResponse(res, nodeResponse) {
  res.statusMessage = nodeResponse.statusText;
  res.status(nodeResponse.status);

  for (let [key, value] of nodeResponse.headers.entries()) {
    res.append(key, value);
  }

  if (nodeResponse.headers.get("Content-Type")?.match(/text\/event-stream/i)) {
    res.flushHeaders();
  }

  if (nodeResponse.body) {
    await node.writeReadableStreamToWritable(nodeResponse.body, res);
  } else {
    res.end();
  }
}

exports.createRemixVueHeaders = createRemixVueHeaders;
exports.createRemixVueRequest = createRemixVueRequest;
exports.createRequestHandler = createRequestHandler;
exports.sendRemixVueResponse = sendRemixVueResponse;
//# sourceMappingURL=server.js.map
