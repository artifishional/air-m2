import stream from "./xhr"
/*
export default ({path, revision}) => stream({path, revision, content: { type: "text/html" }})
    .map( xhr => {
        const doc = new DOMParser().parseFromString(xhr.responseText, "text/html");
        const err = doc.querySelector("parsererror");
        if(err) throw `${path} parser error: ${err.innerText}`;
        return { content: doc.querySelector("body").children[0] };
    } );
*/

export default ({path, revision}) => {
    const url = new URL(path, window.location.origin);
    if (revision) {
        url.searchParams.append("revision", revision);
    }
    return fetch(url, {
        mode: 'cors',
        method: 'GET',
        headers: {'Content-Type': 'text/html'}
    })
        .then( response => response.text() )
        .then( raw => {
            const doc = new DOMParser().parseFromString(raw, "text/html");
            const err = doc.querySelector("parsererror");
            if (err) throw `${path} parser error: ${err.innerText}`;
            return { content: doc.body.children[0] };
        });
}