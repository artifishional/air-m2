import include from "./script_like_promise"
import html from "./html"
import { REVISION as revision, PORT as port } from '../globals'
import loadResource from "./resource";
import Loader from "air-m2/src/loader/loader";

const schtypes = {
  "js": "/index.js",
  "json": "/index.json",
  "html": "/index.html",
};

export default class LoaderFileSystem {

  constructor({path = "node_modules/"} = {}) {
    this.rpath = path;
    this.modules = [];
    this.loadResource = loadResource;
  }

  obtain( { path: _path, schtype = "js" } ) {
    console.log('before', _path);
    if(!_path) throw "'path' param is required";
    let [pathHead, ...pathRest] = _path.split('/').filter(part => part !== '.' && part !== '..');
    pathRest = pathRest && pathRest.join('/') || '';
    const path = pathHead + '/m2unit/' + pathRest + schtypes[schtype];
    const exist = this.modules.find( ({ path: _path }) => path === _path );
    if(exist) {
      return exist.module;
    }
    else {
      let module = null;
      if (schtype === "html") {
        module = html({loadResource, path: `${this.rpath}${path}`, revision, port})
          .then( html => ({ data: html.content, pack: { path: _path + "/" } }) )
      }
      else {
        module =
          /*todo es6 dynamic
          eval(`import("./${this.rpath}${path}")`).then(module => {
              emt({data: module});
          } );
          */


          include({loadResource, path: `${this.rpath}${path}`, revision, port}).then(({module}) => {
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
