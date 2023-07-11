import { Configurable } from './configurable'

export class LoaderConfigurable extends Configurable {
  accountID = undefined
  trustKey = undefined
  agentID = undefined
  licenseKey = undefined
  applicationID = undefined
  xpid = undefined

  /**
   * Constructs a new configurable instance using the loader config model.
   * @param {Exclude<LoaderConfigurable, 'update'>=} input Base loader config options to apply
   * to the configuration instance.
   */
  constructor (input) {
    super()

    this.update(input)
  }
}
