import { useState, useRef } from 'kaiku'
import * as api from '../../api'
import * as auth from '../../auth'
import { closeOverlay } from '../../state'
import css from './LoginForm.css'
import assert from '../../assert'
import Input from '../input/Input'
import Overlay from '../overlay/Overlay'
import testAttributes from '../../test-attributes'

const LoginForm = () => {
  const state = useState<{ loading: boolean; error: null | string }>({
    loading: false,
    error: null,
  })
  const emailRef = useRef<HTMLInputElement>()
  const passwordRef = useRef<HTMLInputElement>()

  const onLogin = async () => {
    assert(emailRef.current)
    assert(passwordRef.current)
    state.loading = true
    state.error = null
    const email = emailRef.current.value
    const password = passwordRef.current.value

    const res = await api.login({ email, password })
    if ('error' in res) {
      state.error = 'Invalid credentials'
    } else {
      auth.set(res)
      closeOverlay()
    }

    state.loading = false
  }

  return (
    <>
      <div className={css('header')}>Login</div>
      <form
        className={css('form')}
        onSubmit={(evt: SubmitEvent) => {
          evt.preventDefault()
          onLogin()
        }}
      >
        <Input
          label="email"
          type="email"
          required
          inputRef={emailRef}
          {...testAttributes({ id: 'email' })}
        />

        <Input
          label="password"
          type="password"
          inputRef={passwordRef}
          minlength="8"
          maxlength="32"
          required
          error={state.error}
          disabled={state.loading}
          {...testAttributes({ id: 'password' })}
        />
        <button type="submit" {...testAttributes({ id: 'login-button' })}>
          Login
        </button>
      </form>
    </>
  )
}

const CreateAccountForm = () => {
  const state = useState<{ loading: boolean }>({ loading: false })
  const usernameRef = useRef<HTMLInputElement>()
  const emailRef = useRef<HTMLInputElement>()
  const passwordRef = useRef<HTMLInputElement>()

  const onCreateAccount = async () => {
    state.loading = true
    assert(usernameRef.current)
    assert(emailRef.current)
    assert(passwordRef.current)

    const username = usernameRef.current.value
    const email = emailRef.current.value
    const password = passwordRef.current.value

    const available = await checkAvailability()

    if (!available) {
      state.loading = false
      return
    }

    const res = await api.register({ username, email, password })

    if ('error' in res) {
      await checkAvailability()
    } else {
      auth.set(res)
      closeOverlay()
    }
    state.loading = false
  }

  const resetValidity = (evt: InputEvent) => {
    const target = evt.target as HTMLInputElement
    target.setCustomValidity('')
    target.reportValidity()
  }

  const checkAvailability = async () => {
    assert(usernameRef.current)
    assert(emailRef.current)

    const username = usernameRef.current.value
    const email = emailRef.current.value

    const res = await api.getCredentialsAvailability({ username, email })

    if (!res.email) {
      emailRef.current.setCustomValidity('This address is already in use')
    } else {
      emailRef.current.setCustomValidity('')
    }
    emailRef.current.reportValidity()

    if (!res.username) {
      usernameRef.current.setCustomValidity('This username is already in use')
    } else {
      usernameRef.current.setCustomValidity('')
    }
    usernameRef.current.reportValidity()

    return res.username && res.email
  }

  return (
    <>
      <div className={css('header')}>Create an account</div>
      <form
        className={css('form')}
        onSubmit={(evt: SubmitEvent) => {
          evt.preventDefault()
          onCreateAccount()
        }}
      >
        <Input
          label="username"
          type="text"
          minlength="3"
          maxlength="24"
          required
          inputRef={usernameRef}
          onInput={resetValidity}
          {...testAttributes({ id: 'username' })}
        />

        <Input
          label="email"
          type="email"
          required
          inputRef={emailRef}
          onInput={resetValidity}
          {...testAttributes({ id: 'email' })}
        />

        <Input
          label="password"
          type="password"
          inputRef={passwordRef}
          required
          minlength="8"
          maxlength="64"
          disabled={state.loading}
          onInput={resetValidity}
          {...testAttributes({ id: 'password' })}
        />
        <button
          type="submit"
          {...testAttributes({ id: 'create-account-button' })}
        >
          Create account
        </button>
      </form>
    </>
  )
}

const Form = () => {
  const state = useState<{ form: 'login' | 'create-account' }>({
    form: 'login',
  })

  return (
    <Overlay className={css('login-form')}>
      <button className={css('close-button')} onClick={closeOverlay}>
        ×
      </button>
      {state.form === 'login' ? <LoginForm /> : <CreateAccountForm />}
      <div className={css('alt-actions')}>
        <button
          {...testAttributes({ id: state.form + '-link' })}
          onClick={() => {
            if (state.form === 'login') {
              state.form = 'create-account'
            } else {
              state.form = 'login'
            }
          }}
        >
          {state.form === 'login' ? 'Create an account' : 'Login'}
        </button>
      </div>
    </Overlay>
  )
}

export default Form
