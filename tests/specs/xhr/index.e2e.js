import { notIE, supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'
import { extractAjaxEvents } from '../../util/xhr'

describe('ajax events', () => {
  it('should generate complete event and metric data for same-origin requests', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    let [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/xhr_no_cat', true)
        xhr.send()

        if (typeof fetch !== 'undefined') {
          fetch('/xhr_no_cat')
        }
      })
    ])

    const dataAjaxEvent = extractAjaxEvents(ajaxEventsHarvest.request.body)
      .filter(event => event.type === 'ajax' && event.path === '/xhr_no_cat')
    const dataAjaxTimeSlice = ajaxTimeSlicesHarvest.request.body.xhr.filter(metric => metric.params.pathname === '/xhr_no_cat')
    expect(dataAjaxEvent.length).toEqual(browserMatch(supportsFetch) ? 2 : 1)
    expect(dataAjaxEvent.find(event => event.requestedWith === 'XMLHttpRequest')).toEqual({
      type: 'ajax',
      children: [],
      start: expect.toBePositive(),
      end: expect.toBePositive(),
      callbackEnd: expect.toBePositive(),
      callbackDuration: expect.toBeWithin(0, Infinity),
      method: 'GET',
      status: 200,
      domain: `${browser.testHandle.assetServerConfig.host}:${browser.testHandle.assetServerConfig.port}`,
      path: '/xhr_no_cat',
      requestBodySize: 0,
      responseBodySize: 10,
      requestedWith: 'XMLHttpRequest',
      nodeId: '0',
      guid: null,
      traceId: null,
      timestamp: null
    })

    expect(dataAjaxTimeSlice[0]).toEqual({
      params: {
        method: 'GET',
        hostname: browser.testHandle.assetServerConfig.host,
        port: browser.testHandle.assetServerConfig.port.toString(),
        protocol: 'http',
        host: `${browser.testHandle.assetServerConfig.host}:${browser.testHandle.assetServerConfig.port}`,
        pathname: '/xhr_no_cat',
        status: 200
      },
      metrics: {
        count: browserMatch(supportsFetch) ? 2 : 1,
        rxSize: {
          t: expect.toBePositive(),
          min: expect.toBePositive(),
          max: expect.toBePositive(),
          sos: expect.toBePositive(),
          c: browserMatch(supportsFetch) ? 2 : 1
        },
        duration: {
          t: expect.toBePositive(),
          min: expect.toBePositive(),
          max: expect.toBePositive(),
          sos: expect.toBePositive(),
          c: browserMatch(supportsFetch) ? 2 : 1
        },
        cbTime: {
          t: expect.toBeWithin(0, Infinity)
        },
        time: {
          t: expect.toBePositive(),
          min: expect.toBePositive(),
          max: expect.toBePositive(),
          sos: expect.toBePositive(),
          c: browserMatch(supportsFetch) ? 2 : 1
        },
        txSize: {
          t: 0
        }
      }
    })

    if (browserMatch(supportsFetch)) {
      expect(dataAjaxEvent.find(event => event.requestedWith === 'fetch')).toEqual({
        type: 'ajax',
        children: [],
        start: expect.toBePositive(),
        end: expect.toBePositive(),
        callbackEnd: expect.toBePositive(),
        callbackDuration: expect.toBeWithin(0, Infinity),
        method: 'GET',
        status: 200,
        domain: `${browser.testHandle.assetServerConfig.host}:${browser.testHandle.assetServerConfig.port}`,
        path: '/xhr_no_cat',
        requestBodySize: 0,
        responseBodySize: 10,
        requestedWith: 'fetch',
        nodeId: '0',
        guid: null,
        traceId: null,
        timestamp: null
      })
    }
  })

  it('should generate complete event and metric data for cross-origin requests', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    let [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function (baseUrl) {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', baseUrl + '/xhr_no_cat', true)
        xhr.send()

        if (typeof fetch !== 'undefined') {
          fetch(baseUrl + '/xhr_no_cat')
        }
      }, `http://${browser.testHandle.corsServerConfig.host}:${browser.testHandle.corsServerConfig.port}`)
    ])

    const dataAjaxEvent = extractAjaxEvents(ajaxEventsHarvest.request.body)
      .filter(event => event.type === 'ajax' && event.path === '/xhr_no_cat')
    const dataAjaxTimeSlice = ajaxTimeSlicesHarvest.request.body.xhr.filter(metric => metric.params.pathname === '/xhr_no_cat')
    expect(dataAjaxEvent.length).toEqual(browserMatch(supportsFetch) ? 2 : 1)
    expect(dataAjaxEvent.find(event => event.requestedWith === 'XMLHttpRequest')).toEqual({
      type: 'ajax',
      children: [],
      start: expect.toBePositive(),
      end: expect.toBePositive(),
      callbackEnd: expect.toBePositive(),
      callbackDuration: expect.toBeWithin(0, Infinity),
      method: 'GET',
      status: 200,
      domain: `${browser.testHandle.corsServerConfig.host}:${browser.testHandle.corsServerConfig.port}`,
      path: '/xhr_no_cat',
      requestBodySize: 0,
      responseBodySize: 10,
      requestedWith: 'XMLHttpRequest',
      nodeId: '0',
      guid: null,
      traceId: null,
      timestamp: null
    })

    expect(dataAjaxTimeSlice[0]).toEqual({
      params: {
        method: 'GET',
        hostname: browser.testHandle.corsServerConfig.host,
        port: browser.testHandle.corsServerConfig.port.toString(),
        protocol: 'http',
        host: `${browser.testHandle.corsServerConfig.host}:${browser.testHandle.corsServerConfig.port}`,
        pathname: '/xhr_no_cat',
        status: 200
      },
      metrics: {
        count: browserMatch(supportsFetch) ? 2 : 1,
        rxSize: {
          t: expect.toBePositive(),
          min: expect.toBePositive(),
          max: expect.toBePositive(),
          sos: expect.toBePositive(),
          c: browserMatch(supportsFetch) ? 2 : 1
        },
        duration: {
          t: expect.toBePositive(),
          min: expect.toBePositive(),
          max: expect.toBePositive(),
          sos: expect.toBePositive(),
          c: browserMatch(supportsFetch) ? 2 : 1
        },
        cbTime: {
          t: expect.toBeWithin(0, Infinity)
        },
        time: {
          t: expect.toBePositive(),
          min: expect.toBePositive(),
          max: expect.toBePositive(),
          sos: expect.toBePositive(),
          c: browserMatch(supportsFetch) ? 2 : 1
        },
        txSize: {
          t: 0
        }
      }
    })

    if (browserMatch(supportsFetch)) {
      expect(dataAjaxEvent.find(event => event.requestedWith === 'fetch')).toEqual({
        type: 'ajax',
        children: [],
        start: expect.toBePositive(),
        end: expect.toBePositive(),
        callbackEnd: expect.toBePositive(),
        callbackDuration: expect.toBeWithin(0, Infinity),
        method: 'GET',
        status: 200,
        domain: `${browser.testHandle.corsServerConfig.host}:${browser.testHandle.corsServerConfig.port}`,
        path: '/xhr_no_cat',
        requestBodySize: 0,
        responseBodySize: 10,
        requestedWith: 'fetch',
        nodeId: '0',
        guid: null,
        traceId: null,
        timestamp: null
      })
    }
  })

  // IE does not support XHR using data URIs
  it.withBrowsersMatching(notIE)('should not generate events for data URI requests, only metrics', async () => {
    let [ajaxEventsHarvestLoad, ajaxTimeSlicesHarvestLoad] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      await browser.url(await browser.testHandle.assetURL('xhr-data-url.html'))
    ])

    let dataAjaxEvent = extractAjaxEvents(ajaxEventsHarvestLoad.request.body)
      .filter(event => event.type === 'ajax' && event.domain === 'undefined:undefined')
    let dataAjaxTimeSlice = ajaxTimeSlicesHarvestLoad.request.body.xhr.filter(metric => metric.params.host === 'undefined:undefined')
    expect(dataAjaxEvent.length).toEqual(0)
    expect(dataAjaxTimeSlice.length).toEqual(1)

    if (browserMatch(supportsFetch)) {
      expect(dataAjaxTimeSlice[0].metrics.count).toEqual(2)
    }

    let [ajaxEventsHarvestExec, ajaxTimeSlicesHarvestExec] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', 'data:,dataUrl', true)
        xhr.send()

        if (typeof fetch !== 'undefined') {
          fetch('data:,dataUrl')
        }
      })
    ])

    dataAjaxEvent = extractAjaxEvents(ajaxEventsHarvestExec.request.body).filter(event => event.type === 'ajax' && event.domain === 'undefined:undefined')
    dataAjaxTimeSlice = ajaxTimeSlicesHarvestExec.request.body.xhr.filter(metric => metric.params.host === 'undefined:undefined')
    expect(dataAjaxEvent.length).toEqual(0)
    expect(dataAjaxTimeSlice.length).toEqual(1)

    if (browserMatch(supportsFetch)) {
      expect(dataAjaxTimeSlice[0].metrics.count).toEqual(2)
    }
  })

  it('should not capture telemetry for aborted network calls', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    let [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/abort', true)
        xhr.send()
        xhr.abort()

        // We currently capture telemetry for aborted fetch calls - https://new-relic.atlassian.net/browse/NR-220129
        // if (typeof fetch !== 'undefined' && typeof AbortController !== 'undefined') {
        //   var abortCtrl = new AbortController()
        //   fetch('/abort', { signal: abortCtrl.signal })
        //   abortCtrl.abort()
        // }
      })
    ])

    const dataAjaxEvent = extractAjaxEvents(ajaxEventsHarvest.request.body)
      .filter(event => event.type === 'ajax' && event.path === '/abort')
    const dataAjaxTimeSlice = ajaxTimeSlicesHarvest.request.body.xhr.filter(metric => metric.params.pathname === '/abort')
    expect(dataAjaxEvent.length).toEqual(0)
    expect(dataAjaxTimeSlice.length).toEqual(0)
  })

  it('should capture timed out network calls with a status of 0', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    let [ajaxEventsHarvest, ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/timeout', true)
        xhr.timeout = 10
        xhr.send()

        if (typeof fetch !== 'undefined' && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
          fetch('/timeout', { signal: AbortSignal.timeout(10) })
        }
      })
    ])

    const dataAjaxEvent = extractAjaxEvents(ajaxEventsHarvest.request.body)
      .filter(event => event.type === 'ajax' && event.path === '/timeout')
    const dataAjaxTimeSlice = ajaxTimeSlicesHarvest.request.body.xhr.filter(metric => metric.params.pathname === '/timeout')
    expect(dataAjaxEvent.length).toEqual(browserMatch(supportsFetch) ? 2 : 1)
    expect(dataAjaxEvent[0].status).toEqual(0)
    expect(dataAjaxTimeSlice.length).toEqual(1)
    expect(dataAjaxTimeSlice[0].params.status).toEqual(0)

    if (browserMatch(supportsFetch)) {
      const fetchMetric = dataAjaxEvent.find(event => event.requestedWith === 'fetch')
      expect(fetchMetric.status).toEqual(0)
      expect(dataAjaxTimeSlice[0].metrics.count).toEqual(2)
    }
  })

  it('should not process cross-application tracing header for cross-origin requests', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    let [ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function (baseUrl) {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', baseUrl + '/xhr_with_cat/1', true)
        xhr.send()

        if (typeof fetch !== 'undefined') {
          fetch(baseUrl + '/xhr_with_cat/1')
        }
      }, `http://${browser.testHandle.corsServerConfig.host}:${browser.testHandle.corsServerConfig.port}`)
    ])

    const dataAjaxTimeSlice = ajaxTimeSlicesHarvest.request.body.xhr.filter(metric => metric.params.pathname === '/xhr_with_cat/1')
    expect(dataAjaxTimeSlice.length).toEqual(1)
    expect(dataAjaxTimeSlice[0].metrics.count).toEqual(browserMatch(supportsFetch) ? 2 : 1)
    expect(dataAjaxTimeSlice[0].params.cat).toBeUndefined()
  })

  it('should process cross-application tracing header for same-origin requests', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    let [ajaxTimeSlicesHarvest] = await Promise.all([
      browser.testHandle.expectAjaxTimeSlices(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/xhr_with_cat/1', true)
        xhr.send()

        // if (typeof fetch !== 'undefined') {
        //   fetch('/xhr_with_cat/1')
        // }
      })
    ])

    const dataAjaxTimeSlice = ajaxTimeSlicesHarvest.request.body.xhr.filter(metric => metric.params.pathname === '/xhr_with_cat/1')
    expect(dataAjaxTimeSlice.length).toEqual(1)
    // Fetch is not capture CAT headers - https://new-relic.atlassian.net/browse/NR-220935
    // expect(dataAjaxTimeSlice[0].metrics.count).toEqual(browserMatch(supportsFetch) ? 2 : 1)
    expect(dataAjaxTimeSlice[0].metrics.count).toEqual(1)
    expect(dataAjaxTimeSlice[0].params.cat).toEqual('foo')
  })
})
