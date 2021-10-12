import { h, Fragment } from 'kaiku'
import { moduleMap } from '../moduleMap'
import { addModule } from '../state'

const ModuleSelector = () => {
  return (
    <div className="module-selector">
      {Object.keys(moduleMap).map((module) => (
        <button onClick={() => addModule(module)}>{module}</button>
      ))}
    </div>
  )
}

export default ModuleSelector
