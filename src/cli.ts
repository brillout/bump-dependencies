import 'source-map-support/register.js'
import { bumpDependencies, type PackageToBump } from './bumpDependencies.js'
import { readPackageJson, runCommand, type GlobFilter } from './utils/index.js'
import path from 'path'
const __filename = new URL('', import.meta.url).pathname
const __dirname = path.dirname(__filename)

initPromiseRejectionHandler()
cli()

async function cli() {
  const { globFilter, packagesToBump } = await parseCliArgs()
  bumpDependencies(packagesToBump, globFilter)
}

async function parseCliArgs() {
  const globFilter: GlobFilter = {
    include: [],
    exclude: [],
  }
  const packagesToBump: PackageToBump[] = []

  let isGlobFilter: undefined | '--include' | '--exclude'
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('-')) {
      if (arg === '--include') {
        isGlobFilter = '--include'
      } else if (arg === '--exclude') {
        isGlobFilter = '--exclude'
      } else if (arg === '--version' || arg === '-v') {
        const { version } = readPackageJson(path.join(__dirname, '../package.json'))
        console.log(version!)
        process.exit(1)
      } else if (arg === '--help' || arg === '-h') {
        showHelp()
        process.exit(1)
      } else {
        console.error('Unknown option ' + arg)
        showHelp()
        process.exit(1)
      }
    } else {
      if (isGlobFilter) {
        const bucket = isGlobFilter === '--include' ? 'include' : 'exclude'
        globFilter[bucket].push(arg)
      } else {
        packagesToBump.push(await parsePackageToBump(arg))
      }
    }
  }

  return {
    globFilter,
    packagesToBump,
  }
}

async function parsePackageToBump(packageArg: string): Promise<PackageToBump> {
  let [packageName, packageVersion] = packageArg.split('@')
  if (!packageVersion) {
    const stdout = await runCommand(`pnpm show ${packageName} version`, { timeout: 20 * 1000 })
    packageVersion = '^' + stdout.trim()
  }
  return { packageName, packageVersion }
}

function initPromiseRejectionHandler() {
  process.on('unhandledRejection', function (err) {
    console.error(err)
    process.exit(1)
  })
}

function showHelp() {
  console.log(
    [
      'Usage:',
      '  $ bump                      # Bump all dependencies of all the package.json files in the entire monorepo',
      '  $ bump vite                 # Bump all dependency to the `vite` package to its latest version',
      '  $ bump vite@^6.0.5          # Bump all dependency to the `vite` package to `^6.0.5`',
      "  $ bump --include examples   # Only touch package.json files that contain 'examples' in their path",
      "  $ bump --exclude examples   # Only touch package.json files that don't contain 'examples' in their path",
    ].join('\n'),
  )
}
