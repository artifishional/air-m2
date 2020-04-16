import scriptLoader from './script_like_promise';
import contentLoader from './content';
import {PORT as port} from "air-m2/src/globals";

export default function (resourceloader, {path}, {type, ...args}) {
  const {protocol, hostname} = window.location;
  const urlOrigin = port ? `${protocol}//${hostname}:${port}` : window.location.origin;
  if (type === "script") {
    return scriptLoader(resourceloader, {path}, {type, urlOrigin, ...args});
  }
  else if(type === "content") {
    return contentLoader({path}, { type, urlOrigin, ...args});
  } else {
    throw "unsupported resource type";
  }
}