import Unit from "../advantages/unit"
import {stream} from "air-stream"
import Factory from "./factory"

export default class ModelSchema extends Unit {

    constructor({maintainer = ModelSchema.maintainer, ...args}) {
        super({maintainer, factory: new Factory(), ...args});
    }

    static maintainer(src, args) {

        return stream( (emt, { over, sweep }) => {

            let linkers;

            over.add(src.at( ({module, advantages}) => {

                advantages.linkers.push(emt);
                linkers = advantages.linkers;

                if(typeof advantages.source === "function") {
                    over.add(advantages.source({advantages, ...advantages.args, ...args}).on(emt));
                }
                else {

                    if(!Object.keys(advantages.source).length || advantages.source.hasOwnProperty("path")) {
                        return emt("complete");
                    }

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
            } ));

            sweep.add(() => linkers && linkers.splice( linkers.indexOf(emt), 1 ));
        });
    }

}