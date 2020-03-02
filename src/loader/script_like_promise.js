import { VIEW_PLUGINS } from "../globals"

Object.defineProperty(window, "__m2unit__", {
    set(module) {
        const script = document.currentScript;
        this.__m2unit___ = module;
        if(WAITERS.has(script)) {
            WAITERS.get(script)({module});
            WAITERS.delete(script);
        }
    }
});

const WAITERS = new Map();

export default function ({path, revision}) {
    if(/.\.js$/g.test(path)) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            WAITERS.set(script, resolve);
            script.src = revision ? `${path}?rev=${revision}` : path;
            script.addEventListener("error", reject);
            document.head.appendChild(script);
        });
    }
    else if(/.\.json$/g.test(path)) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", revision ? `${path}?rev=${revision}` : path, true);
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
            xhr.open("GET", revision ? `${path}?rev=${revision}` : path, true);
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