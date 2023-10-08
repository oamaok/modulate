import css from './Overlay.css'
import { closeOverlay } from '../../state'
import { FC } from 'kaiku'
import testAttributes from '../../test-attributes'

type OverlayProps = {
  className?: string
  showCloseButton?: boolean
}

const Overlay: FC<OverlayProps> = ({
  className = '',
  showCloseButton = true,
  children,
}) => {
  return (
    <div className={css('overlay')} {...testAttributes({ id: 'overlay' })}>
      <div className={[css('modal'), className]}>
        {showCloseButton ? (
          <button
            className={css('close-button')}
            onClick={closeOverlay}
            {...testAttributes({ id: 'close-modal' })}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export default Overlay
