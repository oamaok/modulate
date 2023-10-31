import { render } from 'kaiku'
import state, { deleteModule } from './state'
import * as api from './api'
import * as auth from './auth'

import './reset.css'

import App from './components/app/App'

if (__DEBUG__) {
  window.addEventListener('unhandledrejection', (evt) => {
    api.sendError(evt.reason)
  })

  window.addEventListener('error', (evt) => {
    api.sendError(evt.error)
  })
}

api.getIdentity().then((res) => {
  if (!res.error) {
    auth.set(res)
  }
})

// Prevent user zooming on mobile devices
document.addEventListener('gesturestart', (evt) => {
  evt.preventDefault()
})

document.body.style.height = `${window.innerHeight}px`
document.documentElement.style.height = `${window.innerHeight}px`

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
