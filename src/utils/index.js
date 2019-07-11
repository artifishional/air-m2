import { BOOLEAN } from '../def';
import JSON5 from 'json5';

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

const EMPTY_ROUTE = { route: [] };
const allowedChars = `abcdefghijklmnopqrsntuvwxyzABCDEFGHIJKLMNOPQRSNTUVWXYZ0123456789$-_,."'`.split('');

// quote processing
export const parseRoute = (route, lvl = []) => {
  const _route = [];
  let _params = {};
  const type = lvl.length ? lvl[lvl.length - 1] : 'path';

  let res;
  let idx = 0;
  let collector = '';
  while (idx < route.length) {
    const char = route[idx];
    if (allowedChars.includes((char))) {
      collector += char;
    } else {
      switch (char) {
        case '=':
          if (type === '[') {
            collector += ':';
          }
          break;
        case '/':
          if (type === 'path') {
            if (collector.length) {
              _route.push(collector);
            }
            collector = '';
          } else {
            collector += char;
          }
          break;
        case '{':
          res = parseRoute(route.slice(idx + 1), [...lvl, '{']);
          if (type !== 'path') {
            collector += `{${res.collector}}`;
          } else {
            _route.push(JSON5.parse(`{${res.collector}}`));
          }
          idx += res.offset;
          break;
        case '}':
          if (type === '{') {
            return { offset: idx, collector };
          }
          break;
        case '[':
          if (type === 'path') {
            res = parseRoute(route.slice(idx + 1), [...lvl, '[']);
            _params = { ..._params, ...JSON5.parse(`{${res.collector}}`) };
            idx += res.offset;
          } else if (type === '{') {
            collector += '[';
          }
          break;
        case ']':
          if (type === '{') {
            idx++;
            collector += ']';
            return { offset: idx, collector, type };
          } else if (type === '[') {
            return { offset: idx, collector, type };
          }
          break;
        default:
          collector += char;
      }

    }
    idx++;
  }

  if (collector.length) {
    _route.push(collector);
  }

  if (!lvl.length) {
    return { route: _route.filter(x => x !== '.'), ..._params };
  }
};

export function routeNormalizer (route) {
  if (!route) return EMPTY_ROUTE;
  if (~route.indexOf('route=')) throw new Error('"route" param not allowed');
  return parseRoute(route);
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