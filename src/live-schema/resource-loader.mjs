import scriptLoader from './script-like-promise.mjs';
import contentLoader from './content.mjs';
import { PORT as port } from '../globals.mjs';

export default function loader(resourceloader, { path }, { type, ...args }) {
  const { protocol, hostname } = window.location;
  const urlOrigin = port ? `${protocol}//${hostname}:${port}` : window.location.origin;
  if (type === 'script') {
    return scriptLoader(resourceloader, { path }, { type, urlOrigin, ...args });
  }
  if (type === 'content') {
    return contentLoader(resourceloader, { path }, { type, urlOrigin, ...args });
  }
  throw new Error('unsupported resource type');
}
