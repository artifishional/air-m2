import { stream } from "air-stream"
import { Schema } from "air-schema"
import {routeNormalizer} from "../utils/index"
import { signature, equal } from "../utils"
import { Loader } from "../loader"

export default class LiveSchema extends Schema {

    constructor([ key, { id = "", source = {}, pack, ...prop }, ...item], src = null) {
        super( [ key, {
	        id,
            source,
            ...prop,
            pack: {
                path: pack && pack.path || (source.hasOwnProperty("path") ?
                    source.path + "/" : src && src.prop.pack.path || "./")
            },
        }, ...item ] );
        this.src = src;
        this.isready = !source.hasOwnProperty("path");
        this.id = `#${id}`;
        this.entities = [];
        this._stream = null;
    }
	
	mergeProperties( name, value ) {
        if(name === "source") {
            return this.prop.source;
        }
        else {
            return super.mergeProperties( name, value );
        }
    }

    pickToState( state ) {
        return this.item.find( ([ key ]) => signature(key, state) );
    }

    findId(id) {
        return this.item.find( ({prop}) => prop.id === id );
    }

    /**
     * todo temporary solution
     * the parser should create layers with packages
     */

    load( emt, { sweep } ) {
        const nextToLoad = this.layers.find( ( { isready } ) => !isready );
        if( nextToLoad ) {
            sweep.add(Loader.default.obtain( nextToLoad ).at(( { data, pack } ) => {
	            nextToLoad.isready = true;
                this.appendData( { data, pack } );
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
            else {
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
	
	createEntity() { throw "io" }
    
    entity( args ) {
        let exist = this.entities.find( ({ signature }) => equal( signature, args ) );
        if(!exist) {
            exist = this.createEntity( args );
	        this.entities.push( exist );
        }
        return exist;
    }

    _obtain({route, ...args}) {
        return stream( (emt, { over, sweep }) =>
            sweep.add(this._get( {route} ).at((evt, src) => {
                over.add(evt.entity(args).at(emt));
            }))
        );
    }

}