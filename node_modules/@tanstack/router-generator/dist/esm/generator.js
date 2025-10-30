import path from "node:path";
import * as fsp from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import crypto from "node:crypto";
import { rootRouteId } from "@tanstack/router-core";
import { logging } from "./logger.js";
import { getRouteNodes as getRouteNodes$1, isVirtualConfigFile } from "./filesystem/physical/getRouteNodes.js";
import { getRouteNodes } from "./filesystem/virtual/getRouteNodes.js";
import { rootPathId } from "./filesystem/physical/rootPathId.js";
import { multiSortBy, format, getImportForRouteNode, isRouteNodeValidForAugmentation, buildRouteTreeConfig, findParent, replaceBackslash, removeExt, createRouteNodesByFullPath, createRouteNodesByTo, createRouteNodesById, getResolvedRouteNodeVariableName, buildFileRoutesByPathInterface, checkRouteFullPathUniqueness, mergeImportDeclarations, buildImportString, checkFileExists, resetRegex, hasParentRoute, determineNodePath, trimPathLeft, removeGroups, removeLeadingUnderscores, removeLayoutSegments, removeUnderscores, removeTrailingSlash, removeLastSegmentFromPath, routePathToVariable, getImportPath } from "./utils.js";
import { getTargetTemplate, fillTemplate } from "./template.js";
import { transform } from "./transform/transform.js";
const DefaultFileSystem = {
  stat: async (filePath) => {
    const res = await fsp.stat(filePath, { bigint: true });
    return {
      mtimeMs: res.mtimeMs,
      mode: Number(res.mode),
      uid: Number(res.uid),
      gid: Number(res.gid)
    };
  },
  rename: (oldPath, newPath) => fsp.rename(oldPath, newPath),
  writeFile: (filePath, content) => fsp.writeFile(filePath, content),
  readFile: async (filePath) => {
    try {
      const fileHandle = await fsp.open(filePath, "r");
      const stat = await fileHandle.stat({ bigint: true });
      const fileContent = (await fileHandle.readFile()).toString();
      await fileHandle.close();
      return { stat, fileContent };
    } catch (e) {
      if ("code" in e) {
        if (e.code === "ENOENT") {
          return "file-not-existing";
        }
      }
      throw e;
    }
  },
  chmod: (filePath, mode) => fsp.chmod(filePath, mode),
  chown: (filePath, uid, gid) => fsp.chown(filePath, uid, gid)
};
function rerun(opts) {
  const { event, ...rest } = opts;
  return { rerun: true, event: event ?? { type: "rerun" }, ...rest };
}
function isRerun(result) {
  return typeof result === "object" && result !== null && "rerun" in result && result.rerun === true;
}
const _Generator = class _Generator {
  constructor(opts) {
    this.routeNodeCache = /* @__PURE__ */ new Map();
    this.routeNodeShadowCache = /* @__PURE__ */ new Map();
    this.fileEventQueue = [];
    this.plugins = [];
    this.physicalDirectories = [];
    this.config = opts.config;
    this.logger = logging({ disabled: this.config.disableLogging });
    this.root = opts.root;
    this.fs = opts.fs || DefaultFileSystem;
    this.generatedRouteTreePath = this.getGeneratedRouteTreePath();
    this.targetTemplate = getTargetTemplate(this.config);
    this.routesDirectoryPath = this.getRoutesDirectoryPath();
    this.plugins.push(...opts.config.plugins || []);
    for (const plugin of this.plugins) {
      plugin.init?.({ generator: this });
    }
  }
  getGeneratedRouteTreePath() {
    const generatedRouteTreePath = path.isAbsolute(
      this.config.generatedRouteTree
    ) ? this.config.generatedRouteTree : path.resolve(this.root, this.config.generatedRouteTree);
    const generatedRouteTreeDir = path.dirname(generatedRouteTreePath);
    if (!existsSync(generatedRouteTreeDir)) {
      mkdirSync(generatedRouteTreeDir, { recursive: true });
    }
    return generatedRouteTreePath;
  }
  getRoutesDirectoryPath() {
    return path.isAbsolute(this.config.routesDirectory) ? this.config.routesDirectory : path.resolve(this.root, this.config.routesDirectory);
  }
  getRoutesByFileMap() {
    return new Map(
      [...this.routeNodeCache.entries()].map(([filePath, cacheEntry]) => [
        filePath,
        { routePath: cacheEntry.routeId }
      ])
    );
  }
  async run(event) {
    if (event && event.type !== "rerun" && !this.isFileRelevantForRouteTreeGeneration(event.path)) {
      return;
    }
    this.fileEventQueue.push(event ?? { type: "rerun" });
    if (this.runPromise) {
      return this.runPromise;
    }
    this.runPromise = (async () => {
      do {
        const tempQueue = this.fileEventQueue;
        this.fileEventQueue = [];
        const remainingEvents = (await Promise.all(
          tempQueue.map(async (e) => {
            if (e.type === "update") {
              let cacheEntry;
              if (e.path === this.generatedRouteTreePath) {
                cacheEntry = this.routeTreeFileCache;
              } else {
                cacheEntry = this.routeNodeCache.get(e.path);
              }
              const change = await this.didFileChangeComparedToCache(
                { path: e.path },
                cacheEntry
              );
              if (change.result === false) {
                return null;
              }
            }
            return e;
          })
        )).filter((e) => e !== null);
        if (remainingEvents.length === 0) {
          break;
        }
        try {
          await this.generatorInternal();
        } catch (err) {
          const errArray = !Array.isArray(err) ? [err] : err;
          const recoverableErrors = errArray.filter((e) => isRerun(e));
          if (recoverableErrors.length === errArray.length) {
            this.fileEventQueue.push(...recoverableErrors.map((e) => e.event));
            recoverableErrors.forEach((e) => {
              if (e.msg) {
                this.logger.info(e.msg);
              }
            });
          } else {
            const unrecoverableErrors = errArray.filter((e) => !isRerun(e));
            this.runPromise = void 0;
            throw new Error(
              unrecoverableErrors.map((e) => e.message).join()
            );
          }
        }
      } while (this.fileEventQueue.length);
      this.runPromise = void 0;
    })();
    return this.runPromise;
  }
  async generatorInternal() {
    let writeRouteTreeFile = false;
    let getRouteNodesResult;
    if (this.config.virtualRouteConfig) {
      getRouteNodesResult = await getRouteNodes(this.config, this.root);
    } else {
      getRouteNodesResult = await getRouteNodes$1(this.config, this.root);
    }
    const {
      rootRouteNode,
      routeNodes: beforeRouteNodes,
      physicalDirectories
    } = getRouteNodesResult;
    if (rootRouteNode === void 0) {
      let errorMessage = `rootRouteNode must not be undefined. Make sure you've added your root route into the route-tree.`;
      if (!this.config.virtualRouteConfig) {
        errorMessage += `
Make sure that you add a "${rootPathId}.${this.config.disableTypes ? "js" : "tsx"}" file to your routes directory.
Add the file in: "${this.config.routesDirectory}/${rootPathId}.${this.config.disableTypes ? "js" : "tsx"}"`;
      }
      throw new Error(errorMessage);
    }
    this.physicalDirectories = physicalDirectories;
    await this.handleRootNode(rootRouteNode);
    const preRouteNodes = multiSortBy(beforeRouteNodes, [
      (d) => d.routePath === "/" ? -1 : 1,
      (d) => d.routePath?.split("/").length,
      (d) => d.filePath.match(new RegExp(`[./]${this.config.indexToken}[.]`)) ? 1 : -1,
      (d) => d.filePath.match(
        /[./](component|errorComponent|pendingComponent|loader|lazy)[.]/
      ) ? 1 : -1,
      (d) => d.filePath.match(new RegExp(`[./]${this.config.routeToken}[.]`)) ? -1 : 1,
      (d) => d.routePath?.endsWith("/") ? -1 : 1,
      (d) => d.routePath
    ]).filter((d) => ![`/${rootPathId}`].includes(d.routePath || ""));
    const routeFileAllResult = await Promise.allSettled(
      preRouteNodes.filter((n) => !n.isVirtualParentRoute && !n.isVirtual).map((n) => this.processRouteNodeFile(n))
    );
    const rejections = routeFileAllResult.filter(
      (result) => result.status === "rejected"
    );
    if (rejections.length > 0) {
      throw rejections.map((e) => e.reason);
    }
    const routeFileResult = routeFileAllResult.flatMap((result) => {
      if (result.status === "fulfilled" && result.value !== null) {
        if (result.value.shouldWriteTree) {
          writeRouteTreeFile = true;
        }
        return result.value.node;
      }
      return [];
    });
    routeFileResult.forEach((r) => r.children = void 0);
    const acc = {
      routeTree: [],
      routeNodes: [],
      routePiecesByPath: {}
    };
    for (const node of routeFileResult) {
      _Generator.handleNode(node, acc, this.config);
    }
    this.crawlingResult = { rootRouteNode, routeFileResult, acc };
    if (!this.routeTreeFileCache) {
      const routeTreeFile = await this.fs.readFile(this.generatedRouteTreePath);
      if (routeTreeFile !== "file-not-existing") {
        this.routeTreeFileCache = {
          fileContent: routeTreeFile.fileContent,
          mtimeMs: routeTreeFile.stat.mtimeMs
        };
      }
      writeRouteTreeFile = true;
    } else {
      const routeTreeFileChange = await this.didFileChangeComparedToCache(
        { path: this.generatedRouteTreePath },
        this.routeTreeFileCache
      );
      if (routeTreeFileChange.result !== false) {
        writeRouteTreeFile = "force";
        if (routeTreeFileChange.result === true) {
          const routeTreeFile = await this.fs.readFile(
            this.generatedRouteTreePath
          );
          if (routeTreeFile !== "file-not-existing") {
            this.routeTreeFileCache = {
              fileContent: routeTreeFile.fileContent,
              mtimeMs: routeTreeFile.stat.mtimeMs
            };
          }
        }
      }
    }
    if (!writeRouteTreeFile) {
      if (this.routeNodeCache.size !== this.routeNodeShadowCache.size) {
        writeRouteTreeFile = true;
      } else {
        for (const fullPath of this.routeNodeCache.keys()) {
          if (!this.routeNodeShadowCache.has(fullPath)) {
            writeRouteTreeFile = true;
            break;
          }
        }
      }
    }
    if (!writeRouteTreeFile) {
      this.swapCaches();
      return;
    }
    const buildResult = this.buildRouteTree({
      rootRouteNode,
      acc,
      routeFileResult
    });
    let routeTreeContent = buildResult.routeTreeContent;
    routeTreeContent = this.config.enableRouteTreeFormatting ? await format(routeTreeContent, this.config) : routeTreeContent;
    let newMtimeMs;
    if (this.routeTreeFileCache) {
      if (writeRouteTreeFile !== "force" && this.routeTreeFileCache.fileContent === routeTreeContent) ;
      else {
        const newRouteTreeFileStat = await this.safeFileWrite({
          filePath: this.generatedRouteTreePath,
          newContent: routeTreeContent,
          strategy: {
            type: "mtime",
            expectedMtimeMs: this.routeTreeFileCache.mtimeMs
          }
        });
        newMtimeMs = newRouteTreeFileStat.mtimeMs;
      }
    } else {
      const newRouteTreeFileStat = await this.safeFileWrite({
        filePath: this.generatedRouteTreePath,
        newContent: routeTreeContent,
        strategy: {
          type: "new-file"
        }
      });
      newMtimeMs = newRouteTreeFileStat.mtimeMs;
    }
    if (newMtimeMs !== void 0) {
      this.routeTreeFileCache = {
        fileContent: routeTreeContent,
        mtimeMs: newMtimeMs
      };
    }
    this.plugins.map((plugin) => {
      return plugin.onRouteTreeChanged?.({
        routeTree: buildResult.routeTree,
        routeNodes: buildResult.routeNodes,
        acc,
        rootRouteNode
      });
    });
    this.swapCaches();
  }
  swapCaches() {
    this.routeNodeCache = this.routeNodeShadowCache;
    this.routeNodeShadowCache = /* @__PURE__ */ new Map();
  }
  buildRouteTree(opts) {
    const config = { ...this.config, ...opts.config || {} };
    const { rootRouteNode, acc } = opts;
    const sortedRouteNodes = multiSortBy(acc.routeNodes, [
      (d) => d.routePath?.includes(`/${rootPathId}`) ? -1 : 1,
      (d) => d.routePath?.split("/").length,
      (d) => d.routePath?.endsWith(config.indexToken) ? -1 : 1,
      (d) => d
    ]);
    const routeImports = sortedRouteNodes.filter((d) => !d.isVirtual).flatMap(
      (node) => getImportForRouteNode(
        node,
        config,
        this.generatedRouteTreePath,
        this.root
      )
    );
    const virtualRouteNodes = sortedRouteNodes.filter((d) => d.isVirtual).map((node) => {
      return `const ${node.variableName}RouteImport = createFileRoute('${node.routePath}')()`;
    });
    const imports = [];
    if (acc.routeNodes.some((n) => n.isVirtual)) {
      imports.push({
        specifiers: [{ imported: "createFileRoute" }],
        source: this.targetTemplate.fullPkg
      });
    }
    if (config.verboseFileRoutes === false) {
      const typeImport = {
        specifiers: [],
        source: this.targetTemplate.fullPkg,
        importKind: "type"
      };
      if (sortedRouteNodes.some(
        (d) => isRouteNodeValidForAugmentation(d) && d._fsRouteType !== "lazy"
      )) {
        typeImport.specifiers.push({ imported: "CreateFileRoute" });
      }
      if (sortedRouteNodes.some(
        (node) => acc.routePiecesByPath[node.routePath]?.lazy && isRouteNodeValidForAugmentation(node)
      )) {
        typeImport.specifiers.push({ imported: "CreateLazyFileRoute" });
      }
      if (typeImport.specifiers.length > 0) {
        typeImport.specifiers.push({ imported: "FileRoutesByPath" });
        imports.push(typeImport);
      }
    }
    const routeTreeConfig = buildRouteTreeConfig(
      acc.routeTree,
      config.disableTypes
    );
    const createUpdateRoutes = sortedRouteNodes.map((node) => {
      const loaderNode = acc.routePiecesByPath[node.routePath]?.loader;
      const componentNode = acc.routePiecesByPath[node.routePath]?.component;
      const errorComponentNode = acc.routePiecesByPath[node.routePath]?.errorComponent;
      const pendingComponentNode = acc.routePiecesByPath[node.routePath]?.pendingComponent;
      const lazyComponentNode = acc.routePiecesByPath[node.routePath]?.lazy;
      return [
        [
          `const ${node.variableName}Route = ${node.variableName}RouteImport.update({
            ${[
            `id: '${node.path}'`,
            !node.isNonPath ? `path: '${node.cleanedPath}'` : void 0,
            `getParentRoute: () => ${findParent(node)}`
          ].filter(Boolean).join(",")}
          }${config.disableTypes ? "" : "as any"})`,
          loaderNode ? `.updateLoader({ loader: lazyFn(() => import('./${replaceBackslash(
            removeExt(
              path.relative(
                path.dirname(config.generatedRouteTree),
                path.resolve(config.routesDirectory, loaderNode.filePath)
              ),
              config.addExtensions
            )
          )}'), 'loader') })` : "",
          componentNode || errorComponentNode || pendingComponentNode ? `.update({
                ${[
            ["component", componentNode],
            ["errorComponent", errorComponentNode],
            ["pendingComponent", pendingComponentNode]
          ].filter((d) => d[1]).map((d) => {
            return `${d[0]}: lazyRouteComponent(() => import('./${replaceBackslash(
              removeExt(
                path.relative(
                  path.dirname(config.generatedRouteTree),
                  path.resolve(config.routesDirectory, d[1].filePath)
                ),
                config.addExtensions
              )
            )}'), '${d[0]}')`;
          }).join("\n,")}
              })` : "",
          lazyComponentNode ? `.lazy(() => import('./${replaceBackslash(
            removeExt(
              path.relative(
                path.dirname(config.generatedRouteTree),
                path.resolve(
                  config.routesDirectory,
                  lazyComponentNode.filePath
                )
              ),
              config.addExtensions
            )
          )}').then((d) => d.Route))` : ""
        ].join("")
      ].join("\n\n");
    });
    let fileRoutesByPathInterface = "";
    let fileRoutesByFullPath = "";
    if (!config.disableTypes) {
      fileRoutesByFullPath = [
        `export interface FileRoutesByFullPath {
${[...createRouteNodesByFullPath(acc.routeNodes, config).entries()].filter(([fullPath]) => fullPath).map(([fullPath, routeNode]) => {
          return `'${fullPath}': typeof ${getResolvedRouteNodeVariableName(routeNode)}`;
        })}
}`,
        `export interface FileRoutesByTo {
${[...createRouteNodesByTo(acc.routeNodes, config).entries()].filter(([to]) => to).map(([to, routeNode]) => {
          return `'${to}': typeof ${getResolvedRouteNodeVariableName(routeNode)}`;
        })}
}`,
        `export interface FileRoutesById {
'${rootRouteId}': typeof rootRouteImport,
${[...createRouteNodesById(acc.routeNodes).entries()].map(([id, routeNode]) => {
          return `'${id}': typeof ${getResolvedRouteNodeVariableName(routeNode)}`;
        })}
}`,
        `export interface FileRouteTypes {
fileRoutesByFullPath: FileRoutesByFullPath
fullPaths: ${acc.routeNodes.length > 0 ? [...createRouteNodesByFullPath(acc.routeNodes, config).keys()].filter((fullPath) => fullPath).map((fullPath) => `'${fullPath}'`).join("|") : "never"}
fileRoutesByTo: FileRoutesByTo
to: ${acc.routeNodes.length > 0 ? [...createRouteNodesByTo(acc.routeNodes, config).keys()].filter((to) => to).map((to) => `'${to}'`).join("|") : "never"}
id: ${[`'${rootRouteId}'`, ...[...createRouteNodesById(acc.routeNodes).keys()].map((id) => `'${id}'`)].join("|")}
fileRoutesById: FileRoutesById
}`,
        `export interface RootRouteChildren {
${acc.routeTree.map((child) => `${child.variableName}Route: typeof ${getResolvedRouteNodeVariableName(child)}`).join(",")}
}`
      ].join("\n");
      fileRoutesByPathInterface = buildFileRoutesByPathInterface({
        module: this.targetTemplate.fullPkg,
        interfaceName: "FileRoutesByPath",
        routeNodes: sortedRouteNodes,
        config
      });
    }
    const routeTree = [
      `const rootRouteChildren${config.disableTypes ? "" : `: RootRouteChildren`} = {
  ${acc.routeTree.map(
        (child) => `${child.variableName}Route: ${getResolvedRouteNodeVariableName(child)}`
      ).join(",")}
}`,
      `export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)${config.disableTypes ? "" : `._addFileTypes<FileRouteTypes>()`}`
    ].join("\n");
    checkRouteFullPathUniqueness(
      sortedRouteNodes.filter(
        (d) => d.children === void 0 && "lazy" !== d._fsRouteType
      ),
      config
    );
    let mergedImports = mergeImportDeclarations(imports);
    if (config.disableTypes) {
      mergedImports = mergedImports.filter((d) => d.importKind !== "type");
    }
    const importStatements = mergedImports.map(buildImportString);
    let moduleAugmentation = "";
    if (config.verboseFileRoutes === false && !config.disableTypes) {
      moduleAugmentation = opts.routeFileResult.map((node) => {
        const getModuleDeclaration = (routeNode) => {
          if (!isRouteNodeValidForAugmentation(routeNode)) {
            return "";
          }
          let moduleAugmentation2 = "";
          if (routeNode._fsRouteType === "lazy") {
            moduleAugmentation2 = `const createLazyFileRoute: CreateLazyFileRoute<FileRoutesByPath['${routeNode.routePath}']['preLoaderRoute']>`;
          } else {
            moduleAugmentation2 = `const createFileRoute: CreateFileRoute<'${routeNode.routePath}',
                  FileRoutesByPath['${routeNode.routePath}']['parentRoute'],
                  FileRoutesByPath['${routeNode.routePath}']['id'],
                  FileRoutesByPath['${routeNode.routePath}']['path'],
                  FileRoutesByPath['${routeNode.routePath}']['fullPath']
                >
              `;
          }
          return `declare module './${getImportPath(routeNode, config, this.generatedRouteTreePath)}' {
                      ${moduleAugmentation2}
                    }`;
        };
        return getModuleDeclaration(node);
      }).join("\n");
    }
    const rootRouteImport = getImportForRouteNode(
      rootRouteNode,
      config,
      this.generatedRouteTreePath,
      this.root
    );
    routeImports.unshift(rootRouteImport);
    let footer = [];
    if (config.routeTreeFileFooter) {
      if (Array.isArray(config.routeTreeFileFooter)) {
        footer = config.routeTreeFileFooter;
      } else {
        footer = config.routeTreeFileFooter();
      }
    }
    const routeTreeContent = [
      ...config.routeTreeFileHeader,
      `// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.`,
      [...importStatements].join("\n"),
      mergeImportDeclarations(routeImports).map(buildImportString).join("\n"),
      virtualRouteNodes.join("\n"),
      createUpdateRoutes.join("\n"),
      fileRoutesByFullPath,
      fileRoutesByPathInterface,
      moduleAugmentation,
      routeTreeConfig.join("\n"),
      routeTree,
      ...footer
    ].filter(Boolean).join("\n\n");
    return {
      routeTreeContent,
      routeTree: acc.routeTree,
      routeNodes: acc.routeNodes
    };
  }
  async processRouteNodeFile(node) {
    const result = await this.isRouteFileCacheFresh(node);
    if (result.status === "fresh") {
      return {
        node: result.cacheEntry.node,
        shouldWriteTree: false,
        cacheEntry: result.cacheEntry
      };
    }
    const previousCacheEntry = result.cacheEntry;
    const existingRouteFile = await this.fs.readFile(node.fullPath);
    if (existingRouteFile === "file-not-existing") {
      throw new Error(`⚠️ File ${node.fullPath} does not exist`);
    }
    const updatedCacheEntry = {
      fileContent: existingRouteFile.fileContent,
      mtimeMs: existingRouteFile.stat.mtimeMs,
      routeId: node.routePath ?? "$$TSR_NO_ROUTE_PATH_ASSIGNED$$",
      node
    };
    const escapedRoutePath = node.routePath?.replaceAll("$", "$$") ?? "";
    let shouldWriteRouteFile = false;
    let shouldWriteTree = false;
    if (!existingRouteFile.fileContent) {
      shouldWriteRouteFile = true;
      shouldWriteTree = true;
      if (node._fsRouteType === "lazy") {
        const tLazyRouteTemplate = this.targetTemplate.lazyRoute;
        updatedCacheEntry.fileContent = await fillTemplate(
          this.config,
          (this.config.customScaffolding?.lazyRouteTemplate || this.config.customScaffolding?.routeTemplate) ?? tLazyRouteTemplate.template(),
          {
            tsrImports: tLazyRouteTemplate.imports.tsrImports(),
            tsrPath: escapedRoutePath.replaceAll(/\{(.+?)\}/gm, "$1"),
            tsrExportStart: tLazyRouteTemplate.imports.tsrExportStart(escapedRoutePath),
            tsrExportEnd: tLazyRouteTemplate.imports.tsrExportEnd()
          }
        );
      } else if (
        // Creating a new normal route file
        ["layout", "static"].some(
          (d) => d === node._fsRouteType
        ) || [
          "component",
          "pendingComponent",
          "errorComponent",
          "loader"
        ].every((d) => d !== node._fsRouteType)
      ) {
        const tRouteTemplate = this.targetTemplate.route;
        updatedCacheEntry.fileContent = await fillTemplate(
          this.config,
          this.config.customScaffolding?.routeTemplate ?? tRouteTemplate.template(),
          {
            tsrImports: tRouteTemplate.imports.tsrImports(),
            tsrPath: escapedRoutePath.replaceAll(/\{(.+?)\}/gm, "$1"),
            tsrExportStart: tRouteTemplate.imports.tsrExportStart(escapedRoutePath),
            tsrExportEnd: tRouteTemplate.imports.tsrExportEnd()
          }
        );
      } else {
        return null;
      }
    }
    const transformResult = await transform({
      source: updatedCacheEntry.fileContent,
      ctx: {
        target: this.config.target,
        routeId: escapedRoutePath,
        lazy: node._fsRouteType === "lazy",
        verboseFileRoutes: !(this.config.verboseFileRoutes === false)
      },
      node
    });
    if (transformResult.result === "no-route-export") {
      this.logger.warn(
        `Route file "${node.fullPath}" does not contain any route piece. This is likely a mistake.`
      );
      return null;
    }
    if (transformResult.result === "error") {
      throw new Error(
        `Error transforming route file ${node.fullPath}: ${transformResult.error}`
      );
    }
    if (transformResult.result === "modified") {
      updatedCacheEntry.fileContent = transformResult.output;
      shouldWriteRouteFile = true;
    }
    for (const plugin of this.plugins) {
      plugin.afterTransform?.({ node, prevNode: previousCacheEntry?.node });
    }
    if (shouldWriteRouteFile) {
      const stats = await this.safeFileWrite({
        filePath: node.fullPath,
        newContent: updatedCacheEntry.fileContent,
        strategy: {
          type: "mtime",
          expectedMtimeMs: updatedCacheEntry.mtimeMs
        }
      });
      updatedCacheEntry.mtimeMs = stats.mtimeMs;
    }
    this.routeNodeShadowCache.set(node.fullPath, updatedCacheEntry);
    return {
      node,
      shouldWriteTree,
      cacheEntry: updatedCacheEntry
    };
  }
  async didRouteFileChangeComparedToCache(file, cache) {
    const cacheEntry = this[cache].get(file.path);
    return this.didFileChangeComparedToCache(file, cacheEntry);
  }
  async didFileChangeComparedToCache(file, cacheEntry) {
    if (!cacheEntry) {
      return { result: "file-not-in-cache" };
    }
    let mtimeMs = file.mtimeMs;
    if (mtimeMs === void 0) {
      try {
        const currentStat = await this.fs.stat(file.path);
        mtimeMs = currentStat.mtimeMs;
      } catch {
        return { result: "cannot-stat-file" };
      }
    }
    return { result: mtimeMs !== cacheEntry.mtimeMs, mtimeMs, cacheEntry };
  }
  async safeFileWrite(opts) {
    const tmpPath = this.getTempFileName(opts.filePath);
    await this.fs.writeFile(tmpPath, opts.newContent);
    if (opts.strategy.type === "mtime") {
      const beforeStat = await this.fs.stat(opts.filePath);
      if (beforeStat.mtimeMs !== opts.strategy.expectedMtimeMs) {
        throw rerun({
          msg: `File ${opts.filePath} was modified by another process during processing.`,
          event: { type: "update", path: opts.filePath }
        });
      }
      const newFileState = await this.fs.stat(tmpPath);
      if (newFileState.mode !== beforeStat.mode) {
        await this.fs.chmod(tmpPath, beforeStat.mode);
      }
      if (newFileState.uid !== beforeStat.uid || newFileState.gid !== beforeStat.gid) {
        try {
          await this.fs.chown(tmpPath, beforeStat.uid, beforeStat.gid);
        } catch (err) {
          if (typeof err === "object" && err !== null && "code" in err && err.code === "EPERM") {
            console.warn(
              `[safeFileWrite] chown failed: ${err.message}`
            );
          } else {
            throw err;
          }
        }
      }
    } else {
      if (await checkFileExists(opts.filePath)) {
        throw rerun({
          msg: `File ${opts.filePath} already exists. Cannot overwrite.`,
          event: { type: "update", path: opts.filePath }
        });
      }
    }
    const stat = await this.fs.stat(tmpPath);
    await this.fs.rename(tmpPath, opts.filePath);
    return stat;
  }
  getTempFileName(filePath) {
    const absPath = path.resolve(filePath);
    const hash = crypto.createHash("md5").update(absPath).digest("hex");
    if (!this.sessionId) {
      mkdirSync(this.config.tmpDir, { recursive: true });
      this.sessionId = crypto.randomBytes(4).toString("hex");
    }
    return path.join(this.config.tmpDir, `${this.sessionId}-${hash}`);
  }
  async isRouteFileCacheFresh(node) {
    const fileChangedCache = await this.didRouteFileChangeComparedToCache(
      { path: node.fullPath },
      "routeNodeCache"
    );
    if (fileChangedCache.result === false) {
      this.routeNodeShadowCache.set(node.fullPath, fileChangedCache.cacheEntry);
      return {
        status: "fresh",
        cacheEntry: fileChangedCache.cacheEntry
      };
    }
    if (fileChangedCache.result === "cannot-stat-file") {
      throw new Error(`⚠️ expected route file to exist at ${node.fullPath}`);
    }
    const mtimeMs = fileChangedCache.result === true ? fileChangedCache.mtimeMs : void 0;
    const shadowCacheFileChange = await this.didRouteFileChangeComparedToCache(
      { path: node.fullPath, mtimeMs },
      "routeNodeShadowCache"
    );
    if (shadowCacheFileChange.result === "cannot-stat-file") {
      throw new Error(`⚠️ expected route file to exist at ${node.fullPath}`);
    }
    if (shadowCacheFileChange.result === false) {
      if (fileChangedCache.result === true) {
        return {
          status: "fresh",
          cacheEntry: shadowCacheFileChange.cacheEntry
        };
      }
    }
    if (fileChangedCache.result === "file-not-in-cache") {
      return {
        status: "stale"
      };
    }
    return { status: "stale", cacheEntry: fileChangedCache.cacheEntry };
  }
  async handleRootNode(node) {
    const result = await this.isRouteFileCacheFresh(node);
    if (result.status === "fresh") {
      this.routeNodeShadowCache.set(node.fullPath, result.cacheEntry);
    }
    const rootNodeFile = await this.fs.readFile(node.fullPath);
    if (rootNodeFile === "file-not-existing") {
      throw new Error(`⚠️ expected root route to exist at ${node.fullPath}`);
    }
    const updatedCacheEntry = {
      fileContent: rootNodeFile.fileContent,
      mtimeMs: rootNodeFile.stat.mtimeMs,
      routeId: node.routePath ?? "$$TSR_NO_ROOT_ROUTE_PATH_ASSIGNED$$",
      node
    };
    if (!rootNodeFile.fileContent) {
      const rootTemplate = this.targetTemplate.rootRoute;
      const rootRouteContent = await fillTemplate(
        this.config,
        rootTemplate.template(),
        {
          tsrImports: rootTemplate.imports.tsrImports(),
          tsrPath: rootPathId,
          tsrExportStart: rootTemplate.imports.tsrExportStart(),
          tsrExportEnd: rootTemplate.imports.tsrExportEnd()
        }
      );
      this.logger.log(`🟡 Creating ${node.fullPath}`);
      const stats = await this.safeFileWrite({
        filePath: node.fullPath,
        newContent: rootRouteContent,
        strategy: {
          type: "mtime",
          expectedMtimeMs: rootNodeFile.stat.mtimeMs
        }
      });
      updatedCacheEntry.fileContent = rootRouteContent;
      updatedCacheEntry.mtimeMs = stats.mtimeMs;
    }
    this.routeNodeShadowCache.set(node.fullPath, updatedCacheEntry);
  }
  async getCrawlingResult() {
    await this.runPromise;
    return this.crawlingResult;
  }
  static handleNode(node, acc, config) {
    const useExperimentalNonNestedRoutes = config?.experimental?.nonNestedRoutes ?? false;
    resetRegex(this.routeGroupPatternRegex);
    let parentRoute = hasParentRoute(
      acc.routeNodes,
      node,
      node.routePath,
      node.originalRoutePath
    );
    if (parentRoute?.isVirtualParentRoute && parentRoute.children?.length) {
      const possibleParentRoute = hasParentRoute(
        parentRoute.children,
        node,
        node.routePath,
        node.originalRoutePath
      );
      if (possibleParentRoute) {
        parentRoute = possibleParentRoute;
      }
    }
    if (parentRoute) node.parent = parentRoute;
    node.path = determineNodePath(node);
    const trimmedPath = trimPathLeft(node.path ?? "");
    const split = trimmedPath.split("/");
    const lastRouteSegment = split[split.length - 1] ?? trimmedPath;
    node.isNonPath = lastRouteSegment.startsWith("_") || split.every((part) => this.routeGroupPatternRegex.test(part));
    node.cleanedPath = removeGroups(
      (useExperimentalNonNestedRoutes ? removeLeadingUnderscores(
        removeLayoutSegments(node.path ?? ""),
        config?.routeToken ?? ""
      ) : removeUnderscores(removeLayoutSegments(node.path))) ?? ""
    );
    if (node._fsRouteType === "layout" || node._fsRouteType === "pathless_layout") {
      node.cleanedPath = removeTrailingSlash(node.cleanedPath);
    }
    if (!node.isVirtual && [
      "lazy",
      "loader",
      "component",
      "pendingComponent",
      "errorComponent"
    ].some((d) => d === node._fsRouteType)) {
      acc.routePiecesByPath[node.routePath] = acc.routePiecesByPath[node.routePath] || {};
      acc.routePiecesByPath[node.routePath][node._fsRouteType === "lazy" ? "lazy" : node._fsRouteType === "loader" ? "loader" : node._fsRouteType === "errorComponent" ? "errorComponent" : node._fsRouteType === "pendingComponent" ? "pendingComponent" : "component"] = node;
      const anchorRoute = acc.routeNodes.find(
        (d) => d.routePath === node.routePath
      );
      if (!anchorRoute) {
        this.handleNode(
          {
            ...node,
            isVirtual: true,
            _fsRouteType: "static"
          },
          acc,
          config
        );
      }
      return;
    }
    const cleanedPathIsEmpty = (node.cleanedPath || "").length === 0;
    const nonPathRoute = node._fsRouteType === "pathless_layout" && node.isNonPath;
    node.isVirtualParentRequired = node._fsRouteType === "pathless_layout" || nonPathRoute ? !cleanedPathIsEmpty : false;
    if (!node.isVirtual && node.isVirtualParentRequired) {
      const parentRoutePath = removeLastSegmentFromPath(node.routePath) || "/";
      const parentVariableName = routePathToVariable(parentRoutePath);
      const anchorRoute = acc.routeNodes.find(
        (d) => d.routePath === parentRoutePath
      );
      if (!anchorRoute) {
        const parentNode = {
          ...node,
          path: removeLastSegmentFromPath(node.path) || "/",
          filePath: removeLastSegmentFromPath(node.filePath) || "/",
          fullPath: removeLastSegmentFromPath(node.fullPath) || "/",
          routePath: parentRoutePath,
          variableName: parentVariableName,
          isVirtual: true,
          _fsRouteType: "layout",
          // layout since this route will wrap other routes
          isVirtualParentRoute: true,
          isVirtualParentRequired: false
        };
        parentNode.children = parentNode.children ?? [];
        parentNode.children.push(node);
        node.parent = parentNode;
        if (node._fsRouteType === "pathless_layout") {
          node.path = determineNodePath(node);
        }
        this.handleNode(parentNode, acc, config);
      } else {
        anchorRoute.children = anchorRoute.children ?? [];
        anchorRoute.children.push(node);
        node.parent = anchorRoute;
      }
    }
    if (node.parent) {
      if (!node.isVirtualParentRequired) {
        node.parent.children = node.parent.children ?? [];
        node.parent.children.push(node);
      }
    } else {
      acc.routeTree.push(node);
    }
    acc.routeNodes.push(node);
  }
  // only process files that are relevant for the route tree generation
  isFileRelevantForRouteTreeGeneration(filePath) {
    if (filePath === this.generatedRouteTreePath) {
      return true;
    }
    if (filePath.startsWith(this.routesDirectoryPath)) {
      return true;
    }
    if (typeof this.config.virtualRouteConfig === "string" && filePath === this.config.virtualRouteConfig) {
      return true;
    }
    if (this.routeNodeCache.has(filePath)) {
      return true;
    }
    if (isVirtualConfigFile(path.basename(filePath))) {
      return true;
    }
    if (this.physicalDirectories.some((dir) => filePath.startsWith(dir))) {
      return true;
    }
    return false;
  }
};
_Generator.routeGroupPatternRegex = /\(.+\)/g;
let Generator = _Generator;
export {
  Generator
};
//# sourceMappingURL=generator.js.map
