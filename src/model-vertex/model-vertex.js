import { LiveSchema } from "../live-schema"
import {stream, Observable} from "air-stream"
import Parser from "./parser"

function equal( sign, elem ) {
    if(Array.isArray(sign)) {
        return sign.length === elem.length && sign.every( (x, i) => equal(x, elem[i]) );
    }
    else if(typeof sign === "object") {
        const keys = Object.keys(sign);
        return keys.length === Object.keys(elem).length && keys.every( key => equal(sign[key], elem[key]) );
    }
    else {
        return sign === elem;
    }
}

function find(cache, args) {
    return cache.find( ({ sign }) => equal( sign, args ));
}

export default class ModelVertex extends LiveSchema {

    constructor(data, src) {
        super(data, src);
        this.__cache = [];
    }

    getParser( data ) {
        return new Parser( data );
    }

    use(src, args) {

        let exist = find(this.__cache, args);

        if(!exist) {
            this.__cache.push( exist = { stream: stream( (emt, { over, sweep }) => {

                let linkers;

                over.add(src.at( ({module, advantages}) => {

                    advantages.linkers.push(emt);
                    linkers = advantages.linkers;

                    if(typeof advantages.source === "function") {
                        const _stream = advantages.source({
                            stream,
                            obtain: (route, args) => advantages.obtain(route, { __memory: "unit", ...args }),
                            advantages,
                            ...advantages.args,
                            ...args
                        });
                        /*@*/if(!(_stream instanceof Observable)) throw "return value of unit must be a function:\n" + advantages.source;/*/@*/
                        over.add(_stream.on(emt));
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
            }),
                sign: args,
            });
        }

        return exist.stream;

    }

    maintainer(src, {__memory = "unit", ...args}) {

        if(__memory === "unit") {
            return this.use( src, args );
        }

        else {
            throw "unexpected type of memory";
        }

    }

}