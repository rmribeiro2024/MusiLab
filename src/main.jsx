import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { dbInit } from './lib/db'

dbInit()
  .catch(err => console.error('[MusiLab] IndexedDB init falhou, continuando sem cache:', err))
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
