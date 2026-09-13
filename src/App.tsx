import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { createRope, stepRope, SEGMENTS, type RopePoint } from "./useRope";
import { DEFAULT_CHARMS, ritualFor, type Charm, type RitualType } from "./charms";
import { playRitualSound } from "./sound";
import { CharmGlyph } from "./charmArt";
import "./App.css";

const MAX_TILT_DEG = 22;

const ANCHOR_Y = -12; // Start from above the screen so it attaches seamlessly to the menu bar
const CHARM_INDEX = SEGMENTS;
const MARGIN = 26;

function loadCharm(): Charm {
  try {
    const saved = localStorage.getItem("deskcharm.charm");
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore corrupt storage
  }
  return DEFAULT_CHARMS[0];
}

export default function App() {
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null);
  const [anchorX, setAnchorX] = useState(400);
  const [charm, setCharm] = useState<Charm>(loadCharm);
  const [menuOpen, setMenuOpenState] = useState(false);
  const menuOpenRef = useRef(false);

  const setMenuOpen = (value: boolean | ((v: boolean) => boolean)) => {
    setMenuOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      menuOpenRef.current = next;
      return next;
    });
  };
  const [activeRitual, setActiveRitual] = useState<RitualType | null>(null);
  const [charmPos, setCharmPos] = useState({ x: 400, y: ANCHOR_Y + CHARM_INDEX * 16 });
  const [tilt, setTilt] = useState(0);
  const [lean, setLean] = useState({ x: 0, y: 0 });

  const pointsRef = useRef<RopePoint[]>(createRope(anchorX, ANCHOR_Y));
  const anchorXRef = useRef(anchorX);
  const dragIndexRef = useRef<number | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const anchorDraggingRef = useRef(false);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const timeRef = useRef(0);
  const frameCountRef = useRef(0);
  const rafRef = useRef<number>(0);
  const isSleepingRef = useRef(false);
  const lastSentHitPointsRef = useRef({ x: 0, y: 0 });
  const [wakeTick, setWakeTick] = useState(0);

  const wakeUp = () => {
    if (isSleepingRef.current) {
      isSleepingRef.current = false;
      setWakeTick((v) => v + 1);
    }
  };

  useEffect(() => {
    invoke<[number, number]>("get_stage_size").then(([w, h]) => {
      setStage({ width: w, height: h });
      const savedX = localStorage.getItem("deskcharm.anchorX");
      let startX = w / 2;
      if (savedX) {
        const parsed = parseFloat(savedX);
        if (!isNaN(parsed)) {
          startX = Math.max(MARGIN, Math.min(parsed, w - MARGIN));
        }
      }
      anchorXRef.current = startX;
      setAnchorX(startX);
      pointsRef.current = createRope(startX, ANCHOR_Y);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("deskcharm.charm", JSON.stringify(charm));
  }, [charm]);

  useEffect(() => {
    if (stage) {
      localStorage.setItem("deskcharm.anchorX", anchorX.toString());
    }
  }, [anchorX, stage]);

  useEffect(() => {
    const unlisten = listen<string>("set_charm", (event) => {
      console.log("RECEIVED SET_CHARM EVENT IN REACT:", event);
      const charmId = event.payload;
      const c = DEFAULT_CHARMS.find(ch => ch.id === charmId);
      if (c) {
        setCharm(c);
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    if (!stage) return;
    const bounds = { width: stage.width, height: stage.height, margin: MARGIN };
    const tick = () => {
      timeRef.current += 1;
      frameCountRef.current += 1;
      const wind = Math.sin(timeRef.current * 0.02) * 0.06;
      const isIdle = stepRope(pointsRef.current, anchorXRef.current, ANCHOR_Y, wind, dragIndexRef.current, dragPosRef.current, bounds);
      const tip = pointsRef.current[CHARM_INDEX];
      setCharmPos({ x: tip.x, y: tip.y });

      const velocityX = tip.x - tip.px;
      const swingTilt = Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, velocityX * 3.2));
      setTilt(swingTilt);

      if (frameCountRef.current % 2 === 0) {
        const lastSent = lastSentHitPointsRef.current;
        const distSq = (tip.x - lastSent.x) ** 2 + (tip.y - lastSent.y) ** 2;
        if (distSq > 1.0) {
          invoke("update_hit_points", {
            points: [
              [tip.x, tip.y],
              [anchorXRef.current, Math.max(14, ANCHOR_Y + 14)],
            ],
          }).catch(() => {});
          lastSentHitPointsRef.current = { x: tip.x, y: tip.y };
        }
      }

      if (isIdle && dragIndexRef.current === null && !anchorDraggingRef.current && !activeRitual) {
        isSleepingRef.current = true;
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    isSleepingRef.current = false;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, wakeTick, activeRitual]);

  useEffect(() => {
    const unlisten = listen("recenter", () => {
      if (!stage) return;
      const x = stage.width / 2;
      anchorXRef.current = x;
      setAnchorX(x);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [stage]);

  useEffect(() => {
    const unlisten = listen("reload_charm", () => {
      window.location.reload();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const syncInteractionState = () => {
    const active = menuOpenRef.current || dragIndexRef.current !== null || anchorDraggingRef.current;
    invoke("set_force_interactive", { active }).catch((e) => console.error("set_force_interactive failed:", e));
  };

  const onCharmPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragIndexRef.current = CHARM_INDEX;
    dragPosRef.current = { x: e.clientX, y: e.clientY };
    downRef.current = { x: e.clientX, y: e.clientY };
    setMenuOpen(false);
    syncInteractionState();
    wakeUp();
  };

  const onCharmPointerMove = (e: React.PointerEvent) => {
    wakeUp();
    if (dragIndexRef.current !== null) {
      dragPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const dx = e.clientX - charmPos.x;
    const dy = e.clientY - charmPos.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pull = Math.min(dist / 60, 1) * 7;
    setLean({ x: -(dx / dist) * pull, y: -(dy / dist) * pull * 0.4 });
  };

  const onCharmPointerLeave = () => {
    setLean({ x: 0, y: 0 });
  };

  const triggerRitual = (ritual: RitualType) => {
    setActiveRitual(ritual);
    playRitualSound(ritual);
    setTimeout(() => setActiveRitual(null), 900);
    wakeUp();
  };

  const onCharmPointerUp = (e: React.PointerEvent) => {
    dragIndexRef.current = null;
    dragPosRef.current = null;
    syncInteractionState();
    const down = downRef.current;
    if (down) {
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 4) {
        triggerRitual(ritualFor(charm));
      }
    }
    downRef.current = null;
  };

  const onCharmContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen((v) => !v);
    // setTimeout to allow state to settle, though ref is updated immediately
    setTimeout(syncInteractionState, 0);
  };

  const onAnchorPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    anchorDraggingRef.current = true;
    syncInteractionState();
    wakeUp();
  };

  const onAnchorPointerMove = (e: React.PointerEvent) => {
    wakeUp();
    if (!anchorDraggingRef.current || !stage) return;
    const x = Math.min(Math.max(e.clientX, MARGIN), stage.width - MARGIN);
    anchorXRef.current = x;
    setAnchorX(x);
  };

  const onAnchorPointerUp = () => {
    anchorDraggingRef.current = false;
    syncInteractionState();
  };

  const chooseCharm = (c: Charm) => {
    setCharm(c);
    setMenuOpen(false);
    setTimeout(syncInteractionState, 0);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setTimeout(syncInteractionState, 0);
  };

  if (!stage) return null;

  const rope = pointsRef.current;
  const points = rope.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      className="stage"
      style={{ width: stage.width, height: stage.height }}
      onPointerDown={() => menuOpen && closeMenu()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="thread" width={stage.width} height={stage.height}>
        <polyline points={points} fill="none" stroke="rgba(20,16,12,0.55)" strokeWidth={3.2} strokeLinecap="round" />
        <polyline points={points} fill="none" stroke="rgba(255,250,240,0.85)" strokeWidth={1.1} strokeLinecap="round" />
      </svg>

      <div
        className="anchor-handle"
        style={{ left: anchorX, top: Math.max(14, ANCHOR_Y + 14) }}
        onPointerDown={onAnchorPointerDown}
        onPointerMove={onAnchorPointerMove}
        onPointerUp={onAnchorPointerUp}
        onPointerCancel={onAnchorPointerUp}
        title="Drag to move along the top"
      />

      {activeRitual === "sparkle" && (
        <div className="sparkle-burst" style={{ left: charmPos.x, top: charmPos.y }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="spark" style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      )}
      {activeRitual === "chime" && (
        <div className="chime-rings" style={{ left: charmPos.x, top: charmPos.y }}>
          <span className="ring" />
          <span className="ring ring-delay" />
        </div>
      )}

      <div
        data-charm
        className="charm"
        style={{
          left: charmPos.x,
          top: charmPos.y,
          transform: `translate(-50%, -50%) translate(${lean.x}px, ${lean.y}px) rotateZ(${(tilt + lean.x * 0.6).toFixed(2)}deg) rotateY(${(tilt * 1.3).toFixed(2)}deg)`,
        }}
        onPointerDown={onCharmPointerDown}
        onPointerMove={onCharmPointerMove}
        onPointerUp={onCharmPointerUp}
        onPointerLeave={onCharmPointerLeave}
        onPointerCancel={onCharmPointerUp}
        onContextMenu={onCharmContextMenu}
        title={`${charm.name} — click for a ritual, right-click to change`}
      >
        <span className={`charm-inner ${activeRitual ? `ritual-${activeRitual}` : "idle"}`}>
          <CharmGlyph charm={charm} size={40} />
        </span>
      </div>

      {menuOpen && (
        <div
          className="menu"
          style={{
            left: Math.min(Math.max(charmPos.x - 145, 12), stage.width - 302),
            top: charmPos.y + 34,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="menu-arrow" style={{ left: Math.min(133, charmPos.x - Math.max(charmPos.x - 145, 12) - 8) }} />
          <p className="menu-label">choose a charm</p>
          <div className="roster">
            {DEFAULT_CHARMS.map((c) => (
              <button
                key={c.id}
                className={`roster-card ${c.id === charm.id ? "active" : ""}`}
                onClick={() => chooseCharm(c)}
              >
                <span className="roster-glyph">
                  <span className="roster-cord" />
                  <span className="roster-bead" />
                  <span className="roster-emoji">
                    <CharmGlyph charm={c} size={30} />
                  </span>
                </span>
                <span className="roster-name">{c.name}</span>
                <span className="roster-tag">{c.region}</span>
                <span className="roster-desc">{c.description}</span>
                <span className="roster-action">{c.actionLabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
