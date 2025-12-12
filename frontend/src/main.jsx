import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// import './index.css' // (You can keep this commented out or delete it since we cleared it earlier)
import { BrowserRouter } from 'react-router-dom' // <--- IMPORT THIS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>  {/* <--- WRAP APP WITH THIS */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)