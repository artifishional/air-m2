import { stream } from "air-stream"
import { Schema } from "air-schema"
import {routeNormalizer, schemasNormalizer, frommodule} from "../utils/index"
import { signature } from "../utils"
import { Loader } from "air-m2/src/loader"

export default class LiveSchema extends Schema {

    constructor([
        key, {
            id = "",
            pack = {path: "./"},
            source,
        }, ...item], src = {}) {

        if(source === undefined) {
            throw "azaz";
        }

        if(!(src instanceof Schema)) src.props = src;

        //const [key, {id = "", source = {}, ...args}, ...advs] = this;

        super( [ key, {
            pack: { path: source && source.hasOwnProperty("path") ? source.path + "/" : src.prop.pack.path },
            source,
        }, ...item ] );

        this.src = src;

        //obsolete
        this.advantages = this;

        //this.source = source;

        this.id = `#${id}`;

        //this.key = key;
        //this.factory = factory;

        //this.sign = sign;

        //this.factory = src.factory;

        //this.parent = src;
        //this.args = args;
        //this.schema = schema;

        this.linkers = [];
        this._stream = null;
    }

    static sign(sign) {
        if(typeof sign === "object") {
            return ({key}) => Object.keys(sign).every( prop => sign[prop] === key[prop] );
        }
        else {
            return ({key}) => sign === key;
        }
    }

    pickToState( state ) {
        return this.item.find( ([ key ]) => signature(key, state) );
    }

    findId(id) {
        return this.item.find( ({prop}) => prop.id === id );
    }

    lift( data ) {
        return new this.constructor( data, this );
    }

    load( emt, { sweep } ) {
        const last = this.layers.slice( -1 )[0];
        if( last.prop.source.hasOwnProperty("path") ) {
            sweep.add(Loader.default.obtain(this).at(( schema ) => {
                this.merge( schema );
                this.load( emt, { sweep } );
            }));
        }
        else {
            emt( this );
        }
    }

    /**
     *
     * @param route
     * @returns {*}
     * @example {route: "./../../state/{key = 55}"}/
     * @param args
     */
    obtain(route = "", args) {
        return this._obtain({...routeNormalizer(route), ...args});
    }

    get(route = "") {
        return this._get(routeNormalizer(route));
    }

    get stream() {
        return this._stream || (this._stream = stream( this.load, this ));
    }

    _get({route: [key, ...route]}, from = {src: this, route: [key, ...route] }) {
        if (key) {
            if(key[0] === "#") {
                if(this.id === key) return this._get({route}, from);
                const exist = this.findId(key);
                if(exist) return exist._get({route}, from);
                if(!this.parent) throw `module "#${key}" not found from ${from}`;
                return this.parent._get({route: [key, ...route]}, from);
            }
            if (key === "..") {
                return this.parent._get({route}, from);
            }
            else {//todo need layers
                return stream((emt, { over }) =>
                    over.add(this.stream.at(() => {
                        const node = this.pickToState(key);
                        if (node) {
                            over.add(node._get({route}, from).at(emt));
                        }
                        else {
                            throw `module "${key}" not found from ${from}`;
                        }
                    }))
                );
            }
        }
        else {
            return this.stream;
        }
    }

    _obtain({route, ...args}) {
        return stream( (emt, { over, sweep }) =>
            sweep.add(this._get( {route} ).at((evt, src) => {
                over.add(evt.advantages.maintainer(this._get( {route} ), args).on(emt));
            }))
        );
    }

    toSCHEMA() {
        return [this.key, {
            id: this.uid,
            linkers: this.linkers,
            source: this.source, ...this.args
        }, ...this.item.map(ch => ch.toSCHEMA())];
    }

}