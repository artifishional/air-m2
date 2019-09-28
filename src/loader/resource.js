import ObservableFont from "./font";
import Sound from "./sound";
import ObservableImage from "./image";
import ObservableStyle from "./style";
import Languages from "./languages";
import Internalization from "./intl";
import ObservableInlineStyle from "./inline-style";
import { REVISION as revision, PORT as port } from '../globals';

function loadResource({ path }, { origin, type, rel, url, ...args }) {
  console.log(path, url);
  const {protocol, hostname} = window.location;
  const urlOrigin = port ? `${protocol}//${hostname}:${port}` : window.location.origin;
  if (type === "inline-style") {
    return ObservableInlineStyle({ loadResource, path, revision, ...args });
  } else if (type === "texture") {
    throw "unsupported in current version";
    //return new ObservableTexture({url: `m2units/${path}${url}` })
  } else if (type === "img") {
    console.log(path);
    return ObservableImage({ loadResource, origin, url: new URL(`${urlOrigin}/m2units/${path}${url}`).href, revision, ...args });
  } else if (type === "font") {
    return ObservableFont({ loadResource, url: new URL(`${urlOrigin}/m2units/${path}${url}`).href, revision, ...args });
  } else if (type === "style") {
    return ObservableStyle({ loadResource, url: new URL(`${urlOrigin}/m2units/${path}${url}`).href, revision, ...args });
  } else if (type === "formatters") {
    return Internalization({ loadResource, url: new URL(`${urlOrigin}/m2units/${path}${url}`).href, revision, ...args });
  } else if (type === "languages") {
    return Languages({ loadResource, url: new URL(`${urlOrigin}/m2units/${path}${url}`).href, revision, ...args });
  } else if (type === "sound") {
    const _path = path.split("/").filter(Boolean);
    const _rel = rel.split("/").filter(Boolean);
    while (_rel[0] === "..") {
      _rel.splice(0, 1);
      _path.splice(-1, 1);
    }
    return Sound({ loadResource, url: new URL(`${urlOrigin}/m2units/${_path.join("/")}/res/sounds/${_rel.join("/")}`).href, name, ...args });
  } else {
    throw "unsupported resource type";
  }
}

export default loadResource;