import {Observable} from "air-stream"
import { Schema } from "air-schema"
import include from "./script_like_promise"
import html from "./html"

const schtypes = {
    "js": "/index.js",
    "json": "/index.json",
    "html": "/index.html",
};

export default class Loader {

    constructor({path = "m2units/"} = {}) {
        this.rpath = path;
        this.modules = [];
    }

    obtain(src) {
        const { prop: { source: {path: _path, schtype = "js"} } } = src;
        const path = _path + schtypes[schtype];
        const exist = this.modules.find( ({ path: _path }) => path === _path );
        if(exist) {
            return exist.module;
        }
        else {
            let module = null;
            if (schtype === "html") {
                module = html({path: `${this.rpath}${path}`})
                    .map( html => src.getParser({ module: html.content }) )
            }
            else {
                module = new Observable( emt => {
                    /*todo es6 dynamic
                    eval(`import("./${this.rpath}${path}")`).then(module => {
                        emt({data: module});
                    } );
                    */
                    include({path: `${this.rpath}${path}`}).then(({module}) => {
                        emt( src.getParser( { module } ));
                    } );
                } );
            }
            this.modules.push({module, path});
            return module;
        }
    }

    //static default = new Loader();

}

Loader.default = new Loader();