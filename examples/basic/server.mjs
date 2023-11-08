import {
  unstable_createViteServer,
  unstable_loadViteServerBuild,
} from "@remix-vue/dev";
import {createRequestHandler} from "@remix-vue/express";
import fs from 'fs'
import path from 'path'

// import { installGlobals } from "@remix-run/node";
import express from "express";

// installGlobals();

const vite =
  process.env.NODE_ENV === "production"
    ? undefined
    : await unstable_createViteServer();

const app = express();
// handle asset requests
if (vite) {
  app.use(vite.middlewares);
} else {
  app.use(
    "/build",
    express.static("public/build", {
      immutable: true,
      maxAge: "1y",
    })
  );
}
app.use(express.static("public", { maxAge: "1h" }));

// handle SSR requests
// app.all(
//   "*",
//   createRequestHandler({
//     build: vite
//       ? () => unstable_loadViteServerBuild(vite)
//       : await import("./build/index.js"),
//   })
// );

app.use('*', async (req, res, next) => {
  try {
    const url = req.originalUrl

    let template
    template = fs.readFileSync(path.resolve('./public/index.html'), 'utf-8')
    template = await vite.transformIndexHtml(url, template)
    const render = (await vite.ssrLoadModule('./app.js')).render
 // 返回当前模块的 URL 路径的 dirname
 const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const appHtml = await render(url, __dirname)

    const html = template.replace(`<!--app-html-->`, appHtml)

    res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
  } catch (e) {
    vite && vite.ssrFixStacktrace(e)
    res.status(500).end(e.stack)
  }
})

const listen = (port) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)
    const duration = 2000 // 重试间隔
    let left = 5 // 重试次数
    let showErrMsg = true

    server.on('listening', () => {
      resolve(`app listening at http://localhost:${port}`)
    })
    server.on('error', (error) => {
      if (error.code !== 'EADDRINUSE') { // 系统非监听端口操作报错
        console.error(error.code,error.message)
      }

      left = left + 1
      if (showErrMsg) {
        console.log(`port ${port} already in use`)
        showErrMsg = false
      }
      port = port + 1;
      console.log(`trying to restart the service on port ${port}... attempts left ${left} `)
      if (left !== 0) {
        setTimeout(() => server.listen(port), duration)
      } else {
        reject('Server is shutting down')
      }
    })
  })
}

const port = 13000;
await listen(port);


