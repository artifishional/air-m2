export default ({path, revision}) => {
  const fs = require('fs');
  return new Promise(resolve => {
    fs.readFile(path, (err, raw) => {
      const doc = new DOMParser().parseFromString(raw, "text/html");
      err = doc.querySelector("parsererror");
      if (err) throw `${path} parser error: ${err.innerText}`;
      resolve({ content: doc.body.children[0] });
    });
  });
}