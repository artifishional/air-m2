import { stream } from "air-stream"

export default ({ origin, url, revision, ...args }) =>
    stream(emt => {
        const image = new Image();
        [...origin.attributes].map( ({ name, value }) => {
            if(name === "srcset") {
              console.warn("'srcset' img property currently is not supported");
            }
            else if(name !== "src") {
              image.setAttribute(name, value);
            }
        } );
        image.src = revision ? `${url}?rev=${revision}` : url
        image.onload = () => emt( {url, type: "img", image, ...args} );
    })
    .first();