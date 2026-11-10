import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Monitor, X } from 'lucide-react';
import { lockModalScroll } from '../utils/modalScrollLock';

const DISMISSED_KEY = 'net2077-course-screen-notice';

export default function NetworkCourseScreenNotice() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const dismissed = useRef(false);

  useEffect(() => {
    try { dismissed.current = sessionStorage.getItem(DISMISSED_KEY) === 'dismissed'; } catch { /* Still dismissible when storage is unavailable. */ }
    const media = window.matchMedia('(max-width: 1000px)');
    const update = () => setOpen(media.matches && !dismissed.current);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const releaseScroll = lockModalScroll();
    dialog.showModal();
    return () => { dialog.close(); releaseScroll(); };
  }, [open]);

  const dismiss = () => {
    dismissed.current = true;
    try { sessionStorage.setItem(DISMISSED_KEY, 'dismissed'); } catch { /* Keep the current page usable without storage. */ }
    setOpen(false);
  };

  if (!open) return null;
  return <dialog ref={dialogRef} className="nc-screen-notice" aria-labelledby="nc-screen-notice-title" aria-describedby="nc-screen-notice-description" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <div className="nc-screen-notice-top"><span><Monitor size={23} /></span><button type="button" aria-label="Close screen recommendation" onClick={dismiss}><X size={19} /></button></div>
    <span className="nc-kicker">BEFORE YOU START</span>
    <h2 id="nc-screen-notice-title">Best experienced<br />on a larger screen.</h2>
    <p id="nc-screen-notice-description">For the best course experience, use a laptop or desktop. A larger screen gives you more room to build networks, follow the guided explanations and configure devices side by side.</p>
    <p className="nc-screen-notice-note">You can still continue on this device. Your progress will be saved to your account.</p>
    <button type="button" className="nc-primary" onClick={dismiss}>Continue on this device<ArrowRight size={16} /></button>
  </dialog>;
}
