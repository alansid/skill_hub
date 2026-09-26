import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PatientApp } from './PatientApp';
import '../styles.css';
import './patient.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PatientApp />
  </StrictMode>,
);
