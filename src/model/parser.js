import {Schema} from "air-schema"
import {frommodule} from "../utils/index"

export function frommodule(module, _key = "main") {
    return [ _key,
        ...Object.keys(module).filter(key => key === "default").map( key => {
            if (typeof module[key] === "function") {
                return {source: module[key]};
            }
        }),
        ...Object.keys(module).filter(key => key !== "default").map( key => {
            if(typeof module[key] === "function") {
                return [ key, { source: module[key] } ];
            }
            else if(typeof module[key] === "object") {
                return frommodule(module[key], key);
            }
        })
    ];
}

export default class Parser extends Schema {

    constructor( { module } ) {
        let exist = module.default;
        if(!Array.isArray(exist) && typeof exist === "object") {
            exist = frommodule(exist);
        }
        if (Array.isArray(exist)) {
            super( exist );
        }
        else {
            super( [ "*", { source: exist } ] );
        }
    }

    parseProperty(propName, value) {
        if(propName === "source") {
            return
        }
    }

}