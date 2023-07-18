import { h, Component, useRef, useEffect } from 'kaiku'
import * as engine from '../../engine'
import * as api from '../../api'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleInputs, ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import { Sampler } from '@modulate/worklets/src/modules'
import assert from '../../assert'
import css from './Sampler.css'
import {
  getKnobValue,
  getModuleKnobs,
  getModuleState,
  setModuleState,
} from '../../state'
import SampleBrowser from '../sample-browser/SampleBrowser'

type Props = {
  id: string
}

type SamplerState = {
  sampleId: null | string
}

class SamplerNode extends Component<Props> {
  audioBuffer: Float32Array | null = null
  playheadPosition: Float64Array | null = null
  animationFrameRequest: number = 0
  waveformCanvasRef = useRef<HTMLCanvasElement>()
  settingsCanvasRef = useRef<HTMLCanvasElement>()

  constructor(props: Props) {
    super(props)
    engine.createModule(props.id, 'Sampler')
    connectKnobToParam<Sampler, 'speed'>(props.id, 'speed', 0)
    connectKnobToParam<Sampler, 'start'>(props.id, 'start', 1)
    connectKnobToParam<Sampler, 'length'>(props.id, 'length', 2)

    this.drawSettingsAndPlayhead()

    engine.onModuleEvent(props.id, (evt) => {
      switch (evt.type) {
        case 'SamplerAllocateSuccess': {
          assert(this.audioBuffer)

          const memory = new Float32Array(
            engine.getMemory().buffer,
            evt.ptr,
            this.audioBuffer.length
          )
          memory.set(this.audioBuffer)
          break
        }

        case 'SamplerPlayheadPtr': {
          this.playheadPosition = new Float64Array(
            engine.getMemory().buffer,
            evt.ptr,
            1
          )
          break
        }
      }
    })

    if (!getModuleState<SamplerState>(props.id)) {
      setModuleState<SamplerState>(props.id, {
        sampleId: null,
      })
    }

    useEffect(() => {
      const samplerState = getModuleState<SamplerState>(props.id)
      if (samplerState) {
        const { sampleId } = samplerState

        if (sampleId) {
          this.loadSample(sampleId)
        }
      }
    })
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.animationFrameRequest)
  }

  drawSettingsAndPlayhead = () => {
    this.animationFrameRequest = requestAnimationFrame(
      this.drawSettingsAndPlayhead
    )

    const canvas = this.settingsCanvasRef.current
    if (!canvas) return
    const length = this.audioBuffer?.length ?? 0

    const context = canvas.getContext('2d')!

    context.clearRect(0, 0, canvas.width, canvas.height)

    const startAt = getKnobValue(this.props.id, 'start') ?? 0
    const playLength = getKnobValue(this.props.id, 'length') ?? 0
    context.fillStyle = 'rgba(0,0,0,0.5)'
    context.fillRect(0, 0, canvas.width * startAt, canvas.height)
    context.fillRect(
      canvas.width * (playLength + startAt),
      0,
      canvas.width,
      canvas.height
    )

    if (this.playheadPosition) {
      context.fillStyle = '#e85d00'
      context.fillRect(
        (this.playheadPosition[0]! * canvas.width) / length,
        0,
        1.5,
        canvas.height
      )
    }

    context.fillStyle = '#e7e7e7'
    context.fillRect(canvas.width * startAt - 1, 0, 1.5, canvas.height)
    context.fillRect(
      canvas.width * (playLength + startAt),
      0,
      1.5,
      canvas.height
    )
  }

  drawWaveform = () => {
    const canvas = this.waveformCanvasRef.current
    if (!canvas || !this.audioBuffer) return

    const context = canvas.getContext('2d')!

    context.clearRect(0, 0, canvas.width, canvas.height)

    const ratio = Math.floor(this.audioBuffer.length / canvas.width)

    context.fillStyle = '#ccc'
    for (let i = 0; i < canvas.width; i++) {
      let min = Infinity
      let max = -Infinity
      for (let si = 0; si < ratio; si++) {
        const sample = this.audioBuffer[si + ratio * i]! * 0.9
        if (sample < min) {
          min = sample
        }

        if (sample > max) {
          max = sample
        }
      }

      context.fillRect(
        i,
        canvas.height / 2 - (max * canvas.height) / 2,
        1,
        Math.max(1, (canvas.height / 2) * (max - min))
      )
    }
  }

  loadSample = async (id: string) => {
    const buffer = await fetch(`/samples/${id}`).then((res) =>
      res.arrayBuffer()
    )
    this.audioBuffer = new Float32Array(buffer)
    this.drawWaveform()

    engine.sendMessageToModule(this.props.id, {
      type: 'SamplerAllocate',
      size: this.audioBuffer.length,
    })
  }

  render({ id }: Props) {
    const samplerState = getModuleState<SamplerState>(id)

    return (
      <Module id={id} name="Sampler" height={260} width={400}>
        <div className={css('sampler')}>
          <div className={css('canvases')}>
            <canvas ref={this.waveformCanvasRef} width="300" height="100" />
            <canvas ref={this.settingsCanvasRef} width="300" height="100" />
          </div>
          <div className={css('browser')}>
            <SampleBrowser
              onSelect={(id) => {
                setModuleState<SamplerState>(this.props.id, {
                  sampleId: id,
                })
              }}
              selected={samplerState?.sampleId ?? null}
            />
          </div>
          <div className={css('knob-group')}>
            <Knob
              moduleId={id}
              id="speed"
              label="SPEED"
              type="linear"
              min={-2}
              max={2}
              initial={1}
            />

            <Knob
              moduleId={id}
              id="start"
              label="START"
              type="linear"
              min={0}
              max={1}
              initial={0}
            />

            <Knob
              moduleId={id}
              id="length"
              label="LENGTH"
              type="linear"
              min={0}
              max={1}
              initial={0}
            />
          </div>
        </div>
        <ModuleInputs>
          <Socket<Sampler, 'input', 'gate'>
            moduleId={id}
            type="input"
            index={0}
            label="GATE"
          />
          <Socket<Sampler, 'parameter', 'speed'>
            moduleId={id}
            type="parameter"
            index={0}
            label="SPD"
          />
          <Socket<Sampler, 'parameter', 'start'>
            moduleId={id}
            type="parameter"
            index={1}
            label="START"
          />
          <Socket<Sampler, 'parameter', 'length'>
            moduleId={id}
            type="parameter"
            index={2}
            label="LEN"
          />
        </ModuleInputs>
        <ModuleOutputs>
          <Socket<Sampler, 'output', 'out'>
            moduleId={id}
            type="output"
            index={0}
            label="OUT"
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default SamplerNode
