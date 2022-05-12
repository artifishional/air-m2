import fontLoader from "./font.mjs";
import soundLoader from "./sound.mjs";
import imageLoader from "./image.mjs";
import styleLoader from "./style.mjs";
import Languages from "./languages.mjs";
import intlLoader from "./intl.mjs";
import inlineStyleLoader from "./inline-style.mjs";
import htmlLoader from "./html.mjs";
import jsonLoader from "./json.mjs";
import { REVISION as revision, PORT as port } from '../globals.mjs';
import baseResourceloader from '../live-schema/resource-loader.mjs';

export default function (resourceloader, { path }, { type, ...args }) {
  const {protocol, hostname} = window.location;
  const urlOrigin = port ? `${protocol}//${hostname}:${port}` : window.location.origin;
  if (type === "json") {
    return jsonLoader(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "inline-style") {
    return inlineStyleLoader(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "texture") {
    throw "unsupported in current version";
    //return new ObservableTexture({url: `m2units/${path}${url}` })
  } else if (type === "img") {
    return imageLoader(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "font") {
    return fontLoader({path}, { type, urlOrigin, revision, ...args });
  } else if (type === "style") {
    return styleLoader(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "formatters") {
    return intlLoader(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "languages") {
    return Languages(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "sound") {
    return soundLoader({path}, { type, urlOrigin, revision, ...args });
  } else if (type === "html") {
    return htmlLoader(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else {
    return baseResourceloader(resourceloader, {path}, { type, revision, ...args });
  }
}
