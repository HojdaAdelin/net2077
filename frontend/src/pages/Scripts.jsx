import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { FileTerminal, BookOpen, Code2, Wrench, ChevronRight, CheckCircle, Lightbulb, Terminal } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import LoginRequired from '../components/LoginRequired';
import '../styles/Scripts.css';

export default function Scripts() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return (
      <LoginRequired
        icon={FileTerminal}
        title="Scripts Access Required"
        description="Please login to access Bash scripting lessons, problems and the script maker."
      />
    );
  }

  return (
    <div className="scripts-page">
      <div className="scripts-container">
        <div className="scripts-header">
          <div className="scripts-header-icon">
            <FileTerminal size={40} />
          </div>
          <h1>Bash Scripting</h1>
          <p>Master Linux shell scripting from the ground up</p>
        </div>

        <div className="scripts-cards">
          {/* Info card */}
          <div className="scripts-info-card">
            <div className="scripts-info-card-header">
              <Terminal size={22} />
              <span>What you'll do</span>
            </div>
            <ul className="scripts-features">
              <li>
                <CheckCircle size={16} className="scripts-check" />
                <div>
                  <strong>Learn scripting</strong>
                  <p>Study Bash concepts through structured lessons and real-world examples.</p>
                </div>
              </li>
              <li>
                <CheckCircle size={16} className="scripts-check" />
                <div>
                  <strong>Resolve scripting problems</strong>
                  <p>Analyze scripts and pick the correct answers in multiple-choice challenges.</p>
                </div>
              </li>
              <li>
                <CheckCircle size={16} className="scripts-check" />
                <div>
                  <strong>Try the script maker</strong>
                  <p>Build and test your own Bash scripts in an interactive sandbox environment.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Action card */}
          <div className="scripts-action-card">
            <div className="scripts-action-card-header">
              <Lightbulb size={22} />
              <span>Get started</span>
            </div>
            <div className="scripts-actions">
              <Link to="/learn" className="scripts-action-btn scripts-action-learn">
                <div className="scripts-action-icon">
                  <BookOpen size={20} />
                </div>
                <div className="scripts-action-content">
                  <span className="scripts-action-title">Learn</span>
                  <span className="scripts-action-desc">Structured lessons & roadmaps</span>
                </div>
                <ChevronRight size={18} className="scripts-action-arrow" />
              </Link>

              <Link to="/scripting/problems" className="scripts-action-btn scripts-action-problems">
                <div className="scripts-action-icon">
                  <Code2 size={20} />
                </div>
                <div className="scripts-action-content">
                  <span className="scripts-action-title">Scripting Problems</span>
                  <span className="scripts-action-desc">Multiple-choice script challenges</span>
                </div>
                <ChevronRight size={18} className="scripts-action-arrow" />
              </Link>

              <Link to="/scripting/maker" className="scripts-action-btn scripts-action-maker">
                <div className="scripts-action-icon">
                  <Wrench size={20} />
                </div>
                <div className="scripts-action-content">
                  <span className="scripts-action-title">Script Maker</span>
                  <span className="scripts-action-desc">Build & test your own scripts</span>
                </div>
                <ChevronRight size={18} className="scripts-action-arrow" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
