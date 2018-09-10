import {Observable} from "air-stream"
//import ObservableTexture from "./observable_texture"
import ObservableFont from "./font"
import Sound from "./sound"
import ObservableImage from "./image"
import ObservableStyle from "./style"
import Languages from "./languages"

export default function ({path}, resources) {
    return Observable.combine( [ ...resources.map( ({type, rel, url, ...args}) => {
        if(type === "texture") {
            throw "unsupported in current version"
            //return new ObservableTexture({url: `./m2units/${path}${url}` })
        }
        else if(type === "img") {
            return ObservableImage({url: `./m2units/${path}${url}` })
        }
        else if(type === "font") {
            return new ObservableFont({url: `./m2units/${path}${url}`, ...args})
        }
        else if(type === "style") {
            return ObservableStyle({url: `./m2units/${path}${url}`, ...args})
        }
        else if(type === "languages") {
            return Languages({url: `./m2units/${path}${url}`, ...args})
        }
        else if(type === "sound") {
            const _path = path.split("/").filter(Boolean);
            const _rel = rel.split("/").filter(Boolean);
            while(_rel[0] === "..") {
                _rel.splice(0, 1);
                _path.splice(-1, 1);
            }
            return new Sound({url: `./m2units/${_path.join("/")}/res/sounds/${_rel.join("/")}`, name: url, ...args})
        }
        else {
            throw "unsupported resource type";
        }
    } ),
        new Observable(emt => emt({type: "none"}))
    ] )
}