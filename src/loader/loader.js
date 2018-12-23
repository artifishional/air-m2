import {Observable, combine, stream} from "air-stream"
import include from "./script_like_promise"
import json from "./json"
import html from "./html"
import { Schema } from "air-schema"
import JSON5 from "json5"

const mouseEvents = [
    "onclickoutside",
    "onpointermove",
    "onclick",
    "onpointerenter",
    "onpointerleave",
    "onglobalkeydown",
    "onglobalkeyup",
    "onkeydown",
    "onkeyup",
];

const schtypes = {
    "js": "/index.js",
    "json": "/index.json",
    "html": "/index.html",
};

let pid = 0;
function transform( node, item = [], _path ) {
    const schema = new Schema(JSON5.parse( node.getAttribute("m2") ) ).subscription( item ).toJSON();
    const [name, { source, frames, model = "", template = false, resources: res = [], handlers: hns = {}, ...props } = {}, ..._item ] = schema;
    const md = typeof name === "string" ?
        model.replace("$name", name) :
        model.replace("$name", JSON.stringify(name));

    const resources = frames && frames.reduce((acc, [name, { sound } = {}]) => {
        return sound ? [...acc, { type: "sound", rel: `${sound}`, name: sound }] : acc
    }, res) || res;

    pid++;
    const handlers = [...node.attributes, ...Object.keys(hns).map( name => ({ name, value: 1, nodeValue: hns[name] }) )]
        .filter(({name}) => mouseEvents.includes(name))
        .filter(({value}) => value )
        .map( ({ name, nodeValue }) => ({ name: name.replace(/^on/, ""), hn: new Function("event", "options", "action", "key", nodeValue) }) );
    handlers.map( ({name}) => node.removeAttribute("on" + name) );
    const m2data = [ name, { model: md, frames, handlers, source, template, node, resources, ...props, pid } ];
    node.setAttribute("m2", JSON.stringify([ name, { source, ...props } ]));
    vertextes( node, m2data, _item, _path );
    return m2data;
}

let imgcounter = 0;

//todo need refactor
function vertextes(parent, exist = [], item, _path) {
    return [...parent.children].reduce( (acc, node, index) => {
        if(node.tagName === "IMG") {
            //const [ name, props = {} ] = JSON.parse(node.getAttribute("m2") || "[]");
            node.setAttribute("m2", JSON.stringify([
                `*${imgcounter++}`, { resources: [ {type: "img", url: node.getAttribute("src") } ]}
            ]));
            item = [];
        }
        /*
        if(node.tagName === "link" && node.getAttribute("rel") === "stylesheet") {
            exist[1].resources.push( {type: "style", url: node.getAttribute("href") } );
            node.remove();
            return acc;
        }*/
        if(node.getAttribute("m2")) {
            const m2data = transform(node, item, _path);

            if(!m2data[1].template && exist[1].type !== "switcher") {
                const placer = document.createElement("div");
                placer.setAttribute("data-pid", m2data[1].pid );
                node.parentNode.replaceChild(placer, node);
            }
            node.remove();
            acc.push( m2data );
        }
        else {
            vertextes(node, exist, item, _path);
        }
        return acc;
    }, exist);
}

export default class Loader {

    constructor({path = "m2units/"} = {}) {
        this.rpath = path;
        this.modules = [];
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
                ], (html, desc) => ({module: {default: transform(html.content, [ desc.content ], _path) }, advantages} ));
            }
            else {
                module = new Observable( emt => {
                    /*todo es6 dynamic
                    eval(`import("./${this.rpath}${path}")`).then(module => {
                        emt({data: module});
                    } );
                    */
                    include({path: `${this.rpath}${path}`}).then(({module}) => {
                        emt({module, advantages});
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