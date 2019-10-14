import { stream2 } from "air-stream"

export default ( { type = "GET", path, content: { type: ctype }, revision }) => stream( null, e => {
    const xhr = new XMLHttpRequest();
    xhr.open(type, revision ? `${path}?rev=${revision}` : path, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-type', `${ctype}; charset=utf-8`);
    xhr.onload = ( ) => e(xhr);
    xhr.send();
} );