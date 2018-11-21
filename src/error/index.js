import { stream } from "../"

export class Error {

    constructor( { code } ) {
        Error.defaultEmitter.emt.kf();
        Error.defaultEmitter.emt( { code } );
    }

}

(Error.default = stream( (emt) => {
    Error.defaultEmitter = emt;
} )).on(() => {});

export const error = () => Error.default;