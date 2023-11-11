import { render, useEffect } from 'kaiku'
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

useEffect(() => {
  document.body.style.height = `${state.viewport.height}px`
  document.documentElement.style.height = `${state.viewport.height}px`
})

render(<App />, document.body, state)
