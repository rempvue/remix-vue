/**
 * @remix-vue/dev v0.0.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
'use strict';

var pick = require('lodash/pick');
var config = require('../config.js');
require('vite');

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

const remixVueVitePlugin = (options = {}) => {
  let viteCommand;
  let viteUserConfig;

  let resolvePluginConfig = async () => {
    let rootDirectory =
      viteUserConfig.root ?? process.env.REMIX_ROOT ?? process.cwd();

    let serverMode = viteUserConfig.serverMode ?? "development";

    // Avoid leaking any config options that the Vite plugin doesn't support
    let config$1 = pick(options, supportedRemixVueConfigKeys);

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
    } = await config.resolveConfig(config$1, { rootDirectory, serverMode });

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

exports.remixVueVitePlugin = remixVueVitePlugin;
//# sourceMappingURL=plugin.js.map
