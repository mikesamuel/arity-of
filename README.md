# arity-of

[![Build Status](https://travis-ci.com/mikesamuel/arity-of.svg?branch=master)](https://travis-ci.com/mikesamuel/arity-of)
[![Dependencies Status](https://david-dm.org/mikesamuel/arity-of/status.svg)](https://david-dm.org/mikesamuel/arity-of)
[![npm](https://img.shields.io/npm/v/arity-of.svg)](https://www.npmjs.com/package/arity-of)
[![Coverage Status](https://coveralls.io/repos/github/mikesamuel/arity-of/badge.svg?branch=master)](https://coveralls.io/github/mikesamuel/arity-of?branch=master)
[![Install Size](https://packagephobia.now.sh/badge?p=arity-of)](https://packagephobia.now.sh/result?p=arity-of)
[![Known Vulnerabilities](https://snyk.io/test/github/mikesamuel/arity-of/badge.svg?targetFile=package.json)](https://snyk.io/test/github/mikesamuel/arity-of?targetFile=package.json)

An NPM library that exposes max arity and other metadata for JS functions

This package implements the [es-shim API](https://github.com/es-shims/api) interface. It works in an ES6-supported environment and complies with the [spec](http://www.ecma-international.org/ecma-262/9.0/) (TODO this is a lie.  Write a proposal).

## Concepts

"Arity" refers to the number of parameters a function declares.

`function (a, b, c) {}` declares 3 parameters so has a minimum and maximum arity of 3.

`function (a, b = 0, ...rest) {}` declares 3 parameters.  It has a minimum arity of 1 since
there is no default value for a.  It has a maximum arity of 3 since that is the number declared.
It uses a rest parameter `...rest` so it can actually take additional parameters.

## Installation

```sh
npm install arity-of
```

## Usage

```js
const arityOf = require('arity-of');

function myFunction(a, b = 0, [c, d], ...e) {
  // ...
}

myFunction.length;   // Minimum arity

const {
  max,               // Maximum arity (including any ...restParamater)
  usesRest,          // True if there is a ...restParameter.
} = arityOf(myFunction);
```
