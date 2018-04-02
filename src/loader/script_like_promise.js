export default function ({path}) {
    if(path.indexOf(".json") < 0) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = path;
            script.addEventListener("load", resolve);
            script.addEventListener("error", reject);
            document.head.appendChild(script);
        });
    }
    else {
        return new Promise((resolve, reject) => {
            const xml = new XMLHttpRequest();
            xml.open("GET", path, true);
            xml.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xml.setRequestHeader('Content-type', 'application/json; charset=utf-8');
            xml.onreadystatechange = function () {
                if (xml.readyState === 4) {
                    resolve( {module: {default: JSON.parse(xml.responseText)}} );
                }
            };
            xml.send();
        });
    }
}