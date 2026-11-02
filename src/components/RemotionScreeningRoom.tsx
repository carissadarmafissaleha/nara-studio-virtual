import React, { useState, useEffect, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { pickJob, useStudioStatus } from '../useStudioStatus';
import { useServerCompositions } from '../useCompositions';
import {
  COMPONENT_REGISTRY,
  DISCOVERED_PROJECTS,
  type MotionItem,
} from '../remotionDiscovery';

interface Props {
  onClose?: () => void;
}

const STORAGE_KEY_COMPS = 'nara_motion_comps_v3';
const FOCUS_KEY = 'nara_focus_comp';
const INITIAL_MOTION_PROJECTS: MotionItem[] = DISCOVERED_PROJECTS;

export const RemotionScreeningRoom: React.FC<Props> = ({ onClose }) => {
  const { compositions: serverComps, loaded: serverLoaded } = useServerCompositions();

  const readFocus = (): string | null => {
    try {
      const wanted = sessionStorage.getItem(FOCUS_KEY);
      if (wanted) sessionStorage.removeItem(FOCUS_KEY);
      return wanted;
    } catch (_) {
      return null;
    }
  };
  const [focusComp] = useState<string | null>(readFocus);
  const [motionList, setMotionList] = useState<MotionItem[]>(INITIAL_MOTION_PROJECTS);
  const [selectedId, setSelectedId] = useState<string>(() => {
    const focused = focusComp
      ? INITIAL_MOTION_PROJECTS.find((item) => item.compName === focusComp || item.id === focusComp)
      : null;
    return focused?.id || INITIAL_MOTION_PROJECTS[0]?.id || '';
  });

  const playerRef = useRef<PlayerRef>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderFeedback, setRenderFeedback] = useState<string | null>(null);

  const studioJob = pickJob(useStudioStatus());

  // Merge server compositions with discovered bundle compositions
  useEffect(() => {
    if (!serverLoaded) return;
    const onDiskMap = new Map(serverComps.map((comp) => [comp.compName, comp]));
    const combined: MotionItem[] = [];
    const seen = new Set<string>();

    // 1. Add all serverComps that exist on disk
    for (const sc of serverComps) {
      combined.push({
        id: sc.id || sc.compName,
        title: sc.title || sc.compName,
        compName: sc.compName,
        duration: sc.duration || 30,
        frames: sc.frames || 900,
        fps: sc.fps || 30,
        width: sc.width || 1080,
        height: sc.height || 1920,
        order: sc.order ?? 50,
      });
      seen.add(sc.compName);
    }

    // 2. Add any from DISCOVERED_PROJECTS that are registered and not yet added
    for (const dp of DISCOVERED_PROJECTS) {
      if (!seen.has(dp.compName) && (onDiskMap.has(dp.compName) || COMPONENT_REGISTRY[dp.compName])) {
        combined.push(dp);
        seen.add(dp.compName);
      }
    }

    setMotionList(combined);
  }, [serverLoaded, serverComps]);

  const updatedAtByComp = new Map(serverComps.map((comp) => [comp.compName, comp.updatedAt]));
  const orderedList = [...motionList].sort((a, b) => {
    const freshest = (updatedAtByComp.get(b.compName) || 0) - (updatedAtByComp.get(a.compName) || 0);
    return freshest !== 0 ? freshest : (a.order ?? 50) - (b.order ?? 50);
  });

  // Keep selectedId valid & select focusComp or freshest draft
  const initialPickDone = useRef(false);
  useEffect(() => {
    if (orderedList.length === 0) {
      if (selectedId) setSelectedId('');
      return;
    }

    if (!initialPickDone.current) {
      initialPickDone.current = true;
      if (focusComp) {
        const focused = orderedList.find((m) => m.compName === focusComp || m.id === focusComp);
        if (focused) {
          setSelectedId(focused.id);
          return;
        }
      }
      setSelectedId(orderedList[0].id);
      return;
    }

    if (!orderedList.some((m) => m.id === selectedId)) {
      setSelectedId(orderedList[0].id);
    }
  }, [orderedList, selectedId, focusComp]);

  const saveMotionList = (newList: MotionItem[]) => {
    setMotionList(newList);
    try {
      localStorage.setItem(STORAGE_KEY_COMPS, JSON.stringify(newList));
    } catch (_) {}
  };

  const handleDeleteMotionItem = async (idToDelete: string) => {
    const itemToDelete = motionList.find((m) => m.id === idToDelete);
    try {
      await fetch('/api/compositions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: idToDelete,
          compName: itemToDelete?.compName || idToDelete,
        }),
      });
    } catch (_) {}

    const updated = motionList.filter((m) => m.id !== idToDelete);
    saveMotionList(updated);

    if (selectedId === idToDelete) {
      setSelectedId(updated.length > 0 ? updated[0].id : '');
    }
  };

  const handleRenderMP4 = async (comp: MotionItem) => {
    setIsRendering(true);
    setRenderFeedback('Menyiapkan proses render...');
    try {
      const res = await fetch('/api/render-remotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionId: comp.compName,
          title: comp.title,
          fps: comp.fps,
          width: comp.width,
          height: comp.height,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRenderFeedback(`Render dimulai! Tugas otomatis masuk kolom Proses di ToDo.`);
      } else {
        setRenderFeedback(`Gagal: ${data.error || 'Terjadi kesalahan'}`);
      }
    } catch (err: any) {
      setRenderFeedback(`Error koneksi: ${err.message}`);
    } finally {
      setIsRendering(false);
      setTimeout(() => setRenderFeedback(null), 8000);
    }
  };

  const activeMotion = orderedList.find((m) => m.id === selectedId);
  const isPlayable = Boolean(activeMotion && COMPONENT_REGISTRY[activeMotion.compName]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 5, 12, 0.85)',
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
          width: 'min(94vw, 680px)',
          maxHeight: '92vh',
          backgroundColor: '#12111f',
          borderRadius: '14px',
          border: '1px solid #2d2948',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'JetBrains Mono', -apple-system, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Sederhana */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#18162b',
            borderBottom: '1px solid #282442',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎬</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>
                Screening Room
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Preview & render video Remotion
              </div>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Tutup"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Pilihan Video (Sederhana & Bersih) */}
        {orderedList.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '8px 12px',
              background: '#0d0c18',
              borderBottom: '1px solid #231f3a',
              overflowX: 'auto',
            }}
          >
            {orderedList.map((m) => {
              const isActive = selectedId === m.id;
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: isActive ? '#f97316' : '#1c1a2e',
                    borderRadius: '6px',
                    border: `1px solid ${isActive ? '#ea580c' : '#2d2845'}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '5px 10px',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: 'inherit',
                    }}
                  >
                    {m.title}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMotionItem(m.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isActive ? '#ffffff' : '#f87171',
                      padding: '5px 7px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      borderLeft: `1px solid ${isActive ? 'rgba(255,255,255,0.2)' : '#2d2845'}`,
                    }}
                    title="Hapus draf ini"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Area Player Remotion */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            backgroundColor: '#090812',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'auto',
          }}
        >
          {activeMotion ? (
            isPlayable ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: (activeMotion.height || 1080) > (activeMotion.width || 1920) ? '280px' : '520px',
                    maxHeight: '60vh',
                    aspectRatio: `${activeMotion.width || 1920}/${activeMotion.height || 1080}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                    border: '1px solid #332d4f',
                    backgroundColor: '#000',
                  }}
                >
                  <Player
                    ref={playerRef}
                    component={COMPONENT_REGISTRY[activeMotion.compName]}
                    durationInFrames={activeMotion.frames}
                    compositionWidth={activeMotion.width || 1920}
                    compositionHeight={activeMotion.height || 1080}
                    fps={activeMotion.fps}
                    controls
                    autoPlay={false}
                    loop
                    numberOfSharedAudioTags={32}
                    playbackRate={1}
                    showVolumeControls
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                {/* Tombol Render (Sederhana & Ringkas) */}
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleRenderMP4(activeMotion)}
                    disabled={isRendering}
                    style={{
                      padding: '6px 14px',
                      background: isRendering ? '#334155' : '#f97316',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isRendering ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'inherit',
                      boxShadow: isRendering ? 'none' : '0 2px 8px rgba(249, 115, 22, 0.3)',
                    }}
                  >
                    {isRendering ? '⏳ Merender...' : '🎬 Render MP4'}
                  </button>

                  {renderFeedback && (
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '10px',
                        color: renderFeedback.includes('Gagal') || renderFeedback.includes('Error') ? '#f87171' : '#4ade80',
                        background: 'rgba(0,0,0,0.5)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'inline-block',
                      }}
                    >
                      {renderFeedback}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Draf ada di disk tetapi player perlu reload bundle */
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 24px',
                  background: 'rgba(28, 25, 48, 0.7)',
                  borderRadius: '12px',
                  border: '1px solid #3b3560',
                  maxWidth: '460px',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  Draf "{activeMotion.title}" Siap di Disk
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '14px' }}>
                  Komposisi baru telah dibuat di disk. Muat ulang tab browser untuk memuat kode player atau render langsung ke MP4.
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    style={{
                      padding: '6px 14px',
                      background: '#6366f1',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    ⟳ Muat Ulang Player
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRenderMP4(activeMotion)}
                    disabled={isRendering}
                    style={{
                      padding: '6px 14px',
                      background: isRendering ? '#334155' : '#f97316',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isRendering ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {isRendering ? '⏳ Merender...' : '🎬 Render MP4'}
                  </button>
                </div>
                {renderFeedback && (
                  <div
                    style={{
                      marginTop: '10px',
                      fontSize: '10px',
                      color: renderFeedback.includes('Gagal') || renderFeedback.includes('Error') ? '#f87171' : '#4ade80',
                      background: 'rgba(0,0,0,0.5)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'inline-block',
                    }}
                  >
                    {renderFeedback}
                  </div>
                )}
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              <div style={{ fontSize: '30px', marginBottom: '8px' }}>🎬</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
                Belum ada draf video aktif
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                Ketik instruksi di chat untuk mulai memproduksi video.
              </div>
            </div>
          )}
        </div>

        {/* Footer Sederhana */}
        <div
          style={{
            padding: '8px 14px',
            backgroundColor: '#12101e',
            borderTop: '1px solid #231f3a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#64748b',
          }}
        >
          <span>
            {activeMotion
              ? `${activeMotion.width || 1920}x${activeMotion.height || 1080} • ${activeMotion.fps} FPS • ${activeMotion.duration || Math.round(activeMotion.frames / activeMotion.fps)}s`
              : 'Studio Siap'}
          </span>
          {studioJob?.done && studioJob.mp4Url && (
            <a
              href={studioJob.mp4Url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 600 }}
            >
              ⬇ Unduh MP4
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
