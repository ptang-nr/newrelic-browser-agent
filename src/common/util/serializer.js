/**
 * @file Implements a serializer that mimics most of the logic
 * of the native JSON.stringify except object containing toJSON
 * methods are never invoked.
 * @copy New Relic Corporation 2023
 * @license Apache-2.0
 */

/**
 * These are character classes that must be escaped in a JSON string.
 */
// eslint-disable-next-line no-misleading-character-class
const escapable = /[\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g
const meta = {
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\f': '\\f',
  '\r': '\\r',
  '"': '\\"',
  '\\': '\\\\'
}

/**
 * Indicates the type of input being processed during a recursive
 * call to the {@link serializer} method.
 */
const recursiveCallTypes = {
  OBJECT: 'object',
  ARRAY: 'array'
}

/**
 * Serializes the input in accordance with the same rules used for JSON.stringify without
 * relying on the native function. The native function also supports the calling of `toJSON`
 * methods on objects when defined. This can have adverse effects on customer code when the
 * customer includes state manipulation within their `toJSON` method. A known limitation of
 * JSON.stringify exists when called upon KnockoutJS objects.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
 * @param {any} input Any input that needs to be serialized
 * @returns {string|undefined} Serialized version of input. Can be undefined under some circumstances.
 * See the JSON.stringify MDN article for more information.
 */
export function serialize (input) {
  return serializer(input)
}

/**
 * Escapes characters that are required to be escaped in a JSON string like control
 * characters and double-quotes.
 * @param {string} input Input value to escape
 * @returns {string} Escaped input
 */
function escape (input) {
  escapable.lastIndex = 0
  return escapable.test(input)
    ? '"' + input.replaceAll(escapable, function (a) {
      var c = meta[a]
      return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4)
    }) + '"'
    : '"' + input + '"'
}

/**
 * Serializes the input and supports maintaining state between recursive calls. When
 * serializing arrays and objects, this method will be called multiple times while
 * traversing the array or object.
 * @param {any} input Any input that needs to be serialized
 * @param {recursiveCallTypes} recursiveCallType Indicates what type of input is being
 * serialized when in a recursive call.
 */
function serializer (input, recursiveCallType, seen = new WeakSet()) {
  let result = ''

  if (input === undefined || typeof input === 'function' || typeof input === 'symbol') {
    result = recursiveCallType === recursiveCallTypes.ARRAY ? 'null' : undefined
  } else if (input === null || (typeof input === 'number' && !isFinite(input))) {
    result = 'null'
  } else if (typeof input === 'number' || input instanceof Number) {
    result = (input - 0).toString()
  } else if (typeof input === 'string' || input instanceof String) {
    result = escape(input)
  } else if (typeof input === 'boolean' || input instanceof Boolean) {
    result = '' + input
  } else if (input instanceof Date) {
    result = '"' + input.toISOString() + '"'
  } else if (input instanceof Error || input instanceof RegExp) {
    result = '{}'
  } else if (Array.isArray(input)) {
    seen.add(input)
    result += '['

    for (const entry of input) {
      let isCircular = false
      if (entry && typeof entry === 'object') {
        if (seen.has(entry)) {
          isCircular = true
        } else {
          seen.add(entry)
        }
      }

      let childSerializer
      if (!isCircular) {
        childSerializer = serializer(entry, recursiveCallTypes.ARRAY)
      } else {
        childSerializer = '"[circular reference]"'
      }

      if (childSerializer) {
        if (result.length > 1) {
          result += ','
        }

        result += childSerializer
      }
    }

    result += ']'
  } else if (typeof input === 'object') {
    seen.add(input)
    result += '{'

    for (const [key, value] of Object.entries(input)) {
      let isCircular = false
      if (value && typeof value === 'object') {
        if (seen.has(value)) {
          isCircular = true
        } else {
          seen.add(value)
        }
      }

      let childSerializer
      if (!isCircular) {
        childSerializer = serializer(value, recursiveCallTypes.OBJECT)
      } else {
        childSerializer = '"[circular reference]"'
      }

      if (childSerializer) {
        if (result.length > 1) {
          result += ','
        }

        result += '"' + key + '":' + childSerializer
      }
    }

    result += '}'
  }

  return result
}
