#!/usr/bin/env node
import meow from 'meow'

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

switch (cli.input[0]) {
  case 'dev':
    console.log('dev')
    break
}
