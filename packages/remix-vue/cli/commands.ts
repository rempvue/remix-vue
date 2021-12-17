import { createServer } from 'vite'
import express from 'express'
import { readConfig } from '../config'

export async function dev(remixVueRoot: string, modeArg?: string) {
  // let createApp: typeof createAppType
  // try {
  //   let serve = require('@remix-run/serve')
  //   createApp = serve.createApp
  // } catch (err) {
  //   throw new Error(
  //     'Could not locate @remix-run/serve. Please verify you have it installed to use the dev command.'
  //   )
  // }

  let config = await readConfig(remixVueRoot)
  // let mode = isBuildMode(modeArg) ? modeArg : BuildMode.Development
  // let port = process.env.PORT || 3000

  let app = express()

  const vite = await createServer({
    server: { middlewareMode: 'ssr' },
  })

  app.use(vite.middlewares)

  app.use('*', async (req, res) => {
    console.log('start')
    const { render } = await vite.ssrLoadModule(config.)
  })

  app.listen(3000)

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
