import {Observable, combine, stream} from "air-stream"
import include from "./script_like_promise"
import json from "./json"
import html from "./html"
import { Schema } from "air-schema"

const schtypes = {
    "js": ".js",
    "json": "/index.json",
    "html": "/index.html",
};

let pid = 0;
function transform( node, item = [] ) {
    const schema = new Schema(JSON.parse( node.getAttribute("data-m2") ) ).mergeIfExistAt( item ).toJSON();
    const [name, { source, model = "", template = false, resources = [], handlers: hns = {}, ...props } = {}, ..._item ] = schema;
    const md = model.replace("$name", name);
    pid++;
    const handlers = [...node.attributes, ...Object.keys(hns).map( name => ({ name, value: 1, nodeValue: hns[name] }) )]
        .filter(({name}) => ["onpointermove", "onclick"].includes(name))
        .filter(({value}) => value )
        .map( ({ name, nodeValue }) => ({ name: name.replace(/^on/, ""), hn: new Function("event", "schema", "action", nodeValue) }) );
    handlers.map( ({name}) => node.removeAttribute("on" + name) );
    const m2data = [ name, { model: md, handlers, source, template, node, resources, ...props, pid } ];
    node.setAttribute("data-m2", JSON.stringify([ name, { source, ...props } ]));
    vertextes( node, m2data, _item );
    return m2data;
}

//todo need refactor
function vertextes(parent, exist = [], item) {
    return [...parent.children].reduce( (acc, node) => {
        if(node.tagName === "img") {
            //const [ name, props = {} ] = JSON.parse(node.getAttribute("data-m2") || "[]");
            node.setAttribute("data-m2", JSON.stringify([
                "*", { resources: [ {type: "img", url: node.getAttribute("src") } ]}])
            );
        }
        /*
        if(node.tagName === "link" && node.getAttribute("rel") === "stylesheet") {
            exist[1].resources.push( {type: "style", url: node.getAttribute("href") } );
            node.remove();
            return acc;
        }*/
        if(node.getAttribute("data-m2")) {
            const m2data = transform(node, item);

            if(!m2data[1].template && exist[1].type !== "switcher") {
                const placer = document.createElement("div");
                placer.setAttribute("data-pid", m2data[1].pid );
                node.parentNode.replaceChild(placer, node);
            }
            node.remove();
            acc.push( m2data );
        }
        else {
            vertextes(node, exist, item);
        }
        return acc;
    }, exist);
}

export default class Loader {

    constructor({path = "m2units/"} = {}) {
        this.rpath = path;
        this.modules = [];
        window.m2unit = {};
    }

    obtain(advantages) {
        const {source: {path: _path, schtype = "js", description = false}} = advantages;
        const path = _path + schtypes[schtype];
        const exist = this.modules.find( ({ path: _path }) => path === _path );
        if(exist) {
            return exist.module;
        }
        else {
            let module = null;
            if (schtype === "html") {
                module = combine( [
                    html({path: `${this.rpath}${path}`}),
                    description && json({path: this.rpath + _path + "/description.json"}) || stream( emt => emt( { content: [ "N/A" ] } ) ),
                ], (html, desc) => ({module: {default: transform(html.content, [ desc.content ]) }, advantages} ));
            }
            else {
                module = new Observable( emt => {
                    /*todo es6 dynamic
                    eval(`import("./${this.rpath}${path}")`).then(module => {
                        emt({data: module});
                    } );
                    */
                    include({path: `${this.rpath}${path}`}).then(({module}) => {
                        emt({module: module || window.m2unit, advantages});
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