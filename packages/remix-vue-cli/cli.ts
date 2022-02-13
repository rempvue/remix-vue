#!/usr/bin/env node
import meow from 'meow'
import * as commands from './cli/commands'

const helpText = `
Usage
 $ remix-vue dev [remixVueRoot]
`
console.log(helpText)
const cli = meow(helpText, {
  autoHelp: true,
  autoVersion: false,
  description: false,
  flags: {
    version: {
      type: 'boolean',
      alias: 'v',
    },
    json: {
      type: 'boolean',
    },
    sourcemap: {
      type: 'boolean',
    },
  },
})

if (cli.flags.version) {
  cli.showVersion()
}

function handleError(error: Error) {
  console.error(error.message)
  process.exit(1)
}

switch (cli.input[0]) {
  case 'dev':
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development'
    commands.dev(cli.input[1], process.env.NODE_ENV).catch(handleError)
    break
}
