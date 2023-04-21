import { serialize } from './serializer'

const dataTypes = [
  0,
  // eslint-disable-next-line no-new-wrappers
  new Number(0),
  Infinity,
  NaN,
  'asdf"\b\t\n\f\r\\',
  new Date(),
  {},
  new Error(),
  /./,
  false,
  // eslint-disable-next-line no-new-wrappers
  new Boolean(false),
  class FooBar {},
  class {},
  function () {},
  () => {},
  Symbol.for('test'),
  JSON.stringify({ foo: 'bar' })
]

/**
 * Returns a function for use as a replacer parameter in JSON.stringify() to handle circular references.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value MDN - Cyclical object value}
 * @returns {Function} A function that filters out values it has seen before.
 */
const getCircularReplacer = () => {
  const seen = new WeakSet()
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[circular reference]'
      }
      seen.add(value)
    }
    return value
  }
}

test('serializer should produce same output as JSON.stringify for "undefined" inputs', () => {
  expect(serialize(undefined)).toEqual(JSON.stringify(undefined))
  expect(serialize([undefined])).toEqual(JSON.stringify([undefined]))
  expect(serialize({ a: undefined })).toEqual(JSON.stringify({ a: undefined }))
})

test('serializer should produce same output as JSON.stringify for "null" inputs', () => {
  expect(serialize(null)).toEqual(JSON.stringify(null))
  expect(serialize([null])).toEqual(JSON.stringify([null]))
  expect(serialize({ a: null })).toEqual(JSON.stringify({ a: null }))
})

test.each(dataTypes)('serializer should produce same output as JSON.stringify for %s', (input) => {
  expect(serialize(input)).toEqual(JSON.stringify(input))
})

test('serializer should produce same output as JSON.stringify for a flat object', () => {
  const input = {}
  dataTypes.forEach((dataType, index) => {
    input[index] = dataType
  })

  expect(serialize(input)).toEqual(JSON.stringify(input))
})

test('serializer should produce same output as JSON.stringify for a flat array', () => {
  expect(serialize(dataTypes)).toEqual(JSON.stringify(dataTypes))
})

test('serializer should produce same output as JSON.stringify for nested objects', () => {
  const input = {
    nested: {}
  }
  dataTypes.forEach((dataType, index) => {
    input[index] = dataType
    input.nested[index] = dataType
  })

  expect(serialize(input)).toEqual(JSON.stringify(input))
})

test('serializer should produce same output as JSON.stringify for nested arrays', () => {
  const input = [...dataTypes, dataTypes]

  expect(serialize(input)).toEqual(JSON.stringify(input))
})

test('serializer should encode ', () => {
  const input = [...dataTypes, dataTypes]

  expect(serialize(input)).toEqual(JSON.stringify(input))
})

test('serializer should work for a circular object', () => {
  const input = {}
  dataTypes.forEach((dataType, index) => {
    input[index] = dataType
  })
  input.circular = input

  expect(serialize(input)).toEqual(JSON.stringify(input, getCircularReplacer()))
})

test('serializer should work for a circular array', () => {
  const input = [...dataTypes]
  input.push(input)

  expect(serialize(input)).toEqual(JSON.stringify(input, getCircularReplacer()))
})
