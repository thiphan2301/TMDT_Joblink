import { useState } from 'react';
import Login from './login';
import Register from './register';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'register'

  return (
      <>
        {currentScreen === 'login' ? (
            <Login onNavigateToRegister={() => setCurrentScreen('register')} />
        ) : (
            <Register onNavigateToLogin={() => setCurrentScreen('login')} />
        )}
      </>
  );
}