import React, { useState, useEffect, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { pickJob, useStudioStatus } from '../useStudioStatus';
import { useServerCompositions } from '../useCompositions';
import {
  COMPONENT_REGISTRY,
  DISCOVERED_PROJECTS,
  hasComposition,
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
      ? INITIAL_MOTION_PROJECTS.find((item) => item.compName === focusComp)
      : null;
    return focused?.id || INITIAL_MOTION_PROJECTS[0]?.id || '';
  });

  const playerRef = useRef<PlayerRef>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderFeedback, setRenderFeedback] = useState<string | null>(null);

  const studioJob = pickJob(useStudioStatus());

  useEffect(() => {
    if (!serverLoaded) return;
    const onDisk = new Set(serverComps.map((comp) => comp.compName));
    setMotionList((prev) => {
      const next = prev.filter((item) => onDisk.has(item.compName));
      return next.length === prev.length ? prev : next;
    });
  }, [serverLoaded, serverComps]);

  const updatedAtByComp = new Map(serverComps.map((comp) => [comp.compName, comp.updatedAt]));
  const orderedList = [...motionList].sort((a, b) => {
    const freshest = (updatedAtByComp.get(b.compName) || 0) - (updatedAtByComp.get(a.compName) || 0);
    return freshest !== 0 ? freshest : (a.order ?? 50) - (b.order ?? 50);
  });

  useEffect(() => {
    if (orderedList.length > 0 && !orderedList.some((m) => m.id === selectedId)) {
      setSelectedId(orderedList[0].id);
    } else if (orderedList.length === 0) {
      setSelectedId('');
    }
  }, [motionList, selectedId, serverComps]);

  const autoPickedRef = useRef(false);
  useEffect(() => {
    if (!serverLoaded || autoPickedRef.current) return;
    autoPickedRef.current = true;
    if (focusComp) return;
    const newest = serverComps
      .filter((comp) => hasComposition(comp.compName))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const item = newest ? motionList.find((m) => m.compName === newest.compName) : null;
    if (item) setSelectedId(item.id);
  }, [serverLoaded, serverComps, motionList, focusComp]);

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
                Preview video Remotion
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
          {activeMotion && COMPONENT_REGISTRY[activeMotion.compName] ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: (activeMotion.height || 1080) > (activeMotion.width || 1920) ? '280px' : '520px',
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
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Tombol Utama Render */}
              <div style={{ marginTop: '14px', width: '100%', maxWidth: '320px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => activeMotion && handleRenderMP4(activeMotion)}
                  disabled={isRendering}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: isRendering ? '#334155' : '#f97316',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: isRendering ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontFamily: 'inherit',
                  }}
                >
                  {isRendering ? '⏳ Merender Video...' : '🎬 Render Video MP4'}
                </button>

                {renderFeedback && (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: renderFeedback.includes('Gagal') || renderFeedback.includes('Error') ? '#f87171' : '#4ade80',
                      background: 'rgba(0,0,0,0.4)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    {renderFeedback}
                  </div>
                )}
              </div>
            </div>
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
