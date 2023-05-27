import { User } from '@modulate/common/types'
import state from './state'

export const get = () => {
  return localStorage.getItem('authorization')
}

export const set = ({ user, token }: { user: User; token: string }) => {
  localStorage.setItem('authorization', token)
  state.user = user
}

export const reset = () => {
  localStorage.removeItem('authorization')
  state.user = null
}
