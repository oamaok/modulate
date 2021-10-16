import { h, useEffect, useState } from 'kaiku'
import state from '../../state'
import * as api from '../../api'
import * as auth from '../../auth'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import classNames from 'classnames/bind'
import styles from './user-bar.css'

const css = classNames.bind(styles)

const SignUp = ({ open }: { open: boolean }) => {
  const signUpState = useState({
    loading: false,
    email: '',
    username: '',
    password: '',

    availability: {
      username: true,
      email: true,
    },
  })

  useEffect(() => {
    api
      .getCredentialsAvailability({
        username: signUpState.username,
        email: signUpState.email,
      })
      .then((availability) => {
        signUpState.availability = availability
      })
  })

  const register = async (evt: SubmitEvent) => {
    evt.preventDefault()
    signUpState.loading = true
    const res = await api.register({
      email: signUpState.email,
      username: signUpState.username,
      password: signUpState.password,
    })

    signUpState.loading = false

    auth.set(res)
  }

  if (!open) {
    return null
  }

  return (
    <form
      className={css('sign-up', { loading: signUpState.loading })}
      onSubmit={register}
    >
      <div className={css('field')}>
        email
        <input
          required
          type="email"
          value={signUpState.email}
          onInput={(evt) => {
            signUpState.email = evt.target.value
          }}
        />
      </div>
      {!signUpState.availability.email && (
        <div className={css('error')}>Email is already in use.</div>
      )}
      <div className={css('field')}>
        username
        <input
          required
          type="text"
          value={signUpState.username}
          onInput={(evt) => {
            signUpState.username = evt.target.value
          }}
        />
      </div>
      {!signUpState.availability.username && (
        <div className={css('error')}>Username is already in use.</div>
      )}
      <div className={css('field')}>
        password
        <input
          required
          type="password"
          value={signUpState.password}
          onInput={(evt) => {
            signUpState.password = evt.target.value
          }}
        />
      </div>
      <button type="submit">sign up</button>
    </form>
  )
}

const Login = ({ open }: { open: boolean }) => {
  const loginState = useState({
    loading: false,
    failed: false,
    email: '',
    password: '',
  })

  const login = async (evt) => {
    evt.preventDefault()
    const { email, password } = loginState
    loginState.failed = false
    loginState.loading = true
    const res = await api.login({
      email,
      password,
    })

    if (res) {
      auth.set(res)
    } else {
      loginState.failed = true
    }
    loginState.loading = false
  }

  if (!open) {
    return null
  }

  return (
    <form
      className={css('login', { loading: loginState.loading })}
      onSubmit={login}
    >
      <div className={css('field')}>
        email
        <input
          required
          type="email"
          value={loginState.email}
          onInput={(evt) => {
            loginState.email = evt.target.value
          }}
        />
      </div>
      <div className={css('field')}>
        password
        <input
          required
          type="password"
          value={loginState.password}
          onInput={(evt) => {
            loginState.password = evt.target.value
          }}
        />
      </div>
      {loginState.failed && (
        <div className={css('error')}>Invalid credentials.</div>
      )}
      <button type="submit">login</button>
    </form>
  )
}

const UserBar = () => {
  const userBarState = useState({
    loginOpen: false,
    signUpOpen: false,
  })

  if (state.user) {
    return (
      <MenuBar top right>
        <span>
          logged in as <b>{state.user.username}</b>
        </span>
        <VerticalDivider />
        <button onClick={() => {}}>settings</button>
        <VerticalDivider />
        <button onClick={auth.reset}>logout</button>
      </MenuBar>
    )
  }

  return (
    <MenuBar top right>
      <span>currently not logged in</span>
      <VerticalDivider />
      <button
        onClick={() => {
          userBarState.loginOpen = false
          userBarState.signUpOpen = !userBarState.signUpOpen
        }}
      >
        sign up
      </button>
      <VerticalDivider />
      <button
        onClick={() => {
          userBarState.signUpOpen = false
          userBarState.loginOpen = !userBarState.loginOpen
        }}
      >
        log in
      </button>

      <Login open={userBarState.loginOpen} />
      <SignUp open={userBarState.signUpOpen} />
    </MenuBar>
  )
}

export default UserBar
