// common files
import { generateRandomHexString } from '../common/ids/unique-id'
import { Aggregator } from '../common/aggregate/aggregator'
import { globalScope } from '../common/constants/runtime'
import { gosInitializedAgent } from '../common/window/nreum'
import { warn } from '../common/util/console'
import { onDOMContentLoaded } from '../common/window/load'
import { InfoConfigurable } from './config/info-configurable'
import { InitConfigurable } from './config/init-configurable'
import { LoaderConfigurable } from './config/loader-configurable'
import { RuntimeConfigurable } from './config/runtime-configurable'
import { FEATURE_NAMES } from './features/features'
import { ee } from '../common/event-emitter/contextual-ee'
import { handle } from '../common/event-emitter/handle'
import { registerDrain } from '../common/drain/drain'

// required features
import { Instrument as PageViewEvent } from '../features/page_view_event/instrument'

/**
 * @typedef {import('../features/utils/instrument-base').InstrumentBase} InstrumentBase
 */

/**
 * @typedef AgentOptions
 * @property {Exclude<InfoConfigurable, 'update'>} info
 * @property {Exclude<InitConfigurable, 'update'>} init
 * @property {Exclude<LoaderConfigurable, 'update'>} loader_config
 * @property {string} loaderType Identifier for the type of agent being loaded. Only used in supportability
 * metrics to track agent type usage.
 * @property {boolean} exposed Indicates if the agent should respond to global agent API calls when called using
 * `newrelic.[API_NAME]` or `NREUM.[API_NAME]`.
 */

/**
 * A base class that all agents extend for basic functionality.
 */
export class AgentBase {
  #infoConfig = new InfoConfigurable()
  #initConfig = new InitConfigurable()
  #loaderConfig = new LoaderConfigurable()
  #runtimeConfig = new RuntimeConfigurable()

  /**
   * @param {AgentOptions=} options Specifies features and runtime configuration,
   * @param {string=} agentIdentifier The optional unique ID of the agent.
   */
  constructor (options = {}, agentIdentifier = generateRandomHexString(16)) {
    if (!globalScope) {
      // We could not determine the runtime environment. Short-circuite the agent here
      // to avoid possible exceptions later that may cause issues with customer's application.
      warn('Failed to initial the agent. Could not determine the runtime environment.')
      return
    }

    this.agentIdentifier = agentIdentifier
    this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
    this.eventEmitter = ee.get(this.agentIdentifier)

    // Apply the configuration options to the agent
    this.#applyConfig(options)
    this.#runtimeConfig.update({ loaderType: options.loaderType || 'Agent', exposed: options.exposed || true })
    // Setup a listener to catch any configuration options added later in the DOM
    onDOMContentLoaded(() => { this.#applyConfig(options) })

    /** @type {{[key: string]: typeof InstrumentBase}} **/
    this.features = {}

    this.desiredFeatures = new Set(options.features || []) // expected to be a list of static Instrument/InstrumentBase classes, see "spa.js" for example
    // For Now... ALL agents must make the rum call whether the page_view_event feature was enabled or not.
    // NR1 creates an index on the rum call, and if not seen for a few days, will remove the browser app!
    // Future work is being planned to evaluate removing this behavior from the backend, but for now we must ensure this call is made
    this.desiredFeatures.add(PageViewEvent)

    // Expose the agent to the global scope
    gosInitializedAgent(this)

    // Async load the agent API implementations
    registerDrain(this.agentIdentifier, 'api')
    this.#loadApi().catch(err =>
      warn('An error occurred loading the agent API definition.', err)
    )
  }

  /**
   * Applies global and passed configurations to the current agent instance.
   * @param {AgentOptions=} options
   */
  #applyConfig (options = {}) {
    this.#infoConfig.update(globalScope.NREUM?.info || {})
    this.#infoConfig.update(options.info || {})
    this.#initConfig.update(globalScope.NREUM?.init || {})
    this.#initConfig.update(options.init || {})
    this.#initConfig.update(globalScope.NREUM?.loader_config || {})
    this.#initConfig.update(options.loader_config || {})
  }

  /**
   * Async loads the agent API definitions for the current agent
   */
  async #loadApi () {
    const AgentApi = (await import(/* webpackChunkName: "agent-api" */'./agent-api')).AgentApi
    this.agentApi = new AgentApi(this)
  }

  get config () {
    warn('Access made to deprecated agent property `config`. Use `infoConfig`, `initConfig`, `loaderConfig`, and `runtimeConfig` properties to access individual configurations.')
    return {
      info: this.infoConfig,
      init: this.initConfig,
      loader_config: this.loaderConfig,
      runtime: this.runtimeConfig
    }
  }

  get infoConfig () {
    return this.#infoConfig
  }

  /**
   * Updates the current info configuration using the provided input object. Only properties
   * defined on the info config model will be updated.
   * @param {Exclude<InfoConfigurable, 'update'>} input New info config object property values.
   */
  set infoConfig (input) {
    this.#infoConfig.update(input)
  }

  get initConfig () {
    return this.#initConfig
  }

  /**
   * Updates the current init configuration using the provided input object. Only properties
   * defined on the init config model will be updated.
   * @param {Exclude<InitConfigurable, 'update'>} input New init config object property values.
   */
  set initConfig (input) {
    this.#initConfig.update(input)
  }

  get loaderConfig () {
    return this.#loaderConfig
  }

  /**
   * Updates the current loader configuration using the provided input object. Only properties
   * defined on the loader config model will be updated.
   * @param {Exclude<LoaderConfigurable, 'update'>} input New loader config object property values.
   */
  set loaderConfig (input) {
    this.#loaderConfig.update(input)
  }

  get runtimeConfig () {
    return this.#runtimeConfig
  }

  /**
   * Updates the current runtime configuration using the provided input object. Only properties
   * defined on the runtime config model will be updated.
   * @param {Exclude<RuntimeConfigurable, 'update'>} input New runtime config object property values.
   */
  set runtimeConfig (input) {
    this.#runtimeConfig.update(input)
  }

  get enabledFeatures () {
    return Object.values(FEATURE_NAMES)
      .reduce((collector, featureName) => {
        collector[featureName] = this.initConfig[featureName]?.enabled || false
        return collector
      }, {})
  }

  /* Sync Agent APIs */

  /**
   * Sets a custom attribute within the agent to be passed on subsequent data collection calls. If the value
   * is omitted or undefined, the attribute will be removed.
   * @param {string} name Name of the custom attribute to set.
   * @param {string|number} [value] Value of the custom attribute to set.
   * @param {boolean} [persistAttribute] Indicates if attribute should be persisted across page views.
   */
  setCustomAttribute (name, value, persistAttribute = false) {
    handle('api', ['setCustomAttribute', name, value, persistAttribute], undefined, 'api', this.eventEmitter)
  }
}
