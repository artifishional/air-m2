import { stream2 as stream } from "../"

export class Error {

    constructor( { code }, rid ) {
        canceled.add(rid);
        Error.defaultEmitter.emt.kf();
        Error.defaultEmitter.emt( { code } );
    }

}

(Error.default = stream.fromCbFunc((cb) => {
    Error.defaultEmitter = cb;
})).connect(() => {});

export const error = () => Error.default;
export const canceled = new Set();