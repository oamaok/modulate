import { h, Fragment, useEffect } from 'kaiku'
import Header from '../header/Header'
import css from './App.css'
import UserBar from '../user-bar/UserBar'
import UtilityBox from '../utility-box/UtilityBox'
import ModuleSelector from '../module-selector/ModuleSelector'
import Patch from '../patch/Patch'
import Hint from '../hint/Hint'
import { initializeAudio } from '../../audio'
import state, { loadPatch, patch } from '../../state'
import * as types from '@modulate/common/types'
import * as api from '../../api'

const loadSaveState = async () => {
  const rawSaveState = localStorage.getItem('savestate')
  if (rawSaveState) {
    const savedPatch = JSON.parse(rawSaveState)
    loadPatch(savedPatch.metadata, savedPatch.patch)
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
      const patchVersion = await api.getLatestPatchVersion(state.route.patchId)

      if (!patchVersion) {
        history.replaceState({}, '', '/')
        loadSaveState()
      } else {
        loadPatch(patchVersion.metadata, patchVersion.patch)
      }

      break
    }
  }
}

const InitModal = () => {
  return (
    <div className={css('overlay')}>
      <div className={css('init-modal')}>
        Please adjust your audio levels before continuing. This application is
        capable of producing ear-busting sonic experiences.
        <button onClick={initialize}>I'm ready!</button>
      </div>
    </div>
  )
}

const App = () => {
  useEffect(() => {
    if (!state.initialized) return
    if (state.route.name !== 'index') return
    localStorage.setItem(
      'savestate',
      JSON.stringify({
        metadata: state.patchMetadata,
        patch,
      })
    )
  })

  return (
    <div
      className={css('app')}
      style={{
        backgroundPosition: () =>
          `${Math.round(state.viewOffset.x / 1.5)}px ${Math.round(
            state.viewOffset.y / 1.5
          )}px`,
      }}
    >
      {state.initialized && <Patch />}
      <Header />
      <UserBar />
      <ModuleSelector />
      <Hint />
      {state.initialized && <UtilityBox />}
      {!state.initialized && <InitModal />}
    </div>
  )
}

export default App
