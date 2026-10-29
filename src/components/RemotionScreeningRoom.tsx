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
/** Set by the footer when it opens the room for one specific draft. */
const FOCUS_KEY = 'nara_focus_comp';

const INITIAL_MOTION_PROJECTS: MotionItem[] = DISCOVERED_PROJECTS;

export const RemotionScreeningRoom: React.FC<Props> = ({ onClose }) => {
  // Live scan of src/remotion/compositions/*.tsx, so a draft built after this
  // bundle was compiled is still visible as "needs a reload" instead of missing.
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

  // Live motion compositions in studio (unrendered drafts)
  const [motionList, setMotionList] = useState<MotionItem[]>(INITIAL_MOTION_PROJECTS);

  const [selectedId, setSelectedId] = useState<string>(() => {
    const focused = focusComp
      ? INITIAL_MOTION_PROJECTS.find((item) => item.compName === focusComp)
      : null;
    return focused?.id || INITIAL_MOTION_PROJECTS[0]?.id || '';
  });

  const playerRef = useRef<PlayerRef>(null);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderFeedback, setRenderFeedback] = useState<string | null>(null);

  // Live export telemetry for the footer: a render started here (or approved in
  // ToDo) must show its progress and its result instead of going quiet.
  const studioJob = pickJob(useStudioStatus());

  // The disk is the source of truth. The loaded bundle was frozen at build time,
  // so a deleted composition is still importable here until the next reload -
  // prune it as soon as the server confirms it is gone from disk.
  useEffect(() => {
    if (!serverLoaded) return;
    const onDisk = new Set(serverComps.map((comp) => comp.compName));
    setMotionList((prev) => {
      const next = prev.filter((item) => onDisk.has(item.compName));
      return next.length === prev.length ? prev : next;
    });
  }, [serverLoaded, serverComps]);

  // Newest draft first: opening the room should show the composition that was
  // just ordered, not whichever file happens to sort first in the bundle.
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

  // On the first disk scan, jump to the freshest draft unless the footer asked
  // for a specific one. The bundle order says nothing about what is newest.
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
    const itemToDelete = motionList.find(m => m.id === idToDelete);

    // 1. Delete the file on disk. The disk is the only tombstone: a topic that
    //    is ordered again writes a fresh composition and comes back to life,
    //    which sticky localStorage tombstones used to block forever.
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

    // 2. Update state
    const updated = motionList.filter(m => m.id !== idToDelete);
    saveMotionList(updated);

    if (selectedId === idToDelete) {
      setSelectedId(updated.length > 0 ? updated[0].id : '');
    }
    setRenderStatus('🗑️ Video dihapus permanen dari studio.');
  };

  const handleRenderMP4 = async (comp: MotionItem) => {
    setIsRendering(true);
    setRenderFeedback('⏳ Sedang menyiapkan proses rendering Remotion...');
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
        setRenderFeedback(`🎬 Render dimulai! Tugas otomatis masuk ke ToDo (Sedang Dikerjakan). Target: out/${data.outputFileName}`);
      } else {
        setRenderFeedback(`⚠️ Gagal: ${data.error || 'Terjadi kesalahan'}`);
      }
    } catch (err: any) {
      setRenderFeedback(`⚠️ Error koneksi: ${err.message}`);
    } finally {
      setIsRendering(false);
      setTimeout(() => setRenderFeedback(null), 10000);
    }
  };

  const activeMotion = orderedList.find(m => m.id === selectedId);

  // A draft can exist on disk while this page still runs a bundle compiled
  // before it: import.meta.glob has no import for it, so the room would show
  // nothing and the order would look lost. Name it and offer the reload.
  const jobAwaitingReload: { compName: string; title: string } | null =
    studioJob && studioJob.draftReady && studioJob.compositionId && !hasComposition(studioJob.compositionId)
      ? { compName: studioJob.compositionId, title: studioJob.title }
      : null;
  const diskOnlyDraft = serverLoaded
    ? serverComps.find((comp) => !hasComposition(comp.compName)) || null
    : null;
  const pendingDraft: { compName: string; title: string } | null = diskOnlyDraft
    ? { compName: diskOnlyDraft.compName, title: diskOnlyDraft.title || diskOnlyDraft.compName }
    : jobAwaitingReload;

  // The footer reports whichever studio job is live: a draft being assembled
  // (so the room explains why the list is still empty) or an MP4 export.
  const liveActive = !!studioJob?.active;
  const showLive = !!studioJob;
  const liveFile = studioJob?.mp4Url || null;
  const liveLine = !studioJob
    ? null
    : studioJob.active
      ? `${studioJob.kind === 'draft' ? '🎬' : '🎞️'} ${studioJob.title} · ${studioJob.stat}${
          studioJob.eta != null ? ` · ETA ${studioJob.eta}s` : ''
        } — ${studioJob.message}`
      : studioJob.done
        ? studioJob.kind === 'draft'
          ? `✅ Draf "${studioJob.title}" siap dipreview${studioJob.message ? ` — ${studioJob.message}` : ''}`
          : `✅ MP4 siap: ${studioJob.mp4Url || 'out/'}`
        : `⚠️ ${studioJob.label} — ${studioJob.message}`;

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
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(96vw, 760px)',
          maxHeight: '94dvh',
          backgroundColor: '#0e0d16',
          borderRadius: '16px',
          border: '1px solid rgba(249, 115, 22, 0.45)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(249, 115, 22, 0.25)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: '#161426',
            borderBottom: '1px solid rgba(249, 115, 22, 0.25)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎬</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px', color: '#f8fafc' }}>
                SCREENING ROOM • LIVE DRAFT PLAYER
              </div>
              <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                Preview live animasi Remotion sebelum render MP4 final
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
                fontSize: '16px',
                width: '30px',
                height: '30px',
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

        {/* Dynamic Motion List Tabs with Delete Button on Each Item */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            backgroundColor: '#12101e',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            flexShrink: 0,
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              flex: 1,
            }}
          >
            {orderedList.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: selectedId === m.id ? '#f97316' : '#1c192e',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: selectedId === m.id ? '1px solid #fb923c' : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px 12px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: selectedId === m.id ? 700 : 500,
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
                    background: selectedId === m.id ? 'rgba(0,0,0,0.25)' : 'rgba(244, 63, 94, 0.15)',
                    border: 'none',
                    color: selectedId === m.id ? '#ffffff' : '#f43f5e',
                    padding: '6px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Hapus video ini permanen"
                >
                  ✕
                </button>
              </div>
            ))}
            {orderedList.length === 0 && (
              <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '4px 6px' }}>
                Semua draf video telah dibersihkan
              </span>
            )}
          </div>
        </div>

        {/* A draft newer than this bundle: one reload makes it playable. */}
        {pendingDraft && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(167, 139, 250, 0.14)',
              borderBottom: '1px solid rgba(167, 139, 250, 0.35)',
              color: '#a78bfa',
              fontSize: '10px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 180px' }}>
              <span style={{ fontWeight: 800, letterSpacing: '0.6px', flexShrink: 0 }}>DRAF BARU:</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: '#c4b5fd',
                  fontWeight: 700,
                }}
                title={pendingDraft.title}
              >
                {pendingDraft.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem(FOCUS_KEY, pendingDraft.compName);
                } catch (_) {}
                window.location.reload();
              }}
              style={{
                flexShrink: 0,
                background: '#a78bfa',
                color: '#0f0e17',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title="Muat ulang halaman supaya draf baru bisa dipreview"
            >
              ⟳ Muat ulang
            </button>
          </div>
        )}

        {/* Live Remotion Player Container Only (Zero MP4 / Ready to Watch) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '12px',
            backgroundColor: '#090812',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '340px',
          }}
        >
          {activeMotion && COMPONENT_REGISTRY[activeMotion.compName] && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: (activeMotion.height || 1080) > (activeMotion.width || 1920) ? '290px' : '100%',
                  aspectRatio: `${activeMotion.width || 1920}/${activeMotion.height || 1080}`,
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.95)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  backgroundColor: '#000000',
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
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              </div>

              {/* Action Button: RENDER VIDEO MP4 -> masuk ToDo */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '14px',
                  width: '100%',
                  maxWidth: '360px',
                }}
              >
                <button
                  type="button"
                  onClick={() => activeMotion && handleRenderMP4(activeMotion)}
                  disabled={isRendering}
                  style={{
                    width: '100%',
                    padding: '11px 20px',
                    background: isRendering
                      ? '#334155'
                      : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: '#ffffff',
                    border: '1px solid #fb923c',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isRendering ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: isRendering ? 'none' : '0 4px 16px rgba(249, 115, 22, 0.45)',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                  }}
                >
                  {isRendering ? (
                    <>
                      <span>⏳</span>
                      <span>MENGIRIM INSTRUKSI RENDER...</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '15px' }}>🎬</span>
                      <span>RENDER VIDEO MP4</span>
                      <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>(Masuk ToDo)</span>
                    </>
                  )}
                </button>

                {renderFeedback && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: renderFeedback.includes('⚠️') ? '#f43f5e' : '#34d399',
                      textAlign: 'center',
                      background: 'rgba(0,0,0,0.5)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: renderFeedback.includes('⚠️') ? '1px solid rgba(244,63,94,0.35)' : '1px solid rgba(52,211,153,0.35)',
                      lineHeight: 1.4,
                    }}
                  >
                    {renderFeedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {!activeMotion && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '36px' }}>🎬</span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>Tidak ada draf video aktif di Screening Room</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Ketik instruksi di chat untuk membuat video baru.
              </div>
            </div>
          )}
        </div>

        {/* Footer Info Strip */}
        <div
          style={{
            padding: '8px 14px',
            backgroundColor: '#12101e',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: showLive
                  ? liveActive
                    ? studioJob?.kind === 'draft' ? '#a78bfa' : '#fbbf24'
                    : studioJob?.done ? '#34d399' : '#f87171'
                  : '#94a3b8',
                fontWeight: showLive ? 700 : 400,
              }}
              title={liveLine || renderStatus || ''}
            >
              {liveLine || renderStatus || (activeMotion ? `📐 ${activeMotion.width || 1920}x${activeMotion.height || 1080} • ${activeMotion.duration}s (${activeMotion.fps} FPS)` : 'Studio Siap')}
            </span>
            {showLive && studioJob?.done && liveFile && (
              <a
                href={liveFile}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  flexShrink: 0,
                  color: '#0e0d16',
                  background: '#34d399',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
                title="Buka hasil MP4 di tab baru"
              >
                ▶ Putar MP4
              </a>
            )}
          </div>
          <div style={{ color: '#fb923c', fontWeight: 600 }}>Remotion 4.x • Anti-PPT Mode</div>
        </div>
      </div>
    </div>
  );
};
