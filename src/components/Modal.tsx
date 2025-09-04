import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen?: boolean; // prefer explicit isOpen, but accept old `open` prop
  open?: boolean;
  title?: string;
  onClose: () => void; // parent should set isOpen=false when this is called
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, open, title, onClose, children }) => {
  const show = Boolean(isOpen ?? open);
  const [shouldRender, setShouldRender] = React.useState(show);
  const [isClosing, setIsClosing] = React.useState(false);
  const modalRef = React.useRef<HTMLDivElement | null>(null);

  const ANIM_MS = 150;

  // Keep mounted while animating out
  React.useEffect(() => {
    if (show) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      // start closing animation
      setIsClosing(true);
      const t = setTimeout(() => {
        setIsClosing(false);
        setShouldRender(false);
      }, ANIM_MS);
      return () => clearTimeout(t);
    }
    return;
  }, [show]);

  React.useEffect(() => {
    if (!show) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && modalRef.current) {
        // Simple focus trap
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          (last as HTMLElement).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement).focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  React.useEffect(() => {
    if (!show) return;
    // lock scroll
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.style.position = 'fixed';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, [show]);

  React.useEffect(() => {
    if (!show || !modalRef.current) return;
    // focus first focusable element
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }
  }, [show]);

  if (!shouldRender) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`absolute inset-0 bg-black ${isClosing ? 'opacity-0 transition-opacity duration-150' : 'opacity-50'}`} onClick={onClose}></div>
      <div
        ref={modalRef}
        className={`bg-white rounded-lg shadow-lg z-10 max-w-2xl w-full p-6 transform transition-all duration-150 ease-out ${isClosing ? 'scale-98 opacity-0' : 'scale-100 opacity-100'}`}
        style={{ animation: isClosing ? undefined : `modal-in ${ANIM_MS}ms ease-out` }}
      >
        {title && <h2 id="modal-title" className="text-xl font-semibold mb-4">{title}</h2>}
        <div>
          {children}
        </div>
      </div>
      <style>{`@keyframes modal-in { from { transform: translateY(-8px) scale(.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }`}</style>
    </div>,
    document.body
  );
};

export default Modal;
