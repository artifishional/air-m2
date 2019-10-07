import script_like_promise from './script_like_promise';
import content from './content';

export default function resourceloader({ path, type }) {
  if (type === "script") {
    return script_like_promise(resourceloader, { path });
  }
  else if(type === "content") {
    return content({ path });
  }
  else {
    throw "unsupported resource type";
  }
}