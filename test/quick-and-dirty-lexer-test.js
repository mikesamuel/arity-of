/* eslint "id-length": 0, "id-blacklist": 0, "no-magic-numbers": 0, "prefer-arrow-callback": 0, "func-names": 0 */

'use strict';

const { expect } = require('chai');
const { describe, it } = require('mocha');

const lex = require('../lib/quick-and-dirty-lexer.js');

describe('quick-and-dirty-lexer', function () {
  it('unterminated template string', function () {
    expect(
      function () {
        // eslint-disable-next-line no-template-curly-in-string
        return Array.from(lex('`foo ${ x }foo\\'));
      }
    ).to.throw();
    expect(
      function () {
        // eslint-disable-next-line no-template-curly-in-string
        return Array.from(lex('`foo ${ x }foo\\`'));
      }
    ).to.throw();
    expect(
      function () {
        // eslint-disable-next-line no-template-curly-in-string
        return Array.from(lex('`foo ${ x }foo'));
      }
    ).to.throw();
    expect(
      function () {
        return Array.from(lex('`foo\\`'));
      }
    ).to.throw();
    expect(
      function () {
        return Array.from(lex('`foo'));
      }
    ).to.throw();
    expect(
      function () {
        return Array.from(lex('`foo`'));
      }
    ).to.not.throw();
    expect(
      function () {
        return Array.from(lex('`foo\\\\`'));
      }
    ).to.not.throw();
  });

  it('ambiguous /', function () {
    expect(
      function () {
        return Array.from(lex('x = ++\n/regex/i'));
      }
    ).to.throw();
    expect(
      function () {
        return Array.from(lex('x   ++\n/notregex/i'));
      }
    ).to.throw();
  });
});
