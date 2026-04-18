const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// Custom resolver to handle @/ path alias (works for both native and web)
const srcRoot = path.resolve(projectRoot, "src");
const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];

function resolveWithExtensions(basePath) {
  // Try exact path first (if it already has an extension)
  if (fs.existsSync(basePath)) {
    const stat = fs.statSync(basePath);
    if (stat.isFile()) return basePath;
    // If it's a directory, try index files
    for (const ext of extensions) {
      const indexPath = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexPath)) return indexPath;
    }
  }
  // Try appending extensions
  for (const ext of extensions) {
    const filePath = basePath + ext;
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Rewrite @/ imports to absolute src/ paths
  if (moduleName.startsWith("@/")) {
    const targetPath = path.resolve(srcRoot, moduleName.slice(2));
    const resolved = resolveWithExtensions(targetPath);
    if (resolved) {
      return { type: "sourceFile", filePath: resolved };
    }
  }
  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/styles/global.css" });
