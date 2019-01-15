import {Schema} from "air-schema"

export default class Parser {

    parse({ module }) {
        let exist = module.default;
        if(!Array.isArray(exist) && typeof exist === "object") {
            exist = this.frommodule(exist);
        }
        if (Array.isArray(exist)) {
            return exist ;
        }
        else {
            return [ "*", { source: exist } ];
        }
        return exist;
    }

    frommodule(module, _key = "main") {
        return [ _key,
            ...Object.keys(module).filter(key => key === "default").map( key => {
                if (typeof module.default === "function") {
                    return {source: module[key]};
                }
            }),
            ...Object.keys(module).filter(key => key !== "default").map( key => {
                if(typeof module[key] === "function") {
                    return [ key, { source: module[key] } ];
                }
                else if(typeof module[key] === "object") {
                    return this.frommodule(module[key], key);
                }
            })
        ];
    }

}