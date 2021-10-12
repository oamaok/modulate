import { h, Fragment } from 'kaiku'
import state from '../state'
import { Id } from '../types'
import { moduleMap } from '../moduleMap'

const Modules = () => {
  return (
    <>
      {Object.keys(state.modules).map((id: string) => {
        const Component: any =
          moduleMap[state.modules[id as Id].name as keyof typeof moduleMap]
        return <Component id={id} />
      })}
    </>
  )
}

export default Modules
