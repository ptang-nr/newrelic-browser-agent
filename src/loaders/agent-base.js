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

  /**
   * Reports a browser PageAction event along with a name and optional attributes.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addpageaction/}
   * @param {string} name Name or category of the action. Reported as the actionName attribute.
   * @param {object} [attributes] JSON object with one or more key/value pairs. For example: {key:"value"}. The key is reported as its own PageAction attribute with the specified values.
   */
  addPageAction (name, attributes) {
    warn('Call to agent api addPageAction failed. The session trace feature is not currently initialized.')
  }

  /**
   * Groups page views to help URL structure or to capture the URL's routing information.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setpageviewname/}
   * @param {string} name The page name you want to use. Use alphanumeric characters.
   * @param {string} [host] Default is http://custom.transaction. Typically set host to your site's domain URI.
   */
  setPageViewName (name, host) {
    warn('Call to agent api setPageViewName failed. The page view feature is not currently initialized.')
  }

  /**
   * Adds a user-defined attribute name and value to subsequent events on the page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcustomattribute/}
   * @param {string} name Name of the attribute. Appears as column in the PageView event. It will also appear as a column in the PageAction event if you are using it.
   * @param {string|number|null} value Value of the attribute. Appears as the value in the named attribute column in the PageView event. It will appear as a column in the PageAction event if you are using it. Custom attribute values cannot be complex objects, only simple types such as Strings and Integers.
   * @param {boolean} [persist] Default false. f set to true, the name-value pair will also be set into the browser's storage API. Then on the following instrumented pages that load within the same session, the pair will be re-applied as a custom attribute.
   */
  setCustomAttribute (name, value, persist) {
    warn('Call to agent api setCustomAttribute failed. The js errors feature is not currently initialized.')
  }

  /**
   * Identifies a browser error without disrupting your app's operations.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/noticeerror/}
   * @param {Error|string} error Provide a meaningful error message that you can use when analyzing data on browser's JavaScript errors page.
   * @param {object} [customAttributes] An object containing name/value pairs representing custom attributes.
   */
  noticeError (error, customAttributes) {
    warn('Call to agent api noticeError failed. The js errors feature is not currently initialized.')
  }

  /**
   * Adds a user-defined identifier string to subsequent events on the page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setuserid/}
   * @param {string|null} value A string identifier for the end-user, useful for tying all browser events to specific users. The value parameter does not have to be unique. If IDs should be unique, the caller is responsible for that validation. Passing a null value unsets any existing user ID.
   */
  setUserId (value) {
    warn('Call to agent api setUserId failed. The js errors feature is not currently initialized.')
  }

  /**
   * Adds a user-defined application version string to subsequent events on the page.
   * This decorates all payloads with an attribute of `application.version` which is queryable in NR1.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setapplicationversion/}
   * @param {string|null} value A string identifier for the application version, useful for
   * tying all browser events to a specific release tag. The value parameter does not
   * have to be unique. Passing a null value unsets any existing value.
   */
  setApplicationVersion (value) {
    warn('Call to agent api setApplicationVersion failed. The agent is not currently initialized.')
  }

  /**
   * Allows selective ignoring and grouping of known errors that the browser agent captures.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/seterrorhandler/}
   * @param {(error: Error|string) => boolean | { group: string }} callback When an error occurs, the callback is called with the error object as a parameter. The callback will be called with each error, so it is not specific to one error.
   */
  setErrorHandler (callback) {
    warn('Call to agent api setErrorHandler failed. The js errors feature is not currently initialized.')
  }

  /**
   * Records an additional time point as "finished" in a session trace, and sends the event to New Relic.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/finished/}
   * @param {number} [timeStamp] Defaults to the current time of the call. If used, this marks the time that the page is "finished" according to your own criteria.
   */
  finished (timeStamp) {
    warn('Call to agent api finished failed. The page action feature is not currently initialized.')
  }

  /**
   * Adds a unique name and ID to identify releases with multiple JavaScript bundles on the same page.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addrelease/}
   * @param {string} name A short description of the component; for example, the name of a project, application, file, or library.
   * @param {string} id The ID or version of this release; for example, a version number, build number from your CI environment, GitHub SHA, GUID, or a hash of the contents.
   */
  addRelease (name, id) {
    warn('Call to agent api addRelease failed. The agent is not currently initialized.')
  }

  /**
   * Starts a set of agent features if not running in "autoStart" mode
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/start/}
   * @param {string|string[]|undefined} featureNames The feature name(s) to start.  If no name(s) are passed, all features will be started
   */
  start (featureNames) {
    warn('Call to agent api addRelease failed. The agent is not currently initialized.')
  }
}
