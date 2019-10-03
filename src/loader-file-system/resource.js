import ObservableFont from "./font";
import ObservableImage from "./image";
import ObservableStyle from "./style";
import Languages from "./languages";
import Internalization from "./intl";
import ObservableInlineStyle from "./inline-style";
import { REVISION as revision, PORT as port } from '../globals';

function loadResource({ path }, { origin, type, rel, url, fonts, ...args }) {
  if (type === "inline-style") {
    return ObservableInlineStyle({ loadResource, path, revision, ...args });
  } else if (type === "texture") {
    throw "unsupported in current version";
    //return new ObservableTexture({url: `m2units/${path}${url}` })
  } else if (type === "img") {
    return ObservableImage({ loadResource, origin, url: `./node_modules/${path}m2unit/${url}`, revision, ...args });
  } else if (type === "font") {
    fonts = fonts.map(font => ({...font, formats: font.formats.map(format => ({...format, url: `./node_modules/${path}m2unit/${format.url}`}))}));
    return ObservableFont({ loadResource, fonts, revision, ...args });
  } else if (type === "style") {
    return ObservableStyle({ loadResource, url: `./node_modules/${path}m2unit/${url}`, revision, ...args });
  } else if (type === "formatters") {
    return Internalization({ loadResource, url: `./node_modules/${path}src/${url}`, revision, ...args });
  } else if (type === "languages") {
    return Languages({ loadResource, url: `./node_modules/${path}src/${url}`, revision, ...args });
  } else {
    throw "unsupported resource type";
  }
}

export default loadResource;