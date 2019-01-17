import { routeNormalizer } from "../../utils"
import events from "../events"

let UQID = 0;

export default class Parser {

    constructor( node, {
        uqid, path = "", key: pkey = null
    } = {} ) {

        const acid = "acid-auto-unique-key-" + ++UQID;
        uqid = uqid || acid;

        let key = node.getAttribute("key");

        if(key) {
            if(/[`"'{}\]\[]/.test(key)) {
                key = JSON5.parse(key);
            }
        }
        else {
            key = pkey;
        }

        const handlers = [ ...node.attributes ]
            .filter( attr => events.includes(attr) )
            .map( ({ name, value }) => ({
                name: name.replace(/^on/, ""),
                hn: new Function("event", "options", "action", "key", value )
            }) );

        const resources = JSON5.parse(node.getAttribute("resources") || "[]");

        let dir = node.getAttribute("dir");
        dir = dir && routeNormalizer(dir.toString()) || { route: "" };
        Object.keys( dir ).map( prop => dir[prop] === "$key" && (dir[prop] = key) );


        this.sign = key !== pkey ? key : acid;
        //event handlers
        this.handlers = handlers;
        //absolute path
        this.path = path;
        //slotted sign
        this.uqid = uqid;
        //system unique id
        this.acid = acid;
        //xml target node
        this.node = node;
        //inherited or inner key
        this.key = key;
        //model stream directory path
        this.dir = dir;
        //related resources
        this.resources = resources;

        this.item = [...node.children].reduce((acc, next) => {
            const use = (next.getAttribute("use") || "").toString();
            const uqid = use && (path + use) || undefined;
            if(Parser.is( next, "unit" )) {
                const parser = new Parser(next, { key, path, uqid });
                const slot = Parser.slot( parser );
                next.replaceWith( slot );
                return [ ...acc, parser ];
            }
            else if (next.tagName === "IMG") {
                next.replaceWith( slot );
                const slot = Parser.slot( { uqid } );
                resources.push( { uqid, type: "image", url: next.getAttribute("src") } );
                return acc;
            }
            return acc;
        }, []);

    }

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
    }

    static slot( { uqid } ) {
        const res =  document.createElement("M2-SLOT");
        res.setAttribute("uqid", uqid);
        return res;
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

}