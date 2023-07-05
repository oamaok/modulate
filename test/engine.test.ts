import server from '@modulate/server/src'
import * as _engine from '@modulate/client/src/engine'

// Defined in client/src/test-index.ts
declare const engine: typeof _engine
declare const advanceToPosition: (pos: bigint) => Promise<void>
declare const getBuffer: (pos: number) => number[]

beforeAll(async () => {
  server.listen(8889)
  await page.goto('http://localhost:8889')
})

afterAll(async () => {
  await server.close()
})

describe('Engine', () => {
  it('should output audio when oscillator is connected to audio output', async () => {
    const buffer = await page.evaluate(async () => {
      await engine.initializeEngine({
        numWorklets: 4,
        spawnAudioWorklet: false,
      })

      await engine.createModule('out', 'AudioOut')
      await engine.createModule('osc', 'Oscillator')

      await engine.setParameterValue('out', 0, 0.5)

      await engine.connectCable({
        id: 'cable',
        from: { type: 'output', moduleId: 'osc', index: 0 },
        to: { type: 'input', moduleId: 'out', index: 0 },
      })

      await advanceToPosition(64n)

      return getBuffer(0)
    })

    expect(buffer).toMatchSnapshot()
  })
})
