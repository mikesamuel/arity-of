/* eslint "id-length": 0, "id-blacklist": 0, "no-magic-numbers": 0 */

'use strict';

const { expect } = require('chai');
const { describe, it, xit } = require('mocha');

const arityOf = require('../index.js');

// Used by test code.
// eslint-disable-next-line no-unused-vars
const foo = 'foo';
// eslint-disable-next-line no-unused-vars
const bar = 'bar';

function test(source, golden) {
  let f = null;
  let testFn = it;
  try {
    // eslint-disable-next-line no-eval
    f = eval(`(${ source })`);
  } catch (ex) {
    // We may not be able to parse some of the function code
    // on older Node engines.
    // For example, function(a,){} on node@7.
    // Skip those tests.
    console.error(ex); // eslint-disable-line no-console
    testFn = xit;
  }

  testFn(String(source), () => {
    expect('function').to.equal(typeof f);

    const { max = 0, usesRest = false } = golden || {};
    const want = { max, usesRest };
    const got = arityOf(f);
    expect(want).to.deep.equal(got);
  });
}

describe('arity-of', () => {
  /* eslint-disable */
  test('(a, b, c) => {}', { max: 3 });
  test('() => {}', {});
  test('() => (a, b, c)', {});
  test('(...args) => (a, b, c)', { max: 1, usesRest: true });
  test('function * (_, $, [], {}) { if (0) {} else /./; }', { max: 4 });
  test('async (...args) => (a, b, c)', { max: 1, usesRest: true });
  test('(a, b, c = a) => {}', { max: 3 });
  test('(a, b, c = `foo ${ 0 },,,)${ [ {} ][2] }`, d, e, ...f) => {}',
    { max: 6, usesRest: true });
  test('(pattern = /2,b=3/i) => {}', { max: 1 });
  test('(i = 1/2,b=3/i) => {}', { max: 2 });
  test('function danglingComma(a,) {}', { max: 1 });

  // This uses a dynamic name block.
  test('({ [(foo, bar)](/* no,params,here*/) {} }).bar', {});

  test('function (a = function (b, c) {}) {}', { max: 1 });

  /* eslint-enable */
});
