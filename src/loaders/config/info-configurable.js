import { Configurable } from './configurable'

export class InfoConfigurable extends Configurable {
  // preset defaults
  beacon = 'bam.nr-data.net'
  errorBeacon = 'bam.nr-data.net'

  // others must be populated by user
  licenseKey = undefined
  applicationID = undefined
  sa = undefined
  queueTime = undefined
  applicationTime = undefined
  ttGuid = undefined
  user = undefined
  account = undefined
  product = undefined
  extra = undefined
  jsAttributes = {}
  userAttributes = undefined
  atts = undefined
  transactionName = undefined
  tNamePlain = undefined

  /**
   * Constructs a new configurable instance using the info config model.
   * @param {Exclude<InfoConfigurable, 'update'>=} input Base info config options to apply
   * to the configuration instance.
   */
  constructor (input) {
    super()

    this.update(input)
  }
}
