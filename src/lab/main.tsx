import React from 'react';
import { createRoot } from 'react-dom/client';
import DecisionLab from './DecisionLab';
import './lab.css';
import './records.css';
createRoot(document.getElementById('lab-root')!).render(
  <React.StrictMode>
    <DecisionLab />
  </React.StrictMode>,
);
