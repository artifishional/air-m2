import { stream } from "air-stream"

export default ({ url, revision, ...args }) =>
    stream(emt => {
        const image = new Image();
        image.src = revision ? `${url}?rev=${revision}` : url
        image.onload = () => emt( {url, type: "img", image, ...args} );
    })
    .first();