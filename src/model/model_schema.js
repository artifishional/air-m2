import Unit from "../advantages/unit"
import {Observable} from "air-stream"
import Factory from "./factory"

export default class ModelSchema extends Unit {

    constructor({maintainer = ModelSchema.maintainer, ...args}) {
        super({maintainer, factory: new Factory(), ...args});
    }

    static maintainer(src, args) {

        return new Observable( emt => {

            let res, linkers;

            return res = [src.on( ({module, advantages}) => {

                advantages.linkers.push(emt);
                linkers = advantages.linkers;

                if(typeof advantages.source === "function") {
                    res.push(advantages.source({advantages, ...advantages.args, ...args}).on(emt));
                }
                else {
                    const exist = module[advantages.source.name || "default"];
                    if(Array.isArray(exist)) {
                        res.push(source({advantages, ...advantages.args, ...args}).on(emt));
                    }
                    else if(exist) {
                        res.push(exist({advantages, ...advantages.args, ...args}).on(emt));
                    }
                    else {
                        throw `module "${key}" not found`;
                    }
                }
            } ),
                ({dissolve}) => dissolve && linkers && linkers.splice( linkers.indexOf(emt), 1 )
            ]
        });
    }

}