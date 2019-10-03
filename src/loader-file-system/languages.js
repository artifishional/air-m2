export default ({url: path, revision}) => {
  const fs = require('fs');
  let url = revision ? `${path}?rev=${revision}` : path;
  return new Promise(resolve => {
    fs.readFile(url, (err, data) => {
      let content = data.toString();
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

      resolve({ type: "language", content });
    });
  });
};