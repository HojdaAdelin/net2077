import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import '../styles/AcadnetPreparation.css';

const SUBJECTS = [
  { id: 'linux', label: 'Linux', track: 'Calculatoare', topics: 'CLI / GUI / File systems',
    links: [{ to: '/grile?filter=linux', title: 'Practice questions' }, { to: '/learn/roadmap/69bff0909aa18fbfacf3a844', title: 'Linux roadmap' }] },
  { id: 'network', label: 'Networking', track: 'Re\u021belistic\u0103', topics: 'Protocols / Routing / Infrastructure',
    links: [{ to: '/grile?filter=network', title: 'Practice questions' }] },
  { id: 'debug', label: 'Debugging', track: 'IS', topics: 'Code / Logic / Problem solving',
    links: [{ to: '/is', title: 'Debug challenges' }] }
];

const EXAMS = [
  { to: '/exam/acadnet2026local_11_12', year: '2026', phase: 'Local', title: 'AcadNet Calculatoare 2026', questions: '50 questions', difficulty: 'Medium' },
  { to: '/exam/acadnet2026county_11_12', year: '2026', phase: 'County', title: 'AcadNet Calculatoare 2026', questions: '50 questions', difficulty: 'Medium' },
  { to: '/exam/acadnet2023national_11_12', year: '2023', phase: 'National', title: 'AcadNet Calculatoare 2023', questions: '50 questions', difficulty: 'Hard' },
  { to: '/exam/acadnet2026national_11_12', year: '2026', phase: 'National', title: 'AcadNet Calculatoare 2026', questions: '30 questions', difficulty: 'Hard' }
];

function SubjectIllustration({ subject }) {
  if (subject === 'linux') return <div className="acad-route-art acad-shell" aria-hidden="true">
    <div className="acad-shell-path">~/acadnet</div>
    <div className="acad-shell-command"><span>$</span> ls -l</div>
    <div className="acad-shell-output"><span>drwxr-xr-x</span> notes/</div>
    <div className="acad-shell-output"><span>-rw-r--r--</span> roadmap.md</div>
    <div className="acad-shell-command"><span>$</span><i /></div>
  </div>;
  if (subject === 'network') return <div className="acad-route-art acad-network" aria-hidden="true">
    <svg viewBox="0 0 300 180" fill="none">
      <path className="acad-net-wire" d="M30 90H145V35H265M145 90H265M145 90V145H265" />
      <path className="acad-net-flow" d="M30 90H145V35H265" />
      <circle className="acad-net-node" cx="30" cy="90" r="7" />
      <rect className="acad-net-hub" x="133" y="78" width="24" height="24" rx="4" />
      <path className="acad-net-hub-mark" d="M140 86h10m-10 8h10" />
      {[35, 90, 145].map(y => <circle key={y} className="acad-net-node" cx="265" cy={y} r="5" />)}
      <text x="12" y="117">host</text><text x="120" y="122">router</text><text x="230" y="22">192.168.1.0/24</text>
    </svg>
  </div>;
  return <div className="acad-route-art acad-code" aria-hidden="true">
    <div><span>01</span><code>{'int sum = 0;'}</code></div>
    <div className="acad-code-removed"><span>02</span><code>{'for (i = 0; i <= n; ++i)'}</code></div>
    <div className="acad-code-fixed"><span>02</span><code>{'for (i = 0; i < n; ++i)'}</code></div>
    <div><span>03</span><code>{'    sum += values[i];'}</code></div>
    <div><span>04</span><code>{'return sum;'}</code></div>
  </div>;
}

export default function AcadnetPreparation() {
  return <section className="h-section acad-prep" id="prepare-acadnet">
    <div className="h-container">
          <div className="acad-prep-header">
            <h2 className="h-section-title">Prepare for AcadNet</h2>
            <p className="h-section-sub acad-prep-description">
              Net2077 offers a variety of questions from all possible chapters in Linux (AcadNet - Calculatoare), Network (AcadNet - Rețelistică) and Debugging (AcadNet - IS)
            </p>
          </div>

      <div className="acad-routes">
        {SUBJECTS.map(subject => <article className={`acad-route acad-route-${subject.id}`} key={subject.id}>
          <div className="acad-route-heading"><span>{subject.label}</span><h3>{subject.track}</h3></div>
          <SubjectIllustration subject={subject.id} />
          <p className="acad-route-topics">{subject.topics}</p>
          <div className="acad-route-links">{subject.links.map((link, index) => <Link key={link.to} to={link.to} className={index === 0 ? 'acad-route-primary' : undefined}>{link.title}<ArrowUpRight size={16} /></Link>)}</div>
        </article>)}
      </div>
      <div className="acad-papers">
        <div className="acad-papers-heading"><h3>Past Tests<span>XI-XII / Calculatoare</span></h3><Link to="/exam-selection">All tests <ArrowUpRight size={15} /></Link></div>
        <div className="acad-papers-list">{EXAMS.map(exam => <Link to={exam.to} key={exam.to} className="acad-paper" aria-label={`${exam.title}, ${exam.phase}, ${exam.questions}, ${exam.difficulty}`}>
          <span className="acad-paper-year">{exam.year}</span><span className="acad-paper-body"><strong>{exam.phase}</strong><small>{exam.questions} / {exam.difficulty}</small></span><ArrowRight size={18} />
        </Link>)}</div>
      </div>
    </div>
  </section>;
}
