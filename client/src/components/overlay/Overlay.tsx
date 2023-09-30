import css from './Overlay.css'
import { closeOverlay } from '../../state'
import { FC } from 'kaiku'

type OverlayProps = {
  className?: string
  showCloseButton?: boolean
}

const Overlay: FC<OverlayProps> = ({
  className,
  showCloseButton = true,
  children,
}) => {
  return (
    <div className={css('overlay')}>
      <div className={[css('modal'), className]}>
        {showCloseButton ? (
          <button className={css('close-button')} onClick={closeOverlay}>
            ×
          </button>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export default Overlay
