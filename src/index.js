import "./polyfills"
export * from "air-stream"
export * from "./live-schema"
export * from "./loader"
export * from "./model-vertex"
export * from "./view-vertex"
export * from "./error"
//todo wtf? it does not want to buid with es2017
// export * as utils from "./utils"
import * as _utils from "./utils/index"
export const utils = _utils;
export const uid = () => __uid++;
let __uid = 1;