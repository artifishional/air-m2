import { routeNormalizer } from '../../src/utils';

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
    expected: { route: [{ kind: 10, name: 'abc' }] }
  },
  {
    path: './[a=1,c=abc]{name: abc, kind: 10}/{name: qwe}[b=2]',
    expected: 'exception'
  },
  {
    path: './{name: abc, kind: 10}[a=1,c=abc]/{name: qwe}[b=2]',
    expected: { a: 1, b: 2, c: 'abc', route: [{ kind: 10, name: 'abc' }, { name: 'qwe' }] }
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
    expected: 'exception'
  },
  {
    path: './cat-a[a=1]some[kind=10]',
    expected: 'exception'
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
    expected: { route: [{ 'kind': 10, 'name': 'abc' }] }
  },
  {
    path: './foo[a=1,b=2]/[b=3]bar',
    expected: 'exception'
  },
  {
    path: './foo[a=1,b=2]/bar[b=3]',
    expected: { a: 1, b: 3, route: ['foo', 'bar'] }
  },
  {
    path: './foo[a=1, b=2]/bar[b={x:{y:{z:123}}}]/baz[c=4]',
    expected: { a: 1, b: { x: { y: { z: 123 } } }, c: 4, route: ['foo', 'bar', 'baz'] }
  }
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
    const text = expected === "exception" ? 'Exception for' : 'Parse route';
    test(`${text} "${path}"`, () => {
      if (expected === 'exception') {
        return expect(parseRoute(path)).rejects.toThrow();
      } else {
        return expect(parseRoute(path)).resolves.toStrictEqual(expected);
      }
    });
  });
});
