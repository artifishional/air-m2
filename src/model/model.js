import Unit from "../advantages/unit"
import {Observable} from "air-stream"

export default class Model extends Unit {

    constructor({maintainer = Model.maintainer, ...args}) {
        super({maintainer, ...args});
    }

    static maintainer(src, {route: [ key, ...route ], ...args}) {
        return new Observable( (emt) => {
            return src.get( {route: [ key, ...route ], ...args} ).on( ({module, advantages}) => {
                if(typeof advantages.source === "function") {
                    return advantages.source({advantages, ...advantages.args, ...args}).on(emt);
                }
                else {
                    const exist = module[advantages.source.name || "default"];
                    if(Array.isArray(exist)) {
                        return source({advantages, ...advantages.args, ...args}).on(emt);
                    }
                    else if(exist) {
                        return exist({advantages, ...advantages.args, ...args}).on(emt);
                    }
                    else {
                        throw `module "${key}" not found`;
                    }
                }
            } );
        });
    }

}