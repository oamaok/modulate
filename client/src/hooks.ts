import { unwrap, useEffect, useRef } from 'kaiku'
import assert from './assert'
import state from './state'

type MoveHandler = (evt: {
  relativeX: number
  relativeY: number
  dx: number
  dy: number
}) => void
type StartHandler = (evt: {
  x: number
  y: number
  relativeX: number
  relativeY: number
}) => void
type EndHandler = (evt: { x: number; y: number }) => void

type TargetHandlers = {
  ref: ReturnType<typeof useRef<Element>>
  mouseButton?: number
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

const targetHandlers: Map<HTMLElement, TargetHandlers[]> = new Map()

const trackedTouches: Map<Touch['identifier'], TrackedTouch> = new Map()

let trackedDrag: {
  target: HTMLElement
  handlers: TargetHandlers[]
  viewOffsetX: number
  viewOffsetY: number
  startX: number
  startY: number
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
        for (const handler of handlers) {
          handler.onStart?.({
            x: touch.clientX,
            y: touch.clientY,
            relativeX: touch.clientX - x,
            relativeY: touch.clientY - y,
          })
        }
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
      for (const handler of handlers) {
        touches.push([touch, trackedTouch, handler])
      }
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

    const { x, y } = trackedTouch.target.getBoundingClientRect()

    handlers.onMove({
      dx,
      dy,
      relativeX: touch.clientX - x,
      relativeY: touch.clientY - y,
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
      for (const handler of handlers) {
        handler.onEnd?.({
          x: trackedTouch.x,
          y: trackedTouch.y,
        })
      }
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
      for (const handler of handlers) {
        let button = handler.mouseButton ?? 0
        if (evt.button !== button) continue

        if (trackedDrag) {
          trackedDrag.handlers.push(handler)
        } else {
          trackedDrag = {
            x: evt.clientX,
            y: evt.clientY,
            startX: evt.clientX,
            startY: evt.clientY,
            viewOffsetX: state.viewOffset.x,
            viewOffsetY: state.viewOffset.y,
            target,
            handlers: [handler],
          }
        }

        const { x, y } = target.getBoundingClientRect()
        handler.onStart?.({
          x: evt.clientX,
          y: evt.clientY,
          relativeX: evt.clientX - x,
          relativeY: evt.clientY - y,
        })
      }
    }
  } while ((target = target.parentElement))
}

const onMouseMove = (evt: MouseEvent) => {
  if (trackedDrag) {
    let dx = trackedDrag.x - evt.clientX
    let dy = trackedDrag.y - evt.clientY

    const { x, y } = trackedDrag.target.getBoundingClientRect()
    for (const handler of trackedDrag.handlers) {
      handler.onMove({
        dx,
        dy,
        relativeX: evt.clientX - x,
        relativeY: evt.clientY - y,
      })
    }

    trackedDrag.x = evt.clientX
    trackedDrag.y = evt.clientY
  }
}

const onMouseUp = (evt: MouseEvent) => {
  if (trackedDrag) {
    for (const handler of trackedDrag.handlers) {
      handler.onEnd?.({
        x: evt.clientX,
        y: evt.clientY,
      })
    }
  }
  trackedDrag = null
}

document.addEventListener('mousedown', onMouseDown)
document.addEventListener('mousemove', onMouseMove)
document.addEventListener('mouseup', onMouseUp)

export const useDrag = (handlers: TargetHandlers) => {
  useEffect(() => {
    if (handlers.ref.current) {
      const target = unwrap(handlers.ref.current as any)
      let existingHandlers = targetHandlers.get(target) ?? []
      existingHandlers.push(handlers)
      targetHandlers.set(target, existingHandlers)
      return () => {
        targetHandlers.delete(unwrap(target as any))
      }
    }
  })
}
