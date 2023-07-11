/**
 * @file Defines `InstrumentBase` to be used as the super of the Instrument classes implemented by each feature.
 * Inherits and executes the `checkConfiguration` method from [FeatureBase]{@link ./feature-base}, which also
 * exposes the `blocked` property.
 */

import { drain, registerDrain } from '../../common/drain/drain'
import { FeatureBase } from './feature-base'
import { onWindowLoad } from '../../common/window/load'
import { isBrowserScope } from '../../common/constants/runtime'
import { warn } from '../../common/util/console'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { AgentBase } from '../../loaders/agent-base'

/**
 * Base class for instrumenting a feature.
 */
export class InstrumentBase extends FeatureBase {
  /**
   * Creates a feature instrument instance with base methods for asyncronously importing the features aggregate class.
   * @param {AgentBase} agent The agent instantiating the feature.
   * @param {string} featureName The name of the feature module (used to construct file path).
   * @param {boolean} [auto=true] Determines whether the feature should automatically register to have the draining
   * of its pooled instrumentation data handled by the agent's centralized drain functionality, rather than draining
   * immediately. Primarily useful for fine-grained control in tests.
   */
  constructor (agent, featureName, auto = true) {
    super(agent, featureName)
    this.auto = auto

    /** @type {Function | undefined} This should be set by any derived Instrument class if it has things to do when feature fails or is killed. */
    this.abortHandler
    /**
     * @type {Class} Holds the reference to the feature's aggregate module counterpart, if and after it has been initialized. This may not be assigned until after page loads!
     * The only purpose of this for now is to expose it to the NREUM interface, as the feature's instrument instance is already exposed.
    */
    this.featAggregate
    /**
     * @type {Promise} Assigned immediately after @see importAggregator runs. Serves as a signal for when the inner async fn finishes execution. Useful for features to await
     * one another if there are inter-features dependencies.
    */
    this.onAggregateImported

    if (auto) registerDrain(this.agent.agentIdentifier, featureName)
  }

  /**
   * Lazy-load the latter part of the feature: its aggregator. This method is called by the first part of the feature
   * (the instrumentation) when instrumentation is complete.
   * @param {Object} [argsObjFromInstrument] - any values or references to pass down to aggregate
   * @returns void
   */
  importAggregator (argsObjFromInstrument = {}) {
    if (this.featAggregate || !this.auto) return
    const enableSessionTracking = isBrowserScope && this.agent.initConfig.privacy.cookies_enabled === true
    let loadedSuccessfully
    this.onAggregateImported = new Promise(resolve => {
      loadedSuccessfully = resolve
    })

    const importLater = async () => {
      let session
      try {
        if (enableSessionTracking) { // would require some setup before certain features start
          const { setupAgentSession } = await import(/* webpackChunkName: "session-manager" */ './agent-session')
          session = setupAgentSession(this.agentIdentifier)
        }
      } catch (e) {
        warn('A problem occurred when starting up session manager. This page will not start or extend any session.', e)
      }

      /**
       * Note this try-catch differs from the one in Agent.start() in that it's placed later in a page's lifecycle and
       * it's only responsible for aborting its one specific feature, rather than all.
       */
      try {
        if (!this.shouldImportAgg(this.featureName, session)) {
          drain(this.agentIdentifier, this.featureName)
          loadedSuccessfully(false) // aggregate module isn't loaded at all
          return
        }
        const { lazyFeatureLoader } = await import(/* webpackChunkName: "lazy-feature-loader" */ './lazy-feature-loader')
        const { Aggregate } = await lazyFeatureLoader(this.featureName, 'aggregate')
        this.featAggregate = new Aggregate(this.agent, argsObjFromInstrument)
        loadedSuccessfully(true)
      } catch (e) {
        warn(`Downloading and initializing ${this.featureName} failed...`, e)
        this.abortHandler?.() // undo any important alterations made to the page
        // not supported yet but nice to do: "abort" this agent's EE for this feature specifically
        loadedSuccessfully(false)
      }
    }

    // For regular web pages, we want to wait and lazy-load the aggregator only after all page resources are loaded.
    // Non-browser scopes (i.e. workers) have no `window.load` event, so the aggregator can be lazy-loaded immediately.
    if (!isBrowserScope) importLater()
    else onWindowLoad(() => importLater(), true)
  }

  /**
 * Make a determination if an aggregate class should even be imported
 * @param {string} featureName
 * @param {SessionEntity} session
 * @returns
 */
  shouldImportAgg (featureName, session) {
  // if this isnt the FIRST load of a session AND
  // we are not actively recording SR... DO NOT run the aggregator
  // session replay samples can only be decided on the first load of a session
  // session replays can continue if in progress
    if (featureName === FEATURE_NAMES.sessionReplay) {
      if (this.agent.initConfig.session_trace.enabled !== true) return false
      return !!session?.isNew || !!session?.state.sessionReplay
    }
    // todo -- add case like above for session trace
    return true
  }
}
