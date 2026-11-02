import React, { useState, useEffect, useRef } from 'react';

interface TerminalLine {
  id: number;
  time: string;
  stream: 'stdout' | 'stderr';
  line: string;
}

interface Props {
  onClose: () => void;
}

export const TerminalLogModal: React.FC<Props> = ({ onClose }) => {
  const [logs, setLogs] = useState<TerminalLine[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchTerminalLogs = async () => {
    try {
      const res = await fetch('/api/terminal-logs?limit=300');
      const data = await res.json();
      if (data?.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchTerminalLogs();
    const interval = setInterval(fetchTerminalLogs, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleClear = async () => {
    try {
      await fetch('/api/terminal-logs/clear', { method: 'POST' });
      setLogs([]);
    } catch (_) {}
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: "'JetBrains Mono', monospace",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(92vw, 800px)',
          height: '75vh',
          backgroundColor: '#0c0d14',
          borderRadius: '8px',
          border: '1px solid #232536',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Simpel */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            borderBottom: '1px solid #1c1d2d',
            background: '#11121c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ color: '#22c55e', fontSize: '9px' }}>●</span>
            <span style={{ color: '#f1f5f9' }}>Terminal Log</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: '1px solid #2d3047',
                color: '#94a3b8',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title="Bersihkan log"
            >
              Bersihkan
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '16px',
                lineHeight: 1,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
              title="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Console Body Simpel */}
        <div
          style={{
            flex: 1,
            padding: '12px 14px',
            overflowY: 'auto',
            background: '#08090f',
            fontSize: '11px',
            lineHeight: 1.6,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#52525b', fontStyle: 'italic' }}>Belum ada log terminal...</div>
          ) : (
            logs.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                style={{
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  color: item.stream === 'stderr' ? '#f87171' : '#e2e8f0',
                }}
              >
                <span style={{ color: '#52525b', marginRight: '8px', userSelect: 'none' }}>
                  {item.time}
                </span>
                {item.line}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
