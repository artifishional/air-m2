import ObservableFont from "./font";
import Sound from "./sound";
import ObservableImage from "./image";
import ObservableStyle from "./style";
import Languages from "./languages";
import Internalization from "./intl";
import ObservableInlineStyle from "./inline-style";
import { REVISION as revision } from '../globals'

export default function({ path }, { origin, type, rel, url, ...args }) {
  if (type === "inline-style") {
    return ObservableInlineStyle({ path, revision, ...args });
  } else if (type === "texture") {
    throw "unsupported in current version";
    //return new ObservableTexture({url: `./m2units/${path}${url}` })
  } else if (type === "img") {
    return ObservableImage({ origin, url: `./m2units/${path}${url}`, revision, ...args });
  } else if (type === "font") {
    return new ObservableFont({ url: `./m2units/${path}${url}`, revision, ...args });
  } else if (type === "style") {
    return ObservableStyle({ url: `./m2units/${path}${url}`, revision, ...args });
  } else if (type === "formatters") {
    return Internalization({ url: `./m2units/${path}${url}`, revision, ...args });
  } else if (type === "languages") {
    return Languages({ url: `./m2units/${path}${url}`, revision, ...args });
  } else if (type === "sound") {
    const _path = path.split("/").filter(Boolean);
    const _rel = rel.split("/").filter(Boolean);
    while (_rel[0] === "..") {
      _rel.splice(0, 1);
      _path.splice(-1, 1);
    }
    return new Sound({ url: `./m2units/${_path.join("/")}/res/sounds/${_rel.join("/")}`, name, ...args });
  } else {
    throw "unsupported resource type";
  }
}
