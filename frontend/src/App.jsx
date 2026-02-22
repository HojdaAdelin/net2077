import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { MessageProvider } from './context/MessageContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SupportButton from './components/SupportButton';
import Home from './pages/Home';
import Grile from './pages/Grile';
import Quiz from './pages/Quiz';
import ExamSelection from './pages/ExamSelection';
import Resurse from './pages/Resurse';
import RoadmapPage from './pages/RoadmapPage';
import Progress from './pages/Progress';
import Login from './pages/Login';
import Register from './pages/Register';
import Updates from './pages/Updates';
import Leaderboard from './pages/Leaderboard';
import Lab from './pages/Lab';
import Terminal from './pages/Terminal';
import IS from './pages/IS';
import Profile from './pages/Profile';
import Forum from './pages/Forum';
import Arena from './pages/Arena';
import ArenaPlay from './pages/ArenaPlay';
import ArenaMatch from './pages/ArenaMatch';
import ArenaWaiting from './pages/ArenaWaiting';
import './styles/global.css';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MessageProvider>
            <ConfirmProvider>
              <BrowserRouter>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/grile" element={<Grile />} />
                  <Route path="/grile/:type/:mode" element={<Quiz />} />
                  <Route path="/exam-selection" element={<ExamSelection />} />
                  <Route path="/exam/:examId" element={<Quiz isExam={true} />} />
                  <Route path="/resurse" element={<Resurse />} />
                  <Route path="/roadmap/:title" element={<RoadmapPage />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/updates" element={<Updates />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/lab" element={<Lab />} />
                  <Route path="/terminal" element={<Terminal />} />
                  <Route path="/is" element={<IS />} />
                  <Route path="/forum" element={<Forum />} />
                  <Route path="/forum/:zoneId/:itemId" element={<Forum />} />
                  <Route path="/forum/topic/:topicId" element={<Forum />} />
                  <Route path="/arena" element={<Arena />} />
                  <Route path="/arena/play" element={<ArenaPlay />} />
                  <Route path="/arena/waiting/:matchId" element={<ArenaWaiting />} />
                  <Route path="/arena/match/:matchId" element={<ArenaMatch />} />
                  <Route path="/profile/:username" element={<Profile />} />
                </Routes>
                <Footer />
                <SupportButton />
              </BrowserRouter>
            </ConfirmProvider>
          </MessageProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
