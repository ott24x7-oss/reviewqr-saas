const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../../packages/shared");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

// Nested packages (e.g. expo-router's own node_modules) must resolve, so keep
// Metro's normal lookup, but never pull in the web app's root node_modules.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const webNodeModules = path.resolve(projectRoot, "../../node_modules");
config.resolver.blockList = [new RegExp(`^${escapeRegExp(webNodeModules)}[\\\\/].*`)];

config.resolver.extraNodeModules = {
  "@reviewqr/shared": sharedRoot,
  zod: path.resolve(projectRoot, "node_modules/zod")
};

module.exports = config;
