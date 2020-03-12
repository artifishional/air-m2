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

import MobileDetect from "mobile-detect"
export const $_IS_MOBILE =
  [375, 812].includes(window.screen.width) &&
  [375, 812].includes(window.screen.height) ||
  !["iPad", null].includes(
    new MobileDetect(window.navigator.userAgent).mobile()
  );

// Patch Chrome 80-82 (and Edgium) bug
// https://bugs.chromium.org/p/chromium/issues/detail?id=1049982
(function() {
  const arrayReduce = Array.prototype.reduce;
  let callback;
  Object.defineProperty(Array.prototype, 'reduce', {
    value: function(cb, ...args) {
      callback = cb;
      return arrayReduce.call(this, callback, ...args);
    }
  });
})();