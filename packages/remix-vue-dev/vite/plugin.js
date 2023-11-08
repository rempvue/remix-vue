import pick from "lodash/pick";
import { resolveConfig } from "../config";

import {
  createServer as createViteDevServer,
} from "vite";

const supportedRemixVueConfigKeys = [
  "appDirectory",
  "assetsBuildDirectory",
  "future",
  "ignoredRouteFiles",
  "publicPath",
  "routes",
  "serverBuildPath",
  "serverModuleFormat",
];

export const remixVueVitePlugin = (options = {}) => {
  let viteCommand;
  let viteUserConfig;

  let cssModulesManifest = {};
  let ssrBuildContext;

  let viteChildCompiler;

  let resolvePluginConfig = async () => {
    let rootDirectory =
      viteUserConfig.root ?? process.env.REMIX_ROOT ?? process.cwd();

    let serverMode = viteUserConfig.serverMode ?? "development";

    // Avoid leaking any config options that the Vite plugin doesn't support
    let config = pick(options, supportedRemixVueConfigKeys);

    // Only select the Remix config options that the Vite plugin uses
    let {
      appDirectory,
      assetsBuildDirectory,
      entryClientFilePath,
      publicPath,
      routes,
      entryServerFilePath,
      serverBuildPath,
      serverModuleFormat,
      relativeAssetsBuildDirectory,
    } = await resolveConfig(config, { rootDirectory, serverMode });

    return {
      appDirectory,
      rootDirectory,
      assetsBuildDirectory,
      entryClientFilePath,
      publicPath,
      routes,
      entryServerFilePath,
      serverBuildPath,
      serverModuleFormat,
      relativeAssetsBuildDirectory,
      future: {
        v3_fetcherPersist: options.future?.v3_fetcherPersist === true,
      },
    };
  };

  let getServerEntry = async () => {
    let pluginConfig = await resolvePluginConfig();

    return `
      import * as entryServer from ${JSON.stringify(
        resolveFileUrl(pluginConfig, pluginConfig.entryServerFilePath)
      )};
      ${Object.keys(pluginConfig.routes)
        .map((key, index) => {
          let route = pluginConfig.routes[key];
          return `import * as route${index} from ${JSON.stringify(
            resolveFileUrl(
              pluginConfig,
              resolveRelativeRouteFilePath(route, pluginConfig)
            )
          )};`;
        })
        .join("\n")}
        export { default as assets } from ${JSON.stringify(serverManifestId)};
        export const assetsBuildDirectory = ${JSON.stringify(
          pluginConfig.relativeAssetsBuildDirectory
        )};
        ${
          pluginConfig.future
            ? `export const future = ${JSON.stringify(pluginConfig.future)}`
            : ""
        };
        export const publicPath = ${JSON.stringify(pluginConfig.publicPath)};
        export const entry = { module: entryServer };
        export const routes = {
          ${Object.keys(pluginConfig.routes)
            .map((key, index) => {
              let route = pluginConfig.routes[key];
              return `${JSON.stringify(key)}: {
            id: ${JSON.stringify(route.id)},
            parentId: ${JSON.stringify(route.parentId)},
            path: ${JSON.stringify(route.path)},
            index: ${JSON.stringify(route.index)},
            caseSensitive: ${JSON.stringify(route.caseSensitive)},
            module: route${index}
          }`;
            })
            .join(",\n  ")}
        };`;
  };

  let createBuildManifest = async () => {
    let pluginConfig = await resolvePluginConfig();
    let viteManifest = JSON.parse(
      await fs.readFile(
        path.resolve(pluginConfig.assetsBuildDirectory, "manifest.json"),
        "utf-8"
      )
    );

    let entry = resolveBuildAssetPaths(
      pluginConfig,
      viteManifest,
      pluginConfig.entryClientFilePath
    );

    let routes = {};
    for (let [key, route] of Object.entries(pluginConfig.routes)) {
      let routeFilePath = path.join(pluginConfig.appDirectory, route.file);
      let sourceExports = await getRouteModuleExports(
        viteChildCompiler,
        pluginConfig,
        route.file
      );

      routes[key] = {
        id: route.id,
        parentId: route.parentId,
        path: route.path,
        index: route.index,
        caseSensitive: route.caseSensitive,
        hasAction: sourceExports.includes("action"),
        hasLoader: sourceExports.includes("loader"),
        hasErrorBoundary: sourceExports.includes("ErrorBoundary"),
        ...resolveBuildAssetPaths(pluginConfig, viteManifest, routeFilePath),
      };
    }

    let fingerprintedValues = { entry, routes };
    let version = getHash(JSON.stringify(fingerprintedValues), 8);
    let manifestFilename = `manifest-${version}.js`;
    let url = `${pluginConfig.publicPath}${manifestFilename}`;
    let nonFingerprintedValues = { url, version };

    let manifest = {
      ...fingerprintedValues,
      ...nonFingerprintedValues,
    };

    await writeFileSafe(
      path.join(pluginConfig.assetsBuildDirectory, manifestFilename),
      `window.__remixManifest=${JSON.stringify(manifest)};`
    );

    return manifest;
  };

  let getDevManifest = async () => {
    let pluginConfig = await resolvePluginConfig();
    let routes = {};

    for (let [key, route] of Object.entries(pluginConfig.routes)) {
      let sourceExports = await getRouteModuleExports(
        viteChildCompiler,
        pluginConfig,
        route.file
      );

      routes[key] = {
        id: route.id,
        parentId: route.parentId,
        path: route.path,
        index: route.index,
        caseSensitive: route.caseSensitive,
        module: `${resolveFileUrl(
          pluginConfig,
          resolveRelativeRouteFilePath(route, pluginConfig)
        )}${
          isJsFile(route.file) ? "" : "?import" // Ensure the Vite dev server responds with a JS module
        }`,
        hasAction: sourceExports.includes("action"),
        hasLoader: sourceExports.includes("loader"),
        hasErrorBoundary: sourceExports.includes("ErrorBoundary"),
        imports: [],
      };
    }

    return {
      version: String(Math.random()),
      url: VirtualModule.url(browserManifestId),
      entry: {
        module: resolveFileUrl(pluginConfig, pluginConfig.entryClientFilePath),
        imports: [],
      },
      routes,
    };
  };

  return [
    {
      name: "remix-vue",
      config: async (_viteUserConfig, viteConfigEnv) => {
        viteUserConfig = _viteUserConfig;
        viteCommand = viteConfigEnv.command;

        let pluginConfig = await resolvePluginConfig();

        return {
          appType: "custom",
          experimental: { hmrPartialAccept: true },
          optimizeDeps: {
            include: ["vue"],
          },
          resolve: {
            dedupe: ["vue"],
          },
          ...(viteCommand === "build" && {
            base: pluginConfig.publicPath,
            build: {
              ...viteUserConfig.build,
              ...(!viteConfigEnv.ssrBuild
                ? {
                    manifest: true,
                    outDir: pluginConfig.assetsBuildDirectory,
                    rollupOptions: {
                      ...viteUserConfig.build?.rollupOptions,
                      preserveEntrySignatures: "exports-only",
                      input: [
                        pluginConfig.entryClientFilePath,
                        ...Object.values(pluginConfig.routes).map((route) =>
                          path.resolve(pluginConfig.appDirectory, route.file)
                        ),
                      ],
                    },
                  }
                : {
                    outDir: path.dirname(pluginConfig.serverBuildPath),
                    rollupOptions: {
                      ...viteUserConfig.build?.rollupOptions,
                      preserveEntrySignatures: "exports-only",
                      input: serverEntryId,
                      output: {
                        entryFileNames: path.basename(
                          pluginConfig.serverBuildPath
                        ),
                        format: pluginConfig.serverModuleFormat,
                      },
                    },
                  }),
            },
          }),
        };
      },
      // async configResolved(viteConfig) {
      //   // await initEsModuleLexer;

      //   viteChildCompiler = await createViteDevServer({
      //     ...viteUserConfig,
      //     server: {
      //       ...viteUserConfig.server,
      //       middlewareMode: false,
      //     },
      //     configFile: false,
      //     envFile: false,
      //     plugins: [
      //       ...(viteUserConfig.plugins ?? [])
      //         .flat()
      //         .filter(
      //           (plugin) =>
      //             typeof plugin === "object" &&
      //             plugin !== null &&
      //             "name" in plugin &&
      //             plugin.name !== "remix" &&
      //             plugin.name !== "remix-hmr-updates"
      //         ),
      //       {
      //         name: "no-hmr",
      //         handleHotUpdate() {
      //           return [];
      //         },
      //       },
      //     ],
      //   });
      //   await viteChildCompiler.pluginContainer.buildStart({});

      //   ssrBuildContext =
      //     viteConfig.build.ssr && viteCommand === "build"
      //       ? { isSsrBuild: true, getManifest: createBuildManifest }
      //       : { isSsrBuild: false };
      // },
      // transform(code, id) {
      //   if (isCssModulesFile(id)) {
      //     cssModulesManifest[id] = code;
      //   }
      // },
      // buildStart() {
      //   if (viteCommand === "build") {
      //     showUnstableWarning();
      //   }
      // },
      // configureServer(vite) {
      //   vite.httpServer?.on("listening", () => {
      //     setTimeout(showUnstableWarning, 50);
      //   });
      //   if (vite.config.server.middlewareMode) return;
      //   return () => {
      //     vite.middlewares.use(async (req, res, next) => {
      //       try {
      //         // Invalidate all virtual modules
      //         vmods.forEach((vmod) => {
      //           let mod = vite.moduleGraph.getModuleById(
      //             VirtualModule.resolve(vmod)
      //           );

      //           if (mod) {
      //             vite.moduleGraph.invalidateModule(mod);
      //           }
      //         });

      //         let { url } = req;
      //         let [pluginConfig, build] = await Promise.all([
      //           resolvePluginConfig(),
      //           vite.ssrLoadModule(serverEntryId),
      //         ]);

      //         let handle = createRequestHandler(build, {
      //           mode: "development",
      //           criticalCss: await getStylesForUrl(
      //             vite,
      //             pluginConfig,
      //             cssModulesManifest,
      //             build,
      //             url
      //           ),
      //         });

      //         await handle(req, res);
      //       } catch (error) {
      //         next(error);
      //       }
      //     });
      //   };
      // },
      // async buildEnd() {
      //   await viteChildCompiler?.close();
      // },
    },
  ];
};
