import ActiveNodeTarget from './active-node-target';
import { equal } from '../../utils';

export default class LazyActiveNodeTarget extends ActiveNodeTarget {

  constructor (src, node, resources, container) {
    super(src, node, resources, container);

    this.lazyscroll = src.prop.lazyscroll;
    this.stream = src.lazyscrollControlStream;
    this.container = container;

    const observer = new MutationObserver((mutations) => {
      const addedNodes = [];
      const removedNodes = [];
      mutations.map((mutation) => {
        addedNodes.push(...mutation.addedNodes);
        removedNodes.push(...mutation.removedNodes);
      });
      if (Array.from(addedNodes).some((n) => n.contains(node))) {
        this.bindLazyscroll();
      }
      if (Array.from(removedNodes).some((n) => n.contains(node))) {
        this.unbindLazyscroll();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  scroll (height, offset) {
    this.hook({
      action: 'scroll',
      data: { height, offset }
    });
  }

  scrollHandler (evt) {
    const { node } = this;
    this.scroll(node.offsetHeight, node.scrollTop);
  };

  resizeHandler (evt) {
    const { node } = this;
    const currentSize = { height: node.offsetHeight, width: node.offsetWidth };
    if (!equal(this.prevSize, currentSize)) {
      this.prevSize = currentSize;
      this.scroll(node.offsetHeight, node.scrollTop);
    }
  };

  bindLazyscroll () {
    const { node, stream } = this;
    this.prevSize = { height: node.offsetHeight, width: node.offsetWidth };
    let prevElements;
    this.hook = stream.at(([{ elements }]) => {
      if (!equal(elements, prevElements)) {
        if (this.lazyscroll !== true) {
          node.firstElementChild.style.height = +this.lazyscroll * elements + 'px';
          if (!this.inited) {
            this.scroll(node.offsetHeight, node.scrollTop);
            this.inited = true;
          }
        } else {
          const observer = new MutationObserver((list) => {
            const el = node.firstElementChild.firstElementChild;
            const style = window.getComputedStyle(el);
            if (el && el.offsetHeight) {
              const height = el.offsetHeight + parseInt(style.marginBottom) + parseInt(style.marginTop);
              if (height) {
                this.hook({
                  action: 'setElementHeight',
                  data: { height }
                });
                node.firstElementChild.style.height = +height * elements + 'px';
              }
              this.scroll(node.offsetHeight, node.scrollTop);
              observer.disconnect();
            }
          });
          observer.observe(node.firstElementChild, { childList: true });
        }
      }
    });

    window.addEventListener('resize', this.resizeHandler.bind(this));
    node.addEventListener('scroll', this.scrollHandler.bind(this));

  }

  unbindLazyscroll () {
    this.inited = false;
    this.node.removeEventListener('scroll', this.scrollHandler.bind(this));
    window.removeEventListener('resize', this.resizeHandler.bind(this));
  }
}