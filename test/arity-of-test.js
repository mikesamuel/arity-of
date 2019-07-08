/* eslint "id-length": 0, "id-blacklist": 0, "no-magic-numbers": 0 */

'use strict';

const { expect } = require('chai');
const { describe, it } = require('mocha');

const arityOf = require('../index.js');

function test(f, golden) {
  it(String(f), () => {
    const { max = 0, usesRest = false } = golden || {};
    const want = { max, usesRest };
    const got = arityOf(f);
    expect(want).to.deep.equal(got);
  });
}

describe('arity-of', () => {
  /* eslint-disable */
  test((a, b, c) => {}, { max: 3 });
  test(() => {}, {});
  test(() => (a, b, c), {});
  test((...args) => (a, b, c), { max: 1, usesRest: true });
  test(function * (_, $, [], {}) { if (0) {} else /./; }, { max: 4 });
  test(async (...args) => (a, b, c), { max: 1, usesRest: true });
  test((a, b, c = a) => {}, { max: 3 });
  test((a, b, c = `foo ${ 0 },,,)${ [ {} ][2] }`, d, e, ...f) => {},
    { max: 6, usesRest: true });
  test((pattern = /2,b=3/i) => {}, { max: 1 });
  test((i = 1/2,b=3/i) => {}, { max: 2 });
  /* eslint-enable */
});
