export default (resourceloader, {path}, {url}) => resourceloader(resourceloader, {path}, {url, type: 'json'})
    .then(({content}) => {
      return { type: "intl", content };
    });