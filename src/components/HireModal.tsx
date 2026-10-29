import React, { useState } from 'react';
import { officeHttpBase } from '../serverUrl';

interface Props {
  onClose: () => void;
  onHired?: (agent: { id: string; name: string; role: string; task: string }) => void;
  embedded?: boolean;
}

interface RoleOption {
  role: string;
  defaultName: string;
  title: string;
  emoji: string;
  color: string;
  defaultTask: string;
}

const PRESET_ROLES: RoleOption[] = [
  { role: 'graphic-artist', defaultName: 'Kimi', title: 'Visual Artist', emoji: '🎨', color: '#ec4899', defaultTask: 'Merancang aset grafis & ilustrasi thumbnail' },
  { role: 'animator-3d', defaultName: 'Bimo', title: '3D Animator', emoji: '🎞️', color: '#8b5cf6', defaultTask: 'Membuat animasi partikel & efek gerak' },
  { role: 'researcher', defaultName: 'Deva', title: 'Researcher', emoji: '🔍', color: '#3b82f6', defaultTask: 'Riset mendalam data statistik & literatur' },
  { role: 'sound-designer', defaultName: 'Fino', title: 'Sound Designer', emoji: '🔊', color: '#eab308', defaultTask: 'Meracik Foley FX, audio mixing, dan ambient BGM' },
  { role: 'prompt-engineer', defaultName: 'Zaki', title: 'AI Storyboarder', emoji: '🤖', color: '#10b981', defaultTask: 'Menyusun visual prompt generatif' },
];

export const HireModal: React.FC<Props> = ({ onClose, onHired, embedded = false }) => {
  const [selectedRole, setSelectedRole] = useState<RoleOption>(PRESET_ROLES[0]);
  const [customName, setCustomName] = useState(PRESET_ROLES[0].defaultName);
  const [customTask, setCustomTask] = useState(PRESET_ROLES[0].defaultTask);
  const [isHiring, setIsHiring] = useState(false);
  const [hiredStatus, setHiredStatus] = useState<string | null>(null);

  const handleSelectRole = (opt: RoleOption) => {
    setSelectedRole(opt);
    setCustomName(opt.defaultName);
    setCustomTask(opt.defaultTask);
  };

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    setIsHiring(true);
    setHiredStatus(`🚀 Merekrut ${customName}...`);

    const newAgentId = `guest-${selectedRole.role}-${Date.now().toString().slice(-4)}`;
    const payload = {
      type: 'agent_spawned',
      agent: {
        id: newAgentId,
        name: customName.trim(),
        role: selectedRole.role,
        task: customTask.trim(),
        statusText: 'Kru baru tiba!',
        color: selectedRole.color,
        emoji: selectedRole.emoji,
      },
    };

    try {
      const res = await fetch(`${officeHttpBase()}/api/agent/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setHiredStatus(`⭐ ${customName} berhasil masuk kantor!`);
        fetch(`${officeHttpBase()}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: customName.trim(),
            role: selectedRole.role,
            text: `👋 Halo semua! Saya ${customName} (${selectedRole.title}), siap bantu: "${customTask.trim()}"!`,
          }),
        }).catch(() => {});

        if (onHired) {
          onHired({
            id: newAgentId,
            name: customName.trim(),
            role: selectedRole.role,
            task: customTask.trim(),
          });
        }

        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setHiredStatus('Gagal mengirim event rekrutmen.');
      }
    } catch (err: any) {
      setHiredStatus(`Error: ${err.message}`);
    } finally {
      setIsHiring(false);
    }
  };

  const formContent = (
    <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%', padding: embedded ? '8px 4px' : '0' }}>
      {/* Content Form Simpel */}
        <form onSubmit={handleHireSubmit} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Preset Roles - Chip Horisontal */}
          <div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {PRESET_ROLES.map((opt) => {
                const isSelected = selectedRole.role === opt.role;
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => handleSelectRole(opt)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(249, 115, 22, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected ? '1px solid #f97316' : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      flexShrink: 0,
                    }}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.defaultName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Input: Nama & Role */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Nama:
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1c192e',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#ffffff',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>
            <div style={{ flex: '1 1 55%' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Peran:
              </label>
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: selectedRole.color,
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '31px',
                  boxSizing: 'border-box',
                }}
              >
                <span>{selectedRole.emoji}</span>
                <span>{selectedRole.title}</span>
              </div>
            </div>
          </div>

          {/* Form Input: Tugas Pertama */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Tugas Pertama:
            </label>
            <input
              type="text"
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              placeholder="Contoh: Meriset data pemanasan global..."
              style={{
                width: '100%',
                backgroundColor: '#1c192e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: '#ffffff',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {hiredStatus && (
            <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700, textAlign: 'center' }}>
              {hiredStatus}
            </div>
          )}

          {/* Action Buttons Ringkas */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#94a3b8',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isHiring}
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(249, 115, 22, 0.35)',
              }}
            >
              {isHiring ? 'Memanggil...' : '➕ Rekrut Kru'}
            </button>
          </div>
        </form>

    </div>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#12101e',
          border: '1px solid #f97316',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 25px rgba(249, 115, 22, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'inherit',
          color: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal Ringkas */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.15) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>➕</span>
            <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.5px' }}>
              REKRUT KRU TAMU
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            ✕
          </button>
        </div>

        {formContent}
      </div>
    </div>
  );
};
