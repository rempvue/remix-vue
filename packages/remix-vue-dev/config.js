import { isValidServerMode } from "./config/serverModes";
import { serverBuildVirtualModule } from "./compiler/server/virtualModules";
import path from "node:path";
import fse from "fs-extra";
import PackageJson from "@npmcli/package-json";

export async function resolveConfig(appConfig, { rootDirectory, serverMode }) {
  if (!isValidServerMode(serverMode)) {
    throw new Error(`Invalid server mode "${serverMode}"`);
  }

  let serverBuildPath = path.resolve(
    rootDirectory,
    appConfig.serverBuildPath ?? "build/index.js"
  );
  let serverBuildTargetEntryModule = `export * from ${JSON.stringify(
    serverBuildVirtualModule.id
  )};`;
  let serverConditions = appConfig.serverConditions;
  let serverDependenciesToBundle = appConfig.serverDependenciesToBundle || [];
  let serverEntryPoint = appConfig.server;
  let serverMainFields = appConfig.serverMainFields;
  let serverMinify = appConfig.serverMinify;

  let serverModuleFormat = appConfig.serverModuleFormat || "esm";
  let serverPlatform = appConfig.serverPlatform || "node";
  serverMainFields ??=
    serverModuleFormat === "esm" ? ["module", "main"] : ["main", "module"];
  serverMinify ??= false;

  let serverNodeBuiltinsPolyfill = appConfig.serverNodeBuiltinsPolyfill;
  let browserNodeBuiltinsPolyfill = appConfig.browserNodeBuiltinsPolyfill;
  let mdx = appConfig.mdx;
  let postcss = appConfig.postcss ?? true;
  let tailwind = appConfig.tailwind ?? true;

  let appDirectory = path.resolve(
    rootDirectory,
    appConfig.appDirectory || "app"
  );

  let cacheDirectory = path.resolve(
    rootDirectory,
    appConfig.cacheDirectory || ".cache"
  );

  let defaultsDirectory = path.resolve(__dirname, "config", "defaults");

  let userEntryClientFile = findEntry(appDirectory, "entry.client");
  let userEntryServerFile = findEntry(appDirectory, "entry.server");

  let entryServerFile;
  let entryClientFile = userEntryClientFile || "entry.client.js";

  let pkgJson = await PackageJson.load(rootDirectory);
  let deps = pkgJson.content.dependencies ?? {};

  if (userEntryServerFile) {
    entryServerFile = userEntryServerFile;
  } else {
    let serverRuntime = deps["@remix-vue/deno"]
      ? "deno"
      : deps["@remix-vue/cloudflare"]
      ? "cloudflare"
      : deps["@remix-vue/node"]
      ? "node"
      : undefined;

    if (!deps["isbot"]) {
      console.log(
        "adding `isbot` to your package.json, you should commit this change"
      );

      pkgJson.update({
        dependencies: {
          ...pkgJson.content.dependencies,
          isbot: "latest",
        },
      });

      await pkgJson.save();

      let packageManager = "npm";//detectPackageManager() ?? "npm";

      execSync(`${packageManager} install`, {
        cwd: rootDirectory,
        stdio: "inherit",
      });
    }

    entryServerFile = `entry.server.${serverRuntime}.js`;
  }

  let entryClientFilePath = userEntryClientFile
    ? path.resolve(appDirectory, userEntryClientFile)
    : path.resolve(defaultsDirectory, entryClientFile);

  let entryServerFilePath = userEntryServerFile
    ? path.resolve(appDirectory, userEntryServerFile)
    : path.resolve(defaultsDirectory, entryServerFile);

  let assetsBuildDirectory =
    appConfig.assetsBuildDirectory || path.join("public", "build");

  let absoluteAssetsBuildDirectory = path.resolve(
    rootDirectory,
    assetsBuildDirectory
  );

  let publicPath = addTrailingSlash(appConfig.publicPath || "/build/");

  let rootRouteFile = findEntry(appDirectory, "root");
  if (!rootRouteFile) {
    throw new Error(`Missing "root" route file in ${appDirectory}`);
  }

  let routes = {
    root: { path: "", id: "root", file: rootRouteFile },
  };

  if (fse.existsSync(path.resolve(appDirectory, "routes"))) {
    let fileRoutes = flatRoutes(appDirectory, appConfig.ignoredRouteFiles);
    for (let route of Object.values(fileRoutes)) {
      routes[route.id] = { ...route, parentId: route.parentId || "root" };
    }
  }
  if (appConfig.routes) {
    let manualRoutes = await appConfig.routes(defineRoutes);
    for (let route of Object.values(manualRoutes)) {
      routes[route.id] = { ...route, parentId: route.parentId || "root" };
    }
  }

  let watchPaths = [];
  if (typeof appConfig.watchPaths === "function") {
    let directories = await appConfig.watchPaths();
    watchPaths = watchPaths.concat(
      Array.isArray(directories) ? directories : [directories]
    );
  } else if (appConfig.watchPaths) {
    watchPaths = watchPaths.concat(
      Array.isArray(appConfig.watchPaths)
        ? appConfig.watchPaths
        : [appConfig.watchPaths]
    );
  }

  // When tsconfigPath is undefined, the default "tsconfig.json" is not
  // found in the root directory.
  let tsconfigPath = "";
  let rootTsconfig = path.resolve(rootDirectory, "tsconfig.json");
  let rootJsConfig = path.resolve(rootDirectory, "jsconfig.json");

  if (fse.existsSync(rootTsconfig)) {
    tsconfigPath = rootTsconfig;
  } else if (fse.existsSync(rootJsConfig)) {
    tsconfigPath = rootJsConfig;
  }

  // Note: When a future flag is removed from here, it should be added to the
  // list below, so we can let folks know if they have obsolete flags in their
  // config.  If we ever convert remix.config.js to a TS file, so we get proper
  // typings this won't be necessary anymore.
  let future = {
    fetcherPersist: appConfig.future?.fetcherPersist === true,
  };

  if (appConfig.future) {
    let userFlags = appConfig.future;
    let deprecatedFlags = [
      "unstable_cssModules",
      "unstable_cssSideEffectImports",
      "unstable_dev",
      "unstable_postcss",
      "unstable_tailwind",
      "unstable_vanillaExtract",
      "errorBoundary",
      "headers",
      "meta",
      "normalizeFormMethod",
      "routeConvention",
    ];

    if ("dev" in userFlags) {
      if (userFlags.dev === true) {
        deprecatedFlags.push("dev");
      } else {
        logger.warn("The `dev` future flag is obsolete.", {
          details: [
            "Move your dev options from `future.dev` to `dev` within your `remix.config.js` file",
          ],
        });
      }
    }

    let obsoleteFlags = deprecatedFlags.filter((f) => f in userFlags);
    if (obsoleteFlags.length > 0) {
      logger.warn(
        `The following Remix future flags are now obsolete ` +
          `and can be removed from your remix.config.js file:\n` +
          obsoleteFlags.map((f) => `- ${f}\n`).join("")
      );
    }
  }

  return {
    appDirectory,
    cacheDirectory,
    entryClientFile,
    entryClientFilePath,
    entryServerFile,
    entryServerFilePath,
    dev: appConfig.dev ?? {},
    assetsBuildDirectory: absoluteAssetsBuildDirectory,
    relativeAssetsBuildDirectory: assetsBuildDirectory,
    publicPath,
    rootDirectory,
    routes,
    serverBuildPath,
    serverBuildTargetEntryModule,
    serverConditions,
    serverDependenciesToBundle,
    serverEntryPoint,
    serverMainFields,
    serverMinify,
    serverMode,
    serverModuleFormat,
    serverNodeBuiltinsPolyfill,
    browserNodeBuiltinsPolyfill,
    serverPlatform,
    mdx,
    postcss,
    tailwind,
    watchPaths,
    tsconfigPath,
    future,
  };
}

const entryExts = [".js"];

function findEntry(dir, basename) {
  for (let ext of entryExts) {
    let file = path.resolve(dir, basename + ext);
    console.log(file)
    if (fse.existsSync(file)) return path.relative(dir, file);
  }
  return undefined;
}
function addTrailingSlash(path) {
    return path.endsWith("/") ? path : path + "/";
  }
