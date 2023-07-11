
/**
 * @typedef {import('./agent-base').AgentBase} AgentBase
 */

export const API_NAMES = [
  'setErrorHandler', 'finished', 'addToTrace', 'inlineHit', 'addRelease',
  'addPageAction', 'setCurrentRouteName', 'setPageViewName', 'setCustomAttribute',
  'interaction', 'noticeError', 'setUserId'
]

export class AgentApi {
  /**
   * Constructs a new agent api definition that will listen to the provided agents
   * event emitter for API calls and react appropriately.
   * @param {AgentBase} agent Agent the API definitions are being attached to.
   */
  constructor (agent, forceDrain = false) {
    this.agent = agent
    this.eventEmitter = this.agent.eventEmitter.get('api')

    this.agent.eventEmitter.on('api', (apiName, ...args) => {
      return this[apiName](...args)
    })
  }

  setCustomAttribute (name, value, persistAttribute = false) {
    console.log('setCustomAttribute called', name, value, persistAttribute)
  }
}
