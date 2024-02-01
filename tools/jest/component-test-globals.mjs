import { ee } from '../../src/common/event-emitter/contextual-ee.js'
import { gosNREUM, setNREUMInitializedAgent } from '../../src/common/window/nreum.js'
import { configure } from '../../src/loaders/configure/configure.js'
import { Aggregator } from '../../src/common/aggregate/aggregator.js'

global.setupAgent = function (agentIdentifier = (Math.random() + 1).toString(36).substring(7)) {
  const fakeAgent = { agentIdentifier }
  setNREUMInitializedAgent(agentIdentifier, fakeAgent)
  const api = configure(fakeAgent, {}, 'jest-test', true)
  const nr = gosNREUM()
  const aggregator = new Aggregator({ agentIdentifier, ee })
  const baseEE = ee.get(agentIdentifier)

  return { agentIdentifier, baseEE, aggregator, nr, api }
}
