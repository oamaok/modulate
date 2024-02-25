import { Component, useEffect, useRef } from 'kaiku'
import { nextId, getModuleState } from '../../state'
import * as styles from './PianoRollEditor.css'
import assert from '../../assert'
import { Vec2 } from '@modulate/common/types'
import { clamp } from '@modulate/common/util'
import useMouseDrag, {
  RIGHT_CLICK,
  MIDDLE_CLICK,
  LEFT_CLICK,
} from '../../hooks/useMouseDrag'
import useTouchEvents, { TapType } from '../../hooks/useTouchEvents'
import useKeyboard from '../../hooks/useKeyboard'
import Icon from '../icon/Icon'
import * as icons from '../../icons'

export type PianoRollNote = {
  id: string
  start: number
  length: number
  pitch: number
}

const NOTE_COLOR = [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0]

const REFERENCE_KEYBOARD_WIDTH = 64
const NOTE_HEIGHT = 16
const OCTAVES = 8

const BAR_WIDTH = 720

// Set to this value to allow snapping for 1/32ths, 3rds, 5ths, 7ths and more
export const BAR_LENGTH = 64 * 3 * 5 * 7

const SNAPPING_OPTIONS = [
  [BAR_LENGTH, 'None'],
  [64, '1/16'],
  [32, '1/8'],
  [28, '1/7'],
  [24, '1/6'],
  [20, '1/5'],
  [16, '1/4'],
  [12, '1/3'],
  [8, '1/2'],
  [4, 'Beat'],
  [2, 'Half-bar'],
  [1, 'Bar'],
] as const
const SNAPPING_NONE = 0

const A4_OFFSET = 50
const MIN_PITCH = -45
const MAX_PITCH = 50

const NOTE_NAMES = [
  'A',
  'A#',
  'B',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
]

type Props = {
  moduleId: string
  onClose: () => void
  positionBuf: Float32Array
}

type State = {
  offset: Vec2
  zoom: Vec2
  selectionRect: {
    minPitch: number
    maxPitch: number
    minTime: number
    maxTime: number
  } | null
  selectedNotes: string[]
  snapping: number
  position: number
}

const isBetween = (a: number, b: number, x: number) => {
  if (a < b) {
    return x >= a && x <= b
  } else {
    return x <= a && x >= b
  }
}

class PianoRollEditor extends Component<Props, State> {
  canvasRef = useRef<HTMLCanvasElement>()
  state: State = {
    offset: {
      x: 0,
      y: 0,
    },
    zoom: {
      x: 1.0,
      y: 1.5,
    },

    selectionRect: null,
    selectedNotes: [],
    snapping: 6,
    position: 0,
  }

  constructor(props: Props) {
    super(props)

    useEffect(() => {
      const timeout = setInterval(() => {
        if (props.positionBuf) {
          this.state.position = props.positionBuf[0]!
        }
      }, 16)

      return () => clearInterval(timeout)
    })

    const moduleState = getModuleState<{ notes: PianoRollNote[] }>(
      props.moduleId
    )

    useKeyboard({
      Delete: () => {
        this.deleteNotes(this.state.selectedNotes)
        this.state.selectedNotes = []
      },
    })

    let startPos = 0
    let startPitch = 0
    let resizing = false
    let noteLength = BAR_LENGTH / 16
    let initialSelectedNotes: string[] = []

    const startRectSelection = (pitch: number, pos: number) => {
      this.state.selectionRect = {
        minPitch: pitch,
        maxPitch: pitch - 1,
        minTime: pos,
        maxTime: pos + 1,
      }
    }

    const updateResize = (pitch: number, pos: number) => {
      const selectedNotes = moduleState.notes.filter((note) =>
        this.state.selectedNotes.includes(note.id)
      )

      let deltaPos = pos - startPos

      for (const note of selectedNotes) {
        if (note.length + deltaPos < BAR_LENGTH / 64) {
          deltaPos = 0
          break
        }
      }

      for (const note of selectedNotes) {
        note.length += deltaPos
      }

      noteLength += deltaPos

      startPos = pos
    }

    const pitchToPixels = (pitch: number) => {
      return (pitch / BAR_LENGTH) * BAR_WIDTH
    }

    const updateRectSelection = (pitch: number, pos: number) => {
      assert(this.state.selectionRect)
      this.state.selectionRect.maxPitch = pitch - 1
      this.state.selectionRect.maxTime = pos + 1

      const { minPitch, maxPitch, minTime, maxTime } = this.state.selectionRect

      this.state.selectedNotes = [
        ...initialSelectedNotes,
        ...moduleState.notes
          .filter((note) => {
            assert(this.state.selectionRect)
            return (
              isBetween(minPitch, maxPitch, note.pitch) &&
              (isBetween(minTime, maxTime, note.start) ||
                isBetween(minTime, maxTime, note.start + note.length))
            )
          })
          .map((note) => note.id),
      ].filter((a, b, c) => c.indexOf(a) === b)
    }

    const endRectSelection = () => {
      this.state.selectionRect = null
    }

    const createOrDragNote = (pitch: number, pos: number) => {
      const noteAtPosition = getNoteAtPosition(pitch, pos)

      const roundedPos = this.roundToSnap(pos)

      startPos = roundedPos
      startPitch = pitch

      if (noteAtPosition) {
        noteLength = noteAtPosition.length
        if (!this.state.selectedNotes.includes(noteAtPosition.id)) {
          this.state.selectedNotes = [noteAtPosition.id]
        }

        if (
          pitchToPixels(noteAtPosition.start + noteAtPosition.length - pos) < 20
        ) {
          resizing = true
        }

        return
      }

      const note: PianoRollNote = {
        id: nextId(),
        pitch,
        start: roundedPos,
        length: noteLength,
      }

      moduleState.notes.push(note)
      this.state.selectedNotes = [note.id]
    }

    const moveSelectedNotes = (pitch: number, pos: number) => {
      const selectedNotes = moduleState.notes.filter((note) =>
        this.state.selectedNotes.includes(note.id)
      )
      const roundedPos = this.roundToSnap(pos)
      let deltaPos = roundedPos - startPos
      let deltaPitch = pitch - startPitch

      for (const note of selectedNotes) {
        if (note.start + deltaPos < 0) {
          deltaPos = 0
          break
        }
      }

      for (const note of selectedNotes) {
        if (
          note.pitch + deltaPitch < MIN_PITCH ||
          note.pitch + deltaPitch > MAX_PITCH
        ) {
          deltaPitch = 0
        }
      }

      for (const note of selectedNotes) {
        assert(note)

        note.pitch += deltaPitch
        note.start += deltaPos
      }

      startPitch = pitch
      startPos = roundedPos
    }

    const getNoteAtPosition = (pitch: number, pos: number) => {
      return moduleState.notes.find(
        (note) =>
          note.pitch === pitch &&
          note.start <= pos &&
          note.start + note.length > pos
      )
    }

    const deleteNoteAt = (pitch: number, pos: number) => {
      const noteAtPosition = getNoteAtPosition(pitch, pos)

      if (noteAtPosition) {
        this.deleteNotes([noteAtPosition.id])
        this.state.selectedNotes = []
        return
      }
    }

    useMouseDrag({
      ref: this.canvasRef,
      onDragStart: ({ button, ctrlKey, shiftKey, relativeX, relativeY }) => {
        const { pos, pitch } = this.getPitchAndPosition(relativeX, relativeY)

        if (button === LEFT_CLICK) {
          if (ctrlKey) {
            if (shiftKey) {
              initialSelectedNotes = this.state.selectedNotes
            } else {
              initialSelectedNotes = []
            }
            startRectSelection(pitch, pos)
            return
          }

          createOrDragNote(pitch, pos)
          return
        }

        if (button === RIGHT_CLICK) {
          deleteNoteAt(pitch, pos)
        }
      },
      onDrag: ({ button, relativeX, relativeY, deltaX, deltaY }) => {
        const { pos, snappedPos, pitch } = this.getPitchAndPosition(
          relativeX,
          relativeY
        )

        if (button === LEFT_CLICK) {
          if (this.state.selectionRect) {
            updateRectSelection(pitch, pos)
            return
          }

          if (resizing) {
            updateResize(pitch, snappedPos)
            return
          }

          moveSelectedNotes(pitch, pos)
        }

        if (button === RIGHT_CLICK) {
          deleteNoteAt(pitch, pos)
          return
        }

        if (button === MIDDLE_CLICK) {
          this.state.offset.x += deltaX
          this.state.offset.y += deltaY
          this.clampOffset()
        }
      },
      onDragEnd: () => {
        resizing = false
        endRectSelection()
      },
    })

    useTouchEvents({
      ref: this.canvasRef,
      disableDoubleTap: true,
      onTap: ({ relativeX, relativeY, tapType }) => {
        const { pos, snappedPos, pitch } = this.getPitchAndPosition(
          relativeX,
          relativeY
        )

        const noteAtPosition = getNoteAtPosition(pitch, pos)
        if (tapType === TapType.SINGLE) {
          if (noteAtPosition) {
            this.deleteNotes([noteAtPosition.id])
            this.state.selectedNotes = []
          } else {
            const note: PianoRollNote = {
              id: nextId(),
              pitch,
              start: snappedPos,
              length: noteLength,
            }

            moduleState.notes.push(note)
            this.state.selectedNotes = [note.id]
          }
        }
      },
      onDragStart: ({ relativeX, relativeY, tapType }) => {
        const { pos, snappedPos, pitch } = this.getPitchAndPosition(
          relativeX,
          relativeY
        )
        startPos = snappedPos
        startPitch = pitch

        if (tapType === TapType.LONG) {
          startRectSelection(pitch, snappedPos)
        }

        if (tapType === TapType.SINGLE) {
          const noteAtPosition = getNoteAtPosition(pitch, pos)
          if (!noteAtPosition) {
            this.state.selectedNotes = []
          } else {
            noteLength = noteAtPosition.length
            if (!this.state.selectedNotes.includes(noteAtPosition.id)) {
              this.state.selectedNotes = [noteAtPosition.id]
            }

            if (
              pitchToPixels(
                noteAtPosition.start + noteAtPosition.length - pos
              ) < 20
            ) {
              resizing = true
            }
          }
        }
      },
      onDrag: ({ relativeX, relativeY, deltaX, deltaY, tapType }) => {
        const { snappedPos, pitch } = this.getPitchAndPosition(
          relativeX,
          relativeY
        )
        if (tapType === TapType.LONG) {
          if (this.state.selectionRect) {
            updateRectSelection(pitch, snappedPos)
            return
          }
        }

        if (tapType === TapType.SINGLE) {
          if (this.state.selectedNotes.length !== 0) {
            if (resizing) {
              updateResize(pitch, snappedPos)
            } else {
              moveSelectedNotes(pitch, snappedPos)
            }
          } else {
            this.state.offset.x += deltaX
            this.state.offset.y += deltaY
            this.clampOffset()
          }
        }
      },
      onDragEnd: () => {
        endRectSelection()
        resizing = false
      },
    })

    useEffect(() => {
      if (!this.canvasRef.current) return
      this.renderPianoRoll()
    })
  }

  roundToSnap = (pos: number) => {
    const snapping = SNAPPING_OPTIONS[this.state.snapping]![0]
    return (
      Math.floor(Math.max(0, pos) / (BAR_LENGTH / snapping)) *
      (BAR_LENGTH / snapping)
    )
  }

  deleteNotes = (notes: string[]) => {
    const moduleState = getModuleState<{ notes: PianoRollNote[] }>(
      this.props.moduleId
    )
    moduleState.notes = moduleState.notes.filter(
      (note) => !notes.includes(note.id)
    )
  }

  clampOffset = () => {
    const canvas = this.canvasRef.current
    assert(canvas)

    const wrapper = canvas.parentElement
    assert(wrapper)

    const { height, width } = wrapper.getBoundingClientRect()

    const noteHeight = NOTE_HEIGHT * this.state.zoom.y
    const pianoRollHeight = noteHeight * 12 * OCTAVES

    this.state.offset.x = Math.max(this.state.offset.x, -width * 0.5)
    this.state.offset.y = clamp(
      this.state.offset.y,
      -height * 0.5,
      pianoRollHeight - height * 0.5
    )
  }

  getPitchAndPosition = (x: number, y: number) => {
    const pos = Math.max(
      0,
      Math.floor(
        (x + this.state.offset.x - REFERENCE_KEYBOARD_WIDTH) /
          (BAR_WIDTH / BAR_LENGTH)
      )
    )

    const snappedPos = this.roundToSnap(pos)

    const noteHeight = NOTE_HEIGHT * this.state.zoom.y
    const pitch = A4_OFFSET - Math.floor((this.state.offset.y + y) / noteHeight)

    return { pos, snappedPos, pitch }
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

    const noteHeight = NOTE_HEIGHT * this.state.zoom.y
    const pianoRollHeight = noteHeight * 12 * OCTAVES

    context.resetTransform()
    context.fillStyle = '#444'
    context.fillRect(0, 0, width, height)

    {
      // Render grid
      context.resetTransform()
      context.translate(
        -this.state.offset.x + REFERENCE_KEYBOARD_WIDTH,
        -this.state.offset.y
      )

      const firstBar = Math.max(0, Math.floor(this.state.offset.x / BAR_WIDTH))
      const numBars = Math.ceil(width / BAR_WIDTH) + 1
      for (let bar = firstBar; bar < firstBar + numBars; bar++) {
        for (let i = 0; i < 12 * OCTAVES; i++) {
          context.fillStyle = NOTE_COLOR[i % 12] ? '#222' : '#2f2f2f'
          context.fillRect(
            bar * BAR_WIDTH,
            i * noteHeight,
            BAR_WIDTH,
            noteHeight
          )
        }

        if (this.state.snapping === SNAPPING_NONE) {
          // Show grid for 1/4ths if snapping is set to 'None'
          for (let i = 0; i < 16; i++) {
            context.fillStyle = i % 4 === 0 ? '#666' : '#444'
            context.fillRect(
              bar * BAR_WIDTH + i * (BAR_WIDTH / 16),
              0,
              i === 0 ? 2 : 1,
              pianoRollHeight
            )
          }
        } else {
          const snapping = SNAPPING_OPTIONS[this.state.snapping]![0]

          for (let i = 0; i < snapping; i++) {
            context.fillStyle = i % (snapping / 4) === 0 ? '#666' : '#444'
            context.fillRect(
              bar * BAR_WIDTH + i * (BAR_WIDTH / snapping),
              0,
              i === 0 ? 2 : 1,
              pianoRollHeight
            )
          }
        }
      }
      context.resetTransform()
      context.translate(REFERENCE_KEYBOARD_WIDTH, -this.state.offset.y)

      for (let i = 0; i < 12 * OCTAVES; i++) {
        if (!(i % 12 === 7 || i % 12 === 0)) {
          continue
        }
        context.fillStyle = '#444'
        context.fillRect(0, i * noteHeight, width, 1)
      }
    }
    {
      // Render notes
      context.resetTransform()
      context.translate(
        -this.state.offset.x + REFERENCE_KEYBOARD_WIDTH,
        -this.state.offset.y
      )

      context.font = 'bold 12px "Gemunu Libre"'
      context.lineWidth = 2

      for (let i = 0; i < moduleState.notes.length; i++) {
        const note = moduleState.notes[i]!
        const x = (note.start / BAR_LENGTH) * BAR_WIDTH
        const y = (A4_OFFSET - note.pitch) * noteHeight
        const width = (note.length / BAR_LENGTH) * BAR_WIDTH

        const isSelectedNode = this.state.selectedNotes.includes(note.id)

        context.fillStyle = isSelectedNode ? '#a29500' : '#5aad41'
        context.strokeStyle = isSelectedNode ? '#f5e200' : '#155c00'

        context.beginPath()
        context.roundRect(x, y, width, noteHeight, 4)
        context.fill()
        context.stroke()
        context.fillStyle = '#165901'
        if (noteHeight >= 16) {
          context.fillText(
            NOTE_NAMES[
              (A4_OFFSET + note.pitch - 2 + NOTE_NAMES.length * 10) %
                NOTE_NAMES.length
            ]!,
            x + 2,
            y + 12
          )
        }
      }
    }

    {
      // Bar hints
      context.resetTransform()
      context.translate(
        -this.state.offset.x + REFERENCE_KEYBOARD_WIDTH,
        Math.max(-this.state.offset.y - 16, 0)
      )

      const firstBar = Math.max(0, Math.floor(this.state.offset.x / BAR_WIDTH))
      const numBars = Math.ceil(width / BAR_WIDTH) + 1
      for (let bar = firstBar; bar < firstBar + numBars; bar++) {
        context.fillStyle = bar & 1 ? '#1f1f1f' : '#111'
        context.strokeStyle = '#666'
        context.lineWidth = 1
        context.fillRect(bar * BAR_WIDTH, 0, BAR_WIDTH, 16)
        context.strokeRect(bar * BAR_WIDTH, 0, BAR_WIDTH, 16)

        for (let i = 0; i < 4; i++) {
          context.fillStyle = '#666'
          context.fillText(
            `${bar + 1}.${i + 1}.`,
            bar * BAR_WIDTH + (BAR_WIDTH / 4) * i + 2,
            12
          )
        }
      }
    }

    {
      if (this.state.selectionRect) {
        context.resetTransform()
        context.translate(
          -this.state.offset.x + REFERENCE_KEYBOARD_WIDTH,
          -this.state.offset.y
        )
        context.strokeStyle = '#a295007f'
        context.lineWidth = 8

        const x = (this.state.selectionRect.minTime / BAR_LENGTH) * BAR_WIDTH
        const y = (A4_OFFSET - this.state.selectionRect.minPitch) * noteHeight
        const w =
          ((this.state.selectionRect.maxTime -
            this.state.selectionRect.minTime) /
            BAR_LENGTH) *
          BAR_WIDTH
        const h =
          (this.state.selectionRect.minPitch -
            this.state.selectionRect.maxPitch) *
          noteHeight

        context.beginPath()
        context.roundRect(x, y, w, h, 8)
        context.stroke()
      }
    }

    {
      // Render playhead
      context.fillStyle = '#a29500'
      context.resetTransform()
      context.translate(-this.state.offset.x + REFERENCE_KEYBOARD_WIDTH, 0)
      context.fillRect(
        (this.state.position / BAR_LENGTH) * BAR_WIDTH,
        0,
        4,
        height
      )
    }

    {
      // Render reference keyboard
      context.resetTransform()
      context.translate(Math.max(-this.state.offset.x, 0), -this.state.offset.y)
      context.font = 'bold 12px "Gemunu Libre"'
      context.lineWidth = 2

      for (let i = 0; i < 12 * OCTAVES; i++) {
        context.fillStyle = NOTE_COLOR[i % 12] ? '#333' : '#ddd'
        const y = i * noteHeight
        context.fillRect(0, y, REFERENCE_KEYBOARD_WIDTH, noteHeight)
        context.strokeStyle = NOTE_COLOR[i % 12] ? '#111' : '#999'
        context.strokeRect(0, y, REFERENCE_KEYBOARD_WIDTH, noteHeight)

        if (i % 12 === 11) {
          context.fillStyle = '#111'
          context.fillText(
            `C${OCTAVES - Math.floor(i / 12)}`,
            2,
            y + noteHeight - 4
          )
        }
      }
    }
  }

  handleWheel = (evt: WheelEvent) => {
    evt.stopPropagation()
    evt.preventDefault()
    if (evt.ctrlKey) {
      this.state.zoom.y -= evt.deltaY * 0.001
      this.state.zoom.y = Math.min(4.0, Math.max(1 / 4.0, this.state.zoom.y))
    } else {
      this.state.offset.x += evt.deltaX
      this.state.offset.y += evt.deltaY
    }
    this.clampOffset()
  }

  render() {
    return (
      <div class={styles.wrapper}>
        <div class={styles.pianoRollEditor}>
          <div class={styles.actions}>
            <button onClick={() => this.deleteNotes(this.state.selectedNotes)}>
              <Icon size={16} name={icons.delete} />
              delete selected
            </button>
            <div class={styles.snapping}>
              <label>Snapping</label>
              <select
                onChange={(evt: InputEvent) => {
                  this.state.snapping = parseInt(
                    (evt.target as HTMLOptionElement).value
                  )
                }}
              >
                {SNAPPING_OPTIONS.map(([, name], i) => (
                  <option selected={i === this.state.snapping} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={this.props.onClose}>
              <Icon size={16} name={icons.close} />
              close
            </button>
          </div>
          <div class={styles.editor} onWheel={this.handleWheel}>
            <canvas ref={this.canvasRef} />
          </div>
        </div>
      </div>
    )
  }
}

export default PianoRollEditor
