import stream from "./xhr"

export default ({url, revision}) => stream({path: url, revision, content: { type: "application/json" }})
    .map( xhr => {
        const json = JSON.parse(xhr.responseText);
        return { type: "intl", content: json };
    } );