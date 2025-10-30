"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const vite = require("@tanstack/router-plugin/vite");
Object.keys(vite).forEach((k) => {
  if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
    enumerable: true,
    get: () => vite[k]
  });
});
//# sourceMappingURL=index.cjs.map
