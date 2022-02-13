import { createServer } from 'vite'
import express from 'express'
import { readConfig } from '../config'
const fs = require('fs')
const path = require('path')

export async function dev(remixVueRoot: string, modeArg?: string) {
  let config = await readConfig(remixVueRoot)

  // let mode = isBuildMode(modeArg) ? modeArg : BuildMode.Development
  // let port = process.env.PORT || 3000

  const app = express()

  const vite = await createServer({
    server: { middlewareMode: 'ssr' },
  })

  app.use(vite.middlewares)

  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl
      // 1. 读取 index.html
      let template = fs.readFileSync(path.resolve(config.publicDirectory, 'index.html'), 'utf-8')

      // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
      //    同时也会从 Vite 插件应用 HTML 转换。
      //    例如：@vitejs/plugin-react 中的 global preambles
      template = await vite.transformIndexHtml(url, template)

      const { render } = await vite.ssrLoadModule(config.publicDirectory + '/entry-server.js')

      // 4. 渲染应用的 HTML。这假设 entry-server.js 导出的 `render`
      //    函数调用了适当的 SSR 框架 API。
      //    例如 ReactDOMServer.renderToString()
      const appHtml = await render(url)

      // 5. 注入渲染后的应用程序 HTML 到模板中。
      const html = template.replace(`<!--ssr-outlet-->`, appHtml)

      // 6. 返回渲染后的 HTML。
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      // 如果捕获到了一个错误，让 Vite 来修复该堆栈，这样它就可以映射回
      // 你的实际源码中。
      vite.ssrFixStacktrace(e)
      console.error(e)
      res.status(500).end(e.message)
    }
  })
  console.log('加载中')
  app.listen(3000)
  console.log('网站地址：http://localhost:3000')
  // app.use((_, __, next) => {
  //   purgeAppRequireCache(config.serverBuildDirectory)
  //   next()
  // })
  // app.use(createApp(config.serverBuildDirectory, mode))

  // let server: Server | null = null

  // try {
  //   await watch(config, mode, {
  //     onInitialBuild: () => {
  //       server = app.listen(port, () => {
  //         console.log(`Remix App Server started at http://localhost:${port}`)
  //       })
  //     },
  //   })
  // } finally {
  //   server!?.close()
  // }
}
