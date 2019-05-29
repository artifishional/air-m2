import { stream } from "air-stream"

export default ( { type = "GET", path, content: { type: ctype }, revision }) => stream( emt => {
    const xhr = new XMLHttpRequest();
    xhr.open(type, revision ? `${path}?revision=${revision}` : path, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-type', `${ctype}; charset=utf-8`);
    xhr.onload = ( ) => emt(xhr);
    xhr.send();
} );