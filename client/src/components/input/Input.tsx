import { useRef } from 'kaiku'
import css from './Input.css'

type Props = {
  label: string
  description?: string
  error?: string | null

  inputRef?: ReturnType<typeof useRef<HTMLInputElement>>
  type?: HTMLInputElement['type']
  minLength?: number
  maxLength?: number
} & Record<string, any>

const Input = ({
  label,
  description,
  error,
  inputRef,
  minLength,
  maxLength,
  type,
  ...rest
}: Props) => {
  return (
    <div className={css('input')}>
      <label>{label}</label>
      <input
        type={type}
        ref={inputRef}
        minlength={minLength}
        maxlength={maxLength}
        {...rest}
      />
      {error ? <div className={css('error')}>{error}</div> : null}
      {description ? (
        <div className={css('description')}>{description}</div>
      ) : null}
    </div>
  )
}

export default Input
