import {Observable} from "air-stream"
import {concatPath} from "../utils";
import include from "./script_like_promise"

export default class Loader {

    constructor({path = "m2units/"} = {}) {
        this.rpath = path;
        this.modules = [];
        window.m2unit = {};
    }

    obtain({relative, source: {path}}) {
        const exist = this.modules.find( ({ path: _path }) => path === _path );
        if(exist) {
            return exist.module;
        }
        else {
            const module = new Observable( emt => {
                /*todo es6 dynamic
                eval(`import("./${this.rpath}${concatPath(relative, path)}")`).then(module => {
                    emt.complete({data: module});
                } );
                */
                include(`${this.rpath}${concatPath(relative, path)}`).then(module => {
                    emt.complete({data: window.m2unit});
                } );
            } );
            this.modules.push({module, path});
            return module;
        }
    }

    static default = new Loader();

}