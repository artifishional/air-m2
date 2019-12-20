const IMGPreloaderSheet = document.createElement("style");
const IMGSStore = new Set();

document.head.append(IMGPreloaderSheet);

export default (resourceloader, {path}, { origin, url, revision, ...args }) => new Promise(resolve => {
  url = new URL(
      'm2units/' + path + url.replace(/"/g, ''),
      window.location.origin + window.location.pathname
  );
  if (revision) {
    url.searchParams.append('revision', revision);
  }
  const rawURL = url.pathname + url.search;
  if(IMGSStore.has(rawURL)) {
    const image = new Image();
    image.src = rawURL;
    resolve( {url, type: "img", image, ...args} );
  }
  else {
    IMGSStore.add(rawURL);
    const image = new Image();
    origin && [...origin.attributes].map( ({ name, value }) => {
      if(name === "srcset") {
        console.warn("'srcset' img property currently is not supported");
      }
      else if(name !== "src") {
        image.setAttribute(name, value);
      }
    } );
    image.src = rawURL;
    image.onload = () => resolve( {url, type: "img", image, ...args} );
    IMGPreloaderSheet.textContent = `
        body:after {
        display:none;
        content: url(${ [...IMGSStore].join(") url(")});
    }`;
  }
})
