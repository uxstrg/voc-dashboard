import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GNB from './components/GNB'
import { Footer } from './components/footer'
import Dashboard from './pages/Dashboard'
import VocFeed from './pages/VocFeed'
import Guide from './pages/Guide'

function App() {
  return (
    <BrowserRouter>
      <GNB />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/voc-feed" element={<VocFeed />} />
        <Route path="/guide" element={<Guide />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}

export default App