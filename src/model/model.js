import Unit from "../advantages/unit"
import {Observable} from "air-stream"

export default class ModelSchema extends Unit {

    constructor({maintainer = ModelSchema.maintainer, ...args}) {
        super({maintainer, ...args});
    }

    static maintainer(src, {route: [ key, ...route ], ...args}) {
        return new Observable( (emt) => {

            let linkers;
            let res;

            const sub = src._get( {route: [ key, ...route ]} ).on( ({module, advantages}) => {

                advantages.linkers.push(emt);
                linkers = advantages.linkers;

                if(typeof advantages.source === "function") {
                    res = advantages.source({advantages, ...advantages.args, ...args}).on(emt);
                }
                else {
                    const exist = module[advantages.source.name || "default"];
                    if(Array.isArray(exist)) {
                        res = source({advantages, ...advantages.args, ...args}).on(emt);
                    }
                    else if(exist) {
                        res = exist({advantages, ...advantages.args, ...args}).on(emt);
                    }
                    else {
                        throw `module "${key}" not found`;
                    }
                }
            } );
            return (...args) => {
                sub(...args);
                res && res(...args);
                linkers && linkers.splice( linkers.indexOf(emt), 1 );
            };
        });
    }

}