import React, { useState, useEffect } from 'react';
import { officeHttpBase } from '../serverUrl';
import { CharacterSettingsModal } from './CharacterSettingsModal';
import { HireModal } from './HireModal';

interface Props {
  onClose: () => void;
  onRefreshWorkspace?: () => void;
  initialTab?: 'skills' | 'character' | 'hire' | 'tips';
}

interface SkillItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
}

interface TipCommand {
  cmd: string;
  desc: string;
  category: 'server' | 'production' | 'diagnostics' | 'security';
}

const STUDIO_TIPS: TipCommand[] = [
  { cmd: 'npm run dev:office-agy', desc: 'Menjalankan Server (:3334), UI (:3333), Studio Bridge, dan Listener AGY sekaligus', category: 'server' },
  { cmd: 'npm run dev:office-ds', desc: 'Menjalankan Server (:3334), UI (:3333), Studio Bridge, dan Listener DeepSeek sekaligus', category: 'server' },
  { cmd: 'npm run dev:all', desc: 'Menjalankan Server Express (:3334) dan UI Vite (:3333)', category: 'server' },
  { cmd: 'npm run bridge', desc: 'Menjalankan Jembatan AI Persona (Lumi, Opi, Jeje, Nara) & Watcher', category: 'server' },
  { cmd: 'npm run open', desc: 'Membuka kantor virtual di browser otomatis dengan token keamanan Admin', category: 'server' },
  { cmd: 'npx remotion render src/remotion/index.ts StudioShowcase out/video.mp4 --gl=angle', desc: 'Merender komposisi video Remotion menjadi file MP4 secara langsung', category: 'production' },
  { cmd: '.\\.venv\\Scripts\\python.exe scripts/tts-cli.py --text "Halo" --output out.mp3', desc: 'Men-generate voiceover Bahasa Indonesia (Edge-TTS Ardi/Gadis)', category: 'production' },
  { cmd: 'npm run doctor', desc: 'Diagnosa kesehatan server, port, dependensi Node.js, dan file build', category: 'diagnostics' },
  { cmd: 'npm run build', desc: 'Kompilasi TypeScript dan membangun bundle produksi web ke dist/', category: 'diagnostics' },
  { cmd: 'npm run test', desc: 'Menjalankan unit test aplikasi menggunakan Vitest', category: 'diagnostics' },
  { cmd: 'npm run rotate-token', desc: 'Membuat token keamanan baru untuk otentikasi admin lokal', category: 'security' },
];

export const StudioSettingsModal: React.FC<Props> = ({ onClose, onRefreshWorkspace, initialTab = 'skills' }) => {
  const [activeTab, setActiveTab] = useState<'skills' | 'character' | 'hire' | 'tips'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Skills State
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Skill Form
  const [showAddSkillForm, setShowAddSkillForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillInstructions, setNewSkillInstructions] = useState('');
  const [savingSkill, setSavingSkill] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Tips Copied feedback
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchSkills = async () => {
    setLoadingSkills(true);
    try {
      const res = await fetch(`${officeHttpBase()}/api/skills`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.skills)) {
        setSkillsList(data.skills);
      }
    } catch (_) {
      setSkillsList([
        { id: 'remotion', name: 'remotion', description: 'Framework video React terprogram', author: 'NARA Studio', version: '2.0.0' },
        { id: 'bang-motion', name: 'bang-motion', description: 'Animasi motion graphic sinematik Anti-PPT', author: 'NARA Studio', version: '1.0.0' },
        { id: 'remotion-coder', name: 'remotion-coder', description: 'Implementasi komponen kode Remotion 4.x', author: 'NARA Studio', version: '1.0.0' },
        { id: 'audio-sync', name: 'audio-sync', description: 'Sinkronisasi suara Edge-TTS, VO & SFX', author: 'NARA Studio', version: '1.0.0' },
        { id: 'render-qa', name: 'render-qa', description: 'Audit kualitas render video MP4 60 FPS', author: 'NARA Studio', version: '1.0.0' },
      ]);
    } finally {
      setLoadingSkills(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleCopyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setSavingSkill(true);
    setSaveStatus('Menyimpan skill baru ke workspace...');

    try {
      const res = await fetch(`${officeHttpBase()}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSkillName.trim(),
          description: newSkillDesc.trim(),
          instructions: newSkillInstructions.trim(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSaveStatus(`✨ Skill "${data.name}" berhasil ditambahkan!`);
        setNewSkillName('');
        setNewSkillDesc('');
        setNewSkillInstructions('');
        setShowAddSkillForm(false);
        fetchSkills();
        if (onRefreshWorkspace) onRefreshWorkspace();
      } else {
        setSaveStatus(`Gagal: ${data.error || 'Terjadi kesalahan'}`);
      }
    } catch (err: any) {
      setSaveStatus(`Error: ${err.message}`);
    } finally {
      setSavingSkill(false);
    }
  };

  const filteredSkills = skillsList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f0d1b',
          border: '1px solid #f97316',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          height: '85vh',
          maxHeight: '760px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(249, 115, 22, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'inherit',
          color: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.18) 0%, rgba(15, 13, 27, 0.5) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '0.5px' }}>
                PENGATURAN STUDIO NARA
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Kelola Karakter, Rekrut Kru Tamu, Pasang Agent Skills, & Panduan Perintah Studio
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '6px 10px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#161329',
            padding: '0 16px',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'skills' ? '3px solid #f97316' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'skills' ? '#f97316' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            🧩 Agent Skills ({skillsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('character')}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'character' ? '3px solid #ec4899' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'character' ? '#ec4899' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            👗 Ganti Karakter
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hire')}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'hire' ? '3px solid #22c55e' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'hire' ? '#22c55e' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            ➕ Rekrut Kru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tips')}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'tips' ? '3px solid #3b82f6' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'tips' ? '#3b82f6' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            💡 Tips & Perintah (CLI)
          </button>
        </div>

        {/* Tab Content Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: activeTab === 'character' ? '0' : '20px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* TAB 1: AGENT SKILLS */}
          {activeTab === 'skills' && (
            <div>
              {/* Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Cari skill yang terpasang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: '#1b1733',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    color: '#ffffff',
                    fontSize: '12px',
                    width: '260px',
                  }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={fetchSkills}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSkillForm(!showAddSkillForm)}
                    style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)',
                    }}
                  >
                    {showAddSkillForm ? '✕ Tutup Form' : '➕ Tambah Skill Baru'}
                  </button>
                </div>
              </div>

              {/* Form Tambah Skill Baru */}
              {showAddSkillForm && (
                <form
                  onSubmit={handleCreateSkill}
                  style={{
                    backgroundColor: '#161329',
                    border: '1px solid #f97316',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#fb923c' }}>
                    📝 Tambah Agent Skill Baru ke Workspace
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Nama Skill (Kebab-case, misal: <code>tiktok-trends-scraper</code>):
                    </label>
                    <input
                      type="text"
                      placeholder="nama-skill-baru"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1c1836',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Deskripsi Singkat:
                    </label>
                    <input
                      type="text"
                      placeholder="Panduan pembuatan..."
                      value={newSkillDesc}
                      onChange={(e) => setNewSkillDesc(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1c1836',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Instruksi & Aturan Kerja Teknis (Markdown):
                    </label>
                    <textarea
                      rows={5}
                      placeholder="# Panduan Langkah demi Langkah..."
                      value={newSkillInstructions}
                      onChange={(e) => setNewSkillInstructions(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1c1836',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {saveStatus && (
                    <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>{saveStatus}</div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddSkillForm(false)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#94a3b8',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingSkill}
                      style={{
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '6px',
                        padding: '6px 18px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {savingSkill ? 'Menyimpan...' : 'Simpan Skill'}
                    </button>
                  </div>
                </form>
              )}

              {/* Daftar Skills Grid */}
              {loadingSkills ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Memuat daftar skill yang terpasang...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
                  {filteredSkills.map((sk) => (
                    <div
                      key={sk.id}
                      style={{
                        backgroundColor: '#17142b',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: '#f97316' }}>
                            🧩 {sk.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              backgroundColor: 'rgba(34, 197, 94, 0.15)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                            }}
                          >
                            v{sk.version} • Terpasang
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {sk.description}
                        </p>
                      </div>

                      <div style={{ fontSize: '10px', color: '#64748b', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Author: {sk.author}</span>
                        <span>Lokasi: skills/{sk.id}/</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GANTI KARAKTER EMBEDDED (SEAMLESS TAB) */}
          {activeTab === 'character' && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <CharacterSettingsModal embedded onClose={onClose} onSaved={() => {}} />
            </div>
          )}

          {/* TAB 3: REKRUT KRU EMBEDDED (SEAMLESS TAB) */}
          {activeTab === 'hire' && (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px' }}>
              <HireModal embedded onClose={onClose} onHired={() => {}} />
            </div>
          )}

          {/* TAB 4: TIPS & PERINTAH CLI STUDIO */}
          {activeTab === 'tips' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#93c5fd',
                  lineHeight: 1.5,
                }}
              >
                💡 <strong>Petunjuk Penting:</strong> Jalankan perintah <code>npm run</code> (seperti <code>npm run dev:office-agy</code> atau <code>npm run dev:office-ds</code>) melalui <strong>chat AGY / DeepSeek</strong> (bukan terminal luar) agar order video dari kantor otomatis terhubung langsung ke mesin produksi AI!
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {STUDIO_TIPS.map((tip, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#17142b',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <code
                        style={{
                          backgroundColor: '#0a0914',
                          border: '1px solid rgba(249, 115, 22, 0.3)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: '#fb923c',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                          flex: 1,
                        }}
                      >
                        {tip.cmd}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyCmd(tip.cmd)}
                        style={{
                          backgroundColor: copiedCmd === tip.cmd ? '#22c55e' : 'rgba(255, 255, 255, 0.08)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.2s',
                        }}
                      >
                        {copiedCmd === tip.cmd ? '✓ Disalin' : '📋 Salin'}
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {tip.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
