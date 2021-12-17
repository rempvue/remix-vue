import meow from 'meow'

console.log('11111')
const helpText = `
Usage
 $ remix-vue dev [remixVueRoot]
`

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
    break
}
