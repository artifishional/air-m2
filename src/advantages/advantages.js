import {Observable} from "air-stream"
import Loader from "../loader/loader"

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
            .map( schema => factory.create( { factory, parent: this, schema, loader } ) );
        this.args = args;
        this.state = { load: !source.hasOwnProperty("path") };
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

    get({route: [ key, ...route ] }) {
        if(key) {
            if(key === "..") {
                return this.parent.get({ route });
            }
            else {
                const node = this.item.find( this.sign(key) );
                if(node) {
                    return node.get({ route });
                }
                else {
                    if(!this.state.load) {
                        return new Observable( (emt) => {
                            return this.get( {route: []} ).on( () => {
                                return this.get( {route: [ key, ...route ]} ).on( emt );
                            } );
                        } );
                    }
                    else {
                        throw `module "${key}" not found`;
                    }
                }
            }
        }
        else {
            if(!this.state.load) {
                return new Observable( (emt) => {
                    return this.loader.obtain(this).on( ({module, advantages}) => {
                        const exist = module[this.source.name || "default"];
                        if(Array.isArray(exist)) {
                            const [, {source} , ...advs] = schemasNormalizer(exist);
                            source && (advantages.source = source);
                            const {factory, loader} = this;
                            this.item = advs.map( schema =>
                                factory.create( { factory, parent: advantages, schema, loader } ) );
                        }
                        else {
                            advantages.source = exist;
                        }
                        this.state.load = true;
                        return this.get( {route: [ ]} ).on(emt);
                    });
                } );
            }
            return new Observable( emt => {
                emt( {advantages: this, source: this.source } );
            } );
        }
    }

    _obtain({route: [ key, ...route ], ...args}) {
        return new Observable( (emt) => {
            return this.get( {route: [ key, ...route ], ...args} ).on( ({module, advantages}) => {
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

    toSCHEMA() {
        return [ this.key, { source: this.source, ...this.args }, ...this.item.map( ch => ch.toSCHEMA() ) ];
    }

    static create({
                      parent = null,
                      loader = Loader.default,
                      factory,
                      schema
                  }) {
        return factory.create( { factory, parent, schema: schemasNormalizer(schema), loader } );
    }

    static sign(sign) {
        return ({key}) => sign === key;
    }

}