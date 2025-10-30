"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const useRouter = require("./useRouter.cjs");
function ScriptOnce({ children }) {
  const router = useRouter.useRouter();
  if (!router.isServer) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntime.jsx(
    "script",
    {
      nonce: router.options.ssr?.nonce,
      className: "$tsr",
      dangerouslySetInnerHTML: {
        __html: [children].filter(Boolean).join("\n") + ";$_TSR.c()"
      }
    }
  );
}
exports.ScriptOnce = ScriptOnce;
//# sourceMappingURL=ScriptOnce.cjs.map
