import { DebugLogger } from './debug-logger'
import { getRuntime } from '../config/config'
import { ee } from '../event-emitter/contextual-ee'
import { FEATURE_NAMES } from '../../loaders/features/features'

/**
 * @typedef AgentDebuggerConfig
 * @prop {boolean} enabled Determines if the debugger is enabled and asynchronously loaded or not.
 * @prop {object} eventEmitterLogging Controls options for logging event emitter events.
 * @prop {boolean} eventEmitterLogging.enabled Determines if a logger should be attached to the event emitter.
 * @prop {string[]} eventEmitterLogging.eventTypes Array of event type strings to log event for. Defaults to ['*'] which
 * is very verbose.
 * @prop {object} spaLogging Controls options for logging data about the spa feature.
 * @prop {boolean} spaLogging.enabled Determines if a logger should be attached to the spa feature.
 */

export class AgentDebugger {
  #agent

  /**
   * @type {AgentDebuggerConfig}
   */
  #config

  #logger

  constructor (agent, config) {
    this.#agent = agent
    this.#config = config
    this.#logger = new DebugLogger(agent)

    this.#attachEventEmitterLogger()
    this.#attachSpaLogger()

    this.#logger.log('Agent debugger attached')
  }

  #attachEventEmitterLogger () {
    if (!(this.#config.eventEmitterLogging?.enabled)) return

    const eventEmitter = ee.get(this.#agent.agentIdentifier, getRuntime(this.#agent.agentIdentifier).isolatedBacklog)
    const eventTypes = this.#config.eventEmitterLogging.eventTypes || ['*']

    eventTypes.forEach(eventType => {
      eventEmitter.addEventListener(eventType, (...args) => {
        this.#logger.log('EventEmitter event noticed', ...args)
      })
    })
  }

  #attachSpaLogger () {
    if (!(this.#config.spaLogging?.enabled)) return

    let spaFeature
    for (const feature of this.#agent.desiredFeatures) {
      if (feature && feature.featureName === FEATURE_NAMES.spa) {
        spaFeature = feature
      }
    }

    if (!spaFeature) {
      this.#logger.log('Could not connect spa logger. SPA feature does not appear to be loaded.')
    }

    let wrappedSpaFeature = new Proxy(spaFeature, {
      construct: (trapTarget, argumentList) => {
        this.#logger.log('Instrumenting spa feature')

        const instrument = Reflect.construct(trapTarget, argumentList)
        instrument.onAggregateImported.then((success) => {
          if (success) {
            const aggregate = instrument.featAggregate

            if (!aggregate) {
              return this.#logger.error('Could not attach to SPA feature aggregate instance.')
            }

            let interactionDepth = aggregate.state.depth
            Object.defineProperty(aggregate.state, 'depth', {
              configurable: true,
              enumerable: true,
              get: () => {
                return interactionDepth
              },
              set: (value) => {
                if (value < interactionDepth) {
                  this.#logger.log('SPA interaction depth decreased', interactionDepth, value)
                } else if (value > interactionDepth) {
                  this.#logger.log('SPA interaction depth increased', interactionDepth, value)
                }
                interactionDepth = value
              }
            })

            let interactionsToHarvest = aggregate.state.interactionsToHarvest
            Object.defineProperty(aggregate.state, 'interactionsToHarvest', {
              configurable: true,
              enumerable: true,
              get: () => {
                return interactionsToHarvest
              },
              set: (value) => {
                if (Array.isArray(value) && value.length === 0) {
                  this.#logger.log('SPA feature harvesting interaction', ...interactionsToHarvest)
                }

                interactionsToHarvest = value
              }
            })
          }
        })

        return instrument
      }
    })
    this.#agent.desiredFeatures.delete(spaFeature)
    this.#agent.desiredFeatures.add(wrappedSpaFeature)
  }
}
