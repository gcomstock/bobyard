import { useState } from 'react';
import Legend from './Legend';
import TakeoffCanvas from './TakeoffCanvas';
import { SEED_RUNS, visKey } from './model';
import type { ModeKey, PipeRun, RowDef } from './model';

const PAGES = [
  { id: 'L1.0', title: 'Planting Notes' },
  { id: 'IP-101', title: 'Irrigation Plan' },
  { id: 'P-101', title: 'Plumbing Plan', active: true },
  { id: 'L1.1', title: 'Planting Plan' },
];

function ToolIcon({ d, extra }: { d: string; extra?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {extra && <path d={extra} />}
    </svg>
  );
}

const TOOLS = [
  { name: 'Select', d: 'M5 3l14 9-7 1-3 7z' },
  { name: 'Pan', d: 'M8 12V6a1.6 1.6 0 0 1 3.2 0v5m0-4a1.6 1.6 0 0 1 3.2 0v4m0-2.5a1.6 1.6 0 0 1 3.2 0V15a6 6 0 0 1-6 6h-.8a6 6 0 0 1-5-2.7L4 14.5a1.7 1.7 0 0 1 2.8-1.9L8 14' },
  { name: 'Line', d: 'M5 19L19 5', extra: 'M5 19h.01M19 5h.01' },
  { name: 'Polyline', d: 'M4 18l6-8 4 4 6-9' },
  { name: 'Count', d: 'M12 3v18M3 12h18' },
  { name: 'Measure', d: 'M3 17L17 3l4 4L7 21zM8 16l1.5 1.5M11 13l1.5 1.5M14 10l1.5 1.5M17 7l1.5 1.5' },
  { name: 'Text', d: 'M5 6V4h14v2M12 4v16M9 20h6' },
];

export default function App() {
  const [mode, setMode] = useState<ModeKey>('size');
  const [runs, setRuns] = useState<PipeRun[]>(SEED_RUNS);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // undefined = nothing selected/armed; null is a real value ("Unassigned")
  const [activeValue, setActiveValue] = useState<string | null | undefined>(undefined);
  const [armedRow, setArmedRow] = useState<RowDef | null>(null);
  const [hoverRow, setHoverRow] = useState<RowDef | null>(null);
  const armed = armedRow !== null;
  // hovering a legend row (or arming its highlighter) spotlights matching runs
  const emphasis = hoverRow ?? armedRow;

  function changeMode(m: ModeKey) {
    setMode(m);
    setActiveValue(undefined);
    setArmedRow(null);
    setHoverRow(null);
  }

  function toggleVisibility(row: RowDef) {
    const key = visKey(mode, row.value);
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectRow(row: RowDef) {
    setActiveValue((prev) => (prev === row.value ? undefined : row.value));
  }

  function armHighlighter(row: RowDef) {
    if (armedRow && armedRow.value === row.value) {
      setArmedRow(null);
    } else {
      setArmedRow(row);
      setActiveValue(row.value);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">Pages</div>
        {PAGES.map((p) => (
          <div key={p.id} className={`page-thumb${p.active ? ' active' : ''}`}>
            <div className="thumb-preview">
              <div className="thumb-line w60" />
              <div className="thumb-line w80" />
              <div className="thumb-line w40" />
              <div className="thumb-box" />
            </div>
            <div className="thumb-label">
              <span className="thumb-id">{p.id}</span> – {p.title}
            </div>
          </div>
        ))}
      </aside>

      <div className="main-col">
        <header className="toolbar">
          {TOOLS.map((t) => (
            <button key={t.name} className="tool-btn" title={t.name}>
              <ToolIcon d={t.d} extra={t.extra} />
            </button>
          ))}
          <div className="toolbar-spacer" />
          <span className="scale-readout">
            Scale: <strong>1/8" = 1'-0"</strong>
          </span>
          <button className="estimate-btn">Estimate →</button>
        </header>

        <main className="canvas-area">
          <TakeoffCanvas
            runs={runs}
            setRuns={setRuns}
            mode={mode}
            hidden={hidden}
            armed={armedRow}
            onDisarm={() => setArmedRow(null)}
            emphasis={emphasis}
          />
          <Legend
            mode={mode}
            onModeChange={changeMode}
            hidden={hidden}
            onToggleVisibility={toggleVisibility}
            activeValue={activeValue}
            onSelectRow={selectRow}
            armedValue={armed ? armedRow!.value : undefined}
            onArmHighlighter={armHighlighter}
            onHoverRow={setHoverRow}
          />
          <div className="takeoff-tab">Takeoff</div>
        </main>
      </div>
    </div>
  );
}
