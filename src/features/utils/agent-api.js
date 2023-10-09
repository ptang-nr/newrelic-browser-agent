import { ee } from '../../common/event-emitter/contextual-ee'
import { handle } from '../../common/event-emitter/handle'
import { SUPPORTABILITY_METRIC_CHANNEL } from '../metrics/constants'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { now } from '../../common/timing/now'

export const API_PREFIX = 'api-'
export const SPA_API_PREFIX = API_PREFIX + 'ixn-'

/**
 * API wrapping method that creates event emitter events for calls to the API. If
 * a buffer group and prefix were provided, this method will also create an event
 * for one or more initialized features to handle.
 * @callback apiCallWrapper
 * @param {*=} context This is the context or `this` scope that is returned after
 * the method is executed and event emitter events are sent.
 * @param {...*} args Arguments to pass on to the feature handling the api call.
 * @returns {*} Returns the context that was provided or undefined.
 */

/**
 * Reusable method for many API calls. This method creates a callback function
 * that can be assigned as an API method. When the API is called, a supportability
 * metric is created and, if needed, a buffered event emitter is dispatched for
 * features to handle the API call.
 * @param agentIdentifier {string} The identifier for the agent instance.
 * @param name {string} The name of the API.
 * @param bufferGroup {string=} The buffer group name to send the event to.
 * @param prefix {string=} The event emitter prefix for buffer the event.
 * @return {apiCallWrapper}
 */
export function apiCall (agentIdentifier, name, bufferGroup, prefix) {
  const instanceEE = ee.get(agentIdentifier)

  return (context, ...args) => {
    handle(SUPPORTABILITY_METRIC_CHANNEL, ['API/' + name + '/called'], undefined, FEATURE_NAMES.metrics, instanceEE)
    if (bufferGroup) handle(prefix + name, [now(), ...args], context, bufferGroup, instanceEE)
    return context
  }
}
