import { useEffect, useId } from 'react'
import Icon from './Icon'

/**
 * Centred modal card: full-screen near-black scrim with blur, bordered header
 * (title + optional subtitle + close button), padded body, bordered footer with
 * right-aligned actions. Escape and scrim click dismiss.
 *
 * Pass `as="form"` + `onSubmit` to make the whole card a form.
 */
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'max-w-md',
  as = 'div',
  ...rest
}) {
  const titleId = useId()

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Card = as

  return (
    <div className="modal-scrim" onClick={() => onClose?.()}>
      <Card
        className={`modal-card ${width}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...rest}
      >
        <div className="modal-head">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-semibold text-ink-primary">{title}</h3>
            {subtitle && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{subtitle}</p>}
          </div>
          <button type="button" className="btn-icon -mr-1 -mt-1" onClick={() => onClose?.()} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-foot">{footer}</div>}
      </Card>
    </div>
  )
}
