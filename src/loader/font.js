import Observer from "fontfaceobserver"

const FONT_LOADING_TIMEOUT = 30000;

export default ( { url, revision, family, size, ...args } ) => {
      const style = document.createElement("style");
      const extension = /\.[a-z0-9]{3,5}$/g.exec(new URL(url).pathname)[0].replace(".", "")
      style.textContent =
        `@font-face { 
                font-family: '${family}'; 
                src: url('${revision ? `${url}?rev=${revision}` : url}') format('${ extension }'); 
            }`;
      document.head.appendChild(style);
      return Promise.resolve();
      // return new Observer(family)
      //   .load(null, FONT_LOADING_TIMEOUT)
      //   .then( () => ( {
      //       type: "font", font: { fontFamily: family, fontSize: size, ...args }
      //   } ) )
      //   .catch(reason => {});
  }
