import events from "../events";
import spreading from "./spreading";
import {BOOLEAN, EMPTY_FUNCTION} from "../../def";
import JSON5 from 'json5';
import { signature as signatureEquals } from '../../utils';


let UNIQUE_IMAGE_IDX = 1;
let UNIQUE_STYLE_IDX = 1;

export default class CachedNodeVertex {
  
  constructor (prop, item) {
    this.prop = prop;
    this.item = item;
  }
  
  map(src, transform) {
    const res = transform(src, this);
    res.append(...this.item.map((item) => item.map(res, transform)));
    return res;
  }
  
  static parse( node ) {
  
    const label = node.getAttribute("label") || "";
    const stream = node.getAttribute("stream") || "";
  
    const handlers = [ ...node.attributes ]
      .filter( ({ name }) => events.includes(name) || name.indexOf("on:") === 0 )
      .map( ({ name, value }) => ({
        name: name.replace(/^on(:)?/, ""),
        hn: new Function("event", "options", "request", "key", "signature", "req", value )
      }) );
    
    const resources = JSON5.parse(node.getAttribute("resources") || "[]");
  
    const template = ["", "true"].includes(node.getAttribute("template"));
    const id = node.getAttribute("id") || "$";
  
    const use = this.pathParser( node.getAttribute("use") || "" );
    
    const styles = [...node.children]
      .filter(byTagName("STYLE"))
      .map(style => {
        style.remove();
        return { style, idx: UNIQUE_STYLE_IDX ++ }
      });
  
    const sounds = [...node.children].filter(byTagName("SOUND"));
    resources.push(...sounds.map( sound => (
      { type: "sound", name: sound.getAttribute("name") || "", rel: sound.getAttribute("rel") || ""}
    )));
  
    const teeF = this.cutteeF(node) || this.cuttee(node);
    const kit = this.cutkit(node);
    const preload =
      !["", "true"].includes(node.getAttribute("nopreload")) &&
      !["", "true"].includes(node.getAttribute("lazy"));
  
    const controlled = [ ...node.childNodes ].some( node => {
      if(node.nodeType === 1 && !["UNIT", "PLUG", "STYLE"].includes(node.tagName.toUpperCase())) {
        return true;
      }
      else if( node.nodeType === 3 && node.nodeValue[0] === "{" ) {
        return true;
      }
    } );
  
    const streamplug = [...node.children]
      .filter(byTagName("script"))
      .filter(byAttr("data-source-type", "stream-source"))
      .map( plug => {
        plug.remove();
        eval.call(window, plug.textContent);
        return window.__m2unit__.default;
      } );
  
    const plug = [...node.children]
      .filter(byTagName("script"))
      .filter(byAttr("data-source-type", "view-source"))
      .map( plug => {
        plug.remove();
        eval.call(window, plug.textContent);
        return window.__m2unit__.default;
      } );
  
    const keyframes = [];
  
    const literal = this.cutliterals(node);
  
    const $node = document.createDocumentFragment();
    const rawKey = node.getAttribute("key");
    
    const res = new CachedNodeVertex({
      rawKey,
      teeF,			      //switch mode (advanced)
      node: $node,    //xml target node
      label,			    //debug layer label
      styles,         //inline style definitions
      streamplug,		  //stream inline plugins
      plug,			      //view inline plugins
      controlled,     //has one or more active children (text or node)
      kit,            //kit's container
      preload,        //must be fully loaded before readiness
      keyframes,      //animation ( data ) settings
      use,            //reused templates path
      template,       //template node
      id,             //tree m2 advantages id
      handlers,       //event handlers
      stream,         //link to model stream todo obsolete io
      resources,      //related resources
      literal,        //string template precompiled literal
    }, []);
    
    res.append(...[...node.children].reduce((acc, next) =>
        [...acc, ...this.parseChildren( next, res.prop, res )]
      , []));
    keyframes.push(...this.parseKeyFrames( { node } ));
  
    $node.append(...node.childNodes);
    
    return res;
  }
  
  append(...item) {
    this.item.push(...item);
  }
  
  static pathSplitter(str = "") {
    str = str + ",";
    let mode = 0;
    let prev = 0;
    const res = [];
    for(let i = 0; i < str.length; i++ ) {
      if(str[i] === "{") {
        mode++;
      }
      else if(str[i] === "}") {
        mode--;
      }
      else if(str[i] === ",") {
        if(mode === 0) {
          res.push( str.substring(prev, i) );
          prev = i+1;
        }
      }
    }
    return res;
  }
  
  static parseKeyProps(prop) {
    if(prop.hasOwnProperty("classList")) {
      prop.classList = Object.keys(prop.classList).reduce( (acc, next) => {
        if(next.indexOf("|") > - 1) {
          next.split("|").reduce( (acc, name) => {
            acc[name] = prop.classList[next] === name;
            return acc;
          }, acc);
        }
        else {
          acc[next] = !!prop.classList[next];
        }
        return acc;
      }, {} );
    }
    return prop;
  }
  
  static parseKeyFrames({ node }) {
    let res = [];
    const keyframe = node.querySelectorAll("keyframe");
    if(keyframe.length) {
      res = [...keyframe].map( node => {
        const action = node.getAttribute("name") || "default";
        const keys = [...node.querySelectorAll("key")]
          .map( node => {
            return [
              node.getAttribute("offset"),
              spreading(
                node.getAttribute("prop"),
                null,
                EMPTY_FUNCTION,
                this.parseKeyProps,
              ),
            ];
          } );
        node.remove();
        return [ action, spreading(node.getAttribute("prop"), null), ...keys ];
      } );
    }
    return res;
  }
  
  static pathParser(str) {
    return this.pathSplitter(str)
      .map( (ly)=>{
        ly = ly.trim();
        if(!ly) {
          return null;
        }
        else {
          let [ , path = null ] = ly.match( /^url\((.*)\)$/ ) || [];
          if(path) {
            return { path, type: "url", schtype: "html" };
          }
          else {
            return { path: ly, type: "query", schtype: "html" };
          }
        }
      } )
      .filter( Boolean )
  }
  
  // the workaround is tied to the querySelectorAll,
  // since it is used to extract replacement slots
  static parseChildren(next, prop) {
    if(is( next, "unit" )) {
      const parser = this.parse(next);
      const _slot = this.createslot();
      if(parser.prop.template) {
        next.remove();
      }
      else {
        next.replaceWith( _slot );
      }
      return [ parser ];
    }
    else if (next.tagName === "IMG") {
      const idx = UNIQUE_IMAGE_IDX ++;
      const _slot = img(idx);
      next.replaceWith( _slot );
      prop.resources.push({
        key: idx,
        origin: next,
        type: "img",
        url: next.getAttribute("src"),
      });
      return [];
    }
    return [...next.children].reduce( (acc, node) =>
        [...acc, ...this.parseChildren(node, prop)]
      , []);
  }
  
  static cutliterals (node) {
    let literal = null;
    if(!node.childElementCount && node.textContent.search(/^`.*`$/) > -1) {
      let i = -1;
      let literals = [];
      const raw = node
        .textContent
        .replace(
          /lang\.([a-z-0-9A-Z_]+)/,
          (_, lit) => {
            i ++ ;
            literals[i] = lit;
            return 'eval("`" + __literals[' + i + '] + "`")'
          }
        )
        .replace(
          /intl\.([a-z-0-9A-Z_]+)/,
          (_, lit) => '__intl["' + lit + '"]'
        );
      const fn = new Function("argv", "eval", "__intl", "__literals", `with(argv) return ${raw}`);
      const operator = (data, literals, intl) => {
        return fn(new Proxy(data, STD_PROXY_CONFIG), eval, intl, literals);
      };
      literal = { literals, operator };
    }
    return literal;
  }
  
  static cutteeF(node) {
    return spreading(node.getAttribute("tee()"), null, null);
  }
  
  static cuttee(node) {
    let rawTee = node.getAttribute("tee");
    if(rawTee === null) {
      return null;
    }
    else if(rawTee === "") {
      return (data, key) => signatureEquals(key, data);
    }
    else if(rawTee[0] === "{") {
      
      //autocomplete { value } boolean
      rawTee = rawTee.replace(/{\s*([a-zA-Z0-9]+|"[\-!&$?*a-zA-Z0-9]+")\s*}/g, (_, vl) => {
        return "{" +  vl + ":$bool" + "}"
      });
      
      const tee = new Function("$bool", "return" + rawTee)(BOOLEAN);
      return data => signatureEquals(tee, data);
    }
    else {
      return data => signatureEquals(rawTee, data);
    }
  }
  
  static cutkit(node) {
    const raw = node.getAttribute("kit");
    if(raw === null) {
      return null;
    }
    else if(raw === "") {
      return {
        prop: [],
        pick: null,
      };
    }
    else {
      const [, getter = "", rawSignature = ""] = raw.match(REG_GETTER_KIT);
      return {
        prop: rawSignature.split(",").filter(Boolean),
        pick: new Function(`argv`, `return argv.${getter}`),
      };
    }
  }
  
  static createslot() {
    const res = document.createElement("slot");
    res.setAttribute("acid", "-");
    return res;
  }
  
}

const REG_GETTER_KIT = /(?:\(([a-zA-Z0-9.\-\[\]]+)\))?(?:{([a-zA-Z0-9.\-\[\],]+)})?/;

function img(idx) {
  const res = document.createElement("slot");
  res.setAttribute("img", idx);
  return res;
}

/**
 *
 * @param node
 * @param {String} name
 * @returns {boolean}
 */
function is( node, name ) {
  name = name.toUpperCase();
  return [ `M2-${name}`, name ].includes( node.tagName.toUpperCase() );
}

function byTagName(tagName) {
  tagName = tagName.toUpperCase();
  return node => node.tagName.toUpperCase() === tagName;
}

function byAttr(attrName, attrValue) {
  return node => node.getAttribute(attrName) === attrValue;
}



const UNSCOPABLES_PROPS = { eval: true, __intl: true, __literals: true };
const STD_PROXY_CONFIG = {
  has() {
    return true;
  },
  get(target, prop) {
    if (prop === Symbol.unscopables) {
      return UNSCOPABLES_PROPS;
    }
    const vl = target[prop];
    if (vl !== undefined) {
      return vl;
    } else {
      throw 1;
    }
  }
};