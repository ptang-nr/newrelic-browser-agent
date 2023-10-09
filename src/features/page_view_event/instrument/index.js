import { InstrumentBase } from '../../utils/instrument-base'
import * as CONSTANTS from '../constants'
import { initializeAgentApi } from './api'

export class Instrument extends InstrumentBase {
  static featureName = CONSTANTS.FEATURE_NAME
  static initializeAgentApi = initializeAgentApi

  constructor (agentIdentifier, aggregator, auto = true) {
    super(agentIdentifier, aggregator, CONSTANTS.FEATURE_NAME, auto)

    this.importAggregator()
  }
}
