import { ReadableStreamPlugin } from "seroval-plugins/web";
import { ShallowErrorPlugin } from "./ShallowErrorPlugin.js";
const defaultSerovalPlugins = [
  ShallowErrorPlugin,
  // ReadableStreamNode is not exported by seroval
  ReadableStreamPlugin
];
export {
  defaultSerovalPlugins
};
//# sourceMappingURL=seroval-plugins.js.map
