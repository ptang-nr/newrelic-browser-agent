import { getRuntime } from '../../../common/config/config'
import { apiCall } from '../../utils/agent-api'

export function initializeAgentApi (agent) {
  agent.addApi('setPageViewName', (name, host) => {
    if (typeof name !== 'string') return
    if (name.charAt(0) !== '/') name = '/' + name
    getRuntime(agent.agentIdentifier).customTransaction = (host || 'http://custom.transaction') + name
    apiCall(agent.agentIdentifier, 'setPageViewName')()
  })
}
