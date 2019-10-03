export default ({url: path, revision}) => {
  const fs = require('fs');
  let url = revision ? `${path}?rev=${revision}` : path;
  return new Promise(resolve => {
    fs.readFile(url, (err, data) => {
      resolve({ type: "intl", content: JSON.parse(data.toString()) });
    });
  });
};