import {Observable} from "air-stream"
import ObservableTexture from "./observable_texture"
import ObservableFont from "./font"
import ObservableImage from "./image"

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
    } ),
        new Observable(emt => emt({type: "none"}))
    ] )
}