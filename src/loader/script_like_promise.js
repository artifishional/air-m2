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
    else if (/.\.html/g.test(path)) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", path, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
            xhr.onload = () => {
                const doc = new DOMParser().parseFromString(xhr.responseText, "application/xml");
                const res = transform(doc.firstChild);
                resolve( {module: {default: res}} );
            };
            xhr.send();
        });
    }
}

let pid = 0;
function transform( node ) {
    const m2data = JSON.parse(node.getAttribute("data-m2"));
    !m2data[1] && m2data.push({});
    m2data[1].node = node;
    if(m2data[1] && m2data[1].source) {
        m2data[1].pid = pid;
        node.setAttribute("data-m2-pid", pid);
        pid++;
    }
    vertextes( node, m2data, true );
    return m2data;
}

//todo need refactor
function vertextes(node, exist = []) {
    return [...node.children].reduce( (acc, node) => {
        if(node.tagName === "img") {
            const [ name = "image", props = {} ] = JSON.parse(node.getAttribute("data-m2") || "[]");
            node.setAttribute("data-m2", JSON.stringify([
                name, { resources: [ {type: "img", url: node.getAttribute("src") } ], ...props}])
            );
        }
        if(node.getAttribute("data-m2")) {
            node.remove();
            acc.push( transform(node) );
        }
        else {
            vertextes(node, exist);
        }
        return acc;
    }, exist);
}