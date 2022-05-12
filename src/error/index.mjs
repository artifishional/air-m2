import { stream2 as stream } from "../"

export class Error {

    constructor( { code }, rid ) {
        Error.defaultEmitter.emt.kf();
        Error.defaultEmitter.emt( { code } );
    }

}

Error.default = stream
  .fromCbFn((cb) => {
    Error.defaultEmitter = cb;
  })
  .store();

export const error = () => Error.default;
export const canceled = new Set();