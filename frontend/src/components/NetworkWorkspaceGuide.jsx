import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Cable, Check, CircleHelp, FlaskConical, LayoutPanelLeft, MousePointer2, Settings2, X } from 'lucide-react';
import { workspaceGuidePosition } from '../utils/workspaceGuidePosition';
import '../styles/NetworkWorkspaceGuide.css';

export default function NetworkWorkspaceGuide({ libraryRef, toolbarRef, canvasRef, inspectorRef, devicesEditable, cablesEditable, onTabChange, onClose }) {
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const dialogRef = useRef(null), cardRef = useRef(null);
  const id = useId().replace(/:/g, '');
  const steps = [
    { ref: libraryRef, icon: LayoutPanelLeft, title: devicesEditable ? 'Your device library' : 'Your lab devices', label: 'DEVICES',
      text: devicesEditable ? 'Add a PC, router, switch or server from this panel. Each device appears on the canvas, ready to connect and configure.' : 'Select a device from the list to inspect it. Editable devices can be configured; preset configurations stay locked for this lab.',
      tip: devicesEditable ? 'Start small: two PCs and a switch make a simple LAN.' : 'Read the lab mission and objectives to see what needs to change.' },
    { ref: toolbarRef, scroll: 'start', icon: Cable, title: 'Tools within reach', label: 'TOOLBAR',
      text: 'Switch between Select, Cable and Simulate. Open the Address table to compare interface settings. Undo and Redo restore your last workspace changes; zoom and Fit view help you navigate.',
      tip: cablesEditable ? 'Choose Cable, then click a free port on each of two devices.' : 'This lab has preset connections. Focus on the editable device settings.' },
    { ref: canvasRef, icon: MousePointer2, title: 'Build and explore here', label: 'CANVAS',
      text: 'This is your network topology. Drag devices to arrange them, drag the background to pan, and select a device or cable to inspect it. Simulated packets travel along these connections.',
      tip: 'Double-click an editable device to configure it. A complete drag counts as one Undo step.' },
    { ref: inspectorRef, tab: 'device', icon: Settings2, title: 'Inspect your configuration', label: 'DEVICE PANEL',
      text: 'The Device tab shows the selected device or cable. Review interfaces, IP addresses and connections, then open Configure to edit the settings available for that device.',
      tip: 'Nothing selected? Choose a device on the canvas or in the device list.' },
    { ref: inspectorRef, tab: 'simulation', icon: FlaskConical, title: 'Test and follow the packet', label: 'SIMULATION PANEL',
      text: 'Choose a source device and run Ping, DNS, HTTP or DHCP. Inspect the result and use playback to follow each step, including the point where traffic is blocked.',
      tip: 'Start with Ping to an IP address, then test DNS and HTTP. DHCP applies settings to an editable end device.' },
  ];
  const step = steps[index];
  const Icon = step.icon;

  useEffect(() => {
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    const originalScroll = { left: window.scrollX, top: window.scrollY, behavior: 'instant' };
    const scrollContainers = [];
    for (let element = dialog.parentElement; element && element !== document.body; element = element.parentElement) {
      if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
        scrollContainers.push({ element, left: element.scrollLeft, top: element.scrollTop });
      }
    }
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      for (const { element, left, top } of scrollContainers) element.scrollTo({ left, top, behavior: 'instant' });
      window.scrollTo(originalScroll);
    };
  }, []);

  useLayoutEffect(() => {
    setPosition(null);
    if (step.tab) onTabChange(step.tab);
    const target = step.ref.current;
    if (!target) return;
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!cardRef.current) return;
        const navbarBottom = document.querySelector('.navbar')?.getBoundingClientRect().bottom || 0;
        setPosition(workspaceGuidePosition(target.getBoundingClientRect(), cardRef.current.getBoundingClientRect(), {
          width: document.documentElement.clientWidth, height: window.innerHeight, top: Math.max(12, navbarBottom + 8),
        }));
      });
    };
    const scrollFrame = requestAnimationFrame(() => {
      target.scrollIntoView({ block: step.scroll || 'center', inline: 'nearest', behavior: 'instant' });
      measure();
    });
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    observer.observe(cardRef.current);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [index, libraryRef, toolbarRef, canvasRef, inspectorRef, onTabChange]);

  const next = () => index === steps.length - 1 ? onClose() : setIndex(value => value + 1);
  const highlight = position?.highlight;
  return <dialog ref={dialogRef} className="nl-guide-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} onKeyDown={event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); next(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); setIndex(value => Math.max(0, value - 1)); }
    }}>
    {highlight ? <>
      <div className="nl-guide-shade" style={{ top: 0, left: 0, right: 0, height: highlight.top }} />
      <div className="nl-guide-shade" style={{ top: highlight.top, left: 0, width: highlight.left, height: highlight.height }} />
      <div className="nl-guide-shade" style={{ top: highlight.top, left: highlight.left + highlight.width, right: 0, height: highlight.height }} />
      <div className="nl-guide-shade" style={{ top: highlight.top + highlight.height, left: 0, right: 0, bottom: 0 }} />
      <div className="nl-guide-spotlight" style={highlight} />
      <svg className="nl-guide-arrow" aria-hidden="true"><defs><marker id={`${id}-arrow`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L6 3.5L0 7" /></marker></defs><path d={`M${position.start.x} ${position.start.y} L${position.end.x} ${position.end.y}`} markerEnd={`url(#${id}-arrow)`} /></svg>
    </> : <div className="nl-guide-shade nl-guide-shade-full" />}
    <section ref={cardRef} className="nl-guide-card" style={position ? position.card : { left: 12, top: 12, visibility: 'hidden' }}>
      <div className="nl-guide-card-top"><span><CircleHelp size={14} />QUICK GUIDE</span><button type="button" aria-label="Close Quick Guide" onClick={onClose}><X size={18} /></button></div>
      <div className="nl-guide-step-heading"><span className="nl-guide-icon"><Icon size={20} /></span><div><small>{step.label}</small><h2 id={`${id}-title`}>{step.title}</h2></div></div>
      <div aria-live="polite" aria-atomic="true"><p id={`${id}-description`}>{step.text}</p><p className="nl-guide-tip">{step.tip}</p></div>
      <div className="nl-guide-progress" aria-label={`Step ${index + 1} of ${steps.length}`}><div>{steps.map((item, number) => <span key={item.label} className={number <= index ? 'is-active' : ''} />)}</div><span>{index + 1} / {steps.length}</span></div>
      <footer><button type="button" className="nl-guide-back" disabled={index === 0} onClick={() => setIndex(value => value - 1)}><ArrowLeft size={14} />Back</button><button type="button" className="nl-guide-next" onClick={next}>{index === steps.length - 1 ? <>Got it<Check size={15} /></> : <>Next<ArrowRight size={15} /></>}</button></footer>
    </section>
  </dialog>;
}
