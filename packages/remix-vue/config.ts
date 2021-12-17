import * as fs from 'fs'
import * as path from 'path'
import { ServerMode } from './config/serverModes'

export interface AppConfig {
  appDirectory?: string

  publicPatch?: string

  devServerPort?: number
}

export async function readConfig(remixVueRoot?: string, serverMode = ServerMode.Production) {
  if (!remixVueRoot) {
    remixVueRoot = process.env.REMIX_VUE_ROOT || process.cwd()
  }

  let rootDirectory = path.resolve(remixVueRoot)
  let configFile = path.resolve(rootDirectory, 'remix-vue.config.js')

  let appConfig: AppConfig
  try {
    appConfig = require(configFile)
  } catch (error) {
    throw new Error(`Error loading Remix config in ${configFile}`)
  }

  let appDirectory = path.resolve(rootDirectory, appConfig.appDirectory || 'app')

  return {
    appDirectory,
  }
}
