import { id } from "./vmod.js";
import vite from "vite";

export const unstable_vitePlugin = (...args) => {
  let { remixVueVitePlugin } = require("./plugin");
  return remixVueVitePlugin(...args);
};

export const unstable_createViteServer = async () => {
  let vite = await import("vite");
  return vite.createServer({
    server: {
      middlewareMode: true,
    },
  });
};

export const unstable_loadViteServerBuild = async(vite) => {
  return vite.ssrLoadModule("entry.server.js");
};
