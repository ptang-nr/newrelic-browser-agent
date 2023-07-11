import { Configurable } from './configurable'
import { DEFAULT_EXPIRES_MS, DEFAULT_INACTIVE_MS } from '../../common/session/constants'

export class InitConfigurable extends Configurable {
  #hiddenSessionReplayProps = {
    blockSelector: '[data-nr-block]',
    maskInputOptions: { password: true }
  }

  allow_bfcache = true // *cli - temporary feature flag for BFCache work
  privacy = { cookies_enabled: true }
  ajax = { deny_list: undefined, enabled: true, harvestTimeSeconds: 10 }
  distributed_tracing = {
    enabled: undefined,
    exclude_newrelic_header: undefined,
    cors_use_newrelic_header: undefined,
    cors_use_tracecontext_headers: undefined,
    allowed_origins: undefined
  }

  session = {
    domain: undefined, // used by first party cookies to set the top-level domain
    expiresMs: DEFAULT_EXPIRES_MS,
    inactiveMs: DEFAULT_INACTIVE_MS
  }

  ssl = true
  obfuscate = undefined
  jserrors = { enabled: true, harvestTimeSeconds: 10 }
  metrics = { enabled: true }
  page_action = { enabled: true, harvestTimeSeconds: 30 }
  page_view_event = { enabled: true }
  page_view_timing = { enabled: true, harvestTimeSeconds: 30, long_task: false }
  session_trace = { enabled: true, harvestTimeSeconds: 10 }
  spa = { enabled: true, harvestTimeSeconds: 10 }
  harvest = { tooManyRequestsDelay: 60 }
  session_replay = {
    // feature settings
    enabled: false,
    harvestTimeSeconds: 60,
    sampleRate: 0.1,
    errorSampleRate: 0.1,
    // recording config settings
    maskTextSelector: '*',
    maskAllInputs: true,
    // these properties only have getters because they are enforcable constants and should error if someone tries to override them
    get blockClass () { return 'nr-block' },
    get ignoreClass () { return 'nr-ignore' },
    get maskTextClass () { return 'nr-mask' },
    get blockSelector () {},
    set blockSelector (_) {},
    get maskInputOptions () {},
    set maskInputOptions (_) {}
  }

  /**
   * Constructs a new configurable instance using the init config model.
   * @param {Exclude<InitConfigurable, 'update'>=} input Base init config options to apply
   * to the configuration instance.
   */
  constructor (input = {}) {
    super()

    // extend enforceable session replay constants with customer input

    Object.defineProperty(this.session_replay, 'blockSelector', {
      get: () => this.#hiddenSessionReplayProps.blockSelector,
      // we must preserve data-nr-block no matter what else the customer sets
      set: (val) => {
        this.#hiddenSessionReplayProps.blockSelector = `[data-nr-block],${val}`
      }
    })

    Object.defineProperty(this.session_replay, 'blockSelector', {
      get: () => this.#hiddenSessionReplayProps.maskInputOptions,
      // password must always be present and true no matter what customer sets
      set: (val) => {
        this.#hiddenSessionReplayProps.maskInputOptions = { ...val, password: true }
      }
    })

    this.update(input)
  }
}
