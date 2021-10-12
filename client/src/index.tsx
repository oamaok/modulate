import { h, Fragment, render, useEffect } from 'kaiku'
import { initializeAudio } from './audio'
import Cables from './components/Cables'
import Modules from './components/Modules'
import ModuleSelector from './components/ModuleSelector'
import state from './state'
import * as api from './api'

const initialize = async () => {
  await initializeAudio()

  const rawSaveState = localStorage.getItem('savestate')

  if (rawSaveState) {
    const { currentId, modules, knobs, sockets, cables } =
      JSON.parse(rawSaveState)
    state.knobs = knobs
    state.currentId = currentId
    state.modules = modules
    state.sockets = sockets

    state.initialized = true
    await new Promise((resolve) => requestAnimationFrame(resolve))
    state.cables = cables
  } else {
    state.initialized = true
  }
}

api.getIdentity().then(({ token }) => {
  console.log(token)
  localStorage.setItem('token', token)
})

const App = () => {
  useEffect(() => {
    if (!state.initialized) return

    const { currentId, modules, knobs, sockets, cables } = state

    localStorage.setItem(
      'savestate',
      JSON.stringify({
        currentId,
        modules,
        knobs,
        sockets,
        cables,
      })
    )
  })

  if (!state.initialized) {
    return (
      <button className="launch-button" onClick={initialize}>
        Start
      </button>
    )
  }

  return (
    <>
      <ModuleSelector />
      <Modules />
      <Cables />
    </>
  )
}

render(<App />, document.body, state)
