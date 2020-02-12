export default (resourceloader, {path}, { origin, revision, urlOrigin, ...args }) => new Promise(resolve => {
  const image = new Image();
  origin && [...origin.attributes].map( ({ name, value }) => {
    if(name === "srcset") {
      console.warn("'srcset' img property currently is not supported");
    }
    else if(name !== "src") {
      image.setAttribute(name, value);
    }
  } );
  const url = new URL(`${urlOrigin}/m2units/${path}${args.url}`);
  if (revision) {
    url.searchParams.append("revision", revision);
  }
  image.src = revision ? `${url}?rev=${revision}` : url
  image.onload = () => resolve( {url, type: "img", image, ...args} );
});