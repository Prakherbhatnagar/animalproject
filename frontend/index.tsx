import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import DonationSuccess from './DonationSuccess'
import DonationCancel from './DonationCancel'
import Chatbot from './Chatbot'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder_client_id";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
         <Routes>
           <Route path="/donation-success" element={<DonationSuccess />} />
           <Route path="/donation-cancel" element={<DonationCancel />} />
           <Route path="*" element={<App />} />
         </Routes>
        <Chatbot />
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
