const path = require("node:path");
const babel = require("@rollup/plugin-babel").default;
const nodeResolve = require("@rollup/plugin-node-resolve").default;
const copy = require("rollup-plugin-copy");
const { name: packageName, version } = require("./package.json");

const {
    createBanner,
    getOutputDir,
    isBareModuleId,
  } = require("../../rollup.utils");

module.exports = function rollup() {
  let sourceDir = "packages/remix-vue-node";
  let outputDir = sourceDir;
  let outputDist = path.join(outputDir, "dist/cjs");

  return [
    {
      input: [`${sourceDir}/index.js`], // 入口文件
      output: {
        banner: createBanner(packageName, version),
        dir: outputDist, // 输出文件
        format: "cjs", // 输出格式 amd / es / cjs / iife / umd / system
        preserveModules: true, // 当format为iife和umd时必须提供，将作为全局变量挂在window(浏览器环境)下：window.A=...
        exports: "named",
        sourcemap: true, // 生成bundle.js.map文件，方便调试
      },
      plugins: [
        // babel({
        //     babelHelpers: "bundled",
        //     exclude: /node_modules/,
        //     extensions: [".js"],
        //   }),
        //   nodeResolve({ extensions: [".js"] }),
        // copy({
        //   targets: [
        //     { src: `${sourceDir}/package.json`, dest: [outputDir, outputDist] },
        //   ],
        // }),
        // {
        //   name: "dynamic-import-polyfill",
        //   renderDynamicImport() {
        //     return {
        //       left: "import(",
        //       right: ")",
        //     };
        //   },
        // },
      ],
    },
  ];
};
