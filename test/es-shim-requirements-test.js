/* eslint "global-require": off, "id-length": off, "no-magic-numbers": off */

'use strict';

const { Function: FunctionBuiltin } = global;
const { getOwnPropertyDescriptors, defineProperties, hasOwnProperty } = Object;
const { expect } = require('chai');
const { describe, it } = require('mocha');
const { prototype } = FunctionBuiltin;

function doesNotModify(action) {
  const protoBits = getOwnPropertyDescriptors(prototype);
  const result = action();
  expect(getOwnPropertyDescriptors(prototype)).to.deep.equals(protoBits);
  return result;
}

function temporarilyPatch(withOld) {
  const descriptors = getOwnPropertyDescriptors(prototype);
  const old = FunctionBuiltin.arityOf;
  const hasOld = hasOwnProperty.call(FunctionBuiltin, 'arityOf');
  const hasOldMaxArity = hasOwnProperty.call(prototype, 'maxArity');
  const hasOldUsesRest = hasOwnProperty.call(prototype, 'usesRest');

  const oldDescriptors = {};
  if (hasOldMaxArity) {
    oldDescriptors.maxArity = descriptors.maxArity;
    delete prototype.maxArity;
  }
  if (hasOldUsesRest) {
    oldDescriptors.usesRest = descriptors.usesRest;
    delete prototype.usesRest;
  }
  if (hasOld) {
    delete FunctionBuiltin.arityOf;
  }
  try {
    withOld(old);
  } finally {
    if (hasOld) {
      FunctionBuiltin.arityOf = old;
    } else {
      delete FunctionBuiltin.arityOf;
    }
    try {
      delete prototype.maxArity;
    } catch (ex) {
      // ok
    }
    try {
      delete prototype.usesRest;
    } catch (ex) {
      // ok
    }
    defineProperties(prototype, oldDescriptors);
  }
}

describe('es-shim-api compatibility', () => {
  const base = '..';

  const defaultExport = doesNotModify(() => require(base));

  // https://github.com/es-shims/es-shim-api

  // require('foo') is a spec-compliant JS or native
  // function. However, if the function’s behavior depends on a
  // receiver (a “this” value), then the first argument to this
  // function will be used as that receiver. The package should
  // indicate if this is the case in its README.
  it('exports compliant function', () => {
    doesNotModify(() => {
      expect({
        name: defaultExport.name,
        type: typeof defaultExport,
      }).to.deep.equal({
        name: 'arityOf',
        type: 'function',
      });
    });
    // We test spec-compliance elsewhere.
  });

  describe('implementation', () => {
    // require('foo').implementation or require('foo/implementation') is
    // a spec-compliant JS function, that will depend on a receiver (a
    // “this” value) as the spec requires.
    it('.implementation', () => {
      doesNotModify(() => {
        expect(require(base).implementation).to.equal(defaultExport);
      });
    });
  });

  describe('polyfill', () => {
    // require('foo').getPolyfill or require('foo/polyfill') is a
    // function that when invoked, will return the most compliant and
    // performant function that it can - if a native version is
    // available, and does not violate the spec, then the native
    // function will be returned - otherwise, either the implementation,
    // or a custom, wrapped version of the native function, will be
    // returned. This is also the result that will be used as the
    // default export.
    it('.getPolyfill', () => {
      doesNotModify(() => {
        expect(require(base).getPolyfill()).to.equal(FunctionBuiltin.arityOf || defaultExport);
      });
    });
  });

  describe('shim', () => {
    // require('foo').shim or require('foo/shim') is a function that
    // when invoked, will call getPolyfill, and if the polyfill doesn’t
    // match the built-in value, will install it into the global
    // environment.
    it('.shim', () => {
      doesNotModify(() => {
        const { shim } = require(base);
        expect({
          name: shim.name,
          length: shim.length,
          type: typeof shim,
        }).to.deep.equal({
          name: 'shim',
          length: 0,
          type: 'function',
        });
      });
    });

    it('does not clobber', () => {
      // does nothing if the polyfill doesn't match the built-in value.
      temporarilyPatch((old) => {
        function arityOf(x) {
          throw new Error(`placeholder that should not be called ${ x }`);
        }
        if (!old) {
          FunctionBuiltin.arityOf = arityOf;
        }
        require(base).shim();
        expect(FunctionBuiltin.arityOf).equals(old || arityOf);
      });
    });
  });

  // require('foo/auto') will automatically invoke the shim method.
  it('/auto', () => {
    temporarilyPatch(() => {
      require(`${ base }/auto`);
      const { arityOf } = FunctionBuiltin;
      const {
        writable,
        enumerable,
        configurable,
      } = Object.getOwnPropertyDescriptor(FunctionBuiltin, 'arityOf');

      expect({
        name: arityOf.name,
        length: arityOf.length,
        type: typeof arityOf,
        writable,
        enumerable,
        configurable,
      }).to.deep.equal({
        name: 'arityOf',
        length: 1,
        type: 'function',
        writable: true,
        enumerable: false,
        configurable: true,
      });

      function f(a, b, c, ...d) {
        return [ a, b, c, d ];
      }
      expect(4).to.equal(f.maxArity);
      expect(true).to.equal(f.usesRest);
    });
  });
});
