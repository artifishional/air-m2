const toImageObject = ({path}, { origin, url, urlOrigin, revision, ...args }) => new Promise(resolve => {
  url = new URL(`${urlOrigin}/m2units/${path}${url}`).href;
  const image = new Image();
  origin && [...origin.attributes].map( ({ name, value }) => {
    if(name === "srcset") {
      console.warn("'srcset' img property currently is not supported");
    }
    else if(name !== "src") {
      image.setAttribute(name, value);
    }
  } );
  image.src = revision ? `${url}?rev=${revision}` : url;
  image.onload = () => resolve( {url, type: "img", image, ...args} );
});

function FileReader({arrayBuffer, type}) {
  return new Promise( (resolver) => {
    const reader = new globalThis.FileReader();
    reader.readAsDataURL(new Blob([arrayBuffer], {type}));
    reader.onloadend = resolver;
  } );
}

const toDataURL = (resourceloader, {path}, args) =>
  resourceloader(resourceloader, {path}, {...args, type: 'array-buffer'})
    .then(FileReader)
    .then(({target: {result: base64}}) => {
      return {type: "img", image: base64, ...args};
    });

export default (resourceloader, {path}, { url, dataURL = false, ...args }) => {
  return dataURL ? toDataURL(resourceloader, {path}, { url, ...args }) : toImageObject({path}, {url, ...args});
};
