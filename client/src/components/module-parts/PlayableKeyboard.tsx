import { Component, useRef } from 'kaiku'
import css from './PlayableKeyboard.css'
import assert from '../../assert'
import { isPointInsideRect } from '@modulate/common/util'

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23]
const BLACK_KEYS = [1, 3, null, 6, 8, 10, null, 13, 15, null, 18, 20, 22]

type Props = {
  onChange: (pressedKeys: number[]) => void
}

const getKeyForTouch = (keyboard: HTMLElement, touch: Touch) => {
  let currentKey: number | null = null
  for (const child of keyboard.children) {
    if (
      isPointInsideRect(
        { x: touch.clientX, y: touch.clientY },
        child.getBoundingClientRect()
      )
    ) {
      const keyAttr = child.getAttribute('data-key')
      assert(keyAttr !== null)
      const key = parseInt(keyAttr)
      const isBlackKey = BLACK_KEYS.includes(key)

      // Prioritize black keys over white keys
      // as they overlap the bounding boxes
      if (isBlackKey) {
        currentKey = key
      } else if (currentKey === null) {
        currentKey = key
      }
    }
  }

  return currentKey
}

class PlayableKeyboard extends Component<Props> {
  ref = useRef<HTMLElement>()
  trackedTouches: Touch['identifier'][] = []
  touchNotes: Map<Touch['identifier'], number> = new Map()

  triggerOnChange = () => {
    this.props.onChange(
      this.trackedTouches.map((id) => {
        const key = this.touchNotes.get(id)
        assert(typeof key !== 'undefined')
        return key
      })
    )
  }

  onTouchStart = (evt: TouchEvent) => {
    evt.preventDefault()

    assert(this.ref.current)
    for (const touch of evt.targetTouches) {
      if (!this.trackedTouches.includes(touch.identifier)) {
        this.trackedTouches.push(touch.identifier)
        const currentKey = getKeyForTouch(this.ref.current, touch)
        assert(currentKey !== null)
        this.touchNotes.set(touch.identifier, currentKey)
      }
    }

    this.triggerOnChange()
  }

  onTouchMove = (evt: TouchEvent) => {
    evt.preventDefault()
    assert(this.ref.current)
    for (const touch of evt.targetTouches) {
      const currentKey = getKeyForTouch(this.ref.current, touch)
      assert(currentKey !== null)
      this.touchNotes.set(touch.identifier, currentKey)
    }

    this.triggerOnChange()
  }

  onTouchEnd = (evt: TouchEvent) => {
    evt.preventDefault()
    this.trackedTouches = this.trackedTouches.filter((id) => {
      for (const touch of evt.targetTouches) {
        if (touch.identifier === id) return true
      }
      return false
    })

    this.triggerOnChange()
  }

  render() {
    return (
      <div
        ref={this.ref}
        className={css('keyboard')}
        onTouchStart={this.onTouchStart}
        onTouchMove={this.onTouchMove}
        onTouchEnd={this.onTouchEnd}
      >
        {WHITE_KEYS.map((key, i) => (
          <button
            data-key={key}
            className={css('white-key')}
            style={{ left: i * 48 + 'px' }}
          ></button>
        ))}
        {BLACK_KEYS.map(
          (key, i) =>
            key && (
              <button
                data-key={key}
                className={css('black-key')}
                style={{ left: i * 48 + 24 + 'px' }}
              ></button>
            )
        )}
      </div>
    )
  }
}

export default PlayableKeyboard
