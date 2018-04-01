export * from "air-stream"
export * from "./advantages"
export * from "./loader"
export * from "./model"
//todo wtf? it does not want to buid with es2017
// export * as utils from "./utils"
import * as _utils from "./utils/index"
export const utils = _utils;