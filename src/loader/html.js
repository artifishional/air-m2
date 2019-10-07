export default (resourceloader, {path}, {url}) => {
    return resourceloader({path}, {url, type: 'content'})
        .then( raw => {
            const doc = new DOMParser().parseFromString(raw, "text/html");
            const err = doc.querySelector("parsererror");
            if (err) throw `${path} parser error: ${err.innerText}`;
            return { content: doc.body.children[0] };
        });
}