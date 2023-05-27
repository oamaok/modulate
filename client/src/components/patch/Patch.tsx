import { h, Fragment, useState, useEffect, useRef, unwrap } from 'kaiku'
import state, { patch } from '../../state'
import { moduleMap } from '../../moduleMap'
import Cables from './Cables'

import css from './Patch.css'

const Patch = () => {
  return (
    <div className={css('patch')}>
      <Cables />
      <div
        style={{
          transform: `translate(${state.viewOffset.x}px, ${state.viewOffset.y}px)`,
        }}
      >
        {Object.keys(patch.modules).map((id: string) => {
          const Component: any =
            moduleMap[patch.modules[id].name as keyof typeof moduleMap]
          return <Component key={id} id={id} />
        })}
      </div>
    </div>
  )
}

export default Patch
