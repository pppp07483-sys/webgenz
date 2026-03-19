'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Static coin packages (1 koin = Rp 500)
const COIN_PACKAGES = [
  { coins: 5, price: 2500 },
  { coins: 10, price: 5000 },
  { coins: 25, price: 12500 },
  { coins: 50, price: 25000 },
  { coins: 100, price: 50000 },
];

// WhatsApp number for ordering
const WHATSAPP_NUMBER = '6285194738928';

// Hidden system prompt for website generation
const SYSTEM_PROMPT = `Buat website HTML lengkap dalam 1 file dengan:
- Animasi cinematic & premium menggunakan GSAP dari CDN
- Three.js dari CDN untuk efek 3D
- Loading screen dengan partikel animasi
- Hero section dengan parallax 3D dan typing effect
- Semua section lengkap & berisi konten
- Responsive mobile-first design
- Dark/light mode otomatis (prefers-color-scheme)
- Google Fonts: Playfair Display untuk heading, Poppins untuk body
- Minimal 500 baris kode HTML
- Konten realistis ala Indonesia
- Tanpa logo apapun, tanpa watermark
- Footer sederhana: hanya copyright dan back to top
- Semua CSS dalam <style> di <head>
- Semua JavaScript dalam <script> sebelum </body>
- Gunakan CDN: GSAP, Three.js, Google Fonts
- Warna menyesuaikan tema konten
- Glassmorphism dan modern design`;

// Job timeout in milliseconds (5 minutes)
const JOB_TIMEOUT = 5 * 60 * 1000;

// Polling interval (10 seconds)
const POLL_INTERVAL = 10000;

// Type for processing jobs
interface ProcessingJob {
  id: string;
  title: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: number; // timestamp in ms
  startTime: number; // same as createdAt, for clarity
  htmlContent?: string;
  error?: string;
}

export default function Home() {
  // User state
  const [user, setUser] = useState<{id: number; name: string; coins: number} | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Auth state
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [authForm, setAuthForm] = useState({ id: '', name: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [newUserId, setNewUserId] = useState<number | null>(null);
  
  // Generate state - SIMPLIFIED: only title
  const [generateOpen, setGenerateOpen] = useState(false);
  const [websiteTitle, setWebsiteTitle] = useState('');
  
  // Processing jobs state
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [notification, setNotification] = useState<{show: boolean; message: string; type: 'info' | 'success' | 'error'}>({show: false, message: '', type: 'info'});
  
  // Polling reference
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Data
  const [websites, setWebsites] = useState<{id: string; title: string; status: string; createdAt: string; htmlContent?: string}[]>([]);
  const [transactions, setTransactions] = useState<{id: string; type: string; coinAmount: number; createdAt: string}[]>([]);

  // Show notification
  const showNotification = (message: string, type: 'info' | 'success' | 'error') => {
    setNotification({show: true, message, type});
    if (type !== 'info') {
      setTimeout(() => {
        setNotification({show: false, message: '', type: 'info'});
      }, 5000);
    }
  };

  // Check job status from server
  const checkJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
      
      // Get text first, then parse JSON
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.log(`Job ${jobId} - Invalid JSON response, skipping...`);
        return false;
      }
      
      if (data.status === 'completed' && data.htmlContent) {
        // Update job with completed status
        setProcessingJobs(prev => {
          const updated = prev.map(j => 
            j.id === jobId 
              ? { ...j, status: 'completed' as const, htmlContent: data.htmlContent }
              : j
          );
          localStorage.setItem('webgenz_processing_jobs', JSON.stringify(updated));
          return updated;
        });
        
        // Add to websites list
        const job = processingJobs.find(j => j.id === jobId);
        if (job) {
          setWebsites(prev => {
            const newWebsite = {
              id: jobId,
              title: job.title,
              status: 'COMPLETED',
              createdAt: new Date(job.createdAt).toISOString(),
              htmlContent: data.htmlContent
            };
            const updated = [newWebsite, ...prev.filter(w => w.id !== jobId)];
            localStorage.setItem('webgenz_websites', JSON.stringify(updated));
            return updated;
          });
          
          showNotification(`✅ Website "${job.title}" sudah siap!`, 'success');
        }
        return true;
      } else if (data.status === 'failed') {
        // Update job with failed status
        setProcessingJobs(prev => {
          const updated = prev.map(j => 
            j.id === jobId 
              ? { ...j, status: 'failed' as const, error: data.error }
              : j
          );
          localStorage.setItem('webgenz_processing_jobs', JSON.stringify(updated));
          return updated;
        });
        return true;
      } else if (data.status === 'not_found') {
        // Job not found on server - might be expired or not started
        // Don't mark as failed, just log
        console.log(`Job ${jobId} not found on server`);
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking job status:', error);
      return false;
    }
  }, [processingJobs]);

  // Poll active jobs
  const pollActiveJobs = useCallback(async () => {
    const activeJobs = processingJobs.filter(j => j.status === 'processing');
    
    for (const job of activeJobs) {
      // Check timeout first
      const elapsed = Date.now() - job.startTime;
      if (elapsed > JOB_TIMEOUT) {
        setProcessingJobs(prev => {
          const updated = prev.map(j => 
            j.id === job.id 
              ? { ...j, status: 'failed' as const, error: 'Timeout (5 menit)' }
              : j
          );
          localStorage.setItem('webgenz_processing_jobs', JSON.stringify(updated));
          return updated;
        });
      } else {
        // Check server status
        await checkJobStatus(job.id);
      }
    }
  }, [processingJobs, checkJobStatus]);

  // Load data from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('webgenz_user');
      if (saved) setUser(JSON.parse(saved));
      
      const savedWebsites = localStorage.getItem('webgenz_websites');
      if (savedWebsites) setWebsites(JSON.parse(savedWebsites));
      
      const savedTx = localStorage.getItem('webgenz_transactions');
      if (savedTx) setTransactions(JSON.parse(savedTx));
      
      // Load jobs - DO NOT mark as failed on load!
      // Only mark as failed if over 3 minutes timeout
      const savedJobs = localStorage.getItem('webgenz_processing_jobs');
      if (savedJobs) {
        const jobs: ProcessingJob[] = JSON.parse(savedJobs);
        const now = Date.now();
        
        // Check each job for timeout
        const validJobs = jobs.map(job => {
          if (job.status === 'processing') {
            const elapsed = now - job.startTime;
            if (elapsed > JOB_TIMEOUT) {
              // Only mark as failed if over 3 minutes
              return { ...job, status: 'failed' as const, error: 'Timeout (5 menit)' };
            }
          }
          return job;
        });
        
        setProcessingJobs(validJobs);
        localStorage.setItem('webgenz_processing_jobs', JSON.stringify(validJobs));
      }
    } catch (e) {
      console.log('No saved data');
    }
  }, []);

  // Start polling when there are active jobs
  useEffect(() => {
    const hasActiveJobs = processingJobs.some(j => j.status === 'processing');
    
    if (hasActiveJobs && !pollingRef.current) {
      // Start polling
      console.log('Starting job polling...');
      pollingRef.current = setInterval(pollActiveJobs, POLL_INTERVAL);
      // Also poll immediately
      pollActiveJobs();
    } else if (!hasActiveJobs && pollingRef.current) {
      // Stop polling
      console.log('Stopping job polling...');
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    // Cleanup on unmount - but DON'T mark jobs as failed!
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [processingJobs.some(j => j.status === 'processing'), pollActiveJobs]);

  const saveUser = (userData: typeof user) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('webgenz_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('webgenz_user');
    }
  };

  const saveWebsites = (data: typeof websites) => {
    setWebsites(data);
    localStorage.setItem('webgenz_websites', JSON.stringify(data));
  };

  const saveTransactions = (data: typeof transactions) => {
    setTransactions(data);
    localStorage.setItem('webgenz_transactions', JSON.stringify(data));
  };

  // Get all users from localStorage
  const getAllUsers = () => {
    try {
      const users = localStorage.getItem('webgenz_all_users');
      return users ? JSON.parse(users) : [];
    } catch {
      return [];
    }
  };

  const saveAllUsers = (users: any[]) => {
    localStorage.setItem('webgenz_all_users', JSON.stringify(users));
  };

  const getNextUserId = () => {
    const users = getAllUsers();
    if (users.length === 0) return 100001;
    return Math.max(...users.map((u: any) => u.id)) + 1;
  };

  // Check if user has active processing job
  const hasActiveJob = () => {
    return processingJobs.some(j => j.status === 'processing');
  };

  // Register
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    setNewUserId(null);
    
    if (!authForm.name.trim()) {
      setAuthMessage('Nama harus diisi!');
      setAuthLoading(false);
      return;
    }
    
    if (!authForm.password || authForm.password.length < 4) {
      setAuthMessage('Password minimal 4 karakter!');
      setAuthLoading(false);
      return;
    }
    
    setTimeout(() => {
      const users = getAllUsers();
      const newId = getNextUserId();
      
      users.push({
        id: newId,
        name: authForm.name.trim(),
        password: authForm.password,
        coins: 0
      });
      saveAllUsers(users);
      
      saveUser({ id: newId, name: authForm.name.trim(), coins: 0 });
      setNewUserId(newId);
      setAuthLoading(false);
      
      setTimeout(() => {
        setAuthOpen(false);
        setAuthForm({ id: '', name: '', password: '' });
        setAuthMessage('');
        setNewUserId(null);
      }, 3000);
    }, 500);
  };

  // Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    
    const userId = parseInt(authForm.id);
    
    if (!userId || userId < 100001) {
      setAuthMessage('ID tidak valid!');
      setAuthLoading(false);
      return;
    }
    
    if (!authForm.password) {
      setAuthMessage('Password harus diisi!');
      setAuthLoading(false);
      return;
    }
    
    setTimeout(() => {
      const users = getAllUsers();
      const foundUser = users.find((u: any) => u.id === userId && u.password === authForm.password);
      
      if (foundUser) {
        saveUser({ id: foundUser.id, name: foundUser.name, coins: foundUser.coins });
        setAuthOpen(false);
        setAuthForm({ id: '', name: '', password: '' });
      } else {
        setAuthMessage('ID atau password salah!');
      }
      setAuthLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    saveUser(null);
  };

  const getWhatsAppLink = () => {
    const userId = user?.id || '';
    const message = encodeURIComponent(`Halo saya mau beli koin WEB GEN Z\nID saya: ${userId}\nMinta tolong isi koin`);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  };

  // Generate website - SYNCHRONOUS (waits for result)
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.coins < 1) {
      alert('Koin tidak cukup! Beli koin dulu via WhatsApp.');
      return;
    }

    // Check if already has active job
    if (hasActiveJob()) {
      alert('⏳ Sedang memproses 1 website, tunggu selesai dulu!');
      return;
    }
    
    // Close modal immediately
    setGenerateOpen(false);
    
    // Store title before clearing
    const title = websiteTitle;
    
    // Create job with startTime
    const jobId = `job_${Date.now()}`;
    const now = Date.now();
    const newJob: ProcessingJob = {
      id: jobId,
      title: title,
      status: 'processing',
      createdAt: now,
      startTime: now
    };
    
    // Add to processing jobs
    const updatedJobs = [newJob, ...processingJobs];
    setProcessingJobs(updatedJobs);
    localStorage.setItem('webgenz_processing_jobs', JSON.stringify(updatedJobs));
    
    // Deduct coin immediately
    const newCoins = user.coins - 1;
    saveUser({ ...user, coins: newCoins });
    
    // Update in all users
    const users = getAllUsers();
    const userIndex = users.findIndex((u: any) => u.id === user.id);
    if (userIndex >= 0) {
      users[userIndex].coins = newCoins;
      saveAllUsers(users);
    }
    
    // Add transaction
    saveTransactions([{
      id: `tx_${Date.now()}`,
      type: 'USAGE',
      coinAmount: 1,
      createdAt: new Date().toISOString()
    }, ...transactions]);
    
    // Combine prompt
    const finalPrompt = `Judul Website: ${title}\n\nBuat website profesional dengan tema: ${title}`;

    // Clear form
    setWebsiteTitle('');

    try {
      console.log('[Client] Sending request to server...');
      
      const response = await fetch('/api/websites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: finalPrompt, 
          jobId,
          title,
          userId: user.id
        })
      });
      
      // Get text first, then parse JSON
      const text = await response.text();
      console.log('[Client] Raw response:', text.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[Client] JSON parse error. Response was:', text.substring(0, 500));
        // Don't show error, let polling handle it
        return;
      }
      
      console.log('[Client] Server response:', { success: data.success, hasHtml: !!data.htmlContent, error: data.error });
      
      if (data.success && data.htmlContent) {
        // SUCCESS - Update job with completed status
        const completedJobs = updatedJobs.map(j => 
          j.id === jobId 
            ? { ...j, status: 'completed' as const, htmlContent: data.htmlContent }
            : j
        );
        setProcessingJobs(completedJobs);
        localStorage.setItem('webgenz_processing_jobs', JSON.stringify(completedJobs));
        
        // Add to websites list
        const newWebsite = {
          id: jobId,
          title: title,
          status: 'COMPLETED',
          createdAt: new Date(now).toISOString(),
          htmlContent: data.htmlContent
        };
        const finalWebsites = [newWebsite, ...websites];
        setWebsites(finalWebsites);
        localStorage.setItem('webgenz_websites', JSON.stringify(finalWebsites));
        
        showNotification(`✅ Website "${title}" berhasil dibuat! (${Math.round(data.duration/1000)}s)`, 'success');
        console.log('[Client] Website saved successfully');
        
      } else {
        // FAILED - Server returned error
        console.error('[Client] Server error:', data.error);
        const failedJobs = updatedJobs.map(j => 
          j.id === jobId 
            ? { ...j, status: 'failed' as const, error: data.error || 'Unknown error' }
            : j
        );
        setProcessingJobs(failedJobs);
        localStorage.setItem('webgenz_processing_jobs', JSON.stringify(failedJobs));
      }
      
    } catch (error: any) {
      console.error('[Client] Network error:', error);
      // Don't show error notification, let polling handle it
    }
  };

  const handleDownload = (site: typeof websites[0]) => {
    if (!site.htmlContent) return;
    const blob = new Blob([site.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${site.title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenWebsite = (site: typeof websites[0]) => {
    if (!site.htmlContent) return;
    const blob = new Blob([site.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Hapus website ini?')) return;
    const filteredWebsites = websites.filter(w => w.id !== id);
    saveWebsites(filteredWebsites);
    
    const filteredJobs = processingJobs.filter(j => j.id !== id);
    setProcessingJobs(filteredJobs);
    localStorage.setItem('webgenz_processing_jobs', JSON.stringify(filteredJobs));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const formatDate = (dateStr: string | number) => {
    if (typeof dateStr === 'number') {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Don't render until mounted
  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #3b82f6, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '24px' }}>Loading...</div>
      </div>
    );
  }

  // Combine processing and completed websites
  const allWebsites = [
    ...processingJobs.map(j => ({
      id: j.id,
      title: j.title,
      status: j.status === 'processing' ? 'PROCESSING' : j.status === 'failed' ? 'FAILED' : 'COMPLETED',
      createdAt: new Date(j.createdAt).toISOString(),
      htmlContent: j.htmlContent
    })),
    ...websites.filter(w => !processingJobs.find(j => j.id === w.id))
  ];

  // LANDING PAGE - Not logged in
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #3b82f6, #9333ea)', color: 'white' }}>
        <header style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🌐</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>WEB GEN Z</span>
          </div>
          <button
            onClick={() => setAuthOpen(true)}
            style={{
              background: 'white',
              color: '#3b82f6',
              border: 'none',
              borderRadius: '9999px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            👤 Masuk / Daftar
          </button>
        </header>

        <main style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '24px' }}>
            Buat Website<br />dalam 1 Menit
          </h1>
          <p style={{ fontSize: '20px', opacity: 0.9, marginBottom: '32px' }}>
            Tulis judul, AI buatkan website.<br />
            <strong>1 koin = Rp 500</strong>
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            style={{
              background: 'white',
              color: '#3b82f6',
              border: 'none',
              borderRadius: '9999px',
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ✨ Mulai Sekarang
          </button>

          <div style={{ marginTop: '64px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {[
              { step: 1, title: 'Daftar' },
              { step: 2, title: 'Beli Koin' },
              { step: 3, title: 'Tulis Judul' },
              { step: 4, title: 'Generate' },
              { step: 5, title: 'Publish' },
            ].map(item => (
              <div key={item.step} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ width: '40px', height: '40px', background: 'white', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContentContent: 'center', fontWeight: 'bold', margin: '0 auto 8px' }}>
                  {item.step}
                </div>
                <p style={{ fontWeight: '500' }}>{item.title}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '64px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Paket Koin</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px' }}>
              {COIN_PACKAGES.map((pkg, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '32px' }}>🪙</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{pkg.coins}</div>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>{formatPrice(pkg.price)}</div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>
          <p>© 2026 WEB GEN Z</p>
        </footer>

        {/* Auth Modal */}
        {authOpen && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: '16px'
            }}
            onClick={() => !authLoading && setAuthOpen(false)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
                width: '100%',
                color: '#333',
                position: 'relative'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setAuthOpen(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  zIndex: 10
                }}
              >
                ×
              </button>
              
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '16px' }}>
                Selamat Datang
              </h2>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f3f4f6', padding: '4px', borderRadius: '12px' }}>
                <button
                  onClick={() => { setAuthTab('login'); setAuthMessage(''); setNewUserId(null); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '8px',
                    background: authTab === 'login' ? 'white' : 'transparent',
                    fontWeight: authTab === 'login' ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  Masuk
                </button>
                <button
                  onClick={() => { setAuthTab('register'); setAuthMessage(''); setNewUserId(null); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '8px',
                    background: authTab === 'register' ? 'white' : 'transparent',
                    fontWeight: authTab === 'register' ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  Daftar
                </button>
              </div>
              
              {newUserId && (
                <div style={{ background: '#dcfce7', padding: '16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', marginBottom: '8px' }}>✅ Pendaftaran berhasil!</p>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Simpan ID kamu:</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a' }}>{newUserId}</p>
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Gunakan ID ini untuk login</p>
                </div>
              )}
              
              {authMessage && !newUserId && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                  {authMessage}
                </div>
              )}
              
              {authTab === 'login' && !newUserId && (
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>ID User</label>
                    <input
                      type="number"
                      value={authForm.id}
                      onChange={e => setAuthForm({ ...authForm, id: e.target.value })}
                      placeholder="contoh: 100001"
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Password</label>
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: authLoading ? 'not-allowed' : 'pointer',
                      opacity: authLoading ? 0.7 : 1
                    }}
                  >
                    {authLoading ? 'Memproses...' : 'Masuk'}
                  </button>
                </form>
              )}
              
              {authTab === 'register' && !newUserId && (
                <form onSubmit={handleRegister}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Nama</label>
                    <input
                      type="text"
                      value={authForm.name}
                      onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                      placeholder="Nama lengkap"
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Password</label>
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      placeholder="Minimal 4 karakter"
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: authLoading ? 'not-allowed' : 'pointer',
                      opacity: authLoading ? 0.7 : 1
                    }}
                  >
                    {authLoading ? 'Memproses...' : 'Daftar'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // DASHBOARD - Logged in
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', color: '#333' }}>
      <header style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🌐</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>WEB GEN Z</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              ID: <strong>{user.id}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '6px 12px', borderRadius: '9999px' }}>
              <span>🪙</span>
              <span style={{ fontWeight: 'bold', color: '#d97706' }}>{user.coins}</span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '9999px',
                padding: '6px 12px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <div style={{ width: '48px', height: '48px', background: '#dcfce7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              💬
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>Beli Koin</div>
              <div style={{ fontSize: '14px', color: '#666' }}>via WhatsApp</div>
            </div>
          </a>

          <button
            onClick={() => {
              if (hasActiveJob()) {
                alert('⏳ Sedang memproses 1 website, tunggu selesai dulu!');
              } else if (user.coins < 1) {
                alert('Koin tidak cukup! Beli koin dulu via WhatsApp.');
              } else {
                setGenerateOpen(true);
              }
            }}
            disabled={hasActiveJob()}
            style={{
              background: hasActiveJob() ? '#e5e7eb' : 'white',
              borderRadius: '16px',
              padding: '20px',
              border: 'none',
              cursor: hasActiveJob() ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              opacity: hasActiveJob() ? 0.7 : 1
            }}
          >
            <div style={{ width: '48px', height: '48px', background: hasActiveJob() ? '#fef3c7' : '#dbeafe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              {hasActiveJob() ? '⏳' : '➕'}
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>
                {hasActiveJob() ? 'Sedang Diproses...' : 'Buat Website'}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {hasActiveJob() ? 'Tunggu selesai' : '1 koin per website'}
              </div>
            </div>
          </button>
        </div>

        {/* Processing Status Banner */}
        {hasActiveJob() && (
          <div style={{ background: '#fef3c7', borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>⏳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600' }}>Sedang Memproses Website</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Estimasi sekitar 1-5 menit.</div>
            </div>
          </div>
        )}

        {/* Websites List */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            🌐 Website Saya ({allWebsites.length})
          </h2>
          
          {allWebsites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
              <p>Belum ada website</p>
              <p style={{ fontSize: '14px' }}>Klik "Buat Website" untuk memulai</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {allWebsites.map(site => (
                <div key={site.id} style={{ border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{site.title}</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{formatDate(site.createdAt)}</div>
                    </div>
                    {site.status === 'PROCESSING' ? (
                      <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🔄 Diproses...
                      </span>
                    ) : site.status === 'FAILED' ? (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px' }}>
                        ❌ Gagal
                      </span>
                    ) : (
                      <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px' }}>
                        ✓ Berhasil
                      </span>
                    )}
                  </div>
                  {site.status === 'COMPLETED' && site.htmlContent && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDownload(site)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        📥 Unduh
                      </button>
                      <button
                        onClick={() => handleOpenWebsite(site)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: 'none',
                          borderRadius: '8px',
                          background: '#22c55e',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🔗 Buka
                      </button>
                      <button
                        onClick={() => handleDelete(site.id)}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                  {site.status === 'FAILED' && (
                    <button
                      onClick={() => handleDelete(site.id)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      🗑️ Hapus
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              💳 Riwayat Transaksi
            </h2>
            <div style={{ display: 'grid', gap: '8px' }}>
              {transactions.slice(0, 10).map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #eee', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      background: tx.type === 'PURCHASE' ? '#dcfce7' : '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {tx.type === 'PURCHASE' ? '🪙' : '🌐'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500' }}>
                        {tx.type === 'PURCHASE' ? `Beli ${tx.coinAmount} Koin` : `Pakai ${tx.coinAmount} Koin`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{formatDate(tx.createdAt)}</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: '600', color: tx.type === 'PURCHASE' ? '#16a34a' : '#dc2626' }}>
                    {tx.type === 'PURCHASE' ? '+' : '-'}{tx.coinAmount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Notification Toast */}
      {notification.show && (
        <div 
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: notification.type === 'success' ? '#16a34a' : notification.type === 'error' ? '#dc2626' : '#3b82f6',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '90%'
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification({show: false, message: '', type: 'info'})}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Generate Modal - SIMPLIFIED */}
      {generateOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '16px'
          }}
          onClick={() => setGenerateOpen(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              color: '#333',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setGenerateOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                zIndex: 10
              }}
            >
              ×
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '16px' }}>
              🌐 Buat Website Baru
            </h2>
            
            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Judul Website <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  value={websiteTitle}
                  onChange={e => setWebsiteTitle(e.target.value)}
                  placeholder="contoh: Toko Kopi Mantap"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <button
                type="submit"
                disabled={!websiteTitle.trim() || user.coins < 1}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: (!websiteTitle.trim() || user.coins < 1) ? '#ddd' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (!websiteTitle.trim() || user.coins < 1) ? 'not-allowed' : 'pointer'
                }}
              >
                ✨ Buat Website (1 Koin)
              </button>
              
              {user.coins < 1 && (
                <p style={{ color: '#dc2626', fontSize: '14px', textAlign: 'center', marginTop: '8px' }}>
                  ⚠️ Koin tidak cukup! Beli koin via WhatsApp dulu.
                </p>
              )}
              
              <p style={{ color: '#888', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>
                Proses membutuhkan waktu sekitar 1-5 menit
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
