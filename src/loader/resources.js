import {Observable} from "air-stream"
import ObservableTexture from "./observable_texture"
import ObservableFont from "./font"
import ObservableImage from "./image"
import ObservableStyle from "./style"

export default function ({path}, resources) {
    return Observable.combine( [ ...resources.map( ({type, url, ...args}) => {
        if(type === "texture") {
            return new ObservableTexture({url: `./m2units/${path}${url}` })
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
        else {
            throw "unsupported resource type";
        }
    } ),
        new Observable(emt => emt({type: "none"}))
    ] )
}