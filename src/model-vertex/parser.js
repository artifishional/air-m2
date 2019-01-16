import { Schema } from "air-schema"

export default class Parser extends Schema {

    constructor(props) {
        super(props);
    }

    parseData( { module } ) {
        let exist = module.default;
        if(!Array.isArray(exist) && typeof exist === "object") {
            exist = this.frommodule(exist);
        }
        if (Array.isArray(exist)) { }
        else {
            exist = [ "main", { source: exist } ];
        }
        return exist;
    }

    parseProperties( { source = {}, ...prop } ) {
        return { source, ...prop };
    }

    parseChildren( item ) {
        return item;
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