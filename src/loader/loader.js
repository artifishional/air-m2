import {Observable} from "air-stream"
import include from "./script_like_promise"

export default class Loader {

    constructor({path = "m2units/"} = {}) {
        this.rpath = path;
        this.modules = [];
        window.m2unit = {};
    }

    obtain(advantages) {
        const {source: {path}} = advantages;
        const exist = this.modules.find( ({ path: _path }) => path === _path );
        if(exist) {
            return exist.module;
        }
        else {
            const module = new Observable( emt => {
                /*todo es6 dynamic
                eval(`import("./${this.rpath}${path}")`).then(module => {
                    emt.complete({data: module});
                } );
                */
                include({path: `${this.rpath}${path}`}).then(module => {
                    emt.complete({module: window.m2unit, advantages});
                } );
            } );
            this.modules.push({module, path});
            return module;
        }
    }

    static default = new Loader();

}