export default function ({path, revision, port}) {
    const url = new URL(path, window.location.origin);
    if (revision) {
        url.searchParams.append("revision", revision);
    }
    if (port) {
        url.port = port;
    }
    path = url.href;
    if(/.\.js$/g.test(path)) {
        return new Promise(async (resolve, reject) => {
            const scriptContent = await (await fetch(revision ? `${path}?rev=${revision}` : path)).text();
            window.eval(scriptContent);
            resolve({module: window.__m2unit__});
        });
    }
    else if(/.\.json$/g.test(path)) {
        return new Promise(async (resolve, reject) => {
            const content = await (await fetch(revision ? `${path}?rev=${revision}` : path)).json();
            resolve({module: {default: content}});
        });
    }
    else if (/.\.html$/g.test(path)) {
        return new Promise(async (resolve, reject) => {
            const htmlContent = await (await fetch(revision ? `${path}?rev=${revision}` : path)).text();
            const doc = new DOMParser().parseFromString(htmlContent, "text/html");
            const err = doc.querySelector("parsererror");
            if(err) throw `${path} parser error: ${err.innerText}`;
            const res = transform(doc.querySelector("body").children[0]);
            resolve( {module: {default: res}} );
        });
    }
}