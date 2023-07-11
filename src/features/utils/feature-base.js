import { ee } from '../../common/event-emitter/contextual-ee'
import { AgentBase } from '../../loaders/agent-base'

/**
 * Base class for all feature instrument and aggregate classes.
 */
export class FeatureBase {
  /**
   * Creates a feature instrument or aggregate instance with pointers to the root agent and a scoped event
   * emitter specific to the feature.
   * @param {AgentBase} agent The agent instantiating the feature.
   * @param {string} featureName The name of the feature module (used to construct file path).
   */
  constructor (agent, featureName) {
    /** @type {AgentBase} */
    this.agent = agent
    /** @type {string} */
    this.featureName = featureName

    /** @type {ee} */
    this.eventEmitter = ee.get(this.agent.agentIdentifier, this.agent.runtimeConfig.isolatedBacklog)

    /**
     * Blocked can be used to prevent aggregation and harvest after initialization time of the feature.
     * This can currently happen if RUM response setToken flag is 0, which is tied to ingest account entitlement info.
     * @type {boolean}
     */
    this.blocked = false
  }
}
