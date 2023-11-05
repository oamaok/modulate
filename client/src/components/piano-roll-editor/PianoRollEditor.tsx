import { Component, useEffect, useRef } from 'kaiku'
import state, { getModuleState } from '../../state'
import css from './PianoRollEditor.css'
import assert from '../../assert'
import { Vec2 } from '@modulate/common/types'
import { useDrag } from '../../hooks'
import { clamp } from '@modulate/common/util'

export type PianoRollNote = {
  start: number
  length: number
  pitch: number
}

const NOTE_COLOR = [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0]

const REFERENCE_KEYBOARD_WIDTH = 64
const NOTE_HEIGHT = 16
const OCTAVES = 8

const BAR_WIDTH = 320
const PIANO_ROLL_HEIGHT = NOTE_HEIGHT * 12 * OCTAVES

const SNAPPING = 16
const BAR_LENGTH = 2 * 2 * 3 * 4 * 5

const A4_OFFSET = 50

type Props = {
  moduleId: string
}

type State = {
  offset: Vec2
  selectedNote: number | null
}

class PianoRollEditor extends Component<Props, State> {
  canvasRef = useRef<HTMLCanvasElement>()
  state: State = {
    offset: {
      x: 0,
      y: 0,
    },
    selectedNote: null,
  }

  constructor(props: Props) {
    super(props)

    let startOffset = 0
    let editingLength = false
    let noteLength = 30

    const moduleState = getModuleState<{ notes: PianoRollNote[] }>(
      props.moduleId
    )

    useDrag({
      ref: this.canvasRef,
      onStart: ({ relativeX, relativeY }) => {
        const { pos, pitch } = this.getPitchAndPosition(relativeX, relativeY)

        const existingNoteIndex = moduleState.notes.findIndex(
          (note) =>
            note.pitch === pitch &&
            note.start <= pos &&
            note.start + note.length > pos
        )

        if (existingNoteIndex === -1) {
          const note: PianoRollNote = {
            pitch,
            start:
              Math.floor(Math.max(0, pos) / (BAR_LENGTH / SNAPPING)) *
              (BAR_LENGTH / SNAPPING),
            length: noteLength,
          }

          moduleState.notes.push(note)
          this.state.selectedNote = moduleState.notes.length - 1
          startOffset = 0
        } else {
          const note = moduleState.notes[existingNoteIndex]
          assert(note)

          editingLength = note.start + note.length - pos <= 4
          startOffset = pos - note.start
          this.state.selectedNote = existingNoteIndex
        }
      },
      onMove: ({ relativeX, relativeY }) => {
        assert(this.state.selectedNote !== null)
        const note = moduleState.notes[this.state.selectedNote]
        assert(note)

        const { pos, pitch } = this.getPitchAndPosition(relativeX, relativeY)

        if (editingLength) {
          note.length = Math.max(5, pos - note.start)
          return
        }

        note.pitch = pitch
        note.start =
          Math.floor(Math.max(0, pos - startOffset) / (BAR_LENGTH / SNAPPING)) *
          (BAR_LENGTH / SNAPPING)
      },
      onEnd: () => {
        assert(this.state.selectedNote !== null)
        const note = moduleState.notes[this.state.selectedNote]
        assert(note)
        noteLength = note.length
        editingLength = false
      },
    })

    useDrag({
      ref: this.canvasRef,
      mouseButton: 1,
      onMove: ({ dx, dy }) => {
        const canvas = this.canvasRef.current
        assert(canvas)

        const wrapper = canvas.parentElement
        assert(wrapper)

        const { height } = wrapper.getBoundingClientRect()
        this.state.offset.x = Math.max(this.state.offset.x + dx, 0)
        this.state.offset.y = clamp(
          this.state.offset.y + dy,
          0,
          PIANO_ROLL_HEIGHT - height
        )
      },
    })

    useEffect(() => {
      if (!this.canvasRef.current) return
      this.renderPianoRoll()
    })
  }

  getPitchAndPosition = (x: number, y: number) => {
    const pos = Math.max(
      0,
      Math.floor(
        (x + this.state.offset.x - REFERENCE_KEYBOARD_WIDTH) /
          (BAR_WIDTH / BAR_LENGTH)
      )
    )

    const pitch =
      A4_OFFSET - Math.floor((this.state.offset.y + y) / NOTE_HEIGHT)

    return { pos, pitch }
  }

  renderPianoRoll = () => {
    const canvas = this.canvasRef.current
    assert(canvas)

    const wrapper = canvas.parentElement
    assert(wrapper)

    const { width, height } = wrapper.getBoundingClientRect()
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    assert(context)

    const moduleState = getModuleState<{ notes: PianoRollNote[] }>(
      this.props.moduleId
    )

    context.resetTransform()
    context.clearRect(0, 0, width, height)

    {
      // Render grid
      context.resetTransform()
      context.translate(
        -this.state.offset.x + REFERENCE_KEYBOARD_WIDTH,
        -this.state.offset.y
      )

      const firstBar = Math.floor(this.state.offset.x / BAR_WIDTH)
      const numBars = Math.ceil(width / BAR_WIDTH) + 1
      for (let bar = firstBar; bar < firstBar + numBars; bar++) {
        context.fillStyle = bar & 1 ? '#2f2f2f' : '#222'
        context.fillRect(bar * BAR_WIDTH, 0, BAR_WIDTH, PIANO_ROLL_HEIGHT)

        for (let i = 0; i < SNAPPING; i++) {
          context.fillStyle = i % 4 === 0 ? '#666' : '#444'
          context.fillRect(
            bar * BAR_WIDTH + i * (BAR_WIDTH / SNAPPING),
            0,
            1,
            PIANO_ROLL_HEIGHT
          )
        }
      }

      for (let i = 1; i < 12 * OCTAVES; i++) {
        context.fillStyle = '#444'
        context.fillRect(0, i * NOTE_HEIGHT, this.state.offset.x + width, 1)
      }
    }

    {
      // Render notes
      for (let i = 0; i < moduleState.notes.length; i++) {
        const note = moduleState.notes[i]!
        const x = (note.start / BAR_LENGTH) * BAR_WIDTH
        const y = (A4_OFFSET - note.pitch) * NOTE_HEIGHT
        const width = (note.length / BAR_LENGTH) * BAR_WIDTH

        context.fillStyle = '#25a200'
        context.fillRect(x, y, width, NOTE_HEIGHT)
        context.strokeStyle =
          this.state.selectedNote === i ? '#ffff00' : '#155c00'
        context.strokeRect(x, y, width, NOTE_HEIGHT)
      }
    }

    {
      // Render reference keyboard
      context.resetTransform()
      context.translate(0, -this.state.offset.y)
      context.font = 'bold 12px "Gemunu Libre"'

      for (let i = 0; i < 12 * OCTAVES; i++) {
        context.fillStyle = NOTE_COLOR[i % 12] ? '#333' : '#ddd'
        const y = i * NOTE_HEIGHT
        context.fillRect(0, y, REFERENCE_KEYBOARD_WIDTH, NOTE_HEIGHT)
        context.strokeStyle = NOTE_COLOR[i % 12] ? '#111' : '#999'
        context.strokeRect(0, y, REFERENCE_KEYBOARD_WIDTH, NOTE_HEIGHT)

        if (i % 12 === 11) {
          context.fillStyle = '#111'
          context.fillText(
            `C${OCTAVES - Math.floor(i / 12)}`,
            2,
            y + NOTE_HEIGHT - 4
          )
        }
      }
    }
  }

  handleDblClick = (evt: MouseEvent) => {
    const moduleState = getModuleState<{ notes: PianoRollNote[] }>(
      this.props.moduleId
    )

    const target = evt.target as HTMLElement | null
    assert(target)
    const { top, left } = target.getBoundingClientRect()

    const { pos, pitch } = this.getPitchAndPosition(
      evt.clientX - left,
      evt.clientY - top
    )
    this.state.selectedNote = null
    moduleState.notes = moduleState.notes.filter(
      (note) =>
        !(
          note.pitch === pitch &&
          note.start <= pos &&
          note.start + note.length > pos
        )
    )
  }

  render() {
    return (
      <div className={css('wrapper')}>
        <div className={css('piano-roll-editor')}>
          <button
            onClick={() => {
              state.activePianoRollModuleId = null
            }}
          >
            close
          </button>
          <div className={css('editor')} onDblClick={this.handleDblClick}>
            <canvas ref={this.canvasRef} />
          </div>
        </div>
      </div>
    )
  }
}

export default PianoRollEditor
