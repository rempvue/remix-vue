import path from "node:path";
import fse from "fs-extra";
import chalk from 'chalk';

const ROOT_DIR = process.cwd();
const PACKAGES_PATH = path.join(ROOT_DIR, "packages");
const DEFAULT_BUILD_PATH = path.join(ROOT_DIR, "build");

let activeOutputDir = DEFAULT_BUILD_PATH;
if (process.env.LOCAL_BUILD_DIRECTORY) {
    let appDir = path.resolve(process.env.LOCAL_BUILD_DIRECTORY);
    try {
      fse.readdirSync(path.join(appDir, "node_modules"));
    } catch {
      console.error(
        "Oops! You pointed `LOCAL_BUILD_DIRECTORY` to a directory that " +
          "does not have a `node_modules` folder. Please `npm install` in that " +
          "directory and try again."
      );
      process.exit(1);
    }
    activeOutputDir = appDir;
  }

copyBuildToDist();

async function copyBuildToDist() {
  let buildPath = getBuildPath();
  let packages = (await getPackageBuildPaths(buildPath)).map((buildDir) => {
    let parentDir = path.basename(path.dirname(buildDir));
    let dirName = path.basename(buildDir);
    return {
      build: buildDir,
      src: path.join(
        PACKAGES_PATH,
        parentDir === "@remix-vue" ? `remix-${dirName}` : dirName
      ),
    };
  });

  console.log(packages)

  console.log(
    chalk.green(
      "  ✅ Successfully copied build files to package dist directories!"
    )
  );
}

async function getPackageBuildPaths(moduleRootDir) {
    /** @type {string[]} */
    let packageBuilds = [];
  
    try {
      for (let fileName of await fse.readdir(moduleRootDir)) {
        let moduleDir = path.join(moduleRootDir, fileName);
        if (!(await fse.stat(moduleDir)).isDirectory()) {
          continue;
        }
        if (path.basename(moduleDir) === "@remix-vue") {
          packageBuilds.push(...(await getPackageBuildPaths(moduleDir)));
        } else if (
          /node_modules[/\\]@remix-run[/\\]/.test(moduleDir) ||
          /node_modules[/\\]create-remix/.test(moduleDir) ||
          /node_modules[/\\]remix/.test(moduleDir)
        ) {
          packageBuilds.push(moduleDir);
        }
      }
      return packageBuilds;
    } catch (_) {
        console.log(_)
      console.error(
        "No build files found. Run `yarn build` before running this script."
      );
      process.exit(1);
    }
  }

function getBuildPath() {
  return path.join(activeOutputDir, "node_modules");
}
