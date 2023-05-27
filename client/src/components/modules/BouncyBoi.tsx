import { h, Component } from 'kaiku'
import { IModule } from '../../types'
import { getAudioContext } from '../../audio'
import { WorkletNode } from '../../worklets'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import css from './BouncyBoi.css'

type Props = {
  id: string
}

class BouncyBoi extends Component<Props> implements IModule {
  node: WorkletNode<'BouncyBoi'>

  constructor(props: Props) {
    super(props)
    const audioContext = getAudioContext()
    this.node = new WorkletNode(audioContext, 'BouncyBoi', {
      numberOfInputs: 0,
      numberOfOutputs: 6,
    })

    const speed = this.node.parameters.get('speed')
    const gravity = this.node.parameters.get('gravity')

    connectKnobToParam(props.id, 'speed', speed)
    connectKnobToParam(props.id, 'gravity', gravity)

    setInterval(() => this.node.port.postMessage(null), 30)

    this.node.port.onmessage = (msg) => {
      this.renderCanvas(msg.data)
    }
  }

  renderCanvas = (state: Float32Array) => {
    const canvas = document.getElementById(
      'bouncy-boi-' + this.props.id
    ) as HTMLCanvasElement
    if (!canvas) return

    const context = canvas.getContext('2d')!

    context.fillStyle = '#000'
    context.fillRect(0, 0, 300, 300)

    context.strokeStyle = '#e85d00'
    context.lineWidth = 2

    for (let i = 0; i < 6; i += 2) {
      context.beginPath()
      context.arc(
        state[i]! * 0.5 + 75,
        state[i + 1]! * 0.5 + 75,
        5,
        0,
        Math.PI * 2
      )
      context.stroke()
    }

    const phase = state[6]

    for (let i = 0; i < 5; i++) {
      const from = {
        x: Math.sin((i * Math.PI * 2) / 5 + phase!) * 50 + 75,
        y: Math.cos((i * Math.PI * 2) / 5 + phase!) * 50 + 75,
      }

      const to = {
        x: Math.sin(((i + 1) * Math.PI * 2) / 5 + phase!) * 50 + 75,
        y: Math.cos(((i + 1) * Math.PI * 2) / 5 + phase!) * 50 + 75,
      }
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
      context.stroke()
    }
  }

  render({ id }: Props) {
    return (
      <Module id={id} name="Bouncy Boi" height={260} width={240}>
        <div className={css('bouncy-boi')}>
          <div className={css('controls')}>
            <Knob
              moduleId={id}
              id="speed"
              label="Speed"
              type="linear"
              min={0}
              max={1}
              initial={0.1}
            />
            <Knob
              moduleId={id}
              id="gravity"
              label="Gravity"
              type="linear"
              min={0}
              max={1}
              initial={0.1}
            />
          </div>
          <canvas id={'bouncy-boi-' + id} width="150" height="150" />
        </div>
        <ModuleOutputs>
          <Socket
            moduleId={id}
            type="output"
            name="trig0"
            output={0}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="output"
            name="trig1"
            output={1}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="output"
            name="trig2"
            output={2}
            node={this.node}
          />

          <Socket
            moduleId={id}
            type="output"
            name="vel0"
            output={3}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="output"
            name="vel1"
            output={4}
            node={this.node}
          />
          <Socket
            moduleId={id}
            type="output"
            name="vel2"
            output={5}
            node={this.node}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default BouncyBoi
