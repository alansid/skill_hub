import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from '../admin/AdminApp';
import { PatientApp } from '../patient/PatientApp';
import '../styles.css';
import '../patient/patient.css';
import './preview.css';

// 示範版：病人頁與管理頁放在同一頁切換，方便用手機試用。

type Tab = 'patient' | 'admin';

function Preview() {
  const [tab, setTab] = useState<Tab>(location.hash === '#admin' ? 'admin' : 'patient');
  return (
    <>
      <div className="preview-switch" role="tablist">
        <button role="tab" aria-selected={tab === 'patient'} onClick={() => setTab('patient')}>
          病人預約頁
        </button>
        <button role="tab" aria-selected={tab === 'admin'} onClick={() => setTab('admin')}>
          診所管理頁
        </button>
      </div>
      {tab === 'patient' ? <PatientApp /> : <AdminApp />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
