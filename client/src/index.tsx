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

render(<App />, document.body, state)
