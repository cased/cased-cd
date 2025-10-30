import {
  require_jsx_runtime,
  useRouter,
  useRouterState
} from "./chunk-5MHRSUE2.js";
import "./chunk-7BTQE24S.js";
import {
  require_react
} from "./chunk-UNLUE3XC.js";
import {
  TanStackRouterDevtoolsCore,
  TanStackRouterDevtoolsPanelCore
} from "./chunk-UW5G2IEP.js";
import "./chunk-ZXCZU47K.js";
import {
  __toESM
} from "./chunk-5WRI5ZAA.js";

// node_modules/@tanstack/react-router-devtools/dist/esm/TanStackRouterDevtools.js
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var import_react = __toESM(require_react(), 1);
function TanStackRouterDevtools(props) {
  const {
    initialIsOpen,
    panelProps,
    closeButtonProps,
    toggleButtonProps,
    position,
    containerElement,
    shadowDOMTarget,
    router: propsRouter
  } = props;
  const hookRouter = useRouter({ warn: false });
  const activeRouter = propsRouter ?? hookRouter;
  const activeRouterState = useRouterState({ router: activeRouter });
  const devToolRef = (0, import_react.useRef)(null);
  const [devtools] = (0, import_react.useState)(
    () => new TanStackRouterDevtoolsCore({
      initialIsOpen,
      panelProps,
      closeButtonProps,
      toggleButtonProps,
      position,
      containerElement,
      shadowDOMTarget,
      router: activeRouter,
      routerState: activeRouterState
    })
  );
  (0, import_react.useEffect)(() => {
    devtools.setRouter(activeRouter);
  }, [devtools, activeRouter]);
  (0, import_react.useEffect)(() => {
    devtools.setRouterState(activeRouterState);
  }, [devtools, activeRouterState]);
  (0, import_react.useEffect)(() => {
    devtools.setOptions({
      initialIsOpen,
      panelProps,
      closeButtonProps,
      toggleButtonProps,
      position,
      containerElement,
      shadowDOMTarget
    });
  }, [
    devtools,
    initialIsOpen,
    panelProps,
    closeButtonProps,
    toggleButtonProps,
    position,
    containerElement,
    shadowDOMTarget
  ]);
  (0, import_react.useEffect)(() => {
    if (devToolRef.current) {
      devtools.mount(devToolRef.current);
    }
    return () => {
      devtools.unmount();
    };
  }, [devtools]);
  return (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: (0, import_jsx_runtime.jsx)("div", { ref: devToolRef }) });
}

// node_modules/@tanstack/react-router-devtools/dist/esm/TanStackRouterDevtoolsPanel.js
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var import_react2 = __toESM(require_react(), 1);
var TanStackRouterDevtoolsPanel = (props) => {
  const { router: propsRouter, ...rest } = props;
  const hookRouter = useRouter({ warn: false });
  const activeRouter = propsRouter ?? hookRouter;
  const activeRouterState = useRouterState({ router: activeRouter });
  const devToolRef = (0, import_react2.useRef)(null);
  const [devtools] = (0, import_react2.useState)(
    () => new TanStackRouterDevtoolsPanelCore({
      ...rest,
      router: activeRouter,
      routerState: activeRouterState
    })
  );
  (0, import_react2.useEffect)(() => {
    devtools.setRouter(activeRouter);
  }, [devtools, activeRouter]);
  (0, import_react2.useEffect)(() => {
    devtools.setRouterState(activeRouterState);
  }, [devtools, activeRouterState]);
  (0, import_react2.useEffect)(() => {
    devtools.setOptions({
      className: props.className,
      style: props.style,
      shadowDOMTarget: props.shadowDOMTarget
    });
  }, [devtools, props.className, props.style, props.shadowDOMTarget]);
  (0, import_react2.useEffect)(() => {
    if (devToolRef.current) {
      devtools.mount(devToolRef.current);
    }
    return () => {
      devtools.unmount();
    };
  }, [devtools]);
  return (0, import_jsx_runtime2.jsx)(import_jsx_runtime2.Fragment, { children: (0, import_jsx_runtime2.jsx)("div", { ref: devToolRef }) });
};

// node_modules/@tanstack/react-router-devtools/dist/esm/index.js
var TanStackRouterDevtoolsInProd = TanStackRouterDevtools;
var TanStackRouterDevtoolsPanelInProd = TanStackRouterDevtoolsPanel;

// node_modules/@tanstack/router-devtools/dist/esm/index.js
console.warn(
  "[@tanstack/router-devtools] This package has moved to @tanstack/react-router-devtools. Please switch to the new package at your earliest convenience, as this package will be dropped in the next major version release."
);
export {
  TanStackRouterDevtoolsInProd as TanStackRouterDevtools,
  TanStackRouterDevtoolsPanelInProd as TanStackRouterDevtoolsPanel
};
//# sourceMappingURL=@tanstack_router-devtools.js.map
