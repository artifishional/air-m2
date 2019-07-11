import { routeNormalizer, routeNormalizer2 } from '../../src/utils';

const routes = [
  {
    path: '',
    expected: { route: [] }
  },
  {
    path: '.[a=1]',
    expected: { a: 1, route: [] }
  },
  {
    path: './{name: abc, kind: 10}',
    expected: 'exception'
  },
  {
    path: './[a=1,c=abc]{name: abc, kind: 10}/{name: qwe}[b=2]',
    expected: 'exception'
  },
  {
    path: './foo[a=1,route=2]/{name: qwe}[b=2]',
    expected: 'exception'
  },
  {
    path: './{name: abc, kind: 10}[a=1,c=abc]/{name: qwe}[b=2]',
    expected: 'exception'
  },
  {
    path: './cat-a',
    expected: { route: ['cat-a'] }
  },
  {
    path: './cat-a[kind=10]',
    expected: { kind: 10, route: ['cat-a'] }
  },
  {
    path: './cat-a[a=1][kind=10]',
    expected: {"a": 1, "kind": 10, "route": ["cat-a"]}
  },
  {
    path: './cat-a[a=1]some[kind=10]',
    expected: {"a": 1, "kind": 10, "route": ["cat-asome"]}
  },
  {
    path: './.component-id',
    expected: { route: ['.component-id'] }
  },
  {
    path: './#component-id',
    expected: { route: ['#component-id'] }
  },
  {
    path: './@component-key',
    expected: { route: ['@component-key'] }
  },
  {
    path: './{name: abc, kind: 10}',
    expected: 'exception'
  },
  {
    path: './{name: "abc", kind: 10}',
    expected: { route: [ { kind: 10, name: "abc" } ] }
  },
  {
    path: './foo[a=1,b=2]/[b=3]bar',
    expected: {"a": 1, "b": 3, "route": ["foo", "bar"]}
  },
  {
    path: '../foo[a=1,b=2]/bar',
    expected: { a: 1, b: 2, route: ['..', 'foo', 'bar'] }
  },
  {
    path: './foo[a=1,b=2]/bar[b=3]',
    expected: { a: 1, b: 3, route: ['foo', 'bar'] }
  },
  {
    path: './{name:123,b:22}/foo[a=1]/bar[b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
    expected: { a: 1, b: { x: { y: { z: 'abc' } } }, c: 4, d: 1.2, route: [ {name: 123, b: 22 }, 'foo', 'bar', 'baz'] }
  },
  {
    path: './{name:123,b:[1,2,3]}/foo[a=1]/bar[a={foo:[1,2,3]},b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
    expected: { a: { foo: [1, 2, 3] }, b: { x: { y: { z: 'abc' } } }, c: 4, d: 1.2, route: [ {name: 123, b: [1, 2, 3] }, 'foo', 'bar', 'baz'] }
  },
  {
    path: './{name:123,b:[1,2,3]}/foo[route=1]/bar[a={foo:[1,2,3]},b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
    expected: 'exception'
  },
  // {
  //   path: './{name:123,b:\'dontparse[1,2,3]\'}/foo[a=1]/bar[a={foo:[1,2,3]},b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
  //   expected: { a: { foo: [1, 2, 3] }, b: { x: { y: { z: 'abc' } } }, c: 4, d: 1.2, route: [ {name: 123, b: 'dontparse[1,2,3]' }, 'foo', 'bar', 'baz'] }
  // }
];

const parseRoute = (route, n = 1) =>
  new Promise((resolve, reject) => {
    let parsed = null;
    try {
      for (let i = 0; i < n; i++) {
        parsed = routeNormalizer(route);
      }
    } catch (e) {
      reject(e);
    }
    resolve(parsed);
  });

describe('Route Normalizer', () => {
  routes.map(({ path, expected }) => {
    const text = expected === 'exception' ? 'Exception for' : 'Parse route';
    test(`${text} "${path}"`, () => {
      if (expected === 'exception') {
        return expect(parseRoute(path)).rejects.toThrow();
      } else {
        return expect(parseRoute(path)).resolves.toStrictEqual(expected);
      }
    });
  });
});
