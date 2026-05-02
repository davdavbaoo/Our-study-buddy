# Focus Mastery

A sleek, AI-powered Pomodoro timer and task manager designed for deep work.

## Features

- **Pomodoro Timer**: Classic 25/5 intervals with custom session support.
- **AI Breakdown**: Automatically split large tasks into manageable sub-tasks using Gemini AI.
- **Reflective Breathers**: Get AI-generated mindful advice during your breaks.
- **Focus Insights**: Daily productivity metrics and trend visualization.
- **Local Persistence**: All data is saved securely to your browser's local storage.

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd focus-mastery
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file based on `.env.example` and add your Google Gemini API key.
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## Built With

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Google Gemini API](https://ai.google.dev/)
- [Recharts](https://recharts.org/)
- [Lucide React](https://lucide.dev/)
