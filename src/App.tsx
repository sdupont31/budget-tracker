import { useEffect, useState } from 'react';
import { seedDatabase, snapshotMonthIfNeeded, seedMissingSnapshots } from './db/database';
import { Dashboard } from './components/Dashboard';
import { ExpenseList } from './components/ExpenseList';
import { AddExpense } from './components/AddExpense';
import { Budget } from './components/Budget';
import { Navigation } from './components/Navigation';

export default function App() {
  const [tab, setTab]       = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    seedDatabase();
    snapshotMonthIfNeeded();
    seedMissingSnapshots();
  }, []);

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#F2F2F7',
      paddingBottom: 90,
      position: 'relative',
      fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif',
    }}>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'expenses'  && <ExpenseList />}
      {tab === 'budget'    && <Budget />}

      <Navigation
        current={tab}
        onChange={setTab}
        onAdd={() => setShowAdd(true)}
      />

      {showAdd && <AddExpense onClose={() => setShowAdd(false)} />}
    </div>
  );
}
