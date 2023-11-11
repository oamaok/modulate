import { unwrap, useEffect, useRef } from 'kaiku'
import assert from '../assert'
import state from '../state'

export const LEFT_CLICK = 0
export const MIDDLE_CLICK = 1
export const RIGHT_CLICK = 2

type MouseButton = typeof LEFT_CLICK | typeof MIDDLE_CLICK | typeof RIGHT_CLICK

type ModKeys = {
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

type MoveHandler = (
  evt: {
    button: MouseButton
    relativeX: number
    relativeY: number
    deltaX: number
    deltaY: number
  } & ModKeys
) => void

type StartHandler = (
  evt: {
    button: MouseButton
    x: number
    y: number
    relativeX: number
    relativeY: number
  } & ModKeys
) => void

type EndHandler = (evt: {
  button: MouseButton
  x: number
  y: number
  relativeX: number
  relativeY: number
}) => void

type TargetHandlers = {
  ref: ReturnType<typeof useRef<Element>>
  onDragStart?: StartHandler
  onDrag: MoveHandler
  onDragEnd?: EndHandler
}

const targetHandlers: Map<HTMLElement, TargetHandlers[]> = new Map()

let trackedDrag:
  | ({
      target: HTMLElement
      handlers: TargetHandlers[]
      viewOffsetX: number
      viewOffsetY: number
      startX: number
      startY: number
      button: MouseButton
      x: number
      y: number
    } & ModKeys)
  | null = null

const onMouseDown = (evt: MouseEvent) => {
  let target = evt.target as HTMLElement | null
  assert(target)
  do {
    const handlers = targetHandlers.get(target)
    if (handlers) {
      for (const handler of handlers) {
        if (trackedDrag) {
          trackedDrag.handlers.push(handler)
        } else {
          trackedDrag = {
            x: evt.clientX,
            y: evt.clientY,
            startX: evt.clientX,
            startY: evt.clientY,
            button: evt.button as MouseButton,
            viewOffsetX: state.viewOffset.x,
            viewOffsetY: state.viewOffset.y,
            target,
            handlers: [handler],
            ctrlKey: evt.ctrlKey,
            shiftKey: evt.shiftKey,
            altKey: evt.altKey,
          }
        }

        const { x, y } = target.getBoundingClientRect()
        handler.onDragStart?.({
          x: evt.clientX,
          y: evt.clientY,
          button: trackedDrag.button,
          relativeX: evt.clientX - x,
          relativeY: evt.clientY - y,
          ctrlKey: trackedDrag.ctrlKey,
          shiftKey: trackedDrag.shiftKey,
          altKey: trackedDrag.altKey,
        })
      }
    }
  } while ((target = target.parentElement))
}

const onMouseMove = (evt: MouseEvent) => {
  if (trackedDrag) {
    let deltaX = trackedDrag.x - evt.clientX
    let deltaY = trackedDrag.y - evt.clientY

    const { x, y } = trackedDrag.target.getBoundingClientRect()
    for (const handler of trackedDrag.handlers) {
      handler.onDrag({
        deltaX,
        deltaY,
        button: trackedDrag.button,
        relativeX: evt.clientX - x,
        relativeY: evt.clientY - y,
        ctrlKey: trackedDrag.ctrlKey,
        shiftKey: trackedDrag.shiftKey,
        altKey: trackedDrag.altKey,
      })
    }

    trackedDrag.x = evt.clientX
    trackedDrag.y = evt.clientY
  }
}

const onMouseUp = (evt: MouseEvent) => {
  if (trackedDrag) {
    const { x, y } = trackedDrag.target.getBoundingClientRect()
    for (const handler of trackedDrag.handlers) {
      handler.onDragEnd?.({
        x: evt.clientX,
        y: evt.clientY,
        button: trackedDrag.button,
        relativeX: evt.clientX - x,
        relativeY: evt.clientY - y,
      })
    }
  }
  trackedDrag = null
}

document.addEventListener('mousedown', onMouseDown)
document.addEventListener('mousemove', onMouseMove)
document.addEventListener('mouseup', onMouseUp)

const useMouseDrag = (handlers: TargetHandlers) => {
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

export default useMouseDrag
