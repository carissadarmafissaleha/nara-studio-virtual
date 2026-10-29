import React, { useState, useEffect } from 'react';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  embedded?: boolean;
}

interface AgentOption {
  role: string;
  defaultName: string;
  defaultSprite: string;
  defaultColor: string;
  label: string;
  agentId: string;
}

const AGENTS_LIST: AgentOption[] = [
  { role: 'boss', defaultName: 'Caca', defaultSprite: 'Frontend-dev-1', defaultColor: '#ec4899', label: '👑 Bos (Caca)', agentId: 'boss-caca' },
  { role: 'assistant', defaultName: 'Nara', defaultSprite: 'employee-2', defaultColor: '#f97316', label: '✨ Asisten (Nara)', agentId: 'assistant-claude' },
  { role: 'scriptwriter', defaultName: 'Lumi', defaultSprite: 'employee-3', defaultColor: '#f43f5e', label: '✍️ Penulis (Lumi)', agentId: 'lumi-script' },
  { role: 'voiceover', defaultName: 'Opi', defaultSprite: 'explore-1', defaultColor: '#06b6d4', label: '🎙️ Voiceover (Opi)', agentId: 'opi-vo' },
  { role: 'video-editor', defaultName: 'Jeje', defaultSprite: 'dev-2', defaultColor: '#10b981', label: '🎬 Editor (Jeje)', agentId: 'jeje-edit' },
];

interface SpriteOption {
  id: string;
  label: string;
  gender: 'female' | 'male';
  desc: string;
}

// 100% Casual Dev & Tech Sprites — Zero Formal / Zero Jas Resmi
const DEV_SPRITES: SpriteOption[] = [
  // Cewek Dev
  { id: 'Frontend-dev-1', label: 'Lead Dev Cewek', gender: 'female', desc: 'Rambut kuncir, kaos kasual' },
  { id: 'employee-2', label: 'Creative Dev Cewek', gender: 'female', desc: 'Sweater kasual hipster' },
  { id: 'employee-3', label: 'Casual Dev Cewek', gender: 'female', desc: 'Kaos santai harian' },

  // Cowok / Tech Dev
  { id: 'dev-1', label: 'Frontend Coder', gender: 'male', desc: 'Kacamata, kaos santai' },
  { id: 'dev-2', label: 'Fullstack Dev', gender: 'male', desc: 'Hoodie kasual tech' },
  { id: 'explore-1', label: 'Tech Explorer', gender: 'male', desc: 'Jaket santai outdoor' },
  { id: 'security-audit-1', label: 'Cyber / Hacker', gender: 'male', desc: 'Kaos hitam santai geek' },
  { id: 'Claude-1', label: 'Hoodie Nara Dev', gender: 'male', desc: 'Hoodie developer' },
  { id: 'Me-1', label: 'Indie Hacker Dev', gender: 'male', desc: 'T-shirt santai' },
];

export const CharacterSettingsModal: React.FC<Props> = ({ onClose, onSaved, embedded = false }) => {
  const [selectedRole, setSelectedRole] = useState<string>('boss');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');

  // Custom states per role
  const [names, setNames] = useState<Record<string, string>>({});
  const [sprites, setSprites] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedSprites = JSON.parse(localStorage.getItem('nara-char-sprites') || '{}');
      const savedNames = JSON.parse(localStorage.getItem('nara-char-names') || '{}');
      const savedColors = JSON.parse(localStorage.getItem('nara-char-colors') || '{}');

      const initSprites: Record<string, string> = {};
      const initNames: Record<string, string> = {};
      const initColors: Record<string, string> = {};

      for (const a of AGENTS_LIST) {
        initSprites[a.role] = savedSprites[a.role] || savedSprites[a.agentId] || a.defaultSprite;
        initNames[a.role] = savedNames[a.role] || savedNames[a.agentId] || a.defaultName;
        initColors[a.role] = savedColors[a.role] || savedColors[a.agentId] || a.defaultColor;
      }

      setSprites(initSprites);
      setNames(initNames);
      setColors(initColors);
    } catch {}
  }, []);

  const activeAgent = AGENTS_LIST.find((a) => a.role === selectedRole) || AGENTS_LIST[0];
  const activeSpriteId = sprites[selectedRole] || activeAgent.defaultSprite;
  const previewImgSrc = `/sprites/characters/${activeSpriteId}-front-left.png`;

  const handleSelectSprite = (spriteId: string) => {
    setSprites((prev) => ({ ...prev, [selectedRole]: spriteId }));
  };

  const handleSave = async () => {
    setStatusMsg('Menyimpan pengaturan dev santai...');
    try {
      const finalSprites: Record<string, string> = { ...sprites };
      const finalNames: Record<string, string> = { ...names };

      if (sprites['video-editor']) {
        finalSprites['video-editor'] = sprites['video-editor'];
        finalSprites['remotion-coder'] = sprites['video-editor'];
        finalSprites['jeje-edit'] = sprites['video-editor'];
      }
      if (sprites['voiceover']) {
        finalSprites['voiceover'] = sprites['voiceover'];
        finalSprites['audio-sync'] = sprites['voiceover'];
        finalSprites['opi-vo'] = sprites['voiceover'];
      }
      if (sprites['scriptwriter']) {
        finalSprites['scriptwriter'] = sprites['scriptwriter'];
        finalSprites['lumi-script'] = sprites['scriptwriter'];
      }
      if (sprites['boss']) {
        finalSprites['boss'] = sprites['boss'];
        finalSprites['boss-caca'] = sprites['boss'];
      }
      if (sprites['assistant']) {
        finalSprites['assistant'] = sprites['assistant'];
        finalSprites['assistant-claude'] = sprites['assistant'];
      }

      localStorage.setItem('nara-char-sprites', JSON.stringify(finalSprites));
      localStorage.setItem('nara-char-names', JSON.stringify(finalNames));
      localStorage.setItem('nara-char-colors', JSON.stringify(colors));

      await fetch('/api/theme/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprites: finalSprites, names: finalNames, colors }),
      }).catch(() => {});

      setStatusMsg('✨ Pengaturan kostum berhasil disimpan!');
      onSaved?.();
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 700);
    } catch {
      setStatusMsg('Tersimpan di lokal!');
      setTimeout(() => onClose(), 800);
    }
  };

  const filteredSprites = DEV_SPRITES.filter((s) => {
    if (genderFilter === 'female') return s.gender === 'female';
    if (genderFilter === 'male') return s.gender === 'male';
    return true;
  });

  const innerContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        color: '#f8fafc',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Top Horizontal Agent Selector (100% Mobile & Desktop Friendly) */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 10px',
            backgroundColor: '#12101e',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            flexShrink: 0,
          }}
        >
          {AGENTS_LIST.map((agent) => {
            const isSelected = selectedRole === agent.role;
            return (
              <button
                key={agent.role}
                type="button"
                onClick={() => setSelectedRole(agent.role)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: isSelected ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#1c192e',
                  border: isSelected ? '1px solid #fb923c' : '1px solid #2e2946',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{agent.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#090812',
          }}
        >
          {/* Active Agent Banner: Preview + Name Input + Color */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              backgroundColor: '#141222',
              borderRadius: '10px',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '8px',
                backgroundColor: '#0d0b16',
                border: '1px solid #2a253e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src={previewImgSrc}
                alt={activeAgent.defaultName}
                style={{
                  height: '46px',
                  width: 'auto',
                  imageRendering: 'pixelated',
                  filter: `drop-shadow(0 0 1px ${colors[selectedRole] ?? activeAgent.defaultColor})`,
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                Nama Karakter:
              </div>
              <input
                type="text"
                value={names[selectedRole] ?? activeAgent.defaultName}
                onChange={(e) => setNames({ ...names, [selectedRole]: e.target.value })}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  backgroundColor: '#0c0a14',
                  border: '1px solid #3b3558',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  marginTop: '3px',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>Warna</span>
              <input
                type="color"
                value={colors[selectedRole] ?? activeAgent.defaultColor}
                onChange={(e) => setColors({ ...colors, [selectedRole]: e.target.value })}
                style={{
                  width: '32px',
                  height: '30px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
                title="Pilih warna aura karakter"
              />
            </div>
          </div>

          {/* Gender Filter Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fb923c' }}>
              PILIH SPRITE KASUAL ({filteredSprites.length} OPSI)
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setGenderFilter('all')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: genderFilter === 'all' ? '#f97316' : '#1e1b2e',
                  border: 'none',
                  color: '#fff',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('female')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: genderFilter === 'female' ? '#f97316' : '#1e1b2e',
                  border: 'none',
                  color: '#fff',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                👩 Cewek
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('male')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: genderFilter === 'male' ? '#f97316' : '#1e1b2e',
                  border: 'none',
                  color: '#fff',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                👨 Cowok
              </button>
            </div>
          </div>

          {/* Sprite Cards Responsive Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
              gap: '8px',
            }}
          >
            {filteredSprites.map((sprite) => {
              const isSelected = activeSpriteId === sprite.id;
              return (
                <div
                  key={sprite.id}
                  onClick={() => handleSelectSprite(sprite.id)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(249, 115, 22, 0.15)' : '#141222',
                    border: isSelected ? '2px solid #f97316' : '1px solid #28243d',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                >
                  <img
                    src={`/sprites/characters/${sprite.id}-front-left.png`}
                    alt={sprite.label}
                    style={{
                      height: '52px',
                      width: 'auto',
                      imageRendering: 'pixelated',
                      marginBottom: '6px',
                      filter: isSelected ? 'drop-shadow(0 0 4px #f97316)' : 'none',
                    }}
                  />
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#f1f5f9', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {sprite.label}
                  </div>
                  <div style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center', marginTop: '2px', lineHeight: 1.2 }}>
                    {sprite.desc}
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#f97316',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '14px',
                        height: '14px',
                        fontSize: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Footer */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#100e1b',
            borderTop: '1px solid rgba(249, 115, 22, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '10px', color: statusMsg ? '#4ade80' : '#94a3b8', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {statusMsg || 'Pilih kostum santai lalu tekan simpan.'}
          </div>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '7px 18px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(249, 115, 22, 0.35)',
            }}
          >
            💾 Simpan Kostum
          </button>
        </div>

    </div>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 12, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        fontFamily: "'JetBrains Mono', monospace",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(96vw, 760px)',
          maxHeight: '94dvh',
          backgroundColor: '#0e0d16',
          borderRadius: '16px',
          border: '1px solid rgba(249, 115, 22, 0.45)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(249, 115, 22, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            backgroundColor: '#161426',
            borderBottom: '1px solid rgba(249, 115, 22, 0.25)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '18px' }}>👗</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '12px', letterSpacing: '0.5px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                KOSTUM KARAKTER DEV STUDIO
              </div>
              <div style={{ fontSize: '9px', color: '#fb923c', whiteSpace: 'nowrap' }}>
                Avatar kasual & santai • Klik luar untuk tutup
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              fontSize: '15px',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Tutup"
          >
            ✕
          </button>
        </div>

        {innerContent}
      </div>
    </div>
  );
};
