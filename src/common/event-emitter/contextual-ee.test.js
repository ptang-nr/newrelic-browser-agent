let mockNREUM
let runtime

beforeEach(() => {
  mockNREUM = {}
  runtime = {}

  jest.doMock('../window/nreum', () => ({
    __esModule: true,
    gosNREUM: jest.fn(() => mockNREUM)
  }))

  jest.doMock('../config/config', () => ({
    __esModule: true,
    getRuntime: jest.fn(() => runtime)
  }))
})

afterEach(() => {
  jest.resetModules()
  jest.resetAllMocks()
})

describe('global event-emitter', () => {
  test('it sets the global event-emitter on window.NREUM when it does not already exist', async () => {
    const { ee } = await import('./contextual-ee')

    expect(ee).toEqual(mockNREUM.ee)
  })

  test('it does not set the global event-emitter on window.NREUM when it already exists', async () => {
    mockNREUM.ee = {}

    const { ee } = await import('./contextual-ee')

    expect(ee).not.toEqual(mockNREUM.ee)
  })
})
