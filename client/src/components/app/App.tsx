import { h, Fragment, useEffect } from 'kaiku'
import Header from '../header/Header'
import classNames from 'classnames/bind'
import styles from './app.css'
import UserBar from '../user-bar/user-bar'
import ModuleSelector from '../module-selector/ModuleSelector'
import Patch from '../patch/Patch'
import Hint from '../hint/Hint'
import { initializeAudio } from '../../audio'
import state, { patch } from '../../state'
import * as types from '../../../../common/types'
import * as api from '../../api'

const css = classNames.bind(styles)

const loadSaveState = async () => {
  const rawSaveState = localStorage.getItem('savestate')
  if (rawSaveState) {
    loadPatch(JSON.parse(rawSaveState))
  } else {
    state.initialized = true
  }
}

const initialize = async () => {
  await initializeAudio()

  switch (state.route.name) {
    case 'index': {
      await loadSaveState()
      break
    }

    case 'patch': {
      const patch = await api.getLatestPatchVersion(state.route.patchId)

      if (!patch) {
        history.replaceState({}, '', '/')
        loadSaveState()
      } else {
        loadPatch(patch.patch)
      }

      break
    }
  }
}

const loadPatch = async (savedPatch: types.Patch) => {
  const { currentId, modules, knobs, cables } = savedPatch
  patch.knobs = knobs
  patch.currentId = currentId
  patch.modules = modules
  state.initialized = true
  await new Promise((resolve) => requestAnimationFrame(resolve))
  patch.cables = cables
}

const App = () => {
  useEffect(() => {
    if (!state.initialized) return
    if (state.route.name !== 'index') return
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
      <Patch />
      <Header />
      <UserBar />
      <ModuleSelector />
      <Hint />
    </>
  )
}

export default App
