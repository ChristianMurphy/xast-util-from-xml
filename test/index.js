/**
 * @typedef {import('../lib/index.js').Node} Node
 *
 *
 */

import fs from 'node:fs'
import path from 'node:path'
import test from 'tape'
import {isHidden} from 'is-hidden'
import {fromXml} from '../index.js'

const join = path.join

test('xast-util-from-xml', (t) => {
  t.equal(typeof fromXml, 'function', 'should expose a function')

  try {
    fromXml('<root unquoted=attribute>')
    t.fail('should fail (1)')
  } catch (error) {
    t.equal(
      String(error),
      '1:17: Unquoted attribute value',
      'should throw messages'
    )
  }

  try {
    fromXml('<!ENTITY>')
    t.fail('should fail (2)')
  } catch (error) {
    t.deepLooseEqual(
      String(error),
      '1:10: Unexpected SGML declaration',
      'should throw for SGML directives'
    )
  }

  try {
    fromXml('<root>&foo;</root>')
    t.fail('should fail (3)')
  } catch (error) {
    t.deepLooseEqual(
      String(error),
      '1:12: Invalid character entity',
      'should throw for unknown entities (1)'
    )
  }

  try {
    fromXml('<root>&copy;</root>')
    t.fail('should fail (4)')
  } catch (error) {
    t.deepLooseEqual(
      String(error),
      '1:13: Invalid character entity',
      'should throw for unknown entities (2)'
    )
  }

  try {
    fromXml('<root><a><b><c/></a></b></root>')
    t.fail('should fail (5)')
  } catch (error) {
    t.deepLooseEqual(
      String(error),
      '1:21: Unexpected close tag',
      'should throw on invalid nesting'
    )
  }

  t.throws(
    () => {
      fromXml('<!doctype>')
    },
    /1:11: Expected doctype name/,
    'should throw on missing doctype name'
  )

  t.throws(
    () => {
      fromXml('<!doctype !>')
    },
    /1:13: Expected start of doctype name/,
    'should throw on invalid doctype name'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name[<!ELEMENT greeting (#PCDATA)>]>')
    },
    /1:47: Unexpected internal subset/,
    'should throw on internal subset directly after doctype name'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name [<!ELEMENT greeting (#PCDATA)>]>')
    },
    /1:48: Unexpected internal subset/,
    'should throw on internal subset after doctype name'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name!>')
    },
    /1:17: Expected doctype name character, whitespace, or doctype end/,
    'should throw on invalid character directly after doctype'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name !>')
    },
    /1:18: Expected external identifier \(`PUBLIC` or `SYSTEM`\), whitespace, or doctype end/,
    'should throw on invalid character after doctype'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name PUB>')
    },
    /1:20: Expected external identifier \(`PUBLIC` or `SYSTEM`\)/,
    'should throw on invalid external identifier (1)'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name SYSTEm>')
    },
    /1:23: Expected external identifier \(`PUBLIC` or `SYSTEM`\)/,
    'should throw on invalid external identifier (2)'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name PUBLIC>')
    },
    /1:23: Expected whitespace after `PUBLIC`/,
    'should throw on missing whitespace after public identifier'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name PUBLIC !>')
    },
    /1:25: Expected quote or apostrophe to start public literal/,
    'should throw on invalid character after public identifier'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name PUBLIC "🤔">')
    },
    /1:28: Expected pubid character in public literal/,
    'should throw on invalid character in public identifier'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name PUBLIC "literal"!>')
    },
    /1:34: Expected whitespace after public literal/,
    'should throw on invalid character after public literal'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name SYSTEM>')
    },
    /1:23: Expected whitespace after `SYSTEM`/,
    'should throw on missing whitespace after system identifier'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name SYSTEM !>')
    },
    /1:25: Expected quote or apostrophe to start system literal/,
    'should throw on invalid character after system identifier'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name SYSTEM "asd>')
    },
    /1:28: Unexpected end/,
    'should throw on unended system literal'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name SYSTEM "asd" [<!ELEMENT greeting (#PCDATA)>]>')
    },
    /1:61: Unexpected internal subset/,
    'should throw on internal subset after external id'
  )

  t.throws(
    () => {
      fromXml('<!DOCTYPE name SYSTEM "asd" !>')
    },
    /1:31: Expected whitespace or end of doctype/,
    'should throw on unexpected character after external id'
  )

  t.end()
})

test('fixtures', (t) => {
  const base = join('test', 'fixtures')
  const files = fs.readdirSync(base)
  let index = -1

  while (++index < files.length) {
    if (!isHidden(files[index])) {
      each(files[index])
    }
  }

  t.end()

  function each(/** @type {string} */ fixture) {
    const input = fs.readFileSync(join(base, fixture, 'index.xml'))
    const fp = join(base, fixture, 'index.json')
    const actual = fromXml(input)
    /** @type {Node} */
    let expected

    try {
      expected = JSON.parse(String(fs.readFileSync(fp)))
    } catch {
      // New fixture.
      fs.writeFileSync(fp, JSON.stringify(actual, null, 2) + '\n')
      return
    }

    t.deepEqual(actual, expected, fixture)
  }
})
