import Observer from "fontfaceobserver"
import {Observable} from "air-stream"

export default class ObservableFont extends Observable {

    //todo need cathce
    constructor( { url, family, size, ...args } ) {
        const style = document.createElement("style");
        style.textContent =
            `@font-face { 
                font-family: '${family}'; 
                src: url('${url}') format('${ /\.[a-z0-9]{3,4}$/g.exec(url)[0].replace(".", "") }'); 
            }`;
        document.head.appendChild(style);
        super( emt => {
            new Observer(family)
                .load(null, 30000)
                .then( () => emt( {
                    type: "font", font: { fontFamily: family, fontSize: size, ...args }
                } ) )
        } );
    }

}