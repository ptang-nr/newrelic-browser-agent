const lineBreak = `
`

export function createStackTrace (clean, removeNr) {
  const origLimit = Error.stackTraceLimit
  try {
    Error.stackTraceLimit = 100
    throw new Error()
  } catch (e) {
    const stack = e.stack
    Error.stackTraceLimit = origLimit
    if (clean) return cleanStackTrace(stack, removeNr)
    return stack
  }
}

export function cleanStackTrace (stack, removeNr = false) {
  try {
    if (removeNr) return stack.split('\n').map(x => x.trim()).slice(3).join(lineBreak)
    return stack.split('\n').map(x => x.trim()).join(lineBreak)
  } catch (e) {
    return stack
  }
}

export function compareStackTraces (traceStack, stack) {
  return stack.includes(traceStack)
}

export const targetStackTrace = {}
