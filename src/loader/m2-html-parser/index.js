import { routeNormalizer, routeToString } from "../../utils"
import events from "../events"
import JSON5 from "json5"

const CUT_FRAMES_REG = /\[\s*["'](.+?)["']\s*,((?:\s*{.+?}\s*,\s*)?\s*(?:\[.+?]))\s*]/gs;

let ACID = 0;

export default class Parser extends Array {

    constructor( node, {
        type = "node", path = "", key: pkey = null
    } = {} ) {
        super();

        const acid = "acid-auto-unique-key-" + ++ACID;

        let key = node.getAttribute("key");

        if(key !== null) {
            if(/[`"'{}\]\[]/.test(key)) {
                key = JSON5.parse(key);
            }
        }
        else {
            key = pkey;
        }

        const handlers = [ ...node.attributes ]
            .filter( ({ name }) => events.includes(name) )
            .map( ({ name, value }) => ({
                name: name.replace(/^on/, ""),
                hn: new Function("event", "options", "request", "key", value )
            }) );

        const resources = JSON5.parse(node.getAttribute("resources") || "[]");

        let stream = node.getAttribute("stream");
        stream = stream && routeNormalizer(stream.toString()) || { route: [] };
        stream.route = stream.route.map( seg => seg === "$key" ? key :  seg );
        Object.keys( stream ).map( prop => stream[prop] === "$key" && (stream[prop] = key) );
        stream = routeToString(stream);

        const template = ["", "false"].includes(node.getAttribute("template"));
        const sign = key !== pkey ? key : acid;
        const id = node.getAttribute("id") || "$";
        let use = (node.getAttribute("use") || "").trim();
        let [ , source = null ] = use && use.match( /^url\((.*)\)$/ ) || [];
        source && (use = null);
        source = source && { path: source, schtype: type === "custom" ? "js" : "html" } || {};

        const keyframes = [];

        this.push( sign ); //view node tree key

        this.push( this.props = {
            keyframes,      //animation ( data ) settings
            use,            //reused templates path
            template,       //template node
            id,             //tree m2 advantages id
            type,           //view node type [node -> unit, switcher -> tee]
            source,         //m2 advantages source path if module
            handlers,       //event handlers
            path,           //absolute path
            acid,           //system unique id
            node,           //xml target node
            key,            //inherited or inner key
            model: stream,  //link to model stream todo obsolete io
            resources,      //related resources
        } );

        [...node.childNodes].map( next => Parser.setup( next, this.props ));

        this.push(...[...node.children].reduce((acc, next) =>
            [...acc, ...Parser.parse( next, this.props )]
        , []));

    }

    static setup( next, { keyframes } ) {
        if(next.nodeType === 3 && !Parser.is( next.parentNode, "setup" )) {
            const templates = next.nodeValue.match(/{(?:intl|lang|argv).+?}/g);
            templates && next.replaceWith( ...templates.map(
                text => {
                    const res = document.createElement("setup");
                    res.textContent = text;
                    return res;
                }
            ));
        }
        if(Parser.is( next, "setup" )) {
            if(!Parser.is( next.parentNode.parentNode, "unit" ) ) {
                const replaced = next.parentNode;
                const unit = document.createElement("unit");
                replaced.replaceWith( unit );
                unit.append( replaced );
            }
            else {

                if(next.textContent) {
                    if(!keyframes.find(([name]) => name === "*")) {
                        keyframes.push( [ "*", [ 100 ] ] );
                    }
                }

                let keyframesAttribute = next.getAttribute("keyframes");
                if(keyframesAttribute) {

                    if(keyframesAttribute.indexOf("[") < 0) {
                        keyframesAttribute = `[[ "*", {}, [100, ${keyframesAttribute}]]]`
                    }

                    keyframesAttribute.replace(CUT_FRAMES_REG, (all, action, fn) => {
                        let exist = keyframes.findIndex(([x]) => x === action);
                        if(exist < 0) {
                            exist = keyframes.length;
                        }
                        const handler = new Function("argv", `return ["${action}", ${fn}]`);
                        keyframes[exist] = [ action, ({argv} = {}) => handler(argv) ];
                    });

                }

            }
        }
        return [...next.childNodes].map( node =>
            !Parser.is( node, "unit" ) && Parser.setup(node, { keyframes })
        );
    }

    //the workaround is tied to the querySelectorAll,
    // since it is used to extract replacement slots
    static parse(next, { resources, path, key }) {
        if(Parser.is( next, "unit" )) {
            const parser = new Parser(next, { key, path });
            const slot = Parser.slot( );
            parser.props.template ? next.remove() : next.replaceWith( slot );
            return [ parser ];
        }
        else if(Parser.is( next, "tee" )) {
            const parser = new Parser(next, {
                key, path, type: "switcher"
            });
            const slot = Parser.slot( );
            parser.props.template ? next.remove() : next.replaceWith( slot );
            return [ parser ];
        }
        else if(Parser.is( next, "plug" )) {
            const parser = new Parser(next, {
                key, path, type: "custom"
            });
            const slot = Parser.slot( );
            parser.props.template ? next.remove() : next.replaceWith( slot );
            return [ parser ];
        }
        else if (next.tagName === "IMG") {
            const slot = Parser.img( );
            next.replaceWith( slot );
            resources.push( { type: "img", url: next.getAttribute("src") } );
            return [];
        }
        else if(next.tagName === "STYLE") { }
        return [...next.children].reduce( (acc, node) =>
            [...acc, ...Parser.parse(node, { resources, path, key })]
        , []);
    }
/*
    targeting() {
        return [...this.node.querySelectorAll( "SETUP,M2-SETUP" )]
            .map(node => {
                const keyframes = JSON5.parse(node.getAttribute("keyframes") || "[]");
                let props = node.getAttribute("props");
                if (props) {
                    const cdc = new Function("key", "argv", `{return ${props}}`);
                    props = argv => cdc(key, argv);
                }
                node.remove();
                return { node, keyframes, props };
            });
    }*/

    static slot( ) {
        return document.createElement("M2-SLOT");
    }

    static img() {
        return document.createElement("M2-RES");
    }

    /**
     *
     * @param node
     * @param {String} name
     * @returns {boolean}
     */
    static is( node, name ) {
        name = name.toUpperCase();
        return [ `M2-${name}`, name ].includes( node.tagName );
    }

    entity( env ) {
        return stream();
    }

}