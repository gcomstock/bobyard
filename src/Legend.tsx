import { MODE_LABELS, MODE_ROWS, visKey } from './model';
import type { ModeKey, RowDef } from './model';

interface LegendProps {
  mode: ModeKey;
  onModeChange: (mode: ModeKey) => void;
  hidden: Set<string>;
  onToggleVisibility: (row: RowDef) => void;
  activeValue: string | null | undefined; // undefined = no selection
  onSelectRow: (row: RowDef) => void;
  armedValue: string | null | undefined; // undefined = highlighter not armed
  onArmHighlighter: (row: RowDef) => void;
  onHoverRow: (row: RowDef | null) => void;
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function HighlighterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l-5 5 2 2 2 2 5-5" />
      <path d="M9 11l7.5-7.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L13 15" />
      <path d="M3 21h5" />
    </svg>
  );
}

export default function Legend(props: LegendProps) {
  const { mode, onModeChange, hidden, onToggleVisibility, activeValue, onSelectRow, armedValue, onArmHighlighter, onHoverRow } = props;
  const rows = MODE_ROWS[mode];
  const showDash = mode === 'type';

  return (
    <div className="legend">
      <div className="legend-modes" role="tablist">
        {(Object.keys(MODE_LABELS) as ModeKey[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={m === mode}
            className={`legend-mode-btn${m === mode ? ' active' : ''}`}
            onClick={() => onModeChange(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
      <div className="legend-header">
        <span className="swatch-spacer" />
        {showDash && <span className="dash-spacer" />}
        <span className="legend-label" />
        <span className="conf-header">Confidence</span>
        <span className="actions-spacer" />
      </div>
      <div className="legend-rows">
        {rows.map((row) => {
          const isHidden = hidden.has(visKey(mode, row.value));
          const isActive = activeValue !== undefined && activeValue === row.value;
          const isArmed = armedValue !== undefined && armedValue === row.value;
          return (
            <div
              key={row.label}
              className={`legend-row${isActive ? ' selected' : ''}${isHidden ? ' row-hidden' : ''}`}
              onClick={() => onSelectRow(row)}
              onPointerEnter={() => onHoverRow(row)}
              onPointerLeave={() => onHoverRow(null)}
            >
              <span className="swatch" style={{ background: row.color }} />
              {showDash && (
                <svg className="dash-sample" width="34" height="10" viewBox="0 0 34 10">
                  <line
                    x1="1"
                    y1="5"
                    x2="33"
                    y2="5"
                    stroke="#111"
                    strokeWidth="2.5"
                    strokeDasharray={row.dash}
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <span className="legend-label">{row.label}</span>
              <span className="conf-cell">
                <span
                  className={`confidence ${row.confidence >= 80 ? 'conf-high' : row.confidence >= 50 ? 'conf-mid' : 'conf-low'}`}
                  title={`AI confidence: ${row.confidence}/100`}
                >
                  {row.confidence}
                </span>
              </span>
              <span className="legend-actions">
                <button
                  className={`icon-btn ai-btn${isArmed ? ' armed' : ''}`}
                  title={`AI highlighter — paint to assign ${row.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onArmHighlighter(row);
                  }}
                >
                  <HighlighterIcon />
                  <span className="sparkle">✦</span>
                </button>
                <button
                  className="icon-btn eye-btn"
                  title={isHidden ? 'Show' : 'Hide'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(row);
                  }}
                >
                  <EyeIcon off={isHidden} />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
