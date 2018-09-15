import stream from "./xhr"

export default ({url}) => stream({path: url, content: { type: "application/json" }})
    .map( xhr => {
        const json = JSON.parse(xhr.responseText);
        return { type: "intl", content: json };
    } );