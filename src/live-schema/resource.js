import script_like_promise from './script_like_promise';
import content from './content';

export default function resourceloader({ path }, { origin, type }) {
  if (type === "script") {
    return script_like_promise({ path }, { origin, type });
  }
  else if(type === "content") {
    return content({ path }, { origin, type });
  }
  else {
    throw "unsupported resource type";
  }
}