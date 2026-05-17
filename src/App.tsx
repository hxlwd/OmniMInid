import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import DashboardView from './views/DashboardView';
import NotesView from './views/NotesView';
import FlashcardsView from './views/FlashcardsView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';
import { ViewScope } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewScope>('dashboard');

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      
      <div className="flex-1 w-full h-full overflow-y-auto">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'notes' && <NotesView />}
        {currentView === 'flashcards' && <FlashcardsView />}
        {currentView === 'profile' && <ProfileView />}
        {currentView === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}

