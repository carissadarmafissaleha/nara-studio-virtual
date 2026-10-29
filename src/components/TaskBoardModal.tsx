import React, { useState, useEffect, useRef } from 'react';
import type { SessionInfo } from '../types';
import { pickJob, useStudioStatus } from '../useStudioStatus';
import { hasComposition } from '../remotionDiscovery';

export interface TaskItem {
  id: string;
  subject: string;
  status: 'todo' | 'in_progress' | 'done';
  owner?: string;
  description?: string;
  reviewType?: 'screening' | 'script' | 'audio' | 'general';
  deliverables?: string;
  /** Set on a card that waits for the boss's approval before rendering. */
  approval?: 'render';
  compositionId?: string;
  compositionTitle?: string;
}

type TaskStatus = TaskItem['status'];

/** Label + warna per kolom, dipakai tombol hapus dan bar konfirmasi. */
const COLUMN_META: Record<TaskStatus, { label: string; color: string; tint: string }> = {
  todo: { label: 'Rencana', color: '#f59e0b', tint: 'rgba(245, 158, 11, 0.15)' },
  in_progress: { label: 'Proses', color: '#38bdf8', tint: 'rgba(56, 189, 248, 0.15)' },
  done: { label: 'Selesai', color: '#4ade80', tint: 'rgba(74, 222, 128, 0.15)' },
};

interface TaskBoardModalProps {
  sessions?: SessionInfo[];
  onClose: () => void;
  onOpenScreening?: () => void;
}

const TODO_STORAGE_KEY = 'nara_studio_kanban_tasks_v3';

const DEFAULT_TASKS: TaskItem[] = [
  {
    id: 'inflasi-task-1',
    subject: 'Riset Data & Naskah 5 Scene: Apa Itu Inflasi? (Bobo si Koin)',
    status: 'done',
    owner: 'Lumi',
    reviewType: 'script',
    description: 'Penyusunan naskah TikTok vertikal 9:16 (20 detik, 600 frames, 5 adegan) dengan maskot Bobo si Koin.',
    deliverables: 'Scene 1: Hook Kaget Uang Gak Berharga (0-3s)\nScene 2: Masalah Harga Naik & Stempel +50% (3-7s)\nScene 3: Penjelasan Inflasi & Metafora Daya Beli (7-13s)\nScene 4: 3 Tips Lawan Inflasi (13-18s)\nScene 5: CTA Follow Akun & Konfeti (18-20s)',
  },
  {
    id: 'inflasi-task-2',
    subject: 'Voiceover Edge-TTS Bahasa Indonesia 5 Scene (id-ID-ArdiNeural)',
    status: 'done',
    owner: 'Opi',
    reviewType: 'audio',
    description: 'Perekaman narasi audio 5 adegan menggunakan Edge-TTS ArdiNeural dengan intonasi santai dan ekspresif.',
    deliverables: '5 Berkas audio tersimpan di public/audio/inflasi_scene_1.mp3 s/d inflasi_scene_5.mp3',
  },
  {
    id: 'inflasi-task-3',
    subject: 'Perakitan Komposisi Remotion 9:16 (Rig Bobo si Koin, Stempel +50% & Tips)',
    status: 'done',
    owner: 'Jeje',
    reviewType: 'screening',
    description: 'Komposisi React Remotion (ApaItuInflasi.tsx) 1080x1920 30FPS: Maskot SVG Bobo si Koin (mata kedip, mulut bicara, highlight sweep, lompat transisi, 3 kartu tips, stempel hantam).',
    deliverables: 'src/remotion/compositions/ApaItuInflasi.tsx (600 frames, 1080x1920)',
  },
  {
    id: 'inflasi-task-4',
    subject: 'Sinkronisasi Sound Effect & Kinetik (Screen Shake, Stempel Wow, Chime)',
    status: 'in_progress',
    owner: 'Opi',
    reviewType: 'audio',
    description: 'Penyelarasan efek suara hantaman stempel +50%, audio voiceover 5 scene, dan partikel konfeti.',
    deliverables: 'Audio cues tersinkronisasi di timeline Remotion',
  },
  {
    id: 'inflasi-task-5',
    subject: 'Screening Room Live Preview & 1-Klik Render MP4',
    status: 'todo',
    owner: 'Jeje',
    reviewType: 'screening',
    description: 'Preview live player interaktif di menu Screening Room dan ekspor MP4 via tombol 1-klik.',
    deliverables: 'Draf live di Screening Room dan tombol Render MP4 siap digunakan',
  },
];

export const TaskBoardModal: React.FC<TaskBoardModalProps> = ({ onClose, onOpenScreening }) => {
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(TODO_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return DEFAULT_TASKS;
  });

  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [selectedDetailTask, setSelectedDetailTask] = useState<TaskItem | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);
  /** Kolom yang sedang menunggu konfirmasi "hapus semua". */
  const [clearConfirm, setClearConfirm] = useState<null | TaskStatus>(null);
  /** Kartu yang baru dihapus, disimpan supaya bisa diurungkan. */
  const [undoClear, setUndoClear] = useState<null | { status: TaskStatus; tasks: TaskItem[] }>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  // The board covers the office footer, so it carries the studio log itself.
  const studioStatus = useStudioStatus();

  // Sync with studio /api/tasks from server
  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.tasks)) {
          setLocalTasks(data.tasks);
          try { localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(data.tasks)); } catch (_) {}
        }
      })
      .catch(() => {});
  }, []);

  /**
   * Persist the board. The POST is a merge on the server: cards the bridge or an
   * agent queued while this tab was open are kept, unless their id is listed in
   * `deletedIds`. Without that, an old local list could wipe a fresh approval
   * card and the render could never be approved.
   */
  const saveTasks = (updated: TaskItem[], deletedIds: string[] = []) => {
    setLocalTasks(updated);
    try {
      localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(updated));
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updated, deletedIds }),
      }).catch(() => {});
    } catch (_) {}
  };

  const handleGasTask = async (task: TaskItem) => {
    setExecutingTaskId(task.id);
    // 1. Move to in_progress immediately
    const updated = localTasks.map(t => t.id === task.id ? { ...t, status: 'in_progress' as const } : t);
    saveTasks(updated);

    // 2. Trigger execution on server
    try {
      await fetch('/api/tasks/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, action: 'gas' }),
      });
    } catch (_) {}

    // 3. Follow the real card on the server. There is no client-side fake
    //    "done": Opi's VO card and Nara's timeline card are completed by the
    //    bridge only after the narration and the mix really exist.
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if (!data.ok || !Array.isArray(data.tasks)) return;
        setLocalTasks(data.tasks);
        try { localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(data.tasks)); } catch (_) {}
        const fresh = data.tasks.find((t: TaskItem) => t.id === task.id);
        if (!fresh || fresh.status === 'done' || fresh.status === 'todo') {
          clearInterval(poll);
          setExecutingTaskId(null);
        }
      } catch (_) {}
    }, 2000);
    setTimeout(() => {
      clearInterval(poll);
      setExecutingTaskId(null);
    }, 180000);
  };

  /** The boss's approval: this is the only place a queued draft starts rendering. */
  const handleApproveRender = async (task: TaskItem) => {
    setExecutingTaskId(task.id);
    saveTasks(localTasks.map(t => t.id === task.id ? { ...t, status: 'in_progress' as const } : t));

    try {
      await fetch('/api/tasks/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, action: 'render', compositionId: task.compositionId }),
      });
    } catch (_) {}

    // The render runs inside the server process; follow its card until it settles.
    const startedAt = Date.now();
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if (data.ok && Array.isArray(data.tasks)) {
          setLocalTasks(data.tasks);
          try { localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(data.tasks)); } catch (_) {}
          const fresh = data.tasks.find((t: TaskItem) => t.id === task.id);
          if (!fresh || fresh.status === 'done' || fresh.status === 'todo') {
            clearInterval(poll);
            setExecutingTaskId(null);
            return;
          }
        }
      } catch (_) {}
      if (Date.now() - startedAt > 15 * 60_000) {
        clearInterval(poll);
        setExecutingTaskId(null);
      }
    }, 5000);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const updated: TaskItem[] = [
      ...localTasks,
      {
        id: String(Date.now()),
        subject: newTaskText.trim(),
        status: 'todo',
        owner: 'Tim Studio',
        description: 'Tugas kustom yang ditambahkan oleh pengguna.',
        reviewType: 'general',
      },
    ];
    saveTasks(updated);
    setNewTaskText('');
  };

  const handleMoveStatus = (id: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    const updated = localTasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
    saveTasks(updated);
    if (selectedDetailTask && selectedDetailTask.id === id) {
      setSelectedDetailTask({ ...selectedDetailTask, status: newStatus });
    }
  };

  const handleDeleteTask = (id: string) => {
    const updated = localTasks.filter(t => t.id !== id);
    saveTasks(updated, [id]);
    if (selectedDetailTask && selectedDetailTask.id === id) {
      setSelectedDetailTask(null);
    }
  };

  /**
   * Hapus seluruh kartu di satu kolom. Dua langkah: klik ikon sampah dulu
   * (clearConfirm), baru ini dijalankan dari tombol "Ya, hapus".
   * Id yang dibuang dikirim sebagai deletedIds supaya server tidak
   * memunculkannya lagi lewat jalur merge.
   */
  const handleClearColumn = (status: TaskStatus) => {
    const removed = localTasks.filter(t => t.status === status);
    if (!removed.length) return;
    const ids = removed.map(t => t.id);
    const updated = localTasks.filter(t => t.status !== status);
    setLocalTasks(updated);
    saveTasks(updated, ids);
    setClearConfirm(null);
    setUndoClear({ status, tasks: removed });
    if (selectedDetailTask && selectedDetailTask.status === status) {
      setSelectedDetailTask(null);
    }
  };

  /** Kembalikan kartu yang baru saja dihapus dari satu kolom. */
  const handleUndoClear = () => {
    if (!undoClear) return;
    const restored = [...localTasks, ...undoClear.tasks];
    setLocalTasks(restored);
    saveTasks(restored);
    setUndoClear(null);
  };

  // Konfirmasi yang dibiarkan menggantung menutup sendiri; tombol hapus tidak
  // boleh tetap "terpasang" berjam-jam sampai tidak sengaja terklik.
  useEffect(() => {
    if (!clearConfirm) return;
    const timer = setTimeout(() => setClearConfirm(null), 6000);
    return () => clearTimeout(timer);
  }, [clearConfirm]);

  // Jendela urungkan ditutup otomatis supaya tidak menumpuk di layar.
  useEffect(() => {
    if (!undoClear) return;
    const timer = setTimeout(() => setUndoClear(null), 12000);
    return () => clearTimeout(timer);
  }, [undoClear]);

  const handlePlayAudio = (file: string) => {
    if (activeAudioPlaying === file) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setActiveAudioPlaying(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audio = new Audio(`/audio/${file}`);
    audioPlayerRef.current = audio;
    audio.play().catch(() => {});
    setActiveAudioPlaying(file);
    audio.onended = () => setActiveAudioPlaying(null);
  };

  const todoTasks = localTasks.filter(t => t.status === 'todo');
  const inProgressTasks = localTasks.filter(t => t.status === 'in_progress');
  const doneTasks = localTasks.filter(t => t.status === 'done');

  const TrashIcon = () => (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M3 4h10M6.5 4V2.8h3V4M4.4 4l.6 9.2h6l.6-9.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  /** Badge jumlah + tombol hapus untuk kepala kolom. */
  const renderColumnActions = (status: TaskStatus, count: number) => {
    const meta = COLUMN_META[status];
    const armed = clearConfirm === status;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', background: meta.tint, color: meta.color, padding: '2px 6px', borderRadius: '10px' }}>
          {count}
        </span>
        <button
          type="button"
          className={`kanban-clear-btn${armed ? ' is-armed' : ''}`}
          onClick={() => setClearConfirm(armed ? null : status)}
          disabled={count === 0}
          aria-label={`Hapus semua kartu di kolom ${meta.label}`}
          aria-expanded={armed}
          title={count === 0 ? `Kolom ${meta.label} kosong` : `Hapus semua ${count} kartu di ${meta.label}`}
        >
          <TrashIcon />
        </button>
      </div>
    );
  };

  /** Bar konfirmasi dua langkah; hanya muncul untuk kolom yang sedang di-arm. */
  const renderClearConfirm = (status: TaskStatus, count: number) => {
    if (clearConfirm !== status) return null;
    const meta = COLUMN_META[status];
    return (
      <div className="kanban-clear-confirm" role="group" aria-label={`Konfirmasi hapus kolom ${meta.label}`}>
        <span className="kanban-clear-text">
          Hapus {count} kartu di {meta.label}?
        </span>
        <button type="button" className="kanban-clear-danger" onClick={() => handleClearColumn(status)}>
          Ya, hapus
        </button>
        <button type="button" className="kanban-clear-cancel" onClick={() => setClearConfirm(null)}>
          Batal
        </button>
      </div>
    );
  };

  const renderCard = (t: TaskItem, borderColor: string, statusColor: string) => {
    return (
      <div
        key={t.id}
        onClick={() => setSelectedDetailTask(t)}
        style={{
          backgroundColor: '#1a182e',
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = '#f97316';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = borderColor;
        }}
        title="Klik kartu untuk melihat detail & review"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: t.status === 'done' ? '#cbd5e1' : '#f1f5f9',
              lineHeight: 1.3,
            }}
          >
            {t.subject}
            {t.approval === 'render' && (
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
                Preview dulu di Screening Room - belum dirender
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: statusColor }}>
            👤 {t.owner || 'Studio'}
          </span>
          <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
            {/* Tombol Review Langsung */}
            <button
              type="button"
              onClick={() => setSelectedDetailTask(t)}
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: '0 2px 6px rgba(6, 182, 212, 0.35)',
              }}
              title="Review output tugas ini"
            >
              👁️ Review
            </button>

            {/* Action sesuai status */}
            {t.status === 'todo' && t.approval === 'render' && (
              <button
                type="button"
                onClick={() => handleApproveRender(t)}
                disabled={executingTaskId === t.id}
                style={{
                  background: executingTaskId === t.id ? '#1e293b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: executingTaskId === t.id ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
                }}
                title="Setujui dan mulai render MP4"
              >
                {executingTaskId === t.id ? 'Merender...' : 'Approve & Render'}
              </button>
            )}

            {t.status === 'todo' && t.approval !== 'render' && (
              <button
                type="button"
                onClick={() => handleGasTask(t)}
                disabled={executingTaskId === t.id}
                style={{
                  background: executingTaskId === t.id ? '#1e293b' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: executingTaskId === t.id ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)',
                }}
                title="Eksekusi tugas ini sekarang"
              >
                {executingTaskId === t.id ? 'Berjalan...' : 'Gas'}
              </button>
            )}

            {t.status === 'in_progress' && (
              <button
                type="button"
                onClick={() => handleMoveStatus(t.id, 'done')}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
                }}
                title="Tandai selesai"
              >
                ✅ Selesai
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDeleteTask(t.id)}
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: 'none',
                color: '#f43f5e',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Hapus tugas permanen"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    );
  };

  const studioJob = pickJob(studioStatus);
  // Finished draft that lives on disk but not in this bundle: reload to preview.
  const studioNeedsReload =
    !!studioJob &&
    studioJob.kind === 'draft' &&
    studioJob.draftReady &&
    !!studioJob.compositionId &&
    !hasComposition(studioJob.compositionId);

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
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(96vw, 920px)',
          maxHeight: '90vh',
          backgroundColor: '#0f0e17',
          borderRadius: '16px',
          border: '1px solid rgba(249, 115, 22, 0.45)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(249, 115, 22, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: "'JetBrains Mono', monospace",
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            backgroundColor: '#161426',
            borderBottom: '1px solid rgba(249, 115, 22, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <div>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#e2e8f0', letterSpacing: '0.5px' }}>
                PAPAN TUGAS & REVIEW STUDIO
              </span>
              <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                Klik kartu tugas atau tombol 👁️ Review untuk meninjau detail output
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
              fontSize: '16px',
              cursor: 'pointer',
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
        </div>

        {/* Studio log: the board is full-screen, so the office footer is hidden.
            Shows the same draft/render job the footer shows. */}
        {studioJob && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              fontSize: '10px',
              fontWeight: 600,
              backgroundColor: studioJob.active
                ? studioJob.kind === 'draft' ? 'rgba(167, 139, 250, 0.12)' : 'rgba(251, 191, 36, 0.10)'
                : studioJob.done
                  ? 'rgba(52, 211, 153, 0.12)'
                  : 'rgba(248, 113, 113, 0.14)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              color: studioJob.active
                ? studioJob.kind === 'draft' ? '#a78bfa' : '#fbbf24'
                : studioJob.done ? '#34d399' : '#f87171',
            }}
            role="status"
            aria-live="polite"
          >
            <span style={{ fontWeight: 800, letterSpacing: '0.8px', flexShrink: 0 }}>
              {studioJob.label}
            </span>
            <span style={{ flexShrink: 0 }}>{studioJob.title}</span>
            <span
              style={{
                flex: '0 0 110px',
                height: '4px',
                borderRadius: '2px',
                background: 'rgba(255, 255, 255, 0.12)',
                overflow: 'hidden',
              }}
              aria-hidden="true"
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${studioJob.percent}%`,
                  background: 'currentColor',
                  transition: 'width 0.4s linear',
                }}
              />
            </span>
            <span style={{ flexShrink: 0 }}>{studioJob.stat}</span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 400,
                color: '#94a3b8',
              }}
              title={studioJob.message}
            >
              {studioJob.message}
            </span>
            {studioJob.mp4Url && (
              <a
                href={studioJob.mp4Url}
                target="_blank"
                rel="noreferrer"
                style={{
                  flexShrink: 0,
                  background: '#34d399',
                  color: '#0f0e17',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                ▶ Putar MP4
              </a>
            )}
            {studioJob.draftReady && studioNeedsReload && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  flexShrink: 0,
                  background: '#a78bfa',
                  color: '#0f0e17',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                title="Draf sudah dibuat, halaman ini masih memakai bundle lama"
              >
                ⟳ Muat ulang
              </button>
            )}
            {studioJob.draftReady && !studioNeedsReload && onOpenScreening && (
              <button
                type="button"
                onClick={() => {
                  try {
                    if (studioJob.compositionId) sessionStorage.setItem('nara_focus_comp', studioJob.compositionId);
                  } catch (_) {}
                  setSelectedDetailTask(null);
                  onOpenScreening();
                }}
                style={{
                  flexShrink: 0,
                  background: '#a78bfa',
                  color: '#0f0e17',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ▶ Buka Screening
              </button>
            )}
          </div>
        )}

        {/* Quick Add Bar */}
        <form
          onSubmit={handleAddTask}
          style={{
            padding: '10px 16px',
            backgroundColor: '#12101e',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: '8px',
          }}
        >
          <input
            type="text"
            placeholder="Tambah tugas studio baru..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#1a182c',
              border: '1px solid #3b3558',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            + Tambah
          </button>
        </form>

        {/* 3 Kanban Columns */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            backgroundColor: '#0d0c14',
          }}
        >
          {/* TO DO (RENCANA) */}
          <div
            style={{
              backgroundColor: '#141222',
              borderRadius: '10px',
              padding: '10px',
              border: '1px solid #28243d',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '12px', color: '#f59e0b' }}>
                📋 RENCANA
              </span>
              {renderColumnActions('todo', todoTasks.length)}
            </div>
            {renderClearConfirm('todo', todoTasks.length)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {todoTasks.map(t => renderCard(t, 'rgba(245, 158, 11, 0.3)', '#fb923c'))}
              {todoTasks.length === 0 && (
                <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                  Tidak ada rencana
                </div>
              )}
            </div>
          </div>

          {/* IN PROGRESS (PROSES) */}
          <div
            style={{
              backgroundColor: '#141222',
              borderRadius: '10px',
              padding: '10px',
              border: '1px solid #28243d',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '12px', color: '#38bdf8' }}>
                ⚡ PROSES
              </span>
              {renderColumnActions('in_progress', inProgressTasks.length)}
            </div>
            {renderClearConfirm('in_progress', inProgressTasks.length)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {inProgressTasks.map(t => renderCard(t, 'rgba(56, 189, 248, 0.3)', '#38bdf8'))}
              {inProgressTasks.length === 0 && (
                <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                  Tidak ada tugas berjalan
                </div>
              )}
            </div>
          </div>

          {/* DONE (SELESAI) */}
          <div
            style={{
              backgroundColor: '#141222',
              borderRadius: '10px',
              padding: '10px',
              border: '1px solid #28243d',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '12px', color: '#4ade80' }}>
                ✅ SELESAI
              </span>
              {renderColumnActions('done', doneTasks.length)}
            </div>
            {renderClearConfirm('done', doneTasks.length)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {doneTasks.map(t => renderCard(t, 'rgba(74, 222, 128, 0.3)', '#4ade80'))}
              {doneTasks.length === 0 && (
                <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                  Belum ada yang selesai
                </div>
              )}
            </div>
          </div>
        </div>

        {undoClear && (
          <div className="kanban-undo" role="status" aria-live="polite">
            <span className="kanban-undo-text">
              {undoClear.tasks.length} kartu di {COLUMN_META[undoClear.status].label} dihapus.
            </span>
            <button type="button" className="kanban-undo-btn" onClick={handleUndoClear}>
              Urungkan
            </button>
            <button
              type="button"
              className="kanban-undo-close"
              aria-label="Tutup pemberitahuan"
              onClick={() => setUndoClear(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* MODAL DETAIL & REVIEW TASK POPUP OVERLAY */}
        {selectedDetailTask && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(4px)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setSelectedDetailTask(null)}
          >
            <div
              style={{
                backgroundColor: '#161426',
                border: '1px solid #f97316',
                borderRadius: '14px',
                width: '100%',
                maxWidth: '560px',
                maxHeight: '82vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.95), 0 0 25px rgba(249, 115, 22, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Detail */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.18) 0%, transparent 100%)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>👁️</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: '#ffffff' }}>
                      DETAIL & REVIEW TUGAS
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      Penanggung Jawab: <span style={{ color: '#fb923c', fontWeight: 700 }}>{selectedDetailTask.owner || 'Studio'}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDetailTask(null)}
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

              {/* Body Detail Content */}
              <div
                style={{
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  fontSize: '12px',
                }}
              >
                {/* Subject & Status */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Nama Tugas:
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', lineHeight: 1.4 }}>
                    {selectedDetailTask.subject}
                  </div>
                </div>

                {/* Deskripsi */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Deskripsi Pekerjaan:
                  </div>
                  <div style={{ backgroundColor: '#100e1b', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {selectedDetailTask.description || 'Tidak ada deskripsi detail tambahan.'}
                  </div>
                </div>

                {/* Deliverables / Output Review */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', marginBottom: '4px' }}>
                    📦 Hasil & Review Output:
                  </div>
                  <div style={{ backgroundColor: '#0c1524', padding: '12px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#e2e8f0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {selectedDetailTask.deliverables || 'Belum ada deliverable tersimpan.'}
                  </div>
                </div>

                {/* Interactive Audio Preview jika tipe audio */}
                {(selectedDetailTask.reviewType === 'audio' || selectedDetailTask.subject.toLowerCase().includes('voiceover')) && (
                  <div style={{ backgroundColor: '#131e24', border: '1px solid #0891b2', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                      🎙️ Dengarkan Pratinjau Voiceover (8 Scene):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '6px' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                        const fname = `uang_scene_${num}.mp3`;
                        const isThisPlaying = activeAudioPlaying === fname;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handlePlayAudio(fname)}
                            style={{
                              background: isThisPlaying ? '#ef4444' : '#1e293b',
                              border: isThisPlaying ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                              color: '#ffffff',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '10.5px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{isThisPlaying ? '⏸️' : '▶️'}</span>
                            <span>Scene {num}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interactive Screening Jump jika tipe screening/remotion */}
                {(selectedDetailTask.reviewType === 'screening' || selectedDetailTask.subject.toLowerCase().includes('screening') || selectedDetailTask.subject.toLowerCase().includes('remotion')) && (
                  <div style={{ backgroundColor: '#211326', border: '1px solid #f43f5e', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fda4af', marginBottom: '8px' }}>
                      🎬 Live Preview Remotion Tersedia!
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDetailTask(null);
                        onClose();
                        if (onOpenScreening) onOpenScreening();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '8px 20px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)',
                      }}
                    >
                      🎬 Buka Langsung di Screening Room
                    </button>
                  </div>
                )}

                {/* Status Switcher Buttons */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Ubah Status Tugas:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(selectedDetailTask.id, 'todo')}
                      style={{
                        background: selectedDetailTask.status === 'todo' ? '#f59e0b' : '#1e1b2e',
                        border: '1px solid #f59e0b',
                        color: selectedDetailTask.status === 'todo' ? '#000' : '#f59e0b',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📋 Rencana
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(selectedDetailTask.id, 'in_progress')}
                      style={{
                        background: selectedDetailTask.status === 'in_progress' ? '#38bdf8' : '#1e1b2e',
                        border: '1px solid #38bdf8',
                        color: selectedDetailTask.status === 'in_progress' ? '#000' : '#38bdf8',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Proses
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(selectedDetailTask.id, 'done')}
                      style={{
                        background: selectedDetailTask.status === 'done' ? '#22c55e' : '#1e1b2e',
                        border: '1px solid #22c55e',
                        color: selectedDetailTask.status === 'done' ? '#000' : '#22c55e',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✅ Selesai
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#100e1b',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedDetailTask.id)}
                  style={{
                    background: 'none',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Hapus Tugas
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedDetailTask.status === 'todo' && selectedDetailTask.approval === 'render' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleApproveRender(selectedDetailTask);
                        setSelectedDetailTask(null);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Approve &amp; Render
                    </button>
                  )}
                  {selectedDetailTask.status === 'todo' && selectedDetailTask.approval !== 'render' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleGasTask(selectedDetailTask);
                        setSelectedDetailTask(null);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Gas Eksekusi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDetailTask(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
