import { Aggregate } from './aggregate'
import { setInfo } from '../../common/config/state/info'
import { setConfiguration } from '../../common/config/state/init'
import qp from '@newrelic/nr-querypack'

describe('ajax feature', () => {
  let agentIdentifier
  let baseEE
  let aggregator
  let ajaxAggregate

  beforeEach(() => {
    const mockSetup = global.setupAgent()
    agentIdentifier = mockSetup.agentIdentifier
    baseEE = mockSetup.baseEE
    aggregator = mockSetup.aggregator

    setInfo(agentIdentifier, {})
    setConfiguration(agentIdentifier, {
      ajax: { enabled: true }
    })

    ajaxAggregate = new Aggregate(agentIdentifier, aggregator)
  })

  test('storeXhr for a SPA ajax request buffers in spaAjaxEvents', () => {
    const interaction = { id: 0 }
    const context = {
      spaNode: { interaction }
    }

    const ajaxArguments = [
      { // params
        method: 'PUT',
        status: 200,
        hostname: 'example.com',
        pathname: '/pathname'
      },
      { // metrics
        txSize: 128,
        rxSize: 256,
        cbTime: 5
      },
      0, // startTime
      10, // endTime
      'XMLHttpRequest' // type
    ]

    ajaxAggregate.storeXhr.apply(context, ajaxArguments)

    const events = ajaxAggregate.getStoredEvents()
    const interactionAjaxEvents = events.spaAjaxEvents[interaction.id]
    expect(interactionAjaxEvents.length).toEqual(1)
    expect(events.ajaxEvents.length).toEqual(0)

    const spaAjaxEvent = interactionAjaxEvents[0]
    expect(spaAjaxEvent.startTime).toEqual(0)
    expect(spaAjaxEvent.path).toEqual('/pathname')
  })

  test('storeXhr for a non-SPA ajax request buffers in ajaxEvents', () => {
    const context = { spaNode: undefined }
    const ajaxArguments = [
      { // params
        method: 'PUT',
        status: 200,
        hostname: 'example.com',
        pathname: '/pathname'
      },
      { // metrics
        txSize: 128,
        rxSize: 256,
        cbTime: 5
      },
      0, // startTime
      10, // endTime
      'XMLHttpRequest' // type
    ]

    ajaxAggregate.storeXhr.apply(context, ajaxArguments)

    const events = ajaxAggregate.getStoredEvents()
    expect(events.ajaxEvents.length).toEqual(1)
    expect(Object.keys(events.spaAjaxEvents).length).toEqual(0)

    const ajaxEvent = events.ajaxEvents[0]
    expect(ajaxEvent.startTime).toEqual(0)
    expect(ajaxEvent.path).toEqual('/pathname')
  })

  test('on interactionDiscarded, saved SPA events are buffered in ajaxEvents', () => {
    const interaction = { id: 0 }
    const context = {
      spaNode: { interaction }
    }

    const ajaxArguments = [
      { // params
        method: 'PUT',
        status: 200,
        hostname: 'example.com',
        pathname: '/pathname'
      },
      { // metrics
        txSize: 128,
        rxSize: 256,
        cbTime: 5
      },
      0, // startTime
      10, // endTime
      'XMLHttpRequest' // type
    ]

    ajaxAggregate.storeXhr.apply(context, ajaxArguments)
    baseEE.emit('interactionDiscarded', [interaction])

    const events = ajaxAggregate.getStoredEvents()

    // no interactions in SPA under interaction 0
    expect(events.ajaxEvents.length).toEqual(1)
    expect(events.spaAjaxEvents[interaction.id]).toBeUndefined()
  })

  test('prepareHarvest correctly serializes an AjaxRequest events payload', () => {
    const context = { spaNode: undefined }
    const ajax1 = generateAjaxCall(0)
    const ajax2 = generateAjaxCall(1)

    ajaxAggregate.storeXhr.apply(context, ajax1.event)
    ajaxAggregate.storeXhr.apply(context, ajax2.event)

    const expectedCustomAttributes = {
      customStringAttribute: 'foobar',
      customNumAttribute: 2,
      customTrueBooleanAttribute: true,
      customFalseBooleanAttribute: false,
      nullCustomAttribute: null,
      undefinedCustomAttribute: undefined
    }

    setInfo(agentIdentifier, {
      jsAttributes: expectedCustomAttributes
    })

    const serializedPayload = ajaxAggregate.prepareHarvest({ retry: false })
    const decodedEvents = serializedPayload.map(sp => qp.decode(sp.body.e))

    expect(decodedEvents[0]).toEqual(expect.arrayContaining([
      expect.objectContaining(ajax1.ajax),
      expect.objectContaining(ajax2.ajax)
    ]))
    decodedEvents[0].forEach(event => {
      expect(event.children.length).toEqual(5) // null is processed, undefined is not
      expect(event.children).toEqual(expect.arrayContaining([
        { type: 'stringAttribute', key: 'customStringAttribute', value: 'foobar' },
        { type: 'doubleAttribute', key: 'customNumAttribute', value: 2 },
        { type: 'trueAttribute', key: 'customTrueBooleanAttribute' },
        { type: 'falseAttribute', key: 'customFalseBooleanAttribute' },
        { type: 'nullAttribute', key: 'nullCustomAttribute' }
      ]))
    })
  })

  test('prepareHarvest correctly serializes a very large AjaxRequest events payload', async () => {
    const context = { spaNode: undefined }

    for (let i = 0; i < 10; i++) {
      ajaxAggregate.storeXhr.apply(context, generateAjaxCall(i).event)
    }

    // this is too small for any AJAX payload to fit in
    const maxPayloadSize = 500
    const serializedPayload = ajaxAggregate.prepareHarvest({ retry: false, maxPayloadSize })
    const decodedEvents = serializedPayload.map(sp => qp.decode(sp.body.e))

    // we just want to check that the list of AJAX events to be sent contains multiple items because it exceeded the allowed byte limit,
    // and that each list item is smaller than the limit
    expect(decodedEvents.length).toBeGreaterThan(1)
    serializedPayload.every(sp => expect(exceedsSizeLimit(sp, maxPayloadSize)).toEqual(false))
  })

  test('prepareHarvest correctly exits if maxPayload is too small', async () => {
    const context = { spaNode: undefined }

    for (let i = 0; i < 10; i++) {
      ajaxAggregate.storeXhr.apply(context, generateAjaxCall(i).event)
    }

    // this is too small for any AJAX payload to fit in
    const maxPayloadSize = 10
    const serializedPayload = ajaxAggregate.prepareHarvest({ retry: false, maxPayloadSize })

    // we just want to check that the list of AJAX events is empty since none of them could fit in the payload size limit
    expect(serializedPayload.length).toEqual(0)
  })
})

function generateAjaxCall (index) {
  const ajax = {
    type: 'ajax',
    start: 0,
    end: 30,
    callbackEnd: 30,
    callbackDuration: 0,
    domain: 'https://example.com',
    path: `/pathname/${index}`,
    method: 'PUT',
    status: 200,
    requestedWith: 'XMLHttpRequest',
    requestBodySize: 128,
    responseBodySize: 256,
    nodeId: '0',
    guid: null,
    traceId: null,
    timestamp: null
  }

  return {
    ajax,
    event: [
      { // params
        method: ajax.method,
        status: ajax.status,
        host: ajax.domain,
        hostname: 'example.com',
        pathname: ajax.path
      },
      { // metrics
        txSize: ajax.requestBodySize,
        rxSize: ajax.responseBodySize,
        cbTime: ajax.callbackDuration
      },
      ajax.start,
      ajax.end,
      ajax.requestedWith
    ]
  }
}

function exceedsSizeLimit (payload, maxPayloadSize) {
  return payload.length * 2 > maxPayloadSize
}
