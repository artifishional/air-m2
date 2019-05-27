import { stream } from "../"

export class Error {

    constructor( { code }, rid ) {
        canceled.add(rid);
        Error.defaultEmitter.emt.kf();
        Error.defaultEmitter.emt( { code } );
    }

}

(Error.default = stream( (emt) => {
    Error.defaultEmitter = emt;
} )).on(() => {});

export const error = () => Error.default;
export const canceled = new Set();