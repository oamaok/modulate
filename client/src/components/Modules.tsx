import { h, Fragment } from 'kaiku'
import { patch } from '../state'
import { moduleMap } from '../moduleMap'

const Modules = () => {
  return (
    <>
      {Object.keys(patch.modules).map((id: string) => {
        const Component: any =
          moduleMap[patch.modules[id].name as keyof typeof moduleMap]
        return <Component id={id} />
      })}
    </>
  )
}

export default Modules
