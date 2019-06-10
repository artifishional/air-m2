import {NODE_TYPES} from "./def"
import { getfrompath } from "../../utils"


class NumberFormat {

    constructor( locale, { splitter = null, ...options } = {} ) {
        this.formatter = new Intl.NumberFormat( locale, options );
        this.splitter = splitter;
    }

    format(num) {
        return this.formatter.format(num);
    }

}

function getformat( name, resources ) {
    const exist = [].concat(
        ...resources
            .filter(( { type } ) => type === "intl" )
            .map( ( { content } ) => content.slice(1) )
    )
        .find( ([ _name ]) => _name === name );
    if(!exist) {
        return `formatter '${name}' not found`
    }
    else return exist[1];
}

function getlang( name, resources, intl ) {
    const exist = [].concat(
        ...resources
            .filter(( { type } ) => type === "language" )
            .map( ( { content } ) => content.slice(1) )
    )
        .find( ([ _name ]) => _name === name );
    if(!exist) {
        return `literal '${name}' not found`
    }
    else return exist[1][intl.locale];
}

function gtemplate(str = "", ct = 0) {
    const len = str.length;
    let res = [];
    let srt = 0;
    let pfx = 0;
    let layer = 0;
    while (ct < len) {
        if(str[ct] === "{") {
            if(!layer) {
                if(pfx < ct) {
                    res.push( { type: "other", vl: str.substring(pfx, ct) } );
                }
                srt = ct;
            }
            layer ++ ;
        }
        if(str[ct] === "}") {
            if(layer > 0) {
                layer -- ;
            }
            if(!layer) {
                pfx = ct+1;
                res.push( { type: "template", vl: str.substring(srt, pfx) } );
            }
        }
        ct ++ ;
    }
    if(pfx < ct) {
        res.push( { type: "other", vl: str.substring(pfx, ct) } );
    }
    return res;
}

function gtargeting(parent, res = []) {
    [...parent.childNodes].map(node => {
        if(node.tagName === "style") { }
        else if(node.nodeType === 3) {
            const nodes = gtemplate(node.nodeValue)
                .map( ({ vl, type }) => ({ vl, type, target: new Text(vl) }) );
            const targeting = nodes.filter(({type}) => type === "template");
            res.push(...targeting);
            if(targeting.length) {
                node.before(...nodes.map(({target}) => target));
                node.remove();
            }
        }
        else if(node.nodeType === 1) {
            gtargeting(node, res);
        }
    });
    return res;
}

function templater(vl, intl = null, argv, resources) {
    
    function filler(template, argv) {
        if(template.search(/\([\[\]a-zA-Z\-_.0-9]*\)/) > -1) {
            return filler(template.replace(/\(([[\]a-zA-Z\-_.0-9]*)\)/g, ( _, path ) => {
                return getfrompath( argv, path );
            }), argv);
        }
        else return template;
    }
    
    if(vl.indexOf("intl") === 1) {
        if(!intl) return null;
        const [_, name, template] = vl.match(/^{intl.([a-zA-Z0-9_\-]*),(.*)}$/);
        const format = getformat( name, resources );
        format.currency = format.currency || intl.currency;
        if(!isNaN(+template)) {
            const formatter = new NumberFormat(intl.locale, format);
            return formatter.format(+template);
        }
        else if(template.search(/\([\[\]a-zA-Z\-_.0-9]*\)/) > -1) {
            const res = filler(template, argv);
            const formatter = new NumberFormat(intl.locale, format);
            return formatter.format(res);
        }
        else {
            const formatter = new NumberFormat(intl.locale, {
                ...format,
                minimumIntegerDigits: 1,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });
            const templates = gtemplate(template).map( ({ vl, type }) => {
                if(type === "template") {
                    return templater(vl, intl, argv, resources);
                }
                else {
                    return vl;
                }
            } );
            if(templates.some(x => x === null)) {
                return null;
            }
            return formatter.format(0).replace( "0", templates.join("") );
        }
    }
    else if(vl.search(/\([\[\]a-zA-Z\-_.0-9]*\)/) > -1) {
        return vl.replace(/{(.*)}/, (_, lit) => {
            return filler( lit, argv );
        });
    }
    else if(vl.indexOf("lang") === 1) {
        if(!intl) return null;

        const [_, name] = vl.match(/^{lang\.([a-zA-Z0-9_\-]*)}$/);
        const template = getlang(name, resources, intl);

        const templates = gtemplate(template).map( ({ vl, type }) => {
            if(type === "template") {
                return templater(vl, intl, argv, resources);
            }
            else {
                return vl;
            }
        } );
        if(templates.some(x => x === null)) {
            return null;
        }
        return templates.join("");
    }
    throw "unsupported template type";
}

export default class ActiveNodeTarget {

    constructor(node, resources) {
        this.resources = resources;
        this.node = node;
        if (node.nodeType === NODE_TYPES.ELEMENT_NODE && node.tagName.toLocaleUpperCase() === 'SOUND') {
            this.type = 'sound'
        } else {
            this.type = node.nodeType === NODE_TYPES.TEXT_NODE ? "data" : "active";
        }
        this.template = this.type === 'data' ? node.textContent : null;
        this.intl = null;
    }

    transition(intl) {
        this.intl = intl;
    }

    update(argv) {
        if(this.type === "data") {
            this.node.textContent = templater( this.template, this.intl, argv, this.resources );
        }
    }

}