import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
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
import './styles/global.css';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
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
          </Routes>
          <Footer />
          <SupportButton />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
