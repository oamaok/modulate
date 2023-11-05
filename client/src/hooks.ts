import { unwrap, useEffect, useRef } from 'kaiku'
import assert from './assert'
import state from './state'

type MoveHandler = (evt: { dx: number; dy: number }) => void
type StartHandler = (evt: {
  x: number
  y: number
  relativeX: number
  relativeY: number
}) => void
type EndHandler = (evt: { x: number; y: number }) => void

type TargetHandlers = {
  relativeToViewOffset?: boolean
  onStart?: StartHandler
  onMove: MoveHandler
  onEnd?: EndHandler
}

type TrackedTouch = {
  target: HTMLElement
  viewOffsetX: number
  viewOffsetY: number
  x: number
  y: number
}

const targetHandlers: Map<HTMLElement, TargetHandlers> = new Map()

const trackedTouches: Map<Touch['identifier'], TrackedTouch> = new Map()

let trackedDrag: {
  target: HTMLElement
  handlers: TargetHandlers
  viewOffsetX: number
  viewOffsetY: number
  x: number
  y: number
} | null = null

const onTouchStart = (evt: TouchEvent) => {
  let target = evt.target as HTMLElement | null
  assert(target)
  do {
    const handlers = targetHandlers.get(target)
    if (handlers) {
      for (const touch of evt.changedTouches) {
        trackedTouches.set(touch.identifier, {
          target,
          viewOffsetX: state.viewOffset.x,
          viewOffsetY: state.viewOffset.y,
          x: touch.clientX,
          y: touch.clientY,
        })
        const { x, y } = target.getBoundingClientRect()
        handlers.onStart?.({
          x: touch.clientX,
          y: touch.clientY,
          relativeX: touch.clientX - x,
          relativeY: touch.clientY - y,
        })
      }
    }
  } while ((target = target.parentElement))
}

const onTouchMove = (evt: TouchEvent) => {
  const touches: [Touch, TrackedTouch, TargetHandlers][] = []

  for (const touch of evt.touches) {
    const trackedTouch = trackedTouches.get(touch.identifier)
    if (trackedTouch) {
      const handlers = targetHandlers.get(trackedTouch.target)
      assert(handlers)
      touches.push([touch, trackedTouch, handlers])
    }
  }

  // Handle drags relative to view offset last to avoid jittery movement
  touches.sort(
    (a, b) => +!b[2].relativeToViewOffset - +!a[2].relativeToViewOffset
  )

  for (const [touch, trackedTouch, handlers] of touches) {
    evt.preventDefault()

    let dx = trackedTouch.x - touch.clientX
    let dy = trackedTouch.y - touch.clientY

    if (handlers.relativeToViewOffset) {
      dx -= trackedTouch.viewOffsetX - state.viewOffset.x
      dy -= trackedTouch.viewOffsetY - state.viewOffset.y
    }

    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) continue

    handlers.onMove({
      dx,
      dy,
    })

    trackedTouch.x = touch.clientX
    trackedTouch.y = touch.clientY
    trackedTouch.viewOffsetX = state.viewOffset.x
    trackedTouch.viewOffsetY = state.viewOffset.y
  }
}

const onTouchEnd = (evt: TouchEvent) => {
  for (const [id, trackedTouch] of trackedTouches) {
    let isPresent = false
    for (const touch of evt.touches) {
      if (touch.identifier === id) {
        isPresent = true
        break
      }
    }
    if (!isPresent) {
      const handlers = targetHandlers.get(trackedTouch.target)
      assert(handlers)
      handlers.onEnd?.({ x: trackedTouch.x, y: trackedTouch.y })
      trackedTouches.delete(id)
    }
  }
}

document.addEventListener('touchstart', onTouchStart)
document.addEventListener('touchmove', onTouchMove)
document.addEventListener('touchend', onTouchEnd)

const onMouseDown = (evt: MouseEvent) => {
  let target = evt.target as HTMLElement | null
  assert(target)
  do {
    const handlers = targetHandlers.get(target)
    if (handlers) {
      trackedDrag = {
        x: evt.clientX,
        y: evt.clientY,
        viewOffsetX: state.viewOffset.x,
        viewOffsetY: state.viewOffset.y,
        target,
        handlers,
      }
      const { x, y } = target.getBoundingClientRect()
      handlers.onStart?.({
        x: evt.clientX,
        y: evt.clientY,
        relativeX: evt.clientX - x,
        relativeY: evt.clientY - y,
      })
    }
  } while ((target = target.parentElement))
}

const onMouseMove = (evt: MouseEvent) => {
  if (trackedDrag) {
    let dx = trackedDrag.x - evt.clientX
    let dy = trackedDrag.y - evt.clientY

    trackedDrag.handlers.onMove({
      dx,
      dy,
    })

    trackedDrag.x = evt.clientX
    trackedDrag.y = evt.clientY
  }
}

const onMouseUp = (evt: MouseEvent) => {
  if (trackedDrag) {
    trackedDrag.handlers.onEnd?.({ x: evt.clientX, y: evt.clientY })
  }
  trackedDrag = null
}

document.addEventListener('mousedown', onMouseDown)
document.addEventListener('mousemove', onMouseMove)
document.addEventListener('mouseup', onMouseUp)

export const useDrag = <T extends HTMLElement = HTMLElement>(
  handlers: TargetHandlers
) => {
  const ref = useRef<T>()

  useEffect(() => {
    const target = ref.current
    if (target) {
      targetHandlers.set(unwrap(target as any), handlers)
      return () => {
        targetHandlers.delete(unwrap(target as any))
      }
    }
  })

  return ref
}
