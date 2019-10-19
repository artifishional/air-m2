import stream from "./xhr"

export default ({url, revision}) => stream({path: url, revision, content: { type: "application/xml" }})
    .map( xhr => {

        const parser = new DOMParser();
        const doc = parser.parseFromString(xhr.responseText, "application/xml");

        const content = [ ...doc.querySelector("languages").children]
            .reduce((acc, next) => {

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

        }, [ ]);

        return { type: "language", content };
    } );