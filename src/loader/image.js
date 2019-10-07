const toImageObject = ({ origin, url, revision, ...args }) => new Promise(resolve => {
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

function FileReader(blob) {
  return new Promise( (resolver) => {
    const reader = new globalThis.FileReader();
    blob.arrayBuffer().then(buffer => {
      // todo: implement load strategy mechanism instead creating new blob instance
      reader.readAsDataURL(new Blob([buffer], {type: blob.type}));
      reader.onloadend = resolver;
    });
  } );
}

const toDataURL = ({ origin, url, revision, ...args }) =>
  fetch(revision ? `${url}?rev=${revision}` : url, {
    mode: 'cors',
    method: 'GET'
  })
    .then(r => r.blob())
    .then(FileReader)
    .then(({target: {result: base64}}) => {
      return {url, type: "img", image: base64, ...args};
    });

export default ({path}, { url, urlOrigin, dataURL = false, ...args }) => {
  url = new URL(`${urlOrigin}/m2units/${path}${url}`).href;
  return dataURL ? toDataURL({url, ...args}) : toImageObject({url, ...args});
};
