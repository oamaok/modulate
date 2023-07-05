import { h, Fragment, render, useEffect } from 'kaiku'
import state, { deleteModule } from './state'
import * as api from './api'
import * as auth from './auth'

import './reset.css'

import App from './components/app/App'
import { joinRoom, leaveRoom } from './rooms'

api.getIdentity().then((res) => {
  if (!res.error) {
    auth.set(res)
  }
})

document.addEventListener('keydown', (evt) => {
  switch (evt.code) {
    case 'Delete': {
      const element = evt.target as HTMLElement
      if (state.activeModule && element.tagName !== 'input') {
        deleteModule(state.activeModule)
        state.activeModule = null
      }
    }
  }
})

render(<App />, document.body, state)
