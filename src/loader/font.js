import FontFaceObserver from "fontfaceobserver";
const FONT_LOADING_TIMEOUT = 30000;

export default ({}, {family}) =>
  new FontFaceObserver(family).load(null, FONT_LOADING_TIMEOUT);