import fontLoader from "./font";
import soundLoader from "./sound";
import imageLoader from "./image";
import styleLoader from "./style";
import Languages from "./languages";
import intlLoader from "./intl";
import inlineStyleLoader from "./inline-style";
import htmlLoader from "./html";
import jsonLoader from "./json";
import { REVISION as revision, PORT as port } from '../globals';
import baseResourceloader from '../live-schema/resource-loader';

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
    return imageLoader({path}, { type, urlOrigin, revision, ...args });
  } else if (type === "font") {
    return fontLoader({path}, { type, urlOrigin, revision, ...args });
  } else if (type === "style") {
    return styleLoader({path}, { type, urlOrigin, revision, ...args });
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
