import { Component } from 'kaiku'
import * as engine from '../../engine'
import Socket from '../module-parts/Socket'
import Module from '../module-parts/Module'
import Knob from '../module-parts/Knob'
import { ModuleOutputs } from '../module-parts/ModuleSockets'
import { connectKnobToParam } from '../../modules'
import css from './BouncyBoi.css'
import { BouncyBoi, EventTypes } from '@modulate/worklets/src/modules'

type Props = {
  id: string
}

const BALL_BORDER_COLORS = ['#c8e800', '#00abe8', '#db00e8']
const BALL_FILL_COLORS = ['#6c7d00', '#006b91', '#76007d']

class BouncyBoiNode extends Component<Props> {
  constructor(props: Props) {
    super(props)

    engine.createModule(props.id, 'BouncyBoi')
    engine.onModuleEvent<BouncyBoi>(props.id, (message) => {
      switch (message.type) {
        case 'BouncyBoiUpdate': {
          this.renderCanvas(message)
          break
        }

        default:
          throw new Error(
            `bouncyboi: unexpected message ${JSON.stringify(message)}`
          )
      }
    })

    connectKnobToParam<BouncyBoi, 'speed'>(props.id, 'speed', 0)
    connectKnobToParam<BouncyBoi, 'gravity'>(props.id, 'gravity', 1)
  }

  renderCanvas = (state: EventTypes<BouncyBoi, 'BouncyBoiUpdate'>) => {
    const canvas = document.getElementById(
      'bouncy-boi-' + this.props.id
    ) as HTMLCanvasElement
    if (!canvas) return

    const context = canvas.getContext('2d')!

    context.fillStyle = '#000'
    context.fillRect(0, 0, 300, 300)

    context.lineWidth = 2

    for (let i = 0; i < state.balls.length; i++) {
      const ball = state.balls[i]!
      context.strokeStyle = BALL_BORDER_COLORS[i]!
      context.fillStyle = BALL_FILL_COLORS[i]!

      context.beginPath()
      context.arc(
        ball.pos.x * 0.5 + 75,
        ball.pos.y * 0.5 + 75,
        5,
        0,
        Math.PI * 2
      )
      context.fill()
      context.stroke()
    }
    context.strokeStyle = '#e85d00'

    for (let i = 0; i < 5; i++) {
      const from = {
        x: Math.sin((i * Math.PI * 2) / 5 + state.phase) * 50 + 75,
        y: Math.cos((i * Math.PI * 2) / 5 + state.phase) * 50 + 75,
      }

      const to = {
        x: Math.sin(((i + 1) * Math.PI * 2) / 5 + state.phase) * 50 + 75,
        y: Math.cos(((i + 1) * Math.PI * 2) / 5 + state.phase) * 50 + 75,
      }
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
      context.stroke()
    }
  }

  render({ id }: Props) {
    return (
      <Module
        id={id}
        type="BouncyBoi"
        name="Bouncy Boi"
        height={260}
        width={240}
      >
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
          <Socket<BouncyBoi, 'output', 'trig0'>
            moduleId={id}
            type="output"
            label="YLW"
            index={0}
          />
          <Socket<BouncyBoi, 'output', 'trig1'>
            moduleId={id}
            type="output"
            label="BLUE"
            index={1}
          />
          <Socket<BouncyBoi, 'output', 'trig2'>
            moduleId={id}
            type="output"
            label="PRPL"
            index={2}
          />
        </ModuleOutputs>
      </Module>
    )
  }
}

export default BouncyBoiNode
