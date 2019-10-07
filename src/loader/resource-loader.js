import ObservableFont from "./font";
import Sound from "./sound";
import ObservableImage from "./image";
import ObservableStyle from "./style";
import Languages from "./languages";
import Internalization from "./intl";
import ObservableInlineStyle from "./inline-style";
import ObservableHTML from "./html";
import { REVISION as revision, PORT as port } from '../globals';
import baseResourceloader from '../live-schema/resource-loader';

export default function resourceloader({ path }, { type, ...args }) {
  const {protocol, hostname} = window.location;
  const urlOrigin = port ? `${protocol}//${hostname}:${port}` : window.location.origin;
  if (type === "inline-style") {
    return ObservableInlineStyle(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "texture") {
    throw "unsupported in current version";
    //return new ObservableTexture({url: `m2units/${path}${url}` })
  } else if (type === "img") {
    return ObservableImage({path}, { type, urlOrigin, revision, ...args });
  } else if (type === "font") {
    // fonts = fonts.map(font => ({...font, formats: font.formats.map(format => ({...format, url: new URL(`${urlOrigin}/m2units/${path}${format.url}`).href}))}));
    return ObservableFont({path}, { type, urlOrigin, revision, ...args });
  } else if (type === "style") {
    return ObservableStyle({path}, { type, urlOrigin, revision, ...args });
  } else if (type === "formatters") {
    return Internalization(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "languages") {
    return Languages(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else if (type === "sound") {
    return Sound({path}, { type, urlOrigin, revision, ...args });
  } else if (type === "html") {
    return ObservableHTML(resourceloader, {path}, { type, urlOrigin, revision, ...args });
  } else {
    return baseResourceloader({path}, { type, revision, ...args });
  }
}
