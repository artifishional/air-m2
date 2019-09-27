import Observer from "fontfaceobserver"

export default ( { url, revision, family, size, ...args } ) => {
      const style = document.createElement("style");
      style.textContent =
        `@font-face { 
                font-family: '${family}'; 
                src: url('${revision ? `${url}?rev=${revision}` : url}') format('${ /\.[a-z0-9]{3,4}$/g.exec(url)[0].replace(".", "") }'); 
            }`;
      document.head.appendChild(style);
      return new Observer(family)
        .load(null, 30000)
        .then( () => ( {
            type: "font", font: { fontFamily: family, fontSize: size, ...args }
        } ) );
  }
