export default (resourceloader, {path}, {url}) => {
  return resourceloader(resourceloader, {path}, {url, type: 'content'})
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