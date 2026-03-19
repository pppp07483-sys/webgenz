'use client';

import { useState, useEffect } from 'react';

// Admin password
const ADMIN_PASSWORD = 'bagus2026';

interface User {
  id: number;
  name: string;
  password: string;
  coins: number;
  createdAt?: string;
}

interface Website {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  htmlContent?: string;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userWebsites, setUserWebsites] = useState<Website[]>([]);
  const [showWebsites, setShowWebsites] = useState(false);
  
  // Form states
  const [coinAmount, setCoinAmount] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  
  // Load users on mount
  useEffect(() => {
    if (isLoggedIn) {
      loadUsers();
    }
  }, [isLoggedIn]);
  
  const loadUsers = () => {
    try {
      const saved = localStorage.getItem('webgenz_all_users');
      if (saved) {
        setUsers(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
  };
  
  const saveUsers = (updatedUsers: User[]) => {
    localStorage.setItem('webgenz_all_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Password salah');
    }
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword('');
  };
  
  // Filter users by search
  const filteredUsers = users.filter(user => 
    user.id.toString().includes(searchQuery) || 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get website count for user
  const getWebsiteCount = (userId: number) => {
    try {
      const websites = localStorage.getItem('webgenz_websites');
      if (websites) {
        const allWebsites: Website[] = JSON.parse(websites);
        return allWebsites.filter(w => w.id.includes(userId.toString())).length;
      }
    } catch (e) {}
    return 0;
  };
  
  // Load user websites
  const loadUserWebsites = (userId: number) => {
    try {
      const websites = localStorage.getItem('webgenz_websites');
      if (websites) {
        const allWebsites: Website[] = JSON.parse(websites);
        setUserWebsites(allWebsites);
        setShowWebsites(true);
      }
    } catch (e) {
      setUserWebsites([]);
    }
  };
  
  // Add coins
  const handleAddCoins = (userId: number) => {
    const amount = parseInt(coinAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Jumlah koin tidak valid');
      return;
    }
    
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, coins: u.coins + amount } : u
    );
    saveUsers(updatedUsers);
    setCoinAmount('');
    setMessage(`✅ Berhasil menambah ${amount} koin ke user ${userId}`);
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Subtract coins
  const handleSubtractCoins = (userId: number) => {
    const amount = parseInt(coinAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Jumlah koin tidak valid');
      return;
    }
    
    const user = users.find(u => u.id === userId);
    if (user && user.coins < amount) {
      setMessage('Koin tidak cukup');
      return;
    }
    
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, coins: Math.max(0, u.coins - amount) } : u
    );
    saveUsers(updatedUsers);
    setCoinAmount('');
    setMessage(`✅ Berhasil mengurangi ${amount} koin dari user ${userId}`);
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Reset password
  const handleResetPassword = (userId: number) => {
    if (!newPassword || newPassword.length < 4) {
      setMessage('Password minimal 4 karakter');
      return;
    }
    
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, password: newPassword } : u
    );
    saveUsers(updatedUsers);
    setNewPassword('');
    setMessage(`✅ Password user ${userId} berhasil diubah`);
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Delete user
  const handleDeleteUser = (userId: number) => {
    if (!confirm(`Hapus user ${userId}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    
    const updatedUsers = users.filter(u => u.id !== userId);
    saveUsers(updatedUsers);
    setMessage(`✅ User ${userId} berhasil dihapus`);
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Open website preview
  const openWebsite = (site: Website) => {
    if (!site.htmlContent) return;
    const blob = new Blob([site.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };
  
  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Login screen
  if (!isLoggedIn) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Admin Developer</h1>
            <p style={{ opacity: 0.7, fontSize: '14px' }}>WEB GEN Z</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password Admin"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#333'
                }}
                autoFocus
              />
            </div>
            
            {error && (
              <div style={{ 
                background: '#fee2e2', 
                color: '#dc2626', 
                padding: '12px', 
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                background: '#3b82f6',
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
  
  // Admin dashboard
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', color: '#333' }}>
      {/* Header */}
      <header style={{ 
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)', 
        color: 'white',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>🔐</span>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Admin Developer</h1>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>WEB GEN Z Dashboard</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          Keluar
        </button>
      </header>
      
      {/* Message */}
      {message && (
        <div style={{
          background: message.includes('✅') ? '#dcfce7' : '#fee2e2',
          color: message.includes('✅') ? '#16a34a' : '#dc2626',
          padding: '12px 24px',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Total User</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{users.length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Koin</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#eab308' }}>
              {users.reduce((sum, u) => sum + u.coins, 0)}
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>User Aktif</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e' }}>
              {users.filter(u => u.coins > 0).length}
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>User Kosong</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
              {users.filter(u => u.coins === 0).length}
            </div>
          </div>
        </div>
        
        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cari by ID atau Nama..."
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '14px 20px',
              border: '1px solid #ddd',
              borderRadius: '9999px',
              fontSize: '16px'
            }}
          />
        </div>
        
        {/* User Table */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: '600' }}>
            👥 Daftar User ({filteredUsers.length})
          </div>
          
          {filteredUsers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Tidak ada user ditemukan
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Nama</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: '600' }}>Password</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: '600' }}>Koin</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: '600' }}>Website</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: '600' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#3b82f6' }}>
                        <button
                          onClick={() => loadUserWebsites(user.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            fontWeight: '600',
                            textDecoration: 'underline'
                          }}
                        >
                          {user.id}
                        </button>
                      </td>
                      <td style={{ padding: '16px' }}>{user.name}</td>
                      <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '14px' }}>{user.password}</td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          background: '#fef3c7',
                          color: '#d97706',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontWeight: 'bold'
                        }}>
                          🪙 {user.coins}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>{getWebsiteCount(user.id)}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {/* Quick coin buttons */}
                          <button
                            onClick={() => { setSelectedUser(user); setCoinAmount('10'); }}
                            style={{
                              background: '#dcfce7',
                              color: '#16a34a',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            +10🪙
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Selected User Management */}
        {selectedUser && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '16px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Kelola User {selectedUser.id}</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Nama</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{selectedUser.name}</div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Koin Saat Ini</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>🪙 {selectedUser.coins}</div>
              </div>
              
              {/* Manage Coins */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Kelola Koin</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(e.target.value)}
                    placeholder="Jumlah koin"
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                  <button
                    onClick={() => handleAddCoins(selectedUser.id)}
                    style={{
                      background: '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    + Tambah
                  </button>
                  <button
                    onClick={() => handleSubtractCoins(selectedUser.id)}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    - Kurangi
                  </button>
                </div>
              </div>
              
              {/* Reset Password */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Reset Password</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password baru"
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                  <button
                    onClick={() => handleResetPassword(selectedUser.id)}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Ganti
                  </button>
                </div>
              </div>
              
              {/* Delete */}
              <button
                onClick={() => {
                  handleDeleteUser(selectedUser.id);
                  setSelectedUser(null);
                }}
                style={{
                  width: '100%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🗑️ Hapus User
              </button>
            </div>
          </div>
        )}
        
        {/* User Websites Modal */}
        {showWebsites && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '16px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>🌐 Semua Website</h2>
                <button
                  onClick={() => setShowWebsites(false)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              
              {userWebsites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Belum ada website
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {userWebsites.map(site => (
                    <div key={site.id} style={{
                      border: '1px solid #eee',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{site.title}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{formatDate(site.createdAt)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          background: site.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7',
                          color: site.status === 'COMPLETED' ? '#16a34a' : '#d97706',
                          padding: '4px 8px',
                          borderRadius: '9999px',
                          fontSize: '12px'
                        }}>
                          {site.status === 'COMPLETED' ? '✓ Berhasil' : '⏳ Proses'}
                        </span>
                        {site.status === 'COMPLETED' && site.htmlContent && (
                          <button
                            onClick={() => openWebsite(site)}
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            🔗 Buka
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
