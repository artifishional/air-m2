import {Observable} from "air-stream"
import {schemasNormalizer, routeNormalizer} from "../utils/index"

export default class Advantages {

    constructor( {
         parent,
         factory,
         loader,
         maintainer,
         schema: [ key, {sign = Advantages.sign, source = {}, ...args}, ...advs ]
     }) {
        this.key = key;
        this.factory = factory;
        this.sign = sign;
        this.maintainer = maintainer;
        this.loader = loader;
        this.source = source;
        this.parent = parent;
        this.item = advs
            .map( schema => factory.create( { maintainer, factory, parent: this, schema, loader } ) );
        this.args = args;
        this.state = { load: !source.hasOwnProperty("path") };
        this.linkers = [];
    }

    /**
     *
     * @param route
     * @returns {*}
     * @example {route: "./../../state/{type: loto20_80}"}/
     * @param args
     */
    obtain({ route = "", ...args } = {}) {
        return this._obtain({ route: routeNormalizer(route), ...args });
    }

    get( { route = "" } ) {
        return this._get({ route: routeNormalizer(route) });
    }

    _get({route: [ key, ...route ] }) {
        if(key) {
            if(key === "..") {
                return this.parent._get({ route });
            }
            else {//todo need layers
                const node = this.item.find( this.sign(key) );
                if(node) {
                    return node._get({ route });
                }
                else {
                    if(!this.state.load) {
                        return new Observable( (emt) => {
                            return this._get( {route: [] } ).on( () => {
                                return this._get( {route: [ key, ...route ] } ).on( emt );
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
                            const [, {source, ...args} , ...advs] = schemasNormalizer(exist);
                            source && (advantages.source = source);
                            advantages.args = args;
                            const {factory, loader} = this;
                            this.item = advs.map( schema =>
                                factory.create( {
                                    maintainer: this.maintainer,
                                    factory,
                                    parent: advantages,
                                    schema,
                                    loader
                                } ) );
                        }
                        else {
                            advantages.source = exist;
                        }
                        this.state.load = true;
                        emt( {advantages: this, source: this.source } );
                    });
                } );
            }
            return new Observable( emt => {
                emt( {advantages: this, source: this.source } );
            } );
        }
    }

    _obtain(args) {
        return this.maintainer( this, args );
    }

    toSCHEMA() {
        return [ this.key, {
            linkers: this.linkers,
            source: this.source, ...this.args
        }, ...this.item.map( ch => ch.toSCHEMA() ) ];
    }

    static sign(sign) {
        return ({key}) => sign === key;
    }

}