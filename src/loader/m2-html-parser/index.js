import { routeNormalizer } from "../../utils"

let UQID = 0;

export default class Parser {

    static slot() {
        return document.createElement("M2-SLOT");
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

    /**
     *
     * @param {Element} node
     * @param sqid
     * @param path
     */
    static parse( node, { uqid = ++UQID, path = "", key: pkey = null } = {} ) {

        const slots = [];

        let key = node.getAttribute("key");

        if(key) {
            if(/[`"'{}\]\[]/.test(key)) {
                key = JSON5.parse(key);
            }
        }
        else {
            key = pkey;
        }
        
        let resources = [];

        let dir = node.getAttribute("dir");
        dir = dir && routeNormalizer(dir.toString()) || { route: "" };
        Object.keys( dir ).map( prop => dir[prop] === "key" && (dir[prop] = key) );

        const props = {
            slots,
            key,
            dir
        };

        return [
            uqid,
            props,
            ...[...node.children].reduce((acc, next)=> {

                const sqid = next.use && (path + next.use.toString()) || ++UQID;

                if(Parser.is( next, "unit" )) {

                    const slot = Parser.slot();
                    slots.push( { slot, sqid } );
                    next.replaceWith( slot );

                }

                else if (Parser.is( next, "img" )) {

                    const slot = Parser.slot();
                    slots.push( { slot, sqid } );
                    next.replaceWith( slot );
                    resources.push( { type: "image" } );

                }

                return [ ...acc, Parser.parse(next, { key, path, uqid }) ];

            }, []),
        ];

    }

}