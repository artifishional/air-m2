import {Observable} from "air-stream"
import {routeNormalizer, schemasNormalizer} from "../utils/index"

export default class Advantages {

    constructor({
        parent,
        factory,
        loader,
        maintainer,
        pack = {path: "./"},
        schema: [key, {sign = Advantages.sign, source = {}, ...args}, ...advs]
    }) {
        this.pack = { path: source && source.hasOwnProperty("path") ?
            source.path
                .replace(".json", "")
                .replace(".js", "")
                .replace("./", "") + "/" :
            pack.path
        };
        this.key = key;
        this.factory = factory;
        this.sign = sign;
        this.maintainer = maintainer;
        this.loader = loader;
        this.source = source;
        this.parent = parent;
        this.item = advs
            .map(schema => factory.create({pack: this.pack, maintainer, factory, parent: this, schema, loader}));
        this.args = args;
        this.state = {load: !source.hasOwnProperty("path")};
        this.linkers = [];
    }

    static sign(sign) {
        return ({key}) => sign === key;
    }

    /**
     *
     * @param route
     * @returns {*}
     * @example {route: "./../../state/{type: loto20_80}"}/
     * @param args
     */
    obtain({route = "", ...args} = {}) {
        return this._obtain({route: routeNormalizer(route), ...args});
    }

    get({route = ""} = {}) {
        return this._get({route: routeNormalizer(route)});
    }

    _get({route: [key, ...route]}) {

        if (key) {
            if (key === "..") {
                return this.parent._get({route});
            }
            else {//todo need layers

                if (!this.state.load) {
                    return new Observable((emt) => {
                        return this._get({route: []}).on(() => {
                            return this._get({route: [key, ...route]}).on(emt);
                        });
                    });
                }

                else {
                    const node = this.item.find(this.sign(key));
                    if (node) {
                        return node._get({route});
                    }
                    else {
                        throw `module "${key}" not found`;
                    }
                }
            }
        }
        else {
            if (!this.state.load) {
                return new Observable((emt) => {
                    return this.loader.obtain(this).on(({module, advantages}) => {
                        const exist = module[this.source.name || "default"];
                        if (Array.isArray(exist)) {
                            const [, {source, ...args}, ...advs] = schemasNormalizer(exist);
                            source && (advantages.source = source);
                            advantages.args = args;
                            const {factory, loader} = advantages;
                            advantages.item.push(...advs.map(schema =>
                                factory.create({
                                    pack: advantages.pack,
                                    maintainer: advantages.maintainer,
                                    factory,
                                    parent: advantages,
                                    schema,
                                    loader
                                })));
                        }
                        else {
                            advantages.source = exist;
                        }
                        advantages.state.load = true;
                        emt({advantages, source: advantages.source});
                    });
                });
            }
            return new Observable(emt => {
                emt({advantages: this, source: this.source});
            });
        }
    }

    _obtain({route, ...args}) {
        return this.maintainer(this._get( {route} ), args);
    }

    toSCHEMA() {
        return [this.key, {
            linkers: this.linkers,
            source: this.source, ...this.args
        }, ...this.item.map(ch => ch.toSCHEMA())];
    }

}