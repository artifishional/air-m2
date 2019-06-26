import { BOOLEAN } from "../def"


/**
 *
 * @param path
 * @example
 * "./" => "./"
 * "./some/joice/model_schema.js" => joice => ./some/joice/
 */
export function catalog(path) {
    return path.replace(/\w{1,}.js/g, "");
}

export function concatPath(...paths) {
    return paths.reduce( (acc, next) => next[0] === "." ? acc + next : next, "");
}

export function frommodule(module, _key = "main") {
    return [ _key,
        ...Object.keys(module).filter(key => key === "default").map( key => {
            if (typeof module[key] === "function") {
                return {source: module[key]};
            }
        }),
        ...Object.keys(module).filter(key => key !== "default").map( key => {
            if(typeof module[key] === "function") {
                return [ key, { source: module[key] } ];
            }
            else if(typeof module[key] === "object") {
                return frommodule(module[key], key);
            }
        })
    ];
}

export function forEachFromData(func) {
    return ({data, ...args}) => ({
        data: data.map( data => func({data, ...args}) ),
        ...args
    })
}

export function argvroute( route ) {
    return JSON.parse(((
        route
        .split("/")
        .filter(x => !".".includes(x))
        .slice(-1)[0] || "")
        .match( /\[.*\]/ ) || ["{}"])[0]
        .replace(/\[(.*)\]/, (_, x) => `{${x}}` )
        .replace("=", ":")
        .replace(/\"{0,1}([$0-9\-_a-zA-Z]{1,77})\"{0,1}/g, (_, x) => `"${x}"`)
    );
}

const EMPTY_ROUTE = { route: [] };

export function routeNormalizer(route) {
    if(!route) return EMPTY_ROUTE;
    try {
        return {
            route: route.split("/")
            //an empty string includes
                .map(x => x.replace(/\[.*]/, ""))
                .filter(x => !".".includes(x))
                .map(x => x[0] === "{" ? JSON.parse(x.replace(/"?([$a-zA-Z0-9\-_]+)"?/g, (_, x)=> `"${x}"`)) : x),
            ...argvroute( route ),
        }
    }
    catch(e) {
        throw `can't parse this route: ${route}`
    }
}

//todo req. to separate the operation on the paths in an entity
export function routeToString( { route, ...args } ) {
    const argsKeys = Object.keys(args);
    return route.map(seg => typeof seg === "object" ? JSON.stringify(seg) : seg).join("/") + (
        argsKeys.length ?
        `[${argsKeys.map( key => `${key}=${JSON.stringify(args[key])}` ).join(",")}]` : "")
}

/**
 *
 * @param {Array} schema
 */
export function schemasNormalizer([key, ...elems]) {
    return [
        key,
        elems.length && !Array.isArray(elems[0]) ? elems.shift() : {},
        ...elems.map( elem => schemasNormalizer(elem) )
    ];
}

export function searchBySignature(sign, arr, sprop = "key") {
    return arr.find(({[sprop]: key}) => {
        return typeof sign === "string" ?
            key === sign :
                /*<@>*/ typeof key === "object" &&/*</@>*/
                Object.keys(sign).every( k => key[k] === sign[k] )
    })
}

export function equal(a, b) {
    if(a === b) {
        return true;
    }
    else {
        if(Array.isArray(a)) {
            return a.length === b.length && a.every( (a, i) => equal( a, b[i] ) );
        }
        else if(
            typeof a === "object" && a !== null && b !== null && a.constructor === Object
        ) {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            return keysA.length === keysB.length &&
                keysA.every( k => equal(a[k], b[k]) )
        }
        return false;
    }
}

export function signature(sign, target) {

    if(sign === BOOLEAN) {
        return !!target;
    }

    if(sign == target) { //important
        return true;
    }
    else {
        if(Array.isArray(sign)) {
            return sign.every( (s, i) => signature( s, target[i] ) );
        }
        else if(typeof sign === "object" && sign !== null && target) {
            return Object.keys(sign).every( k => signature(sign[k], target[k]) )
        }
        return false;
    }
}

export function getfrompath(argv, path) {
    let res;
	if(path) {
		res = new Function(`argv`, `return argv.${path}`)(argv);
	}
	else {
		res = argv;
	}
	if(res === undefined) {
	    throw "unable to get data";
    }
	return res;
}

export function settopath(argv, path, value) {
    const chapters = path.split(/\.|\[|\]\./);
	const res = chapters.slice(0, -1).reduce( (acc, key) => acc[key] || (acc[key] = {}), argv);
    return res[chapters.slice(-1)[0]] = value;
}

export function calcsignature(state, prop) {
	if(prop.length) {
	    return prop.reduce((acc, key) => {
		    if(/\[|\]|\./.test(key)) {
	            settopath( acc, key, getfrompath(state, key) );
            }
	        else {
		        acc[key] = state[key];
            }
		    return acc;
	    }, {});
    }
	return state;
}

export const copy = target => JSON.parse(JSON.stringify(target));