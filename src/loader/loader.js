import { REVISION as revision, PORT as port } from '../globals'

const schtypes = {
    "js": "index.js",
    "json": "index.json",
    "html": "index.html",
};

export default class Loader {

    constructor({path = "m2units/"} = {}) {
        this.rpath = path;
        this.modules = [];
    }

    obtain( { path: _path, schtype = "js" }, resourceloader ) {
        if(!_path) throw "'path' param is required";
        const path = _path + schtypes[schtype];
        const exist = this.modules.find( ({ path: _path }) => path === _path );
        if(exist) {
            return exist.module;
        }
        else {
            let module = null;
            if (schtype === "html") {
                module = resourceloader(resourceloader, {path: _path + '/'}, {url: schtypes[schtype], type: 'html'})
                  .then( html => ({ data: html.content, pack: { path: _path + "/" } }) );
            }
            else {
                module =
                    /*todo es6 dynamic
                    eval(`import("./${this.rpath}${path}")`).then(module => {
                        emt({data: module});
                    } );
                    */
                    resourceloader(resourceloader, {path: _path + '/'}, {url: schtypes[schtype], type: 'script'}).then(({module}) => {
                        return { data: module, pack: { path: _path + "/" } };
                    } );

                    /*
                    include({path: `${this.rpath}${path}`, revision}).then(({module}) => {
                        emt( { data: module, pack: { path: _path + "/" } } );
                    } );*/
            }
            this.modules.push({module, path});
            return module;
        }
    }

    //static default = new Loader();

}

Loader.default = new Loader();