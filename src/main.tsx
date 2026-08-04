import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './firebase';
import App from './App.tsx';
import HelpPage from './pages/HelpPage.tsx';
import CommunityPage from './pages/CommunityPage.tsx';
import AccountPage from './pages/AccountPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
