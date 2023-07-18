import server from '@modulate/server/src'
import * as _engine from '@modulate/client/src/engine'
import { Cable } from '@modulate/common/types'

// Defined in client/src/test-index.ts
declare const engine: typeof _engine
declare const advanceToPosition: (pos: bigint) => Promise<void>
declare const getBuffer: (pos: number) => number[]

beforeAll(() => {
  server.listen(8889)
})

beforeEach(async () => {
  await page.goto('http://localhost:8889')

  await page.evaluate(async () => {
    await engine.initializeEngine({
      numWorklets: 4,
      spawnAudioWorklet: false,
    })

    await advanceToPosition(0n)
  })
})

afterAll(async () => {
  await server.close()
})

describe('Engine', () => {
  it('should output audio when oscillator is connected to audio output', async () => {
    const buffer = await page.evaluate(async () => {
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

  it('should handle multiple connects and disconnects', async () => {
    const buffer = await page.evaluate(async () => {
      const oscillators = ['0', '1', '2', '3', '4']
      const cables: Cable[] = []
      let nextCableId = 0

      for (const fromOsc of oscillators)
        for (const toOsc of oscillators)
          for (let output = 0; output < 4; output++)
            for (let param = 0; param < 3; param++) {
              const id = (nextCableId++).toString()

              cables.push({
                id,
                from: {
                  type: 'output',
                  moduleId: fromOsc,
                  index: output,
                },
                to: {
                  type: 'parameter',
                  moduleId: toOsc,
                  index: param,
                },
              })
            }

      await engine.createModule('out', 'AudioOut')
      await engine.setParameterValue('out', 0, 0.5)

      for (const osc of oscillators) {
        await engine.createModule(osc, 'Oscillator')
      }

      await engine.connectCable({
        id: 'cable',
        from: { type: 'output', moduleId: '1', index: 0 },
        to: { type: 'input', moduleId: 'out', index: 0 },
      })

      for (const cable of cables) {
        await engine.connectCable(cable)
      }

      await advanceToPosition(128n)

      for (const cable of cables) {
        await engine.disconnectCable(cable)
      }

      return getBuffer(0)
    })

    expect(buffer).toMatchSnapshot()
  })

  it('should handle multiple connects and disconnects while running', async () => {
    page.on('console', (message) => console.log(message.text()))

    await page.evaluate(async () => {
      const oscillators = ['0', '1', '2', '3', '4']
      const cables: Cable[] = []
      let nextCableId = 0

      for (const fromOsc of oscillators)
        for (const toOsc of oscillators)
          for (let output = 0; output < 4; output++)
            for (let param = 0; param < 3; param++) {
              const id = (nextCableId++).toString()

              cables.push({
                id,
                from: {
                  type: 'output',
                  moduleId: fromOsc,
                  index: output,
                },
                to: {
                  type: 'parameter',
                  moduleId: toOsc,
                  index: param,
                },
              })
            }

      await engine.createModule('out', 'AudioOut')
      await engine.setParameterValue('out', 0, 0.5)

      let pos = 0n
      const advanceInterval = setInterval(async () => {
        pos += 16n
        await advanceToPosition(pos)
      }, 1)
      // Should be running whilst the changes are being done

      for (const osc of oscillators) {
        await engine.createModule(osc, 'Oscillator')
      }

      await engine.connectCable({
        id: 'cable',
        from: { type: 'output', moduleId: '1', index: 0 },
        to: { type: 'input', moduleId: 'out', index: 0 },
      })

      for (let i = 0; i < 4; i++) {
        for (const cable of cables) {
          await engine.connectCable(cable)
        }

        for (const cable of cables) {
          await engine.disconnectCable(cable)
        }
      }

      clearInterval(advanceInterval)
    })
  })
})
