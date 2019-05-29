import { stream } from "air-stream"
import include from "./script_like_promise"
import html from "./html"

const schtypes = {
    "js": "/index.js",
    "json": "/index.json",
    "html": "/index.html",
};

const revision = document.currentScript.getAttribute('revision')

export default class Loader {

    constructor({path = "m2units/"} = {}) {
        this.rpath = path;
        this.modules = [];
    }

    obtain( { path: _path, schtype = "js" } ) {
        if(!_path) throw "'path' param is required";
        const path = _path + schtypes[schtype];
        const exist = this.modules.find( ({ path: _path }) => path === _path );
        if(exist) {
            return exist.module;
        }
        else {
            let module = null;
            if (schtype === "html") {
                module = html({path: `${this.rpath}${path}`, revision})
                    .map( html => ({ data: html.content, pack: { path: _path + "/" } }) )
            }
            else {
                module = stream( emt => {
                    /*todo es6 dynamic
                    eval(`import("./${this.rpath}${path}")`).then(module => {
                        emt({data: module});
                    } );
                    */
                    include({path: `${this.rpath}${path}`, revision}).then(({module}) => {
                        emt( { data: module, pack: { path: _path + "/" } } );
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