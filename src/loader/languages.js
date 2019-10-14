import { stream2 as stream } from 'air-stream';

export default ({ url, revision }) =>
  stream.from(
    fetch(url, {
      mode: 'cors',
      method: 'GET',
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    })
      .then(raw => raw.text())
      .then(xml => {
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');

        const content = [...doc.querySelector('languages').children].reduce((acc, next) => {

          const lang = next.tagName;

          [...next.children].map(string => {
            const name = string.getAttribute('name');
            let exist = acc.find(([x]) => x === name);
            if (!exist) {
              acc.push(exist = [name, {}]);
            }
            exist[1][lang] = string.textContent;
          });

          return acc;

        }, ['languages']);

        return { type: 'language', content };
      })
  );