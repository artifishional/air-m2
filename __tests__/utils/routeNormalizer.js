import { routeNormalizer, routeNormalizer2 } from '../../src/utils';
import { EMPTY_OBJECT } from "../../src/def";

const routes = [
  {
    message: 'Parse empty route',
    path: '',
    expected: [[], EMPTY_OBJECT]
  },
  {
    path: '.[a=1]',
    expected: [[], {a: 1}]
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
    expected: [['cat-a'], EMPTY_OBJECT]
  },
  {
    path: './cat-a[kind=10]',
    expected: [['cat-a'], {kind: 10}]
  },
  {
    path: './cat-a[a=1][kind=10]',
    expected: [["cat-a"], {"a": 1, "kind": 10}]
  },
  {
    path: './cat-a[a=1]some[kind=10]',
    expected: [["cat-asome"], {"a": 1, "kind": 10}]
  },
  {
    path: './.component-id',
    expected: [['.component-id'], EMPTY_OBJECT]
  },
  {
    path: './#component-id',
    expected: [['#component-id'], EMPTY_OBJECT]
  },
  {
    path: './@component-key',
    expected: [['@component-key'], EMPTY_OBJECT]
  },
  {
    path: './{name: abc, kind: 10}',
    expected: 'exception'
  },
  {
    path: './{name: "abc", kind: 10}',
    expected: [[ { kind: 10, name: "abc" } ], EMPTY_OBJECT]
  },
  {
    path: './foo[a=1,b=2]/[b=3]bar',
    expected: [["foo", "bar"], {"a": 1, "b": 3}]
  },
  {
    path: '../foo[a=1,b=2]/bar',
    expected: [['..', 'foo', 'bar'], { a: 1, b: 2}]
  },
  {
    path: './foo[a=1,b=2]/bar[b=3]',
    expected: [['foo', 'bar'], { a: 1, b: 3}]
  },
  {
    path: './{name:123,b:22}/foo[a=1]/bar[b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
    expected: [[{name: 123, b: 22}, 'foo', 'bar', 'baz'], {a: 1, b: {x: {y: {z: 'abc'}}}, c: 4, d: 1.2}]
  },
  {
    path: './{name:123,b:[1,2,3]}/foo[a=1]/bar[a={foo:[1,2,3]},b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
    expected: [
      [{name: 123, b: [1, 2, 3]}, 'foo', 'bar', 'baz'],
      {a: {foo: [1, 2, 3]}, b: {x: {y: {z: 'abc'}}}, c: 4, d: 1.2}
    ]
  },
  {
    path: './{name:123,b:[1,2,3]}/foo[route=1]/bar[a={foo:[1,2,3]},b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
    expected: 'exception'
  },
  {
    path: './{name:123,b:\'dont\\\'parse[1,2,3]\'}/foo[a=1]/bar[a={foo:[1,2,3]},b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
    expected: [
      [{name: 123, b: 'dont\'parse[1,2,3]'}, 'foo', 'bar', 'baz'],
      {a: {foo: [1, 2, 3]}, b: {x: {y: {z: 'abc'}}}, c: 4, d: 1.2}
    ]
  },
  {
    path: './{name:[1,2,3],b:\'dont\\\'parse[1,2,3]\'}/foo[a=1]/bar[a={foo:[1,2,3]},b={x:{y:{z:"abc"}}}]/baz[c=4][d=1.2]',
    expected: [
      [{name: [1, 2, 3], b: 'dont\'parse[1,2,3]'}, 'foo', 'bar', 'baz'],
      {a: {foo: [1, 2, 3]}, b: {x: {y: {z: 'abc'}}}, c: 4, d: 1.2}
    ]
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
