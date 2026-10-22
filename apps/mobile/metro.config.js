const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../../packages/shared");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  "@reviewqr/shared": sharedRoot,
  zod: path.resolve(projectRoot, "node_modules/zod")
};

module.exports = config;
