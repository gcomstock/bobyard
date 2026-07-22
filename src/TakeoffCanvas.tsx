import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction, PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { IMG_W, IMG_H, nextId, rowFor, visKey } from './model';
import type { ModeKey, PipeRun, Point, RowDef } from './model';
import { distToPolyline, polylineToPath, simplify, straighten } from './geometry';

const OVERLAP_TOL = 16; // px distance from painted point to a run counting as overlap
const SIMPLIFY_TOL = 12;

interface CanvasProps {
  runs: PipeRun[];
  setRuns: Dispatch<SetStateAction<PipeRun[]>>;
  mode: ModeKey;
  hidden: Set<string>;
  armed: RowDef | null;
  onDisarm: () => void;
  emphasis: RowDef | null; // legend row being hovered/armed; non-matching runs dim
}

interface NodeRef {
  runId: string;
  idx: number;
}

interface SegRef {
  runId: string;
  idx: number; // segment between points[idx] and points[idx+1]
}

interface ExtendState {
  runId: string;
  atStart: boolean;
  added: number;
}

interface Analysis {
  points: Point[];
  color: string;
  phase: 'analyzing' | 'done';
  message: string;
}

export default function TakeoffCanvas({ runs, setRuns, mode, hidden, armed, onDisarm, emphasis }: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<NodeRef | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverNode, setHoverNode] = useState<NodeRef | null>(null);
  const [hoverSeg, setHoverSeg] = useState<SegRef | null>(null);
  const [extend, setExtend] = useState<ExtendState | null>(null);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [paint, setPaint] = useState<Point[] | null>(null);
  const paintRef = useRef<Point[] | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());
  const armedRef = useRef<RowDef | null>(null);
  armedRef.current = armed;

  const visibleRuns = runs.filter((r) => !hidden.has(visKey(mode, r[mode])));

  const isDim = (run: PipeRun) => emphasis !== null && run[mode] !== emphasis.value;

  function toImg(e: { clientX: number; clientY: number }): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(IMG_W, ((e.clientX - rect.left) / rect.width) * IMG_W)),
      y: Math.max(0, Math.min(IMG_H, ((e.clientY - rect.top) / rect.height) * IMG_H)),
    };
  }

  // ---- keyboard ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setExtend(null);
      setPaint(null);
      paintRef.current = null;
      if (armedRef.current) onDisarm();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDisarm]);

  // ---- node dragging ----
  function onNodePointerDown(e: ReactPointerEvent, node: NodeRef) {
    if (armed || extend) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = node;
    setDragging(true);
  }

  function onSvgPointerMove(e: ReactPointerEvent) {
    const p = toImg(e);
    setCursorPos(p);
    if (dragRef.current) {
      const { runId, idx } = dragRef.current;
      setRuns((prev) =>
        prev.map((r) => (r.id === runId ? { ...r, points: r.points.map((pt, i) => (i === idx ? p : pt)) } : r)),
      );
    } else if (paintRef.current) {
      const pts = paintRef.current;
      const last = pts[pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 3) {
        paintRef.current = [...pts, p];
        setPaint(paintRef.current);
      }
    }
  }

  function onSvgPointerUp() {
    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
    }
    if (paintRef.current) {
      finishPaint(paintRef.current);
      paintRef.current = null;
      setPaint(null);
    }
  }

  // ---- extend mode ----
  function startExtend(e: ReactMouseEvent, runId: string, atStart: boolean) {
    e.stopPropagation();
    if (extend && extend.runId === runId && extend.atStart === atStart) {
      setExtend(null);
    } else {
      setExtend({ runId, atStart, added: 0 });
    }
  }

  function onSvgClick(e: ReactMouseEvent) {
    if (!extend || armed) return;
    const p = toImg(e);
    setRuns((prev) =>
      prev.map((r) =>
        r.id === extend.runId ? { ...r, points: extend.atStart ? [p, ...r.points] : [...r.points, p] } : r,
      ),
    );
    setExtend({ ...extend, added: extend.added + 1 });
  }

  function onSvgDoubleClick() {
    if (!extend) return;
    // the double-click registered two single clicks; drop the duplicate vertex
    if (extend.added > 0) {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === extend.runId
            ? { ...r, points: extend.atStart ? r.points.slice(1) : r.points.slice(0, -1) }
            : r,
        ),
      );
    }
    setExtend(null);
  }

  // ---- delete segment ----
  function deleteSegment(e: ReactMouseEvent, seg: SegRef) {
    e.stopPropagation();
    setRuns((prev) =>
      prev.flatMap((r) => {
        if (r.id !== seg.runId) return [r];
        const pts = r.points;
        const n = pts.length;
        if (n <= 2) return []; // only segment — run disappears
        if (seg.idx === 0) return [{ ...r, points: pts.slice(1) }];
        if (seg.idx === n - 2) return [{ ...r, points: pts.slice(0, -1) }];
        return [
          { ...r, points: pts.slice(0, seg.idx + 1) },
          { ...r, id: nextId(), points: pts.slice(seg.idx + 1) },
        ];
      }),
    );
    setHoverSeg(null);
  }

  // ---- AI highlighter ----
  function onSvgPointerDown(e: ReactPointerEvent) {
    if (!armed || analysis) return;
    e.preventDefault();
    svgRef.current!.setPointerCapture(e.pointerId);
    paintRef.current = [toImg(e)];
    setPaint(paintRef.current);
  }

  function finishPaint(stroke: Point[]) {
    const row = armedRef.current;
    if (!row || stroke.length < 2) return;
    setAnalysis({ points: stroke, color: row.color, phase: 'analyzing', message: '' });
    onDisarm();

    window.setTimeout(() => {
      const overlapped = visibleRuns
        .filter((r) => stroke.some((p) => distToPolyline(p, r.points) < OVERLAP_TOL))
        .map((r) => r.id);

      let message: string;
      if (overlapped.length > 0) {
        setRuns((prev) =>
          prev.map((r) => {
            if (!overlapped.includes(r.id)) return r;
            const copy = { ...r };
            copy[mode] = row.value;
            return copy;
          }),
        );
        setPulseIds(new Set(overlapped));
        window.setTimeout(() => setPulseIds(new Set()), 1100);
        message = `Assigned to ${row.label}`;
      } else {
        const pts = straighten(simplify(stroke, SIMPLIFY_TOL));
        const newRun: PipeRun = { id: nextId(), points: pts, size: null, type: null, system: null };
        newRun[mode] = row.value;
        setRuns((prev) => [...prev, newRun]);
        message = 'New run added';
      }
      setAnalysis((a) => (a ? { ...a, phase: 'done', message } : a));
      window.setTimeout(() => setAnalysis(null), 1100);
    }, 1300);
  }

  // ---- rendering helpers ----
  const interactive = !armed && !extend && !paint;

  const extendRun = extend ? runs.find((r) => r.id === extend.runId) : null;
  const extendAnchor = extendRun
    ? extend!.atStart
      ? extendRun.points[0]
      : extendRun.points[extendRun.points.length - 1]
    : null;

  const chipAnchor = analysis ? analysis.points[analysis.points.length - 1] : null;

  let cursorClass = '';
  if (armed || paint) cursorClass = 'cursor-highlighter';
  else if (extend) cursorClass = 'cursor-extend';
  else if (dragging) cursorClass = 'cursor-grabbing';

  return (
    <div className={`sheet ${cursorClass}`}>
      <img src="/blueprint.png" alt="Blueprint — Irrigation Plan" draggable={false} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${IMG_W} ${IMG_H}`}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onClick={onSvgClick}
        onDoubleClick={onSvgDoubleClick}
      >
        {/* type linetype centerlines — always visible, black, beneath the highlights */}
        {visibleRuns.map((run) => {
          if (run.type === null) return null;
          return (
            <path
              key={run.id}
              className={`type-centerline${isDim(run) ? ' dim' : ''}`}
              d={polylineToPath(run.points)}
              strokeDasharray={rowFor('type', run.type).dash}
            />
          );
        })}

        {/* run highlight strokes */}
        {visibleRuns.map((run) => {
          const row = rowFor(mode, run[mode]);
          return (
            <path
              key={run.id}
              className={`run-stroke${pulseIds.has(run.id) ? ' pulse' : ''}${isDim(run) ? ' dim' : ''}`}
              d={polylineToPath(run.points)}
              stroke={row.color}
            />
          );
        })}

        {/* extend preview */}
        {extendAnchor && cursorPos && (
          <line
            className="extend-preview"
            x1={extendAnchor.x}
            y1={extendAnchor.y}
            x2={cursorPos.x}
            y2={cursorPos.y}
            stroke={rowFor(mode, extendRun![mode]).color}
          />
        )}

        {/* interaction layer: segment hit areas + minus badges, nodes + plus badges */}
        <g style={{ pointerEvents: interactive ? 'auto' : 'none' }}>
          {visibleRuns.map((run) => {
            const row = rowFor(mode, run[mode]);
            const last = run.points.length - 1;
            return (
              <g key={run.id} className={isDim(run) ? 'dim' : undefined}>
                {run.points.slice(0, -1).map((a, i) => {
                  const b = run.points[i + 1];
                  const hovered = hoverSeg?.runId === run.id && hoverSeg.idx === i;
                  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                  return (
                    <g
                      key={i}
                      onPointerEnter={() => setHoverSeg({ runId: run.id, idx: i })}
                      onPointerLeave={() => setHoverSeg(null)}
                    >
                      <line className="seg-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                      {hovered && !dragging && (
                        <g className="badge minus-badge" onClick={(e) => deleteSegment(e, { runId: run.id, idx: i })}>
                          <circle cx={mid.x} cy={mid.y} r="9" />
                          <path d={`M${mid.x - 4.5} ${mid.y}H${mid.x + 4.5}`} />
                        </g>
                      )}
                    </g>
                  );
                })}
                {run.points.map((p, i) => {
                  const isEndpoint = i === 0 || i === last;
                  const hovered = hoverNode?.runId === run.id && hoverNode.idx === i;
                  return (
                    <g
                      key={i}
                      onPointerEnter={() => setHoverNode({ runId: run.id, idx: i })}
                      onPointerLeave={() => setHoverNode(null)}
                    >
                      <circle
                        className="node-hit"
                        cx={p.x}
                        cy={p.y}
                        r="11"
                        onPointerDown={(e) => onNodePointerDown(e, { runId: run.id, idx: i })}
                      />
                      <circle className="node" cx={p.x} cy={p.y} r="6" fill={row.color} />
                      {isEndpoint && hovered && !dragging && (
                        <g className="badge plus-badge" onClick={(e) => startExtend(e, run.id, i === 0)}>
                          <circle className="badge-hit" cx={p.x + 15} cy={p.y - 15} r="18" />
                          <circle cx={p.x + 15} cy={p.y - 15} r="9" />
                          <path d={`M${p.x + 15 - 4.5} ${p.y - 15}H${p.x + 15 + 4.5}M${p.x + 15} ${p.y - 15 - 4.5}V${p.y - 15 + 4.5}`} />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* active extend anchor + badge stays clickable to exit */}
        {extendAnchor && (
          <g className="badge plus-badge active" onClick={(e) => startExtend(e, extend!.runId, extend!.atStart)}>
            <circle className="badge-hit" cx={extendAnchor.x + 15} cy={extendAnchor.y - 15} r="18" />
            <circle cx={extendAnchor.x + 15} cy={extendAnchor.y - 15} r="9" />
            <path
              d={`M${extendAnchor.x + 15 - 4.5} ${extendAnchor.y - 15}H${extendAnchor.x + 15 + 4.5}M${extendAnchor.x + 15} ${extendAnchor.y - 15 - 4.5}V${extendAnchor.y - 15 + 4.5}`}
            />
          </g>
        )}

        {/* highlighter paint stroke (live or analyzing) */}
        {paint && armed && (
          <path className="paint-stroke" d={polylineToPath(paint)} stroke={armed.color} />
        )}
        {analysis && (
          <path
            className={`paint-stroke${analysis.phase === 'analyzing' ? ' analyzing' : ' fading'}`}
            d={polylineToPath(analysis.points)}
            stroke={analysis.color}
          />
        )}
      </svg>

      {/* floating AI chip */}
      {analysis && chipAnchor && (
        <div
          className={`ai-chip${analysis.phase === 'done' ? ' done' : ''}`}
          style={{
            left: `${(chipAnchor.x / IMG_W) * 100}%`,
            top: `${(chipAnchor.y / IMG_H) * 100}%`,
          }}
        >
          <span className="chip-sparkle">✦</span>
          {analysis.phase === 'analyzing' ? 'Analyzing…' : analysis.message}
        </div>
      )}
    </div>
  );
}
