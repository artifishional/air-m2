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
    const exist =
        resources
            .filter(( { type } ) => type === "language" )
            .map( ( { content } ) => content )
            .flat()
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
        if(!intl) {
            throw "'intl' can not be used here";
        }
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
                throw "some templates can not be initialized";
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
        if(!intl) {
	        throw "'intl' can not be used here";
        }
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
		    throw "some templates can not be initialized";
	    }
        return templates.join("");
    }
    throw "unsupported template type";
}

export default class ActiveNodeTarget {

    constructor(src, node, resources) {
        this.literal = src.prop.literal;
        this.resources = resources;
        this.node = node;
        this.formatters = {};
        if(this.literal) {
            this.type = "data";
        }
        else if (node.nodeType === NODE_TYPES.ELEMENT_NODE && node.tagName.toLocaleUpperCase() === 'SOUND') {
            this.type = 'sound';
            node.remove()
        } else {
            this.type = node.nodeType === NODE_TYPES.TEXT_NODE ? "data" : "active";
        }
        this.template = this.type === 'data' ? node.textContent : null;
        this.intl = null;
        this.argv = null;

        this.lazyscroll = src.prop.lazyscroll;
        if (this.lazyscroll && src.lazyscrollControlStream) {
            let lazyscrollControlStreamHook;

            const scroll = (height, offset) => {
                lazyscrollControlStreamHook({
                    action: 'scroll',
                    data: { height, offset }
                });
            };

            lazyscrollControlStreamHook = src.lazyscrollControlStream.at(([{ elements }]) => {
                if (this.lazyscroll !== true) {
                    node.firstElementChild.style.height = +this.lazyscroll * elements + 'px';
                    scroll(node.offsetHeight, node.scrollTop);
                } else {
                    const observer = new MutationObserver((list) => {
                        const height = node.firstElementChild.firstElementChild && node.firstElementChild.firstElementChild.offsetHeight;
                        if (height) {
                            lazyscrollControlStreamHook({
                                action: 'setElementHeight',
                                data: { height }
                            });
                            node.firstElementChild.style.height = +height * elements + 'px';
                        }
                        scroll(node.offsetHeight, node.scrollTop);
                        observer.disconnect();
                    });
                    observer.observe(node.firstElementChild, { childList: true });
                }

            });
            const scrollHandler = (evt) => {
                scroll(evt.target.offsetHeight, node.scrollTop);
            };
            node.addEventListener('scroll', scrollHandler);
        }

    }

    transition(intl) {
        //todo perf hack
        if(this.intl && intl.locale === this.intl.locale && intl.currency === this.intl.currency) {
            return;
        }
        const formattersRes = this.resources.find(({type}) => type === "intl");
        //todo if optional provides formatters
        if(formattersRes) {
            if(!this.formatters[intl.locale]) {
                this.formatters[intl.locale] = formattersRes.content.slice(1)
                    .reduce( (acc, [ name, options ]) => {
                        const formatter =
                            new Intl.NumberFormat(intl.locale, { currency: intl.currency, ... options });
                        acc[name] = (value) => {
                            if(value === undefined) {
                                return "";
                            }
                            if(isNaN(+value)) {
                                return formatter.format(0).replace( "0", value );
                            }
                            return formatter.format(value);
                        };
                        return acc;
                    } , {} );
            }
        }
        if(this.literal && this.literal.litterals.length) {
            const language = this.resources.filter( ({type}) => type === "language");
            this.genLiterals = this.literal.litterals.map(
                name => language
                    .map( ({ content }) => content )
                    .flat()
                    .find( ([ x ]) => x === name)[1][intl.locale]
            );
        }
        this.intl = { ...intl };
        this.argv && this.update(this.argv);
    }

    update(argv) {
        this.argv = argv;
        if(this.intl && this.type === "data") {
            if(this.literal) {
                try {
                    this.node.textContent = this.literal.operator(
                        argv, this.genLiterals, this.formatters[this.intl.locale]
                    );
                }
                catch (e) {
                    /*<@debug>*/
                    this.node.textContent = "Could not parse literal or stream data error";
                    /*</@debug>*/
                }
            }
            else {
                try {
                    /*<@debug>*/
                    console.warn("Current literal form is deprecated now: ", this.template);
                    /*</@debug>*/
                    this.node.textContent = templater( this.template, this.intl, argv, this.resources );
                }
                catch (e) {}
            }
        }
    }

}