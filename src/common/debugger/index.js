import { isBrowserScope, globalScope } from '../constants/runtime'

/**
 * @typedef {import('./agent-debugger').AgentDebuggerConfig} AgentDebuggerConfig
 */

export const attachDebugger = async (agent, cb) => {
  if (!agent || !agent.agentIdentifier) {
    throw new Error('The debugger can only be attached to an instantiated agent.')
  }

  try {
    if (isBrowserScope && typeof globalScope.localStorage !== 'undefined') {
      /**
       * @type {AgentDebuggerConfig}
       */
      const debuggerConfig = JSON.parse(globalScope.localStorage.getItem('NRBA_DEBUG') || '{}')

      if (debuggerConfig.enabled) {
        agent.debugger = new (await import(/* webpackChunkName: "nr-debugger" */'./agent-debugger')).AgentDebugger(agent, debuggerConfig)
      }
    }
  } catch (e) {}

  if (typeof cb === 'function') cb()
}
