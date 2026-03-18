'use client';

import { useState } from 'react';

const ADMIN_PASSWORD = 'bagus2026';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Password salah!');
    }
  };

  const handleAddCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const id = parseInt(userId);
    const coins = parseInt(coinAmount);

    if (!id || id < 100001) {
      setMessage('ID tidak valid!');
      setLoading(false);
      return;
    }

    if (!coins || coins < 1) {
      setMessage('Jumlah koin tidak valid!');
      setLoading(false);
      return;
    }

    try {
      // Get all users from localStorage
      const usersStr = localStorage.getItem('webgenz_all_users');
      const users = usersStr ? JSON.parse(usersStr) : [];
      
      // Find user
      const userIndex = users.findIndex((u: any) => u.id === id);
      
      if (userIndex === -1) {
        setMessage(`User dengan ID ${id} tidak ditemukan!`);
        setLoading(false);
        return;
      }

      // Update coins
      users[userIndex].coins = (users[userIndex].coins || 0) + coins;
      
      // Save back to localStorage
      localStorage.setItem('webgenz_all_users', JSON.stringify(users));

      // Also update current user if they're logged in
      const currentUserStr = localStorage.getItem('webgenz_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.id === id) {
          currentUser.coins = users[userIndex].coins;
          localStorage.setItem('webgenz_user', JSON.stringify(currentUser));
        }
      }

      // Add transaction
      const txStr = localStorage.getItem('webgenz_transactions');
      const transactions = txStr ? JSON.parse(txStr) : [];
      transactions.unshift({
        id: `tx_admin_${Date.now()}`,
        type: 'PURCHASE',
        coinAmount: coins,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('webgenz_transactions', JSON.stringify(transactions));

      setMessage(`✅ Berhasil! User ${id} mendapat ${coins} koin. Total: ${users[userIndex].coins} koin`);
      setUserId('');
      setCoinAmount('');
    } catch (err) {
      setMessage('Terjadi kesalahan!');
    }

    setLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
  };

  // Get all users for display
  const getAllUsers = () => {
    try {
      const usersStr = localStorage.getItem('webgenz_all_users');
      return usersStr ? JSON.parse(usersStr) : [];
    } catch {
      return [];
    }
  };

  const users = getAllUsers();

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#16213e', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%' }}>
          <h1 style={{ color: '#e94560', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>
            🔐 Admin Panel
          </h1>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Password Admin</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#0f3460',
                  color: '#fff'
                }}
              />
            </div>
            
            {error && (
              <div style={{ color: '#e94560', marginBottom: '16px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: '#e94560',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', padding: '16px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#e94560', fontSize: '24px', fontWeight: 'bold' }}>
            🔐 Admin Panel - Isi Koin
          </h1>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #e94560',
              color: '#e94560',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            Keluar
          </button>
        </div>

        {/* Add Coins Form */}
        <div style={{ background: '#16213e', padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px' }}>➕ Tambah Koin User</h2>
          
          <form onSubmit={handleAddCoins}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '4px', fontSize: '12px' }}>ID User</label>
                <input
                  type="number"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  placeholder="contoh: 100001"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#0f3460',
                    color: '#fff'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '4px', fontSize: '12px' }}>Jumlah Koin</label>
                <input
                  type="number"
                  value={coinAmount}
                  onChange={e => setCoinAmount(e.target.value)}
                  placeholder="contoh: 10"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#0f3460',
                    color: '#fff'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    background: loading ? '#666' : '#e94560',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    height: '46px'
                  }}
                >
                  {loading ? 'Proses...' : 'Isi Koin'}
                </button>
              </div>
            </div>
            
            {message && (
              <div style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                background: message.includes('✅') ? '#0f4c3a' : '#4a1f1f',
                color: message.includes('✅') ? '#4ade80' : '#f87171'
              }}>
                {message}
              </div>
            )}
          </form>
        </div>

        {/* Users List */}
        <div style={{ background: '#16213e', padding: '24px', borderRadius: '16px' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px' }}>👥 Daftar User ({users.length})</h2>
          
          {users.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center' }}>Belum ada user terdaftar</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #0f3460' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#aaa', fontSize: '12px' }}>ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#aaa', fontSize: '12px' }}>Nama</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: '#aaa', fontSize: '12px' }}>Koin</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #0f3460' }}>
                      <td style={{ padding: '12px', color: '#fff', fontWeight: '600' }}>{u.id}</td>
                      <td style={{ padding: '12px', color: '#fff' }}>{u.name}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>
                          🪙 {u.coins || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
