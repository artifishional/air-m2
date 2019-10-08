import { stream, combine } from "air-stream"
import { Schema } from "air-schema"
import {routeNormalizer, signature, equal, forEachFromData} from "../utils"
import { Loader } from "../loader"
import {EMPTY_OBJECT} from "../def";

const {document} = window;

export default class LiveSchema extends Schema {

    constructor(
        [ key, { id = "", use = [], pack = { path: "./" }, ...prop }, ...item],
        src = {  },
        { acid } = {}
    ) {
        src.acid = src.acid || -1;
        super( [ key, { id, ...prop, use, pack, }, ...item ], src, { acid } );
        // todo разобраться с src
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

    load( resolver ) {
        const nextToLoad = this.layers.find( ( { isready } ) => !isready );
        if( nextToLoad ) {
            const loader = Promise.all( nextToLoad.prop.use.map( ({ type = "url", ...use }) =>
                  type === "url" ? Loader.default.obtain(use, this.resourceloader) : this.get(use.path)
            ));
            loader.then(( packs ) => {
                packs.map( (pkj, index) => {
                    const { type = "url" } = nextToLoad.prop.use[index];
                    if(type === "url") {
                        this.appendData( pkj, nextToLoad.src );
                    }
                    else {
                        this.merge( pkj, true );
                    }
                } );
                nextToLoad.isready = true;
                this.load( resolver );
            });
        }
        else {
            resolver( this );
        }
    }

    /**
     *
     * @param route
     * @param signature signature props
     * @param $ common props
     * @returns stream.<LiveSchema>
     */
    obtain(route = "", signature, $) {
        const normilizedRoute = routeNormalizer(route);
        if(normilizedRoute[1] !== EMPTY_OBJECT) {
            signature = { ...normilizedRoute[1], ...signature };
        }
        return this._obtain(normilizedRoute[0], signature, $);
    }

    get(route = "") {
        const normilizedRoute = routeNormalizer(route);
        return this._get(normilizedRoute[0]);
    }

    get stream() {
        if(this.leadlayer !== this) {
            return this.leadlayer.stream;
        }
        return this._stream || (this._stream = new Promise( resolver => this.load(resolver) ));
    }

    _get([key, ...route], from = {src: this, route: [key, ...route] }) {
        if (key) {
            if(key[0] === "@") {
                if(this.key === key.substr(1)) return this._get(route, from);
                const exist = this.findByKey(key.substr(1));
                if(exist) return exist._get(route, from);
                if(!this.parent) throw `module "@${key}" not found from ${from}`;
                return this.parent._get([key, ...route], from);
            }
            else if(key[0] === "#") {
                if(this.id === key) return this._get(route, from);
                const exist = this.findId(key.substr(1));
                if(exist) return exist._get(route, from);
                if(!this.parent) throw `module "#${key}" not found from ${from}`;
                return this.parent._get([key, ...route], from);
            }
            else if(key[0] === "(") {
                if(this.key === key) return this._get(route, from);
                const exist = this.findSignature(key);
                if(exist) return exist._get(route, from);
                if(!this.parent) throw `module "#${key}" not found from ${from}`;
                return this.parent._get([key, ...route], from);
            }
            if (key === "..") {
                if(this.prop.glassy) {
	                return this.parent._get([ key, ...route ], from);
                }
                else {
	                return this.parent._get(route, from);
                }
            }
            else {
                return this.stream.then(() => {
                    const node = this.pickToState(key);
                    if (node) {
                        return node._get(route, from);
                    }
                    else {
                        throw `module "${key}" not found from ${from}`;
                    }
                })
            }
        }
        else {
            return this.stream;
        }
    }

	createEntity() { throw "io" }

    findEntity(signature) {
        return this.entities.find( ({ signature: x }) => equal( x, signature ) );
    }

    entity( signature, $ ) {
        let exist = this.findEntity( signature );
        if(!exist) {
            exist = {
                entity: this.createEntity( signature, $ ),
                signature,
            };
            this.entities.push( exist );
        }
        return exist.entity;
    }

    _obtain(route, signature = EMPTY_OBJECT, $) {
        if(signature.hasOwnProperty("$")) {
            console.warn(`Current call form is obsolete`);
            $ = { ...$, ...signature.$ };
            delete signature.$;
        }
        return stream( (emt, { over }) =>
            this._get( route ).then( vertex => {
                over.add(vertex.entity(signature, $).on(emt));
            })
        );
    }

}
