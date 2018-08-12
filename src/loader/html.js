import stream from "./xhr"

export default ({path}) => stream({path, content: { type: "text/html" }})
    .map( xhr => {
        const doc = new DOMParser().parseFromString(xhr.responseText, "text/html");
        const err = doc.querySelector("parsererror");
        if(err) throw `${path} parser error: ${err.innerText}`;
        return { content: doc.querySelector("body").children[0] };
    } );