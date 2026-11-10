let locks = 0;
let originalOverflow;

// A walkthrough may be opened over a settings dialog. Restore scrolling only
// after both dialogs have released their locks, regardless of cleanup order.
export function lockModalScroll() {
  if (locks++ === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) document.body.style.overflow = originalOverflow;
  };
}
