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

function FileReader(buffer) {
  return new Promise( (resolver) => {
    const reader = new globalThis.FileReader();
    reader.readAsDataURL(new Blob([buffer]));
    reader.onloadend = resolver;
  } );
}

const toDataURL = ({ origin, url, revision, ...args }) => {
  const fs = require('fs');
  return new Promise(resolve => {
    fs.readFile(revision ? `${url}?rev=${revision}` : url, (err, buffer) => {
      FileReader(buffer)
        .then((dataURL) => resolve({url, type: "img", image: dataURL, ...args}));
    });
  });
};

export default ({ dataURL = false, ...args }) => dataURL ? toDataURL({...args}) : toImageObject({...args});
