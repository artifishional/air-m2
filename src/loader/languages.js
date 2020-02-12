export default (resourceloader, {path}, {url}) => resourceloader(resourceloader, {path}, {url, type: 'content'})
    .then((content) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "application/xml");

      content = [ ...doc.querySelector("languages").children]
          .reduce((acc, next) => {

            const lang = next.tagName;

            [ ...next.children ].map( string => {
                const name = string.getAttribute("name");
                let exist = acc.find( ([ x ]) => x === name );
                if(!exist) {
                    acc.push( exist = [ name, {} ] );
                }
                exist[1][lang] = string.textContent
                    .replace(
                      /(intl|lang)\.([a-z-0-9A-Z_]+)/,
                      (_, type, lit) => '__' + type + '["' + lit + '"]'
                    );
            } );

            return acc;

        }, [ ]);

      return { type: "language", content };
    });