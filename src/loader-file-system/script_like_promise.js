export default function ({path, revision}) {
    const fs = require('fs');
    if(/.\.js$/g.test(path)) {
        return new Promise(async (resolve, reject) => {
            fs.readFile(path, (err, scriptContent) => {
                window.eval(scriptContent.toString());
                resolve({module: window.__m2unit__});
            });
        });
    }
    else if(/.\.json$/g.test(path)) {
        return new Promise(async (resolve, reject) => {
            fs.readFile(path, (err, content) => {
                content = JSON.parse(content.toString());
                resolve({module: {default: content}});
            });
        });
    }
    else if (/.\.html$/g.test(path)) {
        return new Promise(async (resolve, reject) => {
            fs.readFile(path, (err, htmlContent) => {
                const doc = new DOMParser().parseFromString(htmlContent.toString(), "text/html");
                err = doc.querySelector("parsererror");
                if(err) throw `${path} parser error: ${err.innerText}`;
                const res = transform(doc.querySelector("body").children[0]);
                resolve( {module: {default: res}} );
            });
        });
    }
}