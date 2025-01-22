import { generateUuid } from '../ids/unique-id'

const lineBreak = `
`

class TargetStack {
  constructor () {
    this.reset()
  }

  /** Resets to a uuid stack trace to ensure it wont match any other stack trace */
  reset () {
    this.target = {}
    this.stackTrace = generateUuid()
  }
}

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
    if (removeNr) return stack.split('\n').map(x => x.trim()).slice(2).join(lineBreak)
    return stack.split('\n').map(x => x.trim()).join(lineBreak)
  } catch (e) {
    return stack
  }
}

export function compareStackTraces (traceStack, stack) {
  return stack.includes(traceStack)
}

export const targetStackTrace = new TargetStack()
