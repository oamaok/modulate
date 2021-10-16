import { h, useState } from 'kaiku'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import classNames from 'classnames/bind'
import styles from './ModuleSelector.css'
import { moduleMap } from '../../moduleMap'
import { addModule } from '../../state'

const css = classNames.bind(styles)

type SelectorState = {
  open: boolean
  filter: string
}

const ModuleList = ({ selectorState }: { selectorState: SelectorState }) => {
  if (!selectorState.open) {
    return null
  }

  const moduleNames = Object.keys(moduleMap).filter((name) =>
    name.toLowerCase().includes(selectorState.filter.toLowerCase())
  )

  return (
    <div className={css('module-list')}>
      {moduleNames.map((name) => (
        <button
          className={css('item')}
          onClick={() => {
            selectorState.open = false
            addModule(name)
          }}
        >
          {name}
        </button>
      ))}
      <div className={css('filter')}>
        filter
        <input
          type="text"
          value={selectorState.filter}
          onInput={(evt) => {
            selectorState.filter = evt.target.value
          }}
        />
      </div>
    </div>
  )
}

const ModuleSelector = () => {
  const selectorState = useState<SelectorState>({
    open: false,
    filter: '',
  })

  return (
    <MenuBar bottom left>
      <button
        onClick={() => {
          selectorState.open = !selectorState.open
        }}
      >
        + add module
      </button>
      <ModuleList selectorState={selectorState} />
    </MenuBar>
  )
}

export default ModuleSelector
