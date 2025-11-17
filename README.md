# NET2077 - Applied Informatics Learning Platform

A modern, professional learning platform for mastering computer science fundamentals through interactive quizzes and curated resources.

## ✨ Features

- 🎯 **Interactive Questions** - Practice with categorized question sets
- 📚 **Learning Resources** - Comprehensive dictionary and study materials
- 📊 **Progress Tracking** - XP system, levels, and detailed statistics
- 🔐 **User Authentication** - Secure JWT-based auth system
- 📱 **Fully Responsive** - Optimized for mobile, tablet, and desktop
- 🎨 **Modern Design** - Professional UI with smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running on `localhost:27017`

### Installation

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Seed the database with sample data
cd backend
npm run seed
cd ..

# Start both frontend and backend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## 📁 Project Structure

```
/
├── frontend/              # Vite + React
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── styles/       # CSS modules
│   │   ├── services/     # API services
│   │   └── context/      # React context
│   └── package.json
│
├── backend/              # Node.js + Express
│   ├── models/          # MongoDB models
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── data/            # Seed data (JSON)
│   ├── scripts/         # Utility scripts
│   └── package.json
│
├── .env                 # Environment variables
└── package.json         # Root package
```

## 📊 Adding Content

### Adding Questions

Edit `backend/data/questions.json`:

```json
{
  "title": "Your question here?",
  "type": "basic|all|acadnet",
  "answers": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctIndex": 0,
  "difficulty": "easy|medium|hard"
}
```

### Adding Resources

Edit `backend/data/resources.json`:

```json
{
  "title": "Resource Title",
  "content": "Resource description or content",
  "category": "dictionary|resource",
  "type": "text|pdf|video"
}
```

After editing, run:
```bash
cd backend
npm run seed
```

## 🎨 Design System

### Colors
- **Primary Accent**: `#00d9ff` (Cyan)
- **Secondary Accent**: `#7b2cbf` (Purple)
- **Background**: `#0f0f1e` (Dark)
- **Cards**: `#16213e` (Dark Blue)
- **Text**: `#ffffff` (White)

### Typography
- **Font**: Inter, system fonts
- **Headings**: 700-800 weight
- **Body**: 400-500 weight

## 🔐 API Endpoints

### Public
- `GET /api/stats` - Platform statistics
- `GET /api/questions` - All questions
- `GET /api/questions/random50` - Random 50 questions
- `GET /api/resources/all` - All resources
- `GET /api/resources/dictionary` - Dictionary terms
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Protected (requires JWT)
- `GET /api/questions/unsolved` - User's unsolved questions
- `POST /api/questions/markSolved` - Mark question as solved
- `GET /api/progress/user` - User progress
- `POST /api/progress/addSimulation` - Add simulation result

## 🛠️ Development

### Backend
```bash
cd backend
npm run dev  # Starts nodemon on port 5000
```

### Frontend
```bash
cd frontend
npm run dev  # Starts Vite on port 5173
```

### Seed Database
```bash
cd backend
npm run seed
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔒 Environment Variables

Create `.env` in root:

```env
MONGODB_URI=mongodb://localhost:27017/learning-platform
JWT_SECRET=your-secret-key-change-in-production
PORT=5000
```

## 📝 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

Built with ❤️ for learners everywhere
