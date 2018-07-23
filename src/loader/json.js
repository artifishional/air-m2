import stream from "./xhr"

export default ({path}) => stream({path, content: { type: "application/json" }})
    .map( xhr => ({ content: JSON.parse(xhr.responseText) }) );