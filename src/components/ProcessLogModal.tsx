import React, { useState, useEffect } from 'react';

interface ProcessOrder {
  id: string;
  engine?: string;
  sender?: string;
  text?: string;
  status?: string;
  createdAt?: string;
  claimedAt?: string;
  claimedBy?: string;
  updatedAt?: string;
  stage?: string;
  compositionId?: string;
  hasProd?: boolean;
  prodFiles?: string[];
}

interface ProcessJob {
  state?: string;
  topic?: string;
  compositionId?: string;
  stage?: string;
  message?: string;
  percent?: number;
  stat?: string;
  eta?: number;
  tail?: string[];
  active?: boolean;
  done?: boolean;
  mp4Url?: string;
}

interface Props {
  onClose: () => void;
  onOpenScreening?: (compName?: string) => void;
}

export const ProcessLogModal: React.FC<Props> = ({ onClose, onOpenScreening }) => {
  const [orders, setOrders] = useState<ProcessOrder[]>([]);
  const [draftJob, setDraftJob] = useState<ProcessJob | null>(null);
  const [renderJob, setRenderJob] = useState<ProcessJob | null>(null);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/process-logs');
      const data = await res.json();
      if (data && data.ok) {
        setOrders(data.orders || []);
        setDraftJob(data.draftJob || null);
        setRenderJob(data.renderJob || null);
        setActiveTasks(data.activeTasks || []);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const timer = setInterval(fetchLogs, 2500);
    return () => clearInterval(timer);
  }, []);

  const filteredOrders = orders.filter((ord) => {
    if (filter === 'active') return ord.status === 'claimed' || ord.status === 'in_progress';
    if (filter === 'done') return ord.status === 'done';
    return true;
  });

  const handleCopyLogs = () => {
    const lines = [
      `=== NARA STUDIO PROCESS LOGS [${new Date().toLocaleString()}] ===`,
      `Total Orders: ${orders.length}`,
      `Active Tasks: ${activeTasks.length}`,
      '',
      '--- RECENT ORDERS ---',
      ...orders.map((o) => `[${o.status?.toUpperCase()}] ${o.id} (${o.engine}) - ${o.text?.slice(0, 80)}`),
      '',
      '--- LATEST DRAFT / RENDER JOB ---',
      draftJob?.message ? `Draft: ${draftJob.stage} - ${draftJob.message}` : 'Draft: Idle',
      renderJob?.message ? `Render: ${renderJob.stat} - ${renderJob.message}` : 'Render: Idle',
      '',
      '--- LOG TAIL ---',
      ...(draftJob?.tail || []),
      ...(renderJob?.tail || []),
    ].join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
        padding: '12px',
        fontFamily: "'JetBrains Mono', -apple-system, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(94vw, 760px)',
          maxHeight: '90vh',
          backgroundColor: '#11101e',
          borderRadius: '16px',
          border: '1px solid #2e2a4a',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            background: '#17152b',
            borderBottom: '1px solid #292446',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#f8fafc' }}>
                Log Proses Pengerjaan Tugas
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Aktivitas multi-agent, pipeline video, dan telemetri real-time
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyLogs}
              style={{
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(129, 140, 248, 0.4)',
                color: '#a5b4fc',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
              }}
              title="Salin seluruh log ke clipboard"
            >
              {copied ? '✔ Disalin' : '📋 Salin Log'}
            </button>
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
        </div>

        {/* Tab Filter & Status Quick Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            background: '#0d0c18',
            borderBottom: '1px solid #211c38',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'active', 'done'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                style={{
                  background: filter === tab ? '#6366f1' : 'transparent',
                  border: filter === tab ? 'none' : '1px solid #2a2544',
                  color: filter === tab ? '#ffffff' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: filter === tab ? 700 : 500,
                  fontFamily: 'inherit',
                }}
              >
                {tab === 'all' && `Semua (${orders.length})`}
                {tab === 'active' && `Dalam Proses (${orders.filter((o) => o.status === 'claimed' || o.status === 'in_progress').length})`}
                {tab === 'done' && `Selesai (${orders.filter((o) => o.status === 'done').length})`}
              </button>
            ))}
          </div>
          <div style={{ color: '#64748b', fontSize: '10px' }}>
            Auto-refresh 2.5s
          </div>
        </div>

        {/* Body Container Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Active Job Alert Card (if any running or recently finished) */}
          {(draftJob?.active || renderJob?.active || (draftJob?.percent && draftJob.percent < 100)) && (
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.15), rgba(30, 27, 75, 0.4))',
                border: '1.5px solid #6366f1',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⚡</span>
                  <span style={{ fontWeight: 800, fontSize: '12px', color: '#c7d2fe' }}>
                    PROSES SEDANG BERJALAN: {draftJob?.topic || renderJob?.topic || 'Eksekusi Tugas'}
                  </span>
                </div>
                <span style={{ color: '#818cf8', fontWeight: 700, fontSize: '12px' }}>
                  {draftJob?.percent || renderJob?.percent || 0}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: '#1e1b4b',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${draftJob?.percent || renderJob?.percent || 0}%`,
                    background: '#6366f1',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#e0e7ff' }}>
                {draftJob?.message || renderJob?.message || 'Memproses instruksi video...'}
              </div>
            </div>
          )}

          {/* List of Orders */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '12px' }}>
              Memuat log proses...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
                Tidak ada order pada filter ini
              </div>
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isExpanded = expandedOrder === ord.id;
              const isDone = ord.status === 'done';
              const isClaimed = ord.status === 'claimed' || ord.status === 'in_progress';

              return (
                <div
                  key={ord.id}
                  style={{
                    background: '#151326',
                    border: `1px solid ${isExpanded ? '#4f46e5' : '#272242'}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    transition: 'border 0.2s ease',
                  }}
                >
                  {/* Order Item Header */}
                  <div
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isExpanded ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                    }}
                    onClick={() => setExpandedOrder(isExpanded ? null : ord.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '3px 7px',
                          borderRadius: '4px',
                          background: isDone
                            ? 'rgba(16, 185, 129, 0.2)'
                            : isClaimed
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                          color: isDone ? '#34d399' : isClaimed ? '#fbbf24' : '#f87171',
                          border: `1px solid ${
                            isDone ? '#059669' : isClaimed ? '#d97706' : '#dc2626'
                          }`,
                        }}
                      >
                        {isDone ? '✔ SELESAI' : isClaimed ? '⏳ PROSES' : '❌ GAGAL'}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#f8fafc',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ord.text || 'Order Video'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          ID: {ord.id} • Dari: {ord.sender || 'User'} • Engine: {ord.engine || 'AI'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {ord.compositionId && onOpenScreening && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenScreening(ord.compositionId);
                          }}
                          style={{
                            background: '#f97316',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                          title="Preview video di Screening Room"
                        >
                          ▶ Screening
                        </button>
                      )}
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {isExpanded ? '▴' : '▾'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Step-by-Step Breakdown */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: '#0d0c18',
                        borderTop: '1px solid #231f3c',
                        fontSize: '11px',
                      }}
                    >
                      {/* Workflow Stepper */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                          TAHAPAN PENGERJAAN:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ background: '#1c1a2e', padding: '3px 8px', borderRadius: '4px', color: '#34d399' }}>
                            1. Terima Order ✔
                          </span>
                          <span style={{ background: '#1c1a2e', padding: '3px 8px', borderRadius: '4px', color: '#34d399' }}>
                            2. Riset & Naskah ✔
                          </span>
                          <span style={{ background: '#1c1a2e', padding: '3px 8px', borderRadius: '4px', color: '#34d399' }}>
                            3. Voiceover & SFX ✔
                          </span>
                          <span style={{ background: '#1c1a2e', padding: '3px 8px', borderRadius: '4px', color: '#34d399' }}>
                            4. Komposisi Remotion ✔
                          </span>
                          <span style={{ background: '#1c1a2e', padding: '3px 8px', borderRadius: '4px', color: '#34d399' }}>
                            5. Terdaftar di Screening Room ✔
                          </span>
                        </div>
                      </div>

                      {/* Detail Info & Files */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px' }}>Komposisi:</div>
                          <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                            {ord.compositionId || '(Belum diset)'}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '6px' }}>Waktu Klaim:</div>
                          <div style={{ color: '#cbd5e1' }}>
                            {ord.claimedAt ? new Date(ord.claimedAt).toLocaleTimeString() : '-'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '10px' }}>Aset & Berkas Produksi:</div>
                          <div style={{ color: '#cbd5e1' }}>
                            {ord.prodFiles && ord.prodFiles.length > 0
                              ? ord.prodFiles.join(', ')
                              : 'Tidak ada berkas disk khusus'}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '6px' }}>Status Selesai:</div>
                          <div style={{ color: '#34d399', fontWeight: 600 }}>
                            {ord.updatedAt ? new Date(ord.updatedAt).toLocaleTimeString() : 'Aktif'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Modal Info */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#151326',
            borderTop: '1px solid #231f3c',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          <span>
            Total Order Tersimpan: {orders.length}
          </span>
          <button
            type="button"
            onClick={fetchLogs}
            style={{
              background: 'none',
              border: 'none',
              color: '#818cf8',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            🔄 Segarkan Data
          </button>
        </div>
      </div>
    </div>
  );
};
