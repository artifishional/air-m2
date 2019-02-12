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
                if(module.hasOwnProperty("id")) {
                    return {id: module.id, source: module[key]};
                }
                return {source: module[key]};
            }
        }),
        ...Object.keys(module).filter(key => key !== "default" && key !== "id").map( key => {
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
        .replace(/\"{0,1}([a-zA-Z]{1,77})\"{0,1}/g, (_, x) => `"${x}"`)
    );
}

export function routeNormalizer(route) {
    try {
        return {
            route: route.split("/")
            //an empty string includes
                .map(x => x.replace(/\[.*\]/, ""))
                .filter(x => !".".includes(x))
                .map(x => x[0] === "{" ? JSON.parse(x.replace(/[a-zA-Z]\w{1,}/g, x=> `"${x}"`)) : x),
            ...argvroute( route ),
        }
    }
    catch(e) {
        throw `can't parse this route: ${route}`
    }
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