export default ({path, revision, port}) => {
    const url = new URL(path, window.location.origin + window.location.pathname);
    if (revision) {
        url.searchParams.append("revision", revision);
    }
    if (port) {
      url.port = port;
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