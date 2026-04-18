import { useEffect, useState } from 'react';
import { fetchHealth } from './lib/api';

function App() {
  const [status, setStatus] = useState('Checking backend...');

  useEffect(() => {
    fetchHealth()
      .then((res) => {
        setStatus(`Backend ${res.data.service} (${res.data.version}) is reachable.`);
      })
      .catch(() => {
        setStatus('Backend is not reachable yet. Start backend + database to continue.');
      });
  }, []);

  return (
    <main className="container">
      <h1>Splitwise-Like App</h1>
      <p>Phase 1 foundation is scaffolded.</p>
      <p>{status}</p>
    </main>
  );
}

export default App;
