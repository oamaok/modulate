import { h, Fragment, render, useEffect } from 'kaiku'
import { initializeAudio } from './audio'
import state, { patch } from './state'
import * as api from './api'
import * as auth from './auth'

import './reset.css'

import App from './components/app/App'

api.getIdentity().then((res) => {
  if (!res.error) {
    auth.set(res)
  }
})

/*
const initialize = async () => {
  await initializeAudio()

  const rawSaveState = localStorage.getItem('savestate')

  if (rawSaveState) {
    const { currentId, modules, knobs, sockets, cables } =
      JSON.parse(rawSaveState)
    patch.knobs = knobs
    patch.currentId = currentId
    patch.modules = modules

    state.initialized = true
    await new Promise((resolve) => requestAnimationFrame(resolve))
    patch.cables = cables
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

    localStorage.setItem('savestate', JSON.stringify(patch))
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
      <div className="patch-controls">
        <button onClick={() => api.saveNewPatch(patch)}>Save</button>
      </div>
    </>
  )
}

*/
render(<App />, document.body, state)
