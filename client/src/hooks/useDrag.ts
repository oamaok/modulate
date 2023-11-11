import useTouchEvents from './useTouchEvents'
import useMouseDrag from './useMouseDrag'
import { useRef } from 'kaiku'

type Target = HTMLElement | SVGElement

type DragHandler = (evt: {
  relativeX: number
  relativeY: number
  deltaX: number
  deltaY: number
}) => void

type TapHandler = (evt: {
  x: number
  y: number
  relativeX: number
  relativeY: number
}) => void

type Props = {
  ref: ReturnType<typeof useRef<Target>>
  relativeToViewOffset?: boolean
  onDragStart?: TapHandler
  onDrag: DragHandler
  onDragEnd?: TapHandler
}

const useDrag = (props: Props) => {
  useTouchEvents(props)
  useMouseDrag(props)
}

export default useDrag
