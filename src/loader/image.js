import { stream } from "air-stream"

export default ({ url, ...args }) =>
    stream(emt => {
        const image = new Image();
        image.src = url;
        image.onload = () => emt( {url, type: "img", image, ...args} );
    })
    .first();