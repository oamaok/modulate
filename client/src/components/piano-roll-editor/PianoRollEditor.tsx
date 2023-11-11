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

const BAR_WIDTH = 600

// Set to this value to allow snapping for 1/32ths, 3rds, 5ths, 7ths and more
export const BAR_LENGTH = 32 * 3 * 5 * 7

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
    let editingLength = false
    let noteLength = BAR_LENGTH / 16
    let initialSelectedNotes: string[] = []

    const startRectSelection = (pitch: number, pos: number) => {
      initialSelectedNotes = this.state.selectedNotes
      this.state.selectionRect = {
        minPitch: pitch,
        maxPitch: pitch - 1,
        minTime: pos,
        maxTime: pos + 1,
      }
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
      const noteAtPosition = moduleState.notes.find(
        (note) =>
          note.pitch === pitch &&
          note.start <= pos &&
          note.start + note.length > pos
      )
      startPos = pos
      startPitch = pitch

      if (noteAtPosition) {
        if (!this.state.selectedNotes.includes(noteAtPosition.id)) {
          this.state.selectedNotes = [noteAtPosition.id]
        }

        return
      }

      const note: PianoRollNote = {
        id: nextId(),
        pitch,
        start: this.roundToSnap(pos),
        length: noteLength,
      }

      moduleState.notes.push(note)
      this.state.selectedNotes = [note.id]
    }

    const moveSelectedNotes = (pitch: number, pos: number) => {
      for (const noteId of this.state.selectedNotes) {
        const note = moduleState.notes.find(({ id }) => noteId === id)
        assert(note)

        note.pitch += pitch - startPitch
        note.start += pos - startPos
      }

      startPitch = pitch
      startPos = pos
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
      onDragStart: ({ button, ctrlKey, relativeX, relativeY }) => {
        const { pos, pitch } = this.getPitchAndPosition(relativeX, relativeY)

        if (button === LEFT_CLICK) {
          if (ctrlKey) {
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
        const { pos, pitch } = this.getPitchAndPosition(relativeX, relativeY)

        if (button === LEFT_CLICK) {
          if (this.state.selectionRect) {
            updateRectSelection(pitch, pos)
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
        endRectSelection()
      },
    })

    useTouchEvents({
      ref: this.canvasRef,
      disableDoubleTap: true,
      onTap: ({ relativeX, relativeY, tapType }) => {
        const { pos, pitch } = this.getPitchAndPosition(relativeX, relativeY)

        const noteAtPosition = getNoteAtPosition(pitch, pos)
        if (tapType === TapType.SINGLE) {
          if (noteAtPosition) {
            this.deleteNotes([noteAtPosition.id])
            this.state.selectedNotes = []
          } else {
            const note: PianoRollNote = {
              id: nextId(),
              pitch,
              start: this.roundToSnap(pos),
              length: noteLength,
            }

            moduleState.notes.push(note)
            this.state.selectedNotes = [note.id]
          }
        }
      },
      onDragStart: ({ relativeX, relativeY, tapType }) => {
        const { pos, pitch } = this.getPitchAndPosition(relativeX, relativeY)
        startPos = pos
        startPitch = pitch

        if (tapType === TapType.LONG) {
          startRectSelection(pitch, pos)
        }

        if (tapType === TapType.SINGLE) {
          const noteAtPosition = getNoteAtPosition(pitch, pos)
          if (!noteAtPosition) {
            this.state.selectedNotes = []
          } else {
            if (!this.state.selectedNotes.includes(noteAtPosition.id)) {
              this.state.selectedNotes = [noteAtPosition.id]
            }
          }
        }
      },
      onDrag: ({ relativeX, relativeY, deltaX, deltaY, tapType }) => {
        const { pos, pitch } = this.getPitchAndPosition(relativeX, relativeY)
        if (tapType === TapType.LONG) {
          if (this.state.selectionRect) {
            updateRectSelection(pitch, pos)
            return
          }
        }

        if (tapType === TapType.SINGLE) {
          if (this.state.selectedNotes.length !== 0) {
            moveSelectedNotes(pitch, pos)
          } else {
            this.state.offset.x += deltaX
            this.state.offset.y += deltaY
            this.clampOffset()
          }
        }
      },
      onDragEnd: () => {
        endRectSelection()
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

    const { height } = wrapper.getBoundingClientRect()

    const noteHeight = NOTE_HEIGHT * this.state.zoom.y
    const pianoRollHeight = noteHeight * 12 * OCTAVES

    this.state.offset.x = Math.max(this.state.offset.x, -BAR_WIDTH * 2)
    this.state.offset.y = clamp(
      this.state.offset.y,
      -pianoRollHeight / 2,
      pianoRollHeight * 1.5 - height
    )
  }

  getPitchAndPosition = (x: number, y: number) => {
    const pos = this.roundToSnap(
      Math.max(
        0,
        Math.floor(
          (x + this.state.offset.x - REFERENCE_KEYBOARD_WIDTH) /
            (BAR_WIDTH / BAR_LENGTH)
        )
      )
    )

    const noteHeight = NOTE_HEIGHT * this.state.zoom.y
    const pitch = A4_OFFSET - Math.floor((this.state.offset.y + y) / noteHeight)

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
        context.fillStyle = bar & 1 ? '#2f2f2f' : '#222'
        context.fillRect(bar * BAR_WIDTH, 0, BAR_WIDTH, pianoRollHeight)

        if (this.state.snapping === SNAPPING_NONE) {
          // Show grid for 1/4ths if snapping is set to 'None'
          for (let i = 0; i < 16; i++) {
            context.fillStyle = i % 4 === 0 ? '#666' : '#444'
            context.fillRect(
              bar * BAR_WIDTH + i * (BAR_WIDTH / 16),
              0,
              1,
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
              1,
              pianoRollHeight
            )
          }
        }
      }

      for (let i = 1; i < 12 * OCTAVES; i++) {
        context.fillStyle = '#444'
        context.fillRect(0, i * noteHeight, this.state.offset.x + width, 1)
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

        context.fillStyle = '#25a200'
        context.fillRect(x, y, width, noteHeight)
        context.strokeStyle = this.state.selectedNotes.includes(note.id)
          ? '#ffff00'
          : '#155c00'
        context.strokeRect(x, y, width, noteHeight)
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
        context.strokeStyle = '#ff0000'
        context.lineWidth = 2

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

        context.strokeRect(x, y, w, h)
      }
    }

    {
      // Render playhead
      context.fillStyle = '#165901'
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
      <div className={styles.wrapper}>
        <div className={styles.pianoRollEditor}>
          <button onClick={this.props.onClose}>close</button>
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
          <div className={styles.editor} onWheel={this.handleWheel}>
            <canvas ref={this.canvasRef} />
          </div>
        </div>
      </div>
    )
  }
}

export default PianoRollEditor
