import { gosCDN } from '../../common/window/nreum'

const debugId = 2
const newrelic = gosCDN()
export function debugNR1 (agentIdentifier, location, event, otherprops = {}, debugName = 'SR') {
  const api = agentIdentifier ? newrelic.initializedAgents[agentIdentifier].api.addPageAction : newrelic.addPageAction
  api(debugName, {
    debugId,
    location,
    event,
    now: performance.now(),
    ...otherprops
  })
}
