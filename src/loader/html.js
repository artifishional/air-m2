export default ({path, revision}) => {
    const url = new URL(path, window.location.origin + window.location.pathname);
    if (revision) {
        url.searchParams.append("revision", revision);
    }
    return fetch(url, {
        credentials: 'same-origin',
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