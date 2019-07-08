'use strict';

// Used to remove a prefix of tokens we don't care about.
const ignorable = new RegExp(`^(?:${ [
  String.raw`[/][/][^\r\n\u2028\u2029]*`, // Line comment
  String.raw`[/][*](?:[^*]|[*](?![/]))*(?:[*][/]?)?`, // Block comment
  String.raw`[\t \n\r\u2028\u2029\ufeff]`, // Whitespace
].join('|')
})+`);
const significant = new RegExp(`^(?:${ [
  // Number is approximate.  Overmatches invalid tokens and signs in exponent are split off.
  String.raw`(?:[0-9]\w*(?:[.]\w*)?)+`, String.raw`[.][0-9]\w+`,
  // Identifier is approximate.  Overmatches invalid tokens.
  String.raw`(?:[_$\w]|[^\x00-\xff]|\\u)+`, String.raw`"(?:[^\"\\\n\r\u2028\u2029]|\\(?:[^\r]|\r\n))+"`, // DQ string
  String.raw`'(?:[^\'\\\n\r\u2028\u2029]|\\(?:[^\r]|\r\n))+'`, // SQ string
  String.raw`\`(?:[^\`\\$]|[$](?![\{])|\\(?:[^\r|\r\n]))+(?:\`|[$][\{])`, // BQ string start
  String.raw`[.](?:[.][.])?`, // ... or .
  // A single punctuation character.  Splits <<, +=, and other multicharacter punctuation.
  String.raw`[^\x00-\x20\u0100-\uffff/.\w_$\"\'\`]`,
  // A '/' that is not part of a comment is not handled.
].join('|')
})`);
const templateStringContinuation = /^(?:[^\\`$]|\\(?:\r\n?|[^\r])|[$](?![{]))*/;

const regex = new RegExp(
  String.raw`^/(?:[^\/\\\[]|\\.|\[(?:[^\]\\]|\\.)*\])+/\w+`);
const divop = /^\//;

const slashPreceder = {
  __proto__: null,
  // Tokens (or parts thereof since we don't match multi-character punctutation)
  // that definitely precede a regex or division operator.
  '(': regex,
  '[': regex,
  '{': regex,
  ',': regex,
  ';': regex,
  '=': regex,
  '|': regex,
  '&': regex,
  '!': regex,
  '?': regex,
  ':': regex,
  ')': divop,
  ']': divop,
  '0': divop,
};

// A generator over JS tokens.
// eslint-disable-next-line complexity
function * tokenize(sourceText) {
  // This is approximate.
  // It does not handle division operator (/), /regex/ distinction correctly.
  // TODO TESTCASE function(i, x =  ++/i/i.exec('.').split('').length) {}
  // TODO TESTCASE function(i, x = i++/i/i.toString(16).length) {}
  const doesRCurlyReenterTemplateString = [];
  let inTemplateString = false;
  let lastToken = ';';

  for (let remainder = sourceText; remainder;) {
    //  console.log(`remainder=${ JSON.stringify(remainder) }, in=${ inTemplateString }, rcStack=${
    //      doesRCurlyReenterTemplateString }`);

    if (inTemplateString) {
      let [ { length: nToIgnore } ] = templateStringContinuation.exec(remainder);
      // Do not emit template string content as a token.
      // Naive clients might confuse the ')' in `(${ x })${ y }` for a top-level token.
      if (remainder[nToIgnore] === '`') {
        ++nToIgnore;
      } else if (remainder[nToIgnore] === '$' && remainder[nToIgnore + 1] === '{') {
        doesRCurlyReenterTemplateString.push(true);
        nToIgnore += 2;
      } else {
        // Reachable on unterminated like `\

        throw new Error(`Unterminated ${ remainder }`);
      }
      //    console.log(`Consuming template content ${ JSON.stringify(remainder.substring(0, nToIgnore)) }`);
      remainder = remainder.substring(nToIgnore);
      inTemplateString = false;
      lastToken = '``'; // Approximate
      continue;
    }

    const matchIgn = ignorable.exec(remainder);
    if (matchIgn) {
      const [ { length: nIgnored } ] = matchIgn;
      if (nIgnored) {
        //      console.log(`ignoring ${ JSON.stringify(remainder.substring(0, nIgnored)) }`);
        remainder = remainder.substring(nIgnored);
        continue;
      }
    }

    let pattern = significant;
    if (remainder[0] === '/') {
      let key = lastToken;
      if (/^[0-9]/.test(lastToken)) {
        key = '0';
      }
      pattern = slashPreceder[key];
      if (!pattern) {
        throw new Error(`Ambiguous / after ${ lastToken }`);
      }
    }

    const matchSig = pattern.exec(remainder);
    if (matchSig) {
      const [ token ] = matchSig;
      //    console.log(`got token ${ token }`);
      if (token) {
        remainder = remainder.substring(token.length);
        switch (token[0]) {
          case '`':
            if (/[^\\](?:\\\\)*[$][{]$/.test(token)) {
              doesRCurlyReenterTemplateString.push(true);
            } else if (!/[^\\](?:\\\\)*`$/.test(token)) {
              throw new Error(`Unterminated ${ token }`);
            }
            break;
          case '{':
            doesRCurlyReenterTemplateString.push(false);
            break;
          case '}':
            inTemplateString = doesRCurlyReenterTemplateString.pop();
            if (inTemplateString) {
            // If token is part of ${...} do not emit it as a token.
              continue;
            }
            break;
          default:
            break;
        }

        lastToken = token;
        yield token;
        continue;
      }
    }
    throw new Error(
      `Lex failure in ${ JSON.stringify(sourceText) } at ${ sourceText.length - remainder.length }`);
  }
// console.log('done tokenizing');
}

module.exports = tokenize;
