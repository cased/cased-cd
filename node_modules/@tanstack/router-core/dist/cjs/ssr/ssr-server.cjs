"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const seroval = require("seroval");
const invariant = require("tiny-invariant");
const utils = require("../utils.cjs");
const tsrScript = require("./tsrScript.cjs");
const constants = require("./constants.cjs");
const serovalPlugins = require("./serializer/seroval-plugins.cjs");
const transformer = require("./serializer/transformer.cjs");
const SCOPE_ID = "tsr";
function dehydrateMatch(match) {
  const dehydratedMatch = {
    i: match.id,
    u: match.updatedAt,
    s: match.status
  };
  const properties = [
    ["__beforeLoadContext", "b"],
    ["loaderData", "l"],
    ["error", "e"],
    ["ssr", "ssr"]
  ];
  for (const [key, shorthand] of properties) {
    if (match[key] !== void 0) {
      dehydratedMatch[shorthand] = match[key];
    }
  }
  return dehydratedMatch;
}
function attachRouterServerSsrUtils({
  router,
  manifest
}) {
  router.ssr = {
    manifest
  };
  let initialScriptSent = false;
  const getInitialScript = () => {
    if (initialScriptSent) {
      return "";
    }
    initialScriptSent = true;
    return `${seroval.getCrossReferenceHeader(SCOPE_ID)};${tsrScript};`;
  };
  let _dehydrated = false;
  const listeners = [];
  router.serverSsr = {
    injectedHtml: [],
    injectHtml: (getHtml) => {
      const promise = Promise.resolve().then(getHtml);
      router.serverSsr.injectedHtml.push(promise);
      router.emit({
        type: "onInjectedHtml",
        promise
      });
      return promise.then(() => {
      });
    },
    injectScript: (getScript) => {
      return router.serverSsr.injectHtml(async () => {
        const script = await getScript();
        return `<script ${router.options.ssr?.nonce ? `nonce='${router.options.ssr.nonce}'` : ""} class='$tsr'>${getInitialScript()}${script};$_TSR.c()<\/script>`;
      });
    },
    dehydrate: async () => {
      invariant(!_dehydrated, "router is already dehydrated!");
      let matchesToDehydrate = router.state.matches;
      if (router.isShell()) {
        matchesToDehydrate = matchesToDehydrate.slice(0, 1);
      }
      const matches = matchesToDehydrate.map(dehydrateMatch);
      const dehydratedRouter = {
        manifest: router.ssr.manifest,
        matches
      };
      const lastMatchId = matchesToDehydrate[matchesToDehydrate.length - 1]?.id;
      if (lastMatchId) {
        dehydratedRouter.lastMatchId = lastMatchId;
      }
      dehydratedRouter.dehydratedData = await router.options.dehydrate?.();
      _dehydrated = true;
      const p = utils.createControlledPromise();
      const trackPlugins = { didRun: false };
      const plugins = router.options.serializationAdapters?.map((t) => transformer.makeSsrSerovalPlugin(t, trackPlugins)) ?? [];
      seroval.crossSerializeStream(dehydratedRouter, {
        refs: /* @__PURE__ */ new Map(),
        plugins: [...plugins, ...serovalPlugins.defaultSerovalPlugins],
        onSerialize: (data, initial) => {
          let serialized = initial ? constants.GLOBAL_TSR + ".router=" + data : data;
          if (trackPlugins.didRun) {
            serialized = constants.GLOBAL_TSR + ".p(()=>" + serialized + ")";
          }
          router.serverSsr.injectScript(() => serialized);
        },
        scopeId: SCOPE_ID,
        onDone: () => p.resolve(""),
        onError: (err) => p.reject(err)
      });
      router.serverSsr.injectHtml(() => p);
    },
    isDehydrated() {
      return _dehydrated;
    },
    onRenderFinished: (listener) => listeners.push(listener),
    setRenderFinished: () => {
      listeners.forEach((l) => l());
    }
  };
}
function getOrigin(request) {
  const originHeader = request.headers.get("Origin");
  if (originHeader) {
    try {
      new URL(originHeader);
      return originHeader;
    } catch {
    }
  }
  try {
    return new URL(request.url).origin;
  } catch {
  }
  return "http://localhost";
}
exports.attachRouterServerSsrUtils = attachRouterServerSsrUtils;
exports.dehydrateMatch = dehydrateMatch;
exports.getOrigin = getOrigin;
//# sourceMappingURL=ssr-server.cjs.map
