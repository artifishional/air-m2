import { stream, combine } from "air-stream"
import { Schema } from "air-schema"
import { routeNormalizer, signature, equal } from "../utils"
import { Loader } from "../loader"

export default class LiveSchema extends Schema {

    constructor(
        [ key, { id = "", use = [], pack = { path: "./" }, ...prop }, ...item],
        src = { acid: -1 },
        { acid } = {}
    ) {
        super( [ key, { id, ...prop, use, pack, }, ...item ], {}, { acid } );
        this.src = this.parent = src;
        this.isready = !use.length;
        this.entities = [];
        this._stream = null;
    }

    mergeProperties( name, value ) {
        if(["use", "id"].includes(name)) {
            return this.prop[name];
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

    findByKey(key) {
        return this.item.find( ({key:x}) => x === key );
    }

    /**
     * todo temporary solution
     * the parser should create layers with packages
     */

    load( emt, { sweep } ) {
        const nextToLoad = this.layers.find( ( { isready } ) => !isready );
        if( nextToLoad ) {
            const loader = combine( nextToLoad.prop.use.map( ({ type = "url", ...use }) =>
                type === "url" ? Loader.default.obtain( use ) : this.get( use.path )
            ));
            sweep.add(loader.at(( packs ) => {
                packs.map( (pkj, index) => {
                    const { type = "url" } = nextToLoad.prop.use[index];
                    if(type === "url") {
                        this.appendData( pkj, nextToLoad.src );
                    }
                    else {
                        this.merge( pkj );
                    }
                } );
                nextToLoad.isready = true;
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
            if(key[0] === "@") {
                if(this.key === key.substr(1)) return this._get({route}, from);
                const exist = this.findByKey(key.substr(1));
                if(exist) return exist._get({route}, from);
                if(!this.parent) throw `module "@${key}" not found from ${from}`;
                return this.parent._get({route: [key, ...route]}, from);
            }
            else if(key[0] === "#") {
                if(this.id === key) return this._get({route}, from);
                const exist = this.findId(key.substr(1));
                if(exist) return exist._get({route}, from);
                if(!this.parent) throw `module "#${key}" not found from ${from}`;
                return this.parent._get({route: [key, ...route]}, from);
            }
            else if(key[0] === "(") {
                if(this.key === key) return this._get({route}, from);
                const exist = this.findSignature(key);
                if(exist) return exist._get({route}, from);
                if(!this.parent) throw `module "#${key}" not found from ${from}`;
                return this.parent._get({route: [key, ...route]}, from);
            }
            if (key === "..") {
                if(this.prop.glassy) {
	                return this.parent._get({route: [ key, ...route ]}, from);
                }
                else {
	                return this.parent._get({route}, from);
                }
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

    findEntity(args) {
        return this.entities.find( ({ signature }) => equal( signature, args ) );
    }

    entity( { $ = {}, ...args } ) {
        let exist = this.findEntity(args);
        if(!exist) {
            exist = {
                entity: this.createEntity( { $, ...args } ),
                signature: args,
            };
            this.entities.push( exist );
        }
        return exist.entity;
    }

    _obtain({route, ...args}) {
        return stream( (emt, { over, sweep }) =>
            sweep.add(this._get( {route} ).at((evt, src) => {
                over.add(evt.entity(args).on(emt));
            }))
        );
    }

}