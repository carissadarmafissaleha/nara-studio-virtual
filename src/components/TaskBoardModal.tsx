import React, { useState, useEffect } from 'react';
import type { SessionInfo } from '../types';

export interface TaskItem {
  id: string;
  subject: string;
  status: 'todo' | 'in_progress' | 'done';
  owner?: string;
  description?: string;
}

type TaskStatus = TaskItem['status'];

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
const TOMBSTONE_STORAGE_KEY = 'nara_studio_deleted_tasks_v1';

const readTombstones = (): Set<string> => {
  try {
    const raw = localStorage.getItem(TOMBSTONE_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
};

const saveTombstones = (set: Set<string>) => {
  try {
    localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
};

const syncTasksToServer = async (tasks: TaskItem[], deletedIds: string[] = [], replace: boolean = false) => {
  try {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, deletedIds, replace }),
    });
  } catch (_) {}
};

const DEFAULT_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    subject: 'Riset & Naskah Video Edukasi Animasi',
    status: 'done',
    owner: 'Lumi',
    description: 'Penyusunan alur cerita, hook 3 detik, dan naskah 5 adegan.',
  },
  {
    id: 'task-2',
    subject: 'Perekaman Voiceover (Sulih Suara) & SFX',
    status: 'done',
    owner: 'Opi',
    description: 'Perekaman audio narasi per adegan dengan Edge-TTS dan sound effects.',
  },
  {
    id: 'task-3',
    subject: 'Perakitan Komposisi Remotion & Kinetic Typography',
    status: 'in_progress',
    owner: 'Jeje',
    description: 'Animasi motion graphic vertikal 9:16 di 30/60 FPS.',
  },
];

export const TaskBoardModal: React.FC<TaskBoardModalProps> = ({ onClose }) => {
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(TODO_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_TASKS;
  });

  const [clearConfirm, setClearConfirm] = useState<TaskStatus | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(localTasks));
    } catch (_) {}
  }, [localTasks]);

  // Sync from backend server with tombstone filtering
  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.tasks)) {
          const tombstones = readTombstones();
          const valid = data.tasks.filter((t: TaskItem) => t && !tombstones.has(t.id));
          setLocalTasks((prev) => {
            const cleanPrev = prev.filter((p) => !tombstones.has(p.id));
            const prevIds = new Set(cleanPrev.map((p) => p.id));
            const merged = [...cleanPrev];
            for (const vt of valid) {
              if (!prevIds.has(vt.id)) merged.push(vt);
            }
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newTaskText.trim();
    if (!text) return;

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      subject: text,
      status: 'todo',
      owner: 'Studio',
    };

    const next = [newTask, ...localTasks];
    setLocalTasks(next);
    setNewTaskText('');
    syncTasksToServer(next);
  };

  const handleMoveStatus = (id: string, newStatus: TaskStatus) => {
    const next = localTasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    setLocalTasks(next);
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    syncTasksToServer(next);
  };

  const handleDeleteTask = (id: string) => {
    const tombstones = readTombstones();
    tombstones.add(id);
    saveTombstones(tombstones);

    const next = localTasks.filter((t) => t.id !== id);
    setLocalTasks(next);
    if (selectedTask?.id === id) setSelectedTask(null);

    syncTasksToServer(next, [id], true);
    fetch(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleClearColumn = (status: TaskStatus) => {
    const toDelete = localTasks.filter((t) => t.status === status).map((t) => t.id);
    const tombstones = readTombstones();
    toDelete.forEach((id) => tombstones.add(id));
    saveTombstones(tombstones);

    const next = localTasks.filter((t) => t.status !== status);
    setLocalTasks(next);
    setClearConfirm(null);

    syncTasksToServer(next, toDelete, true);
    fetch(`/api/tasks?status=${status}`, { method: 'DELETE' }).catch(() => {});
  };

  const todoTasks = localTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = localTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = localTasks.filter((t) => t.status === 'done');

  const renderColumnActions = (status: TaskStatus, count: number) => {
    const meta = COLUMN_META[status];
    const armed = clearConfirm === status;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: '10px',
            background: meta.tint,
            color: meta.color,
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 700,
          }}
        >
          {count}
        </span>
        <button
          type="button"
          className={`kanban-clear-btn${armed ? ' is-armed' : ''}`}
          onClick={() => setClearConfirm(armed ? null : status)}
          disabled={count === 0}
          title={count === 0 ? `Kolom ${meta.label} kosong` : `Hapus semua kartu di ${meta.label}`}
        >
          {armed ? 'Batal' : 'Hapus semua'}
        </button>
      </div>
    );
  };

  const renderClearConfirm = (status: TaskStatus, count: number) => {
    if (clearConfirm !== status) return null;
    const meta = COLUMN_META[status];
    return (
      <div className="kanban-clear-confirm" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '6px' }}>
        <span style={{ fontSize: '10px', color: '#fca5a5', flex: 1 }}>
          Hapus {count} kartu di {meta.label}?
        </span>
        <button
          type="button"
          onClick={() => handleClearColumn(status)}
          style={{
            background: '#ef4444',
            border: 'none',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Ya, hapus
        </button>
        <button
          type="button"
          onClick={() => setClearConfirm(null)}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            color: '#94a3b8',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Batal
        </button>
      </div>
    );
  };

  const renderCard = (t: TaskItem, statusColor: string) => {
    return (
      <div
        key={t.id}
        style={{
          backgroundColor: '#181628',
          border: '1px solid #2a2542',
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          cursor: 'pointer',
          transition: 'border-color 0.15s ease',
        }}
        onClick={() => setSelectedTask(t)}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.35 }}>
          {t.subject}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: statusColor }}>
            👤 {t.owner || 'Studio'}
          </span>

          <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
            {/* Quick status transitions */}
            {t.status === 'todo' && (
              <button
                type="button"
                onClick={() => handleMoveStatus(t.id, 'in_progress')}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ➔ Proses
              </button>
            )}
            {t.status === 'in_progress' && (
              <button
                type="button"
                onClick={() => handleMoveStatus(t.id, 'done')}
                style={{
                  background: '#16a34a',
                  border: 'none',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ➔ Selesai
              </button>
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleDeleteTask(t.id)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: 'none',
                color: '#f87171',
                fontSize: '10px',
                padding: '2px 5px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Hapus tugas"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  };

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
          width: 'min(94vw, 860px)',
          height: 'min(90vh, 620px)',
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
            <span style={{ fontSize: '18px' }}>📋</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>
                Papan Tugas Studio
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Kanban alur kerja produksi video
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
        </div>

        {/* Input Cepat Tambah Tugas */}
        <form
          onSubmit={handleAddTask}
          style={{
            padding: '8px 14px',
            background: '#0d0c18',
            borderBottom: '1px solid #231f3a',
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
              padding: '6px 10px',
              background: '#181628',
              border: '1px solid #2d2845',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '11px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              background: '#f97316',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Tambah
          </button>
        </form>

        {/* 3 Kolom Kanban Sederhana */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
            backgroundColor: '#090812',
          }}
        >
          {/* RENCANA */}
          <div
            style={{
              backgroundColor: '#12101e',
              borderRadius: '8px',
              padding: '10px',
              border: '1px solid #231f3a',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '11px', color: '#f59e0b' }}>
                📋 RENCANA
              </span>
              {renderColumnActions('todo', todoTasks.length)}
            </div>
            {renderClearConfirm('todo', todoTasks.length)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
              {todoTasks.map((t) => renderCard(t, '#f59e0b'))}
              {todoTasks.length === 0 && (
                <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
                  Tidak ada rencana
                </div>
              )}
            </div>
          </div>

          {/* PROSES */}
          <div
            style={{
              backgroundColor: '#12101e',
              borderRadius: '8px',
              padding: '10px',
              border: '1px solid #231f3a',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '11px', color: '#38bdf8' }}>
                ⚡ PROSES
              </span>
              {renderColumnActions('in_progress', inProgressTasks.length)}
            </div>
            {renderClearConfirm('in_progress', inProgressTasks.length)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
              {inProgressTasks.map((t) => renderCard(t, '#38bdf8'))}
              {inProgressTasks.length === 0 && (
                <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
                  Tidak ada tugas berjalan
                </div>
              )}
            </div>
          </div>

          {/* SELESAI */}
          <div
            style={{
              backgroundColor: '#12101e',
              borderRadius: '8px',
              padding: '10px',
              border: '1px solid #231f3a',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '11px', color: '#4ade80' }}>
                ✅ SELESAI
              </span>
              {renderColumnActions('done', doneTasks.length)}
            </div>
            {renderClearConfirm('done', doneTasks.length)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
              {doneTasks.map((t) => renderCard(t, '#4ade80'))}
              {doneTasks.length === 0 && (
                <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
                  Belum ada yang selesai
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Detail Sederhana jika kartu diklik */}
        {selectedTask && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setSelectedTask(null)}
          >
            <div
              style={{
                backgroundColor: '#18162b',
                border: '1px solid #3b3558',
                borderRadius: '10px',
                padding: '16px',
                width: '100%',
                maxWidth: '420px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                  {selectedTask.subject}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {selectedTask.description && (
                <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>
                  {selectedTask.description}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #282442' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Penanggung Jawab: <b style={{ color: '#f97316' }}>{selectedTask.owner || 'Studio'}</b>
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {selectedTask.status !== 'todo' && (
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(selectedTask.id, 'todo')}
                      style={{ fontSize: '10px', padding: '3px 8px', background: '#332d4f', border: 'none', color: '#f59e0b', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Ke Rencana
                    </button>
                  )}
                  {selectedTask.status !== 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(selectedTask.id, 'in_progress')}
                      style={{ fontSize: '10px', padding: '3px 8px', background: '#332d4f', border: 'none', color: '#38bdf8', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Ke Proses
                    </button>
                  )}
                  {selectedTask.status !== 'done' && (
                    <button
                      type="button"
                      onClick={() => handleMoveStatus(selectedTask.id, 'done')}
                      style={{ fontSize: '10px', padding: '3px 8px', background: '#332d4f', border: 'none', color: '#4ade80', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Ke Selesai
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
