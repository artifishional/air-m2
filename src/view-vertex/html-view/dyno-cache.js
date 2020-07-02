import { signature as signatureEquals } from '../../utils';

const FATED_LIVE_TIME_MS = 5000;
let FATED_COUNER = 0;

export default class DynoCache {
  constructor({ fatedLiveTime = FATED_LIVE_TIME_MS } = {}) {
    this.items = [];
    this.fatedLiveTime = fatedLiveTime;
  }
  
  createIfNotExist(signature, data) {
    let exist = this.items.find(({ signature: x }) => signatureEquals(signature, x));
    if (!exist) {
      exist = { signature, instance: this.create(signature, data), fated: 0 };
      this.items.push(exist);
    } else {
      exist.fated = 0;
    }
    return exist.instance;
  }
  
  create(/* signature, data */) {
    return new Error('This abstract method should be overwritten');
  }
  
  freeByItems(items) {
    FATED_COUNER += 1;
    const fated = FATED_COUNER;
    items.forEach((item) => {
      /* <debug> */
      if (!this.items.includes(item)) {
        throw new Error('Attempt to delete element out of the container');
      }
      /* </debug> */
      item.fated = fated;
    });
    setTimeout(() => {
      items.forEach((elem) => {
        if (elem.fated === fated) {
          this.destroy(elem.instance, elem);
        }
      });
    }, this.fatedLiveTime);
  }
  
  destroy(element, instance, fastClear = false) {
    if (!fastClear) {
      const deletedIDX = this.items.indexOf(instance);
      /* <debug> */
      if (deletedIDX < 0) throw new Error('Attempt to delete element out of the container');
      /* </debug> */
      this.items.splice(deletedIDX, 1);
    }
  }
  
  clear() {
    items.forEach((item) => {
      this.destroy(item.instance, item, true);
    });
    this.items = [];
  }
}