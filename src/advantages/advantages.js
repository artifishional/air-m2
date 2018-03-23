import {Observable} from "air-stream"
import Loader from "../loader"
import {catalog, concatPath} from "../utils";

/**
 *
 * @param {Array} schema
 */
export function schemasNormalizer([key, ...elems]) {
    return [
        key,
        elems.length && !Array.isArray(elems[0]) ? elems.shift() : {},
        ...elems.map( elem => schemasNormalizer(elem) )
    ];
}

export function routeNormalizer(route) {
    return route.split("/")
        //an empty string includes
        .filter(x => !".".includes(x))
        .map(x => x[0] === "{" ? JSON.parse(x.replace(/[a-zA-Z]\w{1,}/g, x=> `"${x}"`)) : x);
}

export default class Advantages {

    constructor( {
                     relative,
                     parent,
                     factory,
                     loader,
                     schema: [ key, {sign = Advantages.sign, source = {}, ...args}, ...advs ]
    }) {
        this.key = key;
        this.factory = factory;
        this.sign = sign;
        this.loader = loader;
        this.source = source;
        this.parent = parent;
        this.item = advs
            .map( schema => factory.create( { relative, factory, parent: this, schema, loader } ) );
        this.args = args;
        this.relative = relative;
    }

    /**
     *
     * @param route
     * @returns {*}
     * @example {route: "./../../state/{type: loto20_80}"}/
     */
    obtain({ route, ...args }) {
        return this._obtain({ route: routeNormalizer(route), ...args });
    }

    _obtain({route: [ key, ...route ], ...args}) {
        if(key) {
            if(key === "..") {
                return this.parent._obtain({ route, ...args });
            }
            else {
                const node = this.item.find( this.sign(key) );
                if(node) {
                    return node._obtain({ route, ...args });
                }
                else {
                    if(this.source.hasOwnProperty("path") && !this.item.length) {
                        const relative = concatPath(this.relative, catalog(this.source.path));
                        return new Observable( (emt) => {
                            let res = null;
                            const loader = this.loader.obtain(this).on( ({data: module}) => {
                                const [,, ...advs] = schemasNormalizer(module[this.source.name || "default"]);
                                const {factory, loader} = this;
                                this.item =
                                    advs.map( schema =>
                                        factory.create( { relative, factory, parent: this, schema, loader } ) );
                                res = this._obtain( { route: [key, ...route], ...args } ).on( emt.emit );
                            });
                            return (...args) => {
                                loader(...args);
                                res(...args);
                            }
                        } );
                    }
                    else {
                        throw "module not found";
                    }
                }
            }
        }
        else {
            if(typeof this.source === "function") {
                return this.source.module({advantages: this, ...this.args, ...args});
            }
            else {
                return new Observable((emt) => {
                    let obs = null;
                    const loader = this.loader.obtain(this).on(({data: module}) => {
                        if (Array.isArray(module[this.source.name || "default"])) {
                            const relative = concatPath(this.relative, catalog(this.source.path));
                            const [, , ...advs] = schemasNormalizer(module[this.source.name || "default"]);
                            const {factory, loader} = this;
                            this.item =
                                advs.map(schema =>
                                    factory.create({relative, factory, parent: this, schema, loader}));
                            obs = module.main({advantages: this, ...this.args, ...args})
                                .on(emt.emit);
                        }
                        else {
                            obs = module[this.source.name || "default"]({advantages: this, ...this.args, ...args})
                                .on(emt.emit);
                        }
                    });
                    return (...args) => {
                        loader(...args);
                        obs && obs(...args);
                    }
                });
            }
        }
    }

    static create({
                      relative = "./",
                      parent = null,
                      loader = Loader.default,
                      factory,
                      schema
    }) {
        return factory.create( { relative, factory, parent, schema: schemasNormalizer(schema), loader } );
    }

    static sign(sign) {
        return ({key}) => sign === key;
    }

}