import { h, unwrap, useEffect, useRef, useState } from 'kaiku'
import classNames from 'classnames/bind'
import styles from './ModuleSelector.css'
import { moduleMap } from '../../moduleMap'
import { addModule } from '../../state'

const css = classNames.bind(styles)

type SelectorState = {
  open: boolean
  filter: string
}

const ModuleSelector = () => {
  const selectorState = useState<SelectorState>({
    open: false,
    filter: '',
  })

  const filterRef = useRef<HTMLInputElement>()

  const moduleNames = Object.keys(moduleMap).filter((name) =>
    name.toLowerCase().includes(selectorState.filter.toLowerCase())
  )

  useEffect(() => {
    const toggle = (evt: KeyboardEvent) => {
      if (evt.code === 'Escape') {
        selectorState.open = false
        filterRef.current!.blur()
      }

      if (evt.code === 'Enter') {
        if (evt.target === document.body) {
          selectorState.open = true
          selectorState.filter = ''
          filterRef.current!.focus()
        } else if (
          selectorState.open &&
          evt.target === unwrap(filterRef.current!)
        ) {
          const moduleNames = Object.keys(moduleMap).filter((name) =>
            name.toLowerCase().includes(selectorState.filter.toLowerCase())
          )
          if (moduleNames.length === 1) {
            filterRef.current!.blur()
            selectorState.open = false

            addModule(moduleNames[0])
          }
        }
      }
    }

    document.addEventListener('keydown', toggle)
    return () => document.removeEventListener('keydown', toggle)
  })

  return (
    <div className={css('module-selector', { open: selectorState.open })}>
      <div className={css('filter')}>
        Filter
        <input
          type="text"
          ref={filterRef}
          value={selectorState.filter}
          onInput={(evt) => {
            selectorState.filter = evt.target.value
          }}
        />
      </div>
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
      </div>
    </div>
  )
}

export default ModuleSelector
