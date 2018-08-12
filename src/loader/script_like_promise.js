export default function ({path}) {
    if(/.\.js$/g.test(path)) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = path;
            script.addEventListener("load", resolve);
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