import {Observable} from "air-stream"
import ObservableTexture from "./observable_texture"
import ObservableFont from "./font"

export default function (pack, resources) {
    return Observable.combine( [ ...resources.map( ({type, url, ...args}) => {
        if(type === "texture") {
            return new ObservableTexture({url: `./m2units/${pack.path}${url}` })
        }
        else if(type === "font") {
            return new ObservableFont({url: `./m2units/${pack.path}${url}`, ...args})
        }
    } ),
        new Observable(emt => emt({type: "none"}))
    ] )
}