'use strict';

// Per https://github.com/es-shims/es-shim-api :
// In every way possible, the package must attempt to make itself
// robust against the environment being modified after it is required.
const { prototype } = Function;
const { toString } = prototype;
const { apply } = Reflect;
const { defineProperty, freeze, hasOwnProperty } = Object;

const tokenize = require('./lib/quick-and-dirty-lexer.js');

const memoTable = new WeakMap();

// eslint-disable-next-line complexity
function arityOf(fun) {
  if (memoTable.has(fun)) {
    return memoTable.get(fun);
  }
  const str = apply(toString, fun, []);

  // Between the parentheses around the formals.
  let inFormalParameterList = false;
  // Count of open brackets ('[', '(', '{') that have been seen without a corresponding
  // close bracket.
  let bracketDepth = 0;
  // Number of formal parameters seen so far.  This includes any rest param.
  let declaredParameterCount = 0;
  // True if the formal parameter list has a ... pattern.
  let hasRestParam = false;

  // Action to apply to the next token processed.  This allows equiv of LA(1)
  // without implementing pushback.
  let onNext = null; // Special action for next token.

  function maybeCountParam(next) {
    if (next !== ')') {
      ++declaredParameterCount;
    }
  }

  tokenLoop:
  for (const tok of tokenize(str)) {
    if (onNext) {
      const onTok = onNext;
      onNext = null;
      onTok(tok);
    }
    switch (tok) {
      case '(':
        if (!bracketDepth) {
          inFormalParameterList = true;
          onNext = maybeCountParam;
        }
        // fallthrough
      case '{':
      case '[':
        // This works even if str has a dynamic name like
        //   [nameExpression](formal,parameter,list) {body}
        ++bracketDepth;
        break;
      case ',':
        if (inFormalParameterList && bracketDepth === 1) {
          onNext = maybeCountParam;
        }
        break;
      case '...':
        if (inFormalParameterList && bracketDepth === 1) {
          hasRestParam = true;
        }
        break;
      case ')':
        if (inFormalParameterList && bracketDepth === 1) {
          break tokenLoop;
        }
        // fallthrough
      case '}': case ']':
        if (!bracketDepth) {
          throw new Error(str);
        }
        --bracketDepth;
        break;
      default:
        break;
    }
  }
  const record = freeze({
    __proto__: null,
    max: declaredParameterCount,
    usesRest: hasRestParam,
  });
  memoTable.set(fun, record);
  return record;
}

module.exports = arityOf;

// Per https://github.com/es-shims/es-shim-api :

// require('foo').implementation or require('foo/implementation') is a
// spec-compliant JS function, that will depend on a receiver
// (a “this” value) as the spec requires.
arityOf.implementation = arityOf;

// require('foo').getPolyfill or require('foo/polyfill') is a function
// that when invoked, will return the most compliant and performant
// function that it can - if a native version is available, and does
// not violate the spec, then the native function will be returned -
// otherwise, either the implementation, or a custom, wrapped version
// of the native function, will be returned. This is also the result
// that will be used as the default export.
arityOf.getPolyfill = function getPolyfill() {
  // TODO: look for native
  return arityOf;
};

// require('foo').shim or require('foo/shim') is a function that when
// invoked, will call getPolyfill, and if the polyfill doesn’t match
// the built-in value, will install it into the global environment.
//
// The only place the package may modify the environment is within its
// shim method.
arityOf.shim = function shim() {
  if (!hasOwnProperty(prototype, 'maxArity')) {
    defineProperty(
      prototype,
      'maxArity',
      {
        configurable: true,
        get() {
          return arityOf(this).max;
        },
      });
  }
  if (!hasOwnProperty(prototype, 'usesRest')) {
    defineProperty(
      prototype,
      'usesRest',
      {
        configurable: true,
        get() {
          return arityOf(this).usesRest;
        },
      });
  }
};
