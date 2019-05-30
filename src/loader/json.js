import stream from "./xhr"

export default ({path, revision}) => stream({path, revision, content: { type: "application/json" }})
    .map( xhr => ({ content: JSON.parse(xhr.responseText) }) );