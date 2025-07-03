import useTouchEvents from './useTouchEvents'
import useMouseDrag from './useMouseDrag'

type Props = Parameters<typeof useTouchEvents>[0] &
  Parameters<typeof useMouseDrag>[0]

const useDrag = (props: Props) => {
  useTouchEvents(props)
  useMouseDrag(props)
}

export default useDrag
