export default (loadResource, {url: path, revision}) => {
  const url = revision ? `${path}?rev=${revision}` : path;
  return loadResource(url, {
    type: "fetch",
    mode: 'cors',
    method: 'GET'
  })
    .then(r => r.text())
    .then((content) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "application/xml");

      content = [ ...doc.querySelector("languages").children].reduce((acc, next) => {

        const lang = next.tagName;

        [ ...next.children ].map( string => {
          const name = string.getAttribute("name");
          let exist = acc.find( ([ x ]) => x === name );
          if(!exist) {
            acc.push( exist = [ name, {} ] );
          }
          exist[1][lang] = string.textContent;
        } );

        return acc;

      }, [ "languages" ]);

      return { type: "language", content };
    })
};