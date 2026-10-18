import { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3, LayoutDashboard, Palette, Terminal, Trophy } from 'lucide-react';

export default function ProgressNavigation({ hasProfile, hasLinuxOverview, hasSimulations }) {
  const navRef = useRef(null);
  const [activeSection, setActiveSection] = useState('progress-general');
  const sections = [
    { id: 'progress-general', label: 'General', Icon: LayoutDashboard },
    ...(hasProfile ? [{ id: 'progress-profile', label: 'Profile', Icon: Palette }] : []),
    { id: 'progress-categories', label: 'Progress by Category', Icon: BarChart3 },
    { id: 'progress-activity', label: 'Daily Activity', Icon: Activity },
    ...(hasLinuxOverview ? [{ id: 'progress-linux', label: 'Linux Overview', Icon: Terminal }] : []),
    ...(hasSimulations ? [{ id: 'progress-simulations', label: 'Simulations', Icon: Trophy }] : []),
  ];

  useEffect(() => {
    const nav = navRef.current;
    const page = nav.closest('.progress-page');
    const ids = ['progress-general', ...(hasProfile ? ['progress-profile'] : []),
      'progress-categories', 'progress-activity', ...(hasLinuxOverview ? ['progress-linux'] : []),
      ...(hasSimulations ? ['progress-simulations'] : [])];
    let frame;
    const updateActive = () => {
      const top = nav.getBoundingClientRect().bottom + 24;
      let active = ids[0];
      for (const id of ids) {
        if (document.getElementById(id)?.getBoundingClientRect().top <= top) active = id;
      }
      setActiveSection(active);
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActive);
    };
    const resize = new ResizeObserver(() => {
      page.style.setProperty('--progress-nav-height', `${nav.offsetHeight}px`);
      scheduleUpdate();
    });
    resize.observe(nav);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();
    return () => {
      resize.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      page.style.removeProperty('--progress-nav-height');
    };
  }, [hasProfile, hasLinuxOverview, hasSimulations]);

  const navigateTo = (event, id) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior:
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    setActiveSection(id);
  };

  return (
    <nav ref={navRef} className="progress-section-nav" aria-label="Progress sections">
      {sections.map(({ id, label, Icon }) => (
        <a key={id} href={`#${id}`} className="progress-section-link"
          aria-current={activeSection === id ? 'location' : undefined}
          onClick={(event) => navigateTo(event, id)}>
          <Icon size={16} aria-hidden="true" /><span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
