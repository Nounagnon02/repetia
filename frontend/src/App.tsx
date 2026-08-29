import { Routes, Route, Navigate } from 'react-router-dom';
import Accueil from './pages/Accueil';
import Entrainement from './pages/Entrainement';
import Chat from './pages/Chat';
import Progression from './pages/Progression';

export default function App() {
  return (
    <div className="min-h-screen bg-brand-paper font-sans text-brand-ink">
      {/* Mobile-first : la mise en page reste calée sur une colonne de téléphone. */}
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col p-4 shadow-xl">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/entrainement" element={<Entrainement />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/progression" element={<Progression />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
