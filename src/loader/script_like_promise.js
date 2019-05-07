import { VIEW_PLUGINS } from "../globals"

class ModuleLoadEvent extends Event {

    constructor({ module, script }) {
        super("m2SourceModuleLoad");
        this.module = module;
        this.script = script;
    }

}

Object.defineProperty(window, "__m2unit__", {
    set(module) {
        const script = document.currentScript;
        if(VIEW_PLUGINS.has(script)) {
            VIEW_PLUGINS.set( script, module );
        }
        window.dispatchEvent(new ModuleLoadEvent({ module, script }));
    }
});

export default function ({path}) {
    if(/.\.js$/g.test(path)) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = path;
            let hn = null;
            //script.addEventListener("load", resolve);
            window.addEventListener("m2SourceModuleLoad", hn = (event) => {
                if(event.script === script) {
                    script.remove();
                    window.removeEventListener("m2SourceModuleLoad", hn);
                    resolve( event );
                }
            });
            script.addEventListener("error", reject);
            document.head.appendChild(script);
        });
    }
    else if(/.\.json$/g.test(path)) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", path, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
            xhr.onload = () => {
                resolve( {module: {default: JSON.parse(xhr.responseText)}} );
            };
            xhr.send();
        });
    }
    else if (/.\.html$/g.test(path)) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", path, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('Content-type', 'text/html; charset=utf-8');
            xhr.onload = () => {
                const doc = new DOMParser().parseFromString(xhr.responseText, "text/html");
                const err = doc.querySelector("parsererror");
                if(err) throw `${path} parser error: ${err.innerText}`;
                const res = transform(doc.querySelector("body").children[0]);
                resolve( {module: {default: res}} );
            };
            xhr.send();
        });
    }
}