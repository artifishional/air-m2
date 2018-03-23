import {Observable} from "air-stream"
import {concatPath} from "./utils";

export default class Loader {

    constructor({path = "m2units/"} = {}) {
        this.rpath = path;
        this.modules = [];
    }

    obtain({relative, source: {path}}) {
        const exist = this.modules.find( ({ path: _path }) => path === _path );
        if(exist) {
            return exist.module;
        }
        else {
            const module = new Observable( emt => {
                eval(`import("./${this.rpath}${concatPath(relative, path)}")`).then(module => {
                    emt.complete({data: module});
                } );
            } );
            this.modules.push({module, path});
            return module;
        }
    }

    static default = new Loader();

}