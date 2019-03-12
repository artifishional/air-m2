import {Observable, stream} from "air-stream"
import {routeNormalizer, schemasNormalizer, frommodule} from "../utils/index"

let uid = 0;

export default class Advantages {

    constructor({
        parent,
        factory,
        loader,
        pack = {path: "./"},
        schema: [key, {id = "", sign = Advantages.sign, source = {}, ...args}, ...advs]
    }) {
        this.pack = { path: source && source.hasOwnProperty("path") ?
            source.path + "/" : pack.path
        };
        this.id = `#${id}`;
        this.uid = uid++;
        this.key = key;
        this.factory = factory;
        this.sign = sign;
        this.loader = loader;
        this.source = source;
        this.parent = parent;
        this.item = advs
            .map(schema => factory.create({pack: this.pack, factory, parent: this, schema, loader}));
        this.args = args;
        this.static = !source.hasOwnProperty("path");
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

    findId(id) {
        return this.item.find( ({id: _id}) => _id === id );
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
        if(!this._stream) {
            if(this.static) {
                this._stream = new Observable(emt => {
                    emt({advantages: this, source: this.source});
                });
            }
            else {
                this._stream = new Observable((emt) => {
                    return this.loader.obtain(this).at(({module, advantages}, src) => {
                        /*locked cache*/this.stream.on( () => {} );
                        let exist = module[this.source.name || "default"];
                        if(!Array.isArray(exist) && typeof exist === "object") {
                            exist = frommodule(exist);
                        }
                        if (Array.isArray(exist)) {
                            const [, {source, ...args}, ...advs] = schemasNormalizer(exist);
                            source && (advantages.source = source);
                            //fixme hack pid overwriten
                            args.pid = advantages.args.pid || args.pid;
                            advantages.args = args;
                            const {factory, loader} = advantages;
                            advantages.item.push(...advs.map(schema =>
                                factory.create({
                                    pack: advantages.pack,
                                    factory,
                                    parent: advantages,
                                    schema,
                                    loader
                                })));
                        }
                        else {
                            advantages.source = exist;
                        }
                        emt({advantages, source: advantages.source}, src);
                    });
                });
            }
        }
        return this._stream;
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
                        const node = this.item.find(this.sign(key));
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