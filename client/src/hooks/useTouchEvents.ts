import { unwrap, useEffect, useRef } from 'kaiku'
import assert from '../assert'
import state from '../state'
import { Vec2 } from '@modulate/common/types'

const DOUBLE_TAP_THRESHOLD = 200 // ms
const DOUBLE_TAP_ERROR_RADIUS_SQUARED = 4 ** 2 // px
const LONG_PRESS_THRESHOLD = 300 // ms

type Target = HTMLElement | SVGElement

export const enum TapType {
  SINGLE,
  DOUBLE,
  LONG,
}

type DragHandler = (evt: {
  id: Touch['identifier']
  tapType: TapType
  relativeX: number
  relativeY: number
  deltaX: number
  deltaY: number
}) => void

type TapHandler = (evt: {
  id: Touch['identifier']
  tapType: TapType
  x: number
  y: number
  relativeX: number
  relativeY: number
}) => void

type EndHandler = (evt: { x: number; y: number }) => void

type TargetHandler = {
  ref: ReturnType<typeof useRef<Target>>
  relativeToViewOffset?: boolean
  disableDoubleTap?: boolean
  onTap?: TapHandler
  onLongPress?: TapHandler
  onDragStart?: TapHandler
  onDrag?: DragHandler
  onDragEnd?: TapHandler
  onEnd?: EndHandler
}

type TouchState = {
  handlers: TargetHandler[]
  longPressTimeout?: NodeJS.Timeout
  tapTimeout?: NodeJS.Timeout
  tapType: TapType
  time: number
  dragStarted: boolean
  viewOffsetX: number
  viewOffsetY: number
  x: number
  y: number
}

const targetHandlers: Map<Target, TargetHandler[]> = new Map()
const trackedTouches: Map<Touch['identifier'], TouchState> = new Map()
const lastTargetTap: Map<Target, TouchState> = new Map()

const distanceSquared = (a: Vec2, b: Vec2) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2

const cleanUpTarget = (target: Target) => {
  targetHandlers.delete(target)
  lastTargetTap.delete(target)
}

const onTouchStart = (evt: TouchEvent) => {
  let target = evt.target as Target | null
  assert(target)

  do {
    const currentTarget = target
    const handlers = targetHandlers.get(currentTarget)

    if (handlers) {
      evt.preventDefault()
      for (const touch of evt.changedTouches) {
        state.cursor.x = touch.clientX
        state.cursor.y = touch.clientY

        const touchState: TouchState = {
          handlers,
          viewOffsetX: state.viewOffset.x,
          viewOffsetY: state.viewOffset.y,
          x: touch.clientX,
          y: touch.clientY,
          dragStarted: false,
          time: evt.timeStamp,
          tapType: TapType.SINGLE,
        }
        trackedTouches.set(touch.identifier, touchState)

        const lastTap = lastTargetTap.get(currentTarget)

        for (const handler of handlers) {
          if (
            !handler.disableDoubleTap &&
            lastTap &&
            lastTap.tapType !== TapType.LONG &&
            touchState.time - lastTap.time < DOUBLE_TAP_THRESHOLD &&
            distanceSquared(touchState, lastTap) <
              DOUBLE_TAP_ERROR_RADIUS_SQUARED
          ) {
            clearInterval(lastTap.tapTimeout)
            touchState.tapType = TapType.DOUBLE
          }

          if (touchState.tapType !== TapType.DOUBLE) {
            touchState.longPressTimeout = setTimeout(() => {
              const { x, y } = currentTarget.getBoundingClientRect()

              handler.onLongPress?.({
                id: touch.identifier,
                tapType: TapType.LONG,
                relativeX: touch.clientX - x,
                relativeY: touch.clientY - y,
                x: touch.clientX,
                y: touch.clientY,
              })

              touchState.tapType = TapType.LONG
            }, LONG_PRESS_THRESHOLD)
          }
        }
      }
    }
  } while ((target = target.parentElement))
}

const onTouchMove = (evt: TouchEvent) => {
  evt.preventDefault()
  let target = evt.target as Target | null
  assert(target)
  for (const touch of evt.changedTouches) {
    const touchState = trackedTouches.get(touch.identifier)
    if (!touchState) continue

    const targetRect = target.getBoundingClientRect()

    if (!touchState.dragStarted) {
      touchState.dragStarted = true
      for (const handler of touchState.handlers) {
        if (handler.onDragStart) {
          handler.onDragStart({
            id: touch.identifier,
            tapType: touchState.tapType,
            relativeX: touch.clientX - targetRect.x,
            relativeY: touch.clientY - targetRect.y,
            x: touch.clientX,
            y: touch.clientY,
          })
        }
      }
    }

    for (const handler of touchState.handlers) {
      clearTimeout(touchState.longPressTimeout)

      if (handler.onDrag) {
        let deltaX = touchState.x - touch.clientX
        let deltaY = touchState.y - touch.clientY

        if (handler.relativeToViewOffset) {
          deltaX -= touchState.viewOffsetX - state.viewOffset.x
          deltaY -= touchState.viewOffsetY - state.viewOffset.y
        }

        handler.onDrag({
          id: touch.identifier,
          tapType: touchState.tapType,
          deltaX,
          deltaY,
          relativeX: touch.clientX - targetRect.x,
          relativeY: touch.clientY - targetRect.y,
        })

        touchState.x = touch.clientX
        touchState.y = touch.clientY
        touchState.viewOffsetX = state.viewOffset.x
        touchState.viewOffsetY = state.viewOffset.y
      }
    }
  }
}

const onTouchEnd = (evt: TouchEvent) => {
  let target = evt.target as Target | null
  assert(target)

  for (const [id, touchState] of trackedTouches) {
    evt.preventDefault()
    let isPresent = false
    for (const touch of evt.targetTouches) {
      if (touch.identifier === id) {
        isPresent = true
        break
      }
    }

    if (isPresent) {
      continue
    }

    trackedTouches.delete(id)

    clearTimeout(touchState.longPressTimeout)
    touchState.time = evt.timeStamp
    lastTargetTap.set(target, touchState)

    const { x, y } = target.getBoundingClientRect()

    if (touchState.dragStarted) {
      for (const handler of touchState.handlers) {
        handler.onDragEnd?.({
          id,
          tapType: touchState.tapType,
          relativeX: touchState.x - x,
          relativeY: touchState.y - y,
          x: touchState.x,
          y: touchState.y,
        })
      }

      return
    }

    for (const handler of touchState.handlers) {
      if (touchState.tapType === TapType.LONG) continue
      if (touchState.dragStarted) continue
      if (handler.onTap) {
        if (handler.disableDoubleTap) {
          handler.onTap({
            id,
            tapType: touchState.tapType,
            relativeX: touchState.x - x,
            relativeY: touchState.y - y,
            x: touchState.x,
            y: touchState.y,
          })
        } else {
          if (touchState.tapType === TapType.SINGLE) {
            touchState.tapTimeout = setTimeout(() => {
              assert(target)
              assert(handler.onTap)
              handler.onTap({
                id,
                tapType: touchState.tapType,
                relativeX: touchState.x - x,
                relativeY: touchState.y - y,
                x: touchState.x,
                y: touchState.y,
              })
            }, DOUBLE_TAP_THRESHOLD)
          } else {
            handler.onTap({
              id,
              tapType: touchState.tapType,
              relativeX: touchState.x - x,
              relativeY: touchState.y - y,
              x: touchState.x,
              y: touchState.y,
            })
          }
        }
      }
    }
  }
}

document.addEventListener('touchstart', onTouchStart, { passive: false })
document.addEventListener('touchmove', onTouchMove, { passive: false })
document.addEventListener('touchend', onTouchEnd, { passive: false })
document.addEventListener('touchcancel', onTouchEnd, { passive: false })

const useTouchEvents = (handler: TargetHandler) => {
  useEffect(() => {
    if (handler.ref.current) {
      const target = unwrap(handler.ref.current as any)
      let existingHandlers = targetHandlers.get(target) ?? []
      if (existingHandlers.length === 0) {
        targetHandlers.set(target, existingHandlers)
      }
      existingHandlers.push(handler)
      return () => {
        cleanUpTarget(target)
      }
    }
  })
}

export default useTouchEvents
