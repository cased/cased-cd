"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const invariant = require("tiny-invariant");
const store = require("@tanstack/store");
const utils = require("../utils.cjs");
function hydrateMatch(match, deyhydratedMatch) {
  match.id = deyhydratedMatch.i;
  match.__beforeLoadContext = deyhydratedMatch.b;
  match.loaderData = deyhydratedMatch.l;
  match.status = deyhydratedMatch.s;
  match.ssr = deyhydratedMatch.ssr;
  match.updatedAt = deyhydratedMatch.u;
  match.error = deyhydratedMatch.e;
}
async function hydrate(router) {
  invariant(
    window.$_TSR,
    "Expected to find bootstrap data on window.$_TSR, but we did not. Please file an issue!"
  );
  const serializationAdapters = router.options.serializationAdapters;
  if (serializationAdapters?.length) {
    const fromSerializableMap = /* @__PURE__ */ new Map();
    serializationAdapters.forEach((adapter) => {
      fromSerializableMap.set(adapter.key, adapter.fromSerializable);
    });
    window.$_TSR.t = fromSerializableMap;
    window.$_TSR.buffer.forEach((script) => script());
  }
  window.$_TSR.initialized = true;
  invariant(
    window.$_TSR.router,
    "Expected to find a dehydrated data on window.$_TSR.router, but we did not. Please file an issue!"
  );
  const { manifest, dehydratedData, lastMatchId } = window.$_TSR.router;
  router.ssr = {
    manifest
  };
  const meta = document.querySelector('meta[property="csp-nonce"]');
  const nonce = meta?.content;
  router.options.ssr = {
    nonce
  };
  const matches = router.matchRoutes(router.state.location);
  const routeChunkPromise = Promise.all(
    matches.map((match) => {
      const route = router.looseRoutesById[match.routeId];
      return router.loadRouteChunk(route);
    })
  );
  function setMatchForcePending(match) {
    const route = router.looseRoutesById[match.routeId];
    const pendingMinMs = route.options.pendingMinMs ?? router.options.defaultPendingMinMs;
    if (pendingMinMs) {
      const minPendingPromise = utils.createControlledPromise();
      match._nonReactive.minPendingPromise = minPendingPromise;
      match._forcePending = true;
      setTimeout(() => {
        minPendingPromise.resolve();
        router.updateMatch(match.id, (prev) => {
          prev._nonReactive.minPendingPromise = void 0;
          return {
            ...prev,
            _forcePending: void 0
          };
        });
      }, pendingMinMs);
    }
  }
  let firstNonSsrMatchIndex = void 0;
  matches.forEach((match) => {
    const dehydratedMatch = window.$_TSR.router.matches.find(
      (d) => d.i === match.id
    );
    if (!dehydratedMatch) {
      match._nonReactive.dehydrated = false;
      match.ssr = false;
      return;
    }
    hydrateMatch(match, dehydratedMatch);
    match._nonReactive.dehydrated = match.ssr !== false;
    if (match.ssr === "data-only" || match.ssr === false) {
      if (firstNonSsrMatchIndex === void 0) {
        firstNonSsrMatchIndex = match.index;
        setMatchForcePending(match);
      }
    }
  });
  router.__store.setState((s) => {
    return {
      ...s,
      matches
    };
  });
  await router.options.hydrate?.(dehydratedData);
  await Promise.all(
    router.state.matches.map(async (match) => {
      const route = router.looseRoutesById[match.routeId];
      const parentMatch = router.state.matches[match.index - 1];
      const parentContext = parentMatch?.context ?? router.options.context;
      if (route.options.context) {
        const contextFnContext = {
          deps: match.loaderDeps,
          params: match.params,
          context: parentContext ?? {},
          location: router.state.location,
          navigate: (opts) => router.navigate({ ...opts, _fromLocation: router.state.location }),
          buildLocation: router.buildLocation,
          cause: match.cause,
          abortController: match.abortController,
          preload: false,
          matches
        };
        match.__routeContext = route.options.context(contextFnContext) ?? void 0;
      }
      match.context = {
        ...parentContext,
        ...match.__routeContext,
        ...match.__beforeLoadContext
      };
      const assetContext = {
        matches: router.state.matches,
        match,
        params: match.params,
        loaderData: match.loaderData
      };
      const headFnContent = await route.options.head?.(assetContext);
      const scripts = await route.options.scripts?.(assetContext);
      match.meta = headFnContent?.meta;
      match.links = headFnContent?.links;
      match.headScripts = headFnContent?.scripts;
      match.styles = headFnContent?.styles;
      match.scripts = scripts;
    })
  );
  const isSpaMode = matches[matches.length - 1].id !== lastMatchId;
  const hasSsrFalseMatches = matches.some((m) => m.ssr === false);
  if (!hasSsrFalseMatches && !isSpaMode) {
    matches.forEach((match) => {
      match._nonReactive.dehydrated = void 0;
    });
    return routeChunkPromise;
  }
  const loadPromise = Promise.resolve().then(() => router.load()).catch((err) => {
    console.error("Error during router hydration:", err);
  });
  if (isSpaMode) {
    const match = matches[1];
    invariant(
      match,
      "Expected to find a match below the root match in SPA mode."
    );
    setMatchForcePending(match);
    match._displayPending = true;
    match._nonReactive.displayPendingPromise = loadPromise;
    loadPromise.then(() => {
      store.batch(() => {
        if (router.__store.state.status === "pending") {
          router.__store.setState((s) => ({
            ...s,
            status: "idle",
            resolvedLocation: s.location
          }));
        }
        router.updateMatch(match.id, (prev) => {
          return {
            ...prev,
            _displayPending: void 0,
            displayPendingPromise: void 0
          };
        });
      });
    });
  }
  return routeChunkPromise;
}
exports.hydrate = hydrate;
//# sourceMappingURL=ssr-client.cjs.map
