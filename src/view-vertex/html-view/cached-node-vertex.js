import events from "../events";
import {VIEW_PLUGINS} from "../../globals";
import spreading from "./spreading";
import {EMPTY_FUNCTION} from "../../def";
import JSON5 from 'json5';


let UNIQUE_IMAGE_IDX = 0;

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
    
    const useOwnerProps = node.parentNode.tagName.toUpperCase() === "UNIT";
    
    const resources = JSON5.parse(node.getAttribute("resources") || "[]");
  
    const template = ["", "true"].includes(node.getAttribute("template"));
    const id = node.getAttribute("id") || "$";
  
    const use = this.pathParser( node.getAttribute("use") || "" );
    
    const styles = [...node.children].filter(byTagName("STYLE"));
    styles.map(style => style.remove());
  
    const sounds = [...node.children].filter(byTagName("SOUND"));
    resources.push(...sounds.map( sound => (
      { type: "sound", name: sound.getAttribute("name") || "", rel: sound.getAttribute("rel") || ""}
    )));
  
    const teeF = cutteeF(node);
    const kit = cutkit(node);
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
        const src = document.createElement("script");
        VIEW_PLUGINS.set(src, null);
        src.textContent = plug.textContent;
        document.head.append( src );
        const res = VIEW_PLUGINS.get(src).default;
        VIEW_PLUGINS.delete(src);
        plug.remove();
        src.remove();
        return res;
      } );
  
    const plug = [...node.children]
      .filter(byTagName("script"))
      .filter(byAttr("data-source-type", "view-source"))
      .map( plug => {
        const src = document.createElement("script");
        VIEW_PLUGINS.set(src, null);
        src.textContent = plug.textContent;
        document.head.append( src );
        const res = VIEW_PLUGINS.get(src).default;
        VIEW_PLUGINS.delete(src);
        plug.remove();
        src.remove();
        return res;
      } );
  
    const keyframes = [];
  
    const literal = cutliterals(node);
  
    const $node = document.createDocumentFragment();
    const rawTee = node.getAttribute("tee");
    const rawKey = node.getAttribute("key");
    
    const res = new CachedNodeVertex({
      rawKey,
      rawTee,
      teeF,			      //switch mode (advanced)
      node: $node,    // xml target node
      label,			    //debug layer label
      styles,         //inline style definitions
      streamplug,		  //stream inline plugins
      plug,			      //view inline plugins
      controlled,     //has one or more active childrens (text or node)
      useOwnerProps,  //must consider parent props
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
      const _slot = slot();
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
  
}

const REG_GETTER_KIT = /(?:\(([a-zA-Z0-9.\-\[\]]+)\))?(?:{([a-zA-Z0-9.\-\[\],]+)})?/;

function cutkit(node) {
  const raw = node.getAttribute("kit");
  if(raw === null) {
    return null;
  }
  else if(raw === "") {
    return { getter: null, prop: [] };
  }
  else {
    const [_, getter = "", rawSignature = ""] = raw.match(REG_GETTER_KIT);
    return { getter, prop: rawSignature.split(",").filter(Boolean) };
  }
}

function slot() {
  const res = document.createElement("slot");
  res.setAttribute("acid", "-");
  return res;
}

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

function cutliterals (node) {
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

function cutteeF(node) {
  return spreading(node.getAttribute("tee()"), null, null);
}