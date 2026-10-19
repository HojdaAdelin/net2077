import { useEffect, useMemo, useRef, useState } from 'react';
import { activityDays, activityScale } from '../utils/activityChart';
import '../styles/DailyActivityChart.css';

const dateLabel = (date, full = false) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', ...(full ? { weekday: 'short' } : {}), timeZone: 'UTC',
});

export default function DailyActivityChart({ data }) {
  const [period, setPeriod] = useState(30);
  const [selectedDate, setSelectedDate] = useState(null);
  const [width, setWidth] = useState(640);
  const plotRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);
  const days = useMemo(() => activityDays(data, period), [data, period, today]);
  const selectedIndex = Math.max(0, selectedDate && days.some(day => day.date === selectedDate)
    ? days.findIndex(day => day.date === selectedDate) : days.length - 1);
  const selected = days[selectedIndex];
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const activeDays = days.filter(day => day.count > 0).length;
  const peak = Math.max(...days.map(day => day.count));
  const scale = activityScale(peak);
  const height = 220;
  const padding = { left: 38, right: 8, top: 14, bottom: 30 };
  const innerWidth = Math.max(1, width - padding.left - padding.right);
  const innerHeight = height - padding.top - padding.bottom;
  const baseline = padding.top + innerHeight;
  const step = innerWidth / days.length;
  const barWidth = Math.min(28, step * (period === 7 ? .52 : .64));
  const x = index => padding.left + step * (index + .5);
  const y = count => baseline - (count / scale.maximum) * innerHeight;
  const labelCount = width < 420 ? 3 : 5;
  const labelIndices = new Set(Array.from({ length: labelCount }, (_, index) =>
    Math.round(index * (days.length - 1) / (labelCount - 1))));

  useEffect(() => {
    const element = plotRef.current;
    const measure = () => setWidth(Math.max(1, element.getBoundingClientRect().width));
    measure();
    if (!('ResizeObserver' in window)) {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const selectAtPointer = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = (event.clientX - bounds.left) * width / bounds.width;
    const index = Math.max(0, Math.min(days.length - 1, Math.floor((localX - padding.left) / step)));
    setSelectedDate(days[index].date);
  };

  return (
    <div className="activity-chart-card">
      <div className="activity-chart-header">
        <div className="activity-chart-summary">
          <span className="activity-chart-total">{total.toLocaleString()}</span>
          <span className="activity-chart-total-label">questions solved</span>
          <p>{activeDays} active {activeDays === 1 ? 'day' : 'days'} <span aria-hidden="true">·</span> {(total / days.length).toLocaleString('en-GB', { maximumFractionDigits: 1 })} / day</p>
        </div>
        <div className="activity-chart-period" role="group" aria-label="Activity period">
          {[7, 30].map(value => (
            <button key={value} type="button" aria-pressed={period === value}
              onClick={() => { setPeriod(value); setSelectedDate(null); }}>
              {value} days
            </button>
          ))}
        </div>
      </div>

      <div className="activity-chart-readout" aria-live="polite" aria-atomic="true">
        <span>{selected.date === today ? 'Today' : dateLabel(selected.date, true)}</span>
        <strong>{selected.count.toLocaleString()} {selected.count === 1 ? 'question' : 'questions'}</strong>
      </div>

      <div ref={plotRef} className="activity-chart-plot" tabIndex={0} role="group"
        aria-label="Daily activity chart. Use the left and right arrow keys to select a day."
        onKeyDown={event => {
          let index = selectedIndex;
          if (event.key === 'ArrowLeft') index--;
          else if (event.key === 'ArrowRight') index++;
          else if (event.key === 'Home') index = 0;
          else if (event.key === 'End') index = days.length - 1;
          else return;
          event.preventDefault();
          setSelectedDate(days[Math.max(0, Math.min(days.length - 1, index))].date);
        }}>
        <svg viewBox={`0 0 ${width} ${height}`} height={height} aria-hidden="true"
          onPointerMove={event => { if (event.pointerType === 'mouse' || event.buttons) selectAtPointer(event); }}
          onPointerDown={selectAtPointer}>
          {[0, 1, 2, 3].map(index => {
            const value = scale.step * index;
            return (
              <g key={index}>
                <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} className="activity-chart-gridline" />
                <text x={padding.left - 10} y={y(value) + 4} textAnchor="end" className="activity-chart-axis">{value.toLocaleString('en-GB', { notation: 'compact' })}</text>
              </g>
            );
          })}
          <rect x={padding.left + selectedIndex * step} y={padding.top} width={step} height={innerHeight}
            rx={Math.min(6, step / 2)} className="activity-chart-selection" />
          {days.map((day, index) => (
            <g key={day.date}>
              <rect x={x(index) - barWidth / 2} y={day.count ? y(day.count) : baseline - 2}
                width={barWidth} height={day.count ? Math.max(2, baseline - y(day.count)) : 2}
                rx={Math.min(4, barWidth / 2)}
                className={`activity-chart-bar${index === selectedIndex ? ' is-selected' : ''}${!day.count ? ' is-empty' : ''}`} />
              {labelIndices.has(index) && (
                <text x={x(index)} y={height - 7}
                  textAnchor={index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle'}
                  className="activity-chart-axis">{dateLabel(day.date)}</text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="activity-chart-footer">
        <span>{dateLabel(days[0].date)} – {dateLabel(days[days.length - 1].date)}</span>
        <span>{total ? `Best day: ${peak.toLocaleString()}` : 'Your activity will appear as you solve questions.'}</span>
      </div>
    </div>
  );
}
