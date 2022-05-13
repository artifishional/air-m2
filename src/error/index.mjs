import { stream2 as stream } from 'air-stream';

export class Error {
  constructor({ code }) {
    Error.defaultEmitter.emt.kf();
    Error.defaultEmitter.emt({ code });
  }
}

Error.default = stream
  .fromCbFn((cb) => {
    Error.defaultEmitter = cb;
  })
  .store();

export const error = () => Error.default;
export const canceled = new Set();
