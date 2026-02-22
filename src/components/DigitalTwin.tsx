"use client";

import { motion } from "framer-motion";
import {
  config,
  type DigitalTwinZoneId,
  type DigitalTwinWallItem,
  type DigitalTwinFurnitureItem,
} from "@/lib/config";
import { useStore } from "@/store/useStore";

type HighlightVariant = "default" | "gold" | "blue";

interface DigitalTwinProps {
  /** Прогресс 0–100 (например, доля взноса). Определяет, сколько зон и насколько закрашено. */
  progress: number;
  highlight?: HighlightVariant;
}

const STROKE_WALL = "rgba(255,255,255,0.1)";
const STROKE_FURNITURE = "rgba(255,255,255,0.05)";

const ZONE_RANGES: Record<DigitalTwinZoneId, [number, number]> = Object.fromEntries(
  config.digitalTwin.zones.map((z) => [z.id, z.progressRange])
) as Record<DigitalTwinZoneId, [number, number]>;

/**
 * Автоматический расчёт заливки зоны по прогрессу (0–100).
 * Например: при 30% первая зона (0–20) заполнена полностью, вторая (20–40) — наполовину.
 */
function getZoneFill(progress: number, zoneId: DigitalTwinZoneId): number {
  const [start, end] = ZONE_RANGES[zoneId];
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

const HIGHLIGHT_GOLD = {
  filter: "url(#digitalTwinGlowGold)" as const,
  containerShadow:
    "0 0 32px -4px rgba(212, 175, 55, 0.5), 0 0 56px -12px rgba(212, 175, 55, 0.25)",
};
const [vbX, vbY, vbW, vbH] = config.digitalTwin.viewBox;

function renderWallItem(item: DigitalTwinWallItem, index: number) {
  const strokeWidth = "strokeWidth" in item ? item.strokeWidth ?? 1 : 1;
  const opacity = "opacity" in item ? item.opacity : undefined;
  const common = {
    stroke: STROKE_WALL,
    fill: item.type === "circle" ? STROKE_WALL : ("none" as const),
    strokeWidth,
    ...(item.type !== "path" && "strokeDasharray" in item && item.strokeDasharray
      ? { strokeDasharray: item.strokeDasharray }
      : {}),
    ...(item.type === "path" && "strokeDasharray" in item && item.strokeDasharray
      ? { strokeDasharray: item.strokeDasharray }
      : {}),
    ...(opacity !== undefined ? { opacity } : {}),
  };
  if (item.type === "path") {
    return <path key={index} d={item.d} {...common} />;
  }
  if (item.type === "line") {
    return (
      <line
        key={index}
        x1={item.x1}
        y1={item.y1}
        x2={item.x2}
        y2={item.y2}
        {...common}
      />
    );
  }
  return (
    <circle
      key={index}
      cx={item.cx}
      cy={item.cy}
      r={item.r}
      {...common}
    />
  );
}

function renderFurnitureItem(item: DigitalTwinFurnitureItem, index: number) {
  const common = { stroke: STROKE_FURNITURE, strokeWidth: 1, fill: "none" };
  switch (item.type) {
    case "rect":
      return (
        <rect
          key={index}
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          rx={item.rx}
          ry={item.ry}
          {...common}
        />
      );
    case "path":
      return <path key={index} d={item.d} {...common} />;
    case "circle":
      return (
        <circle key={index} cx={item.cx} cy={item.cy} r={item.r} {...common} />
      );
    case "ellipse":
      return (
        <ellipse
          key={index}
          cx={item.cx}
          cy={item.cy}
          rx={item.rx}
          ry={item.ry}
          {...common}
        />
      );
    case "line":
      return (
        <line
          key={index}
          x1={item.x1}
          y1={item.y1}
          x2={item.x2}
          y2={item.y2}
          {...common}
        />
      );
  }
}

export function DigitalTwin({ progress, highlight = "default" }: DigitalTwinProps) {
  const primaryColor = useStore((s) => s.config.brand.primaryColor);
  const primaryRgb = hexToRgb(primaryColor);
  const highlightBlue = {
    filter: "url(#digitalTwinGlowBlue)" as const,
    containerShadow: `0 0 32px -4px ${primaryColor}80, 0 0 56px -12px ${primaryColor}40`,
  };
  const premiumStyle =
    highlight === "blue" ? highlightBlue : highlight === "gold" ? HIGHLIGHT_GOLD : null;
  const isPremium = highlight === "blue" || highlight === "gold";

  const clamped = Math.max(0, Math.min(100, progress));

  const zoneFills = Object.fromEntries(
    config.digitalTwin.zones.map((z) => [z.id, getZoneFill(clamped, z.id)])
  ) as Record<DigitalTwinZoneId, number>;

  const stagger = (i: number) => ({
    duration: 0.35,
    ease: "easeOut" as const,
    delay: i * 0.05,
  });
  const glowFilter = isPremium ? premiumStyle!.filter : "url(#digitalTwinGlow)";

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl backdrop-blur-xl transition-shadow duration-500"
      style={
        premiumStyle ? { boxShadow: premiumStyle.containerShadow } : undefined
      }
    >
      <div className="flex h-full w-full max-h-[240px] items-center justify-center">
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          width={vbW * 2}
          height={vbH * 2}
          preserveAspectRatio="xMidYMid meet"
          className="h-auto max-h-[240px] w-full"
          fill="none"
          stroke={STROKE_WALL}
        >
          <defs>
            <linearGradient
              id="zoneGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={primaryColor}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={primaryColor}
                stopOpacity={0}
              />
            </linearGradient>
            <filter
              id="digitalTwinGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx={0}
                dy={0}
                stdDeviation={4}
                floodColor={primaryRgb}
                floodOpacity={0.4}
              />
            </filter>
            <filter
              id="digitalTwinGlowBlue"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx={0}
                dy={0}
                stdDeviation={8}
                floodColor={primaryRgb}
                floodOpacity={0.6}
              />
              <feDropShadow
                dx={0}
                dy={0}
                stdDeviation={16}
                floodColor={primaryRgb}
                floodOpacity={0.25}
              />
            </filter>
            <filter
              id="digitalTwinGlowGold"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx={0}
                dy={0}
                stdDeviation={8}
                floodColor="rgb(212, 175, 55)"
                floodOpacity={0.55}
              />
              <feDropShadow
                dx={0}
                dy={0}
                stdDeviation={16}
                floodColor="rgb(212, 175, 55)"
                floodOpacity={0.2}
              />
            </filter>
          </defs>

          {/* Стены: контур и перегородки из конфига */}
          <g>
            {config.digitalTwin.walls.map((item, i) => renderWallItem(item, i))}
          </g>

          {/* Мебель и сантехника из конфига */}
          <g>
            {config.digitalTwin.furniture.map((item, i) =>
              renderFurnitureItem(item, i)
            )}
          </g>

          {/* Заливка зон: путь и уровень из конфига, расчёт по progress */}
          {config.digitalTwin.zones.map((zone, idx) => (
            <motion.path
              key={zone.id}
              d={zone.fillPath}
              fill="url(#zoneGradient)"
              filter={glowFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: zoneFills[zone.id] }}
              transition={stagger(idx)}
            />
          ))}

          {/* Сканирующая полоса */}
          <motion.rect
            x={vbX}
            y={vbY}
            width={vbW}
            height={2}
            fill="rgba(255,255,255,0.4)"
            initial={{ y: vbY }}
            animate={{ y: [vbY, vbY + vbH - 2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Подписи зон из конфига; яркость при заливке > 50% */}
          {config.digitalTwin.zones.map((zone) => {
            const fill = zoneFills[zone.id];
            const { x, y } = zone.labelPosition;
            return (
              <motion.text
                key={zone.id}
                x={x}
                y={y}
                textAnchor="middle"
                className="font-sans text-[8px] font-light uppercase tracking-[0.2em]"
                style={{ opacity: fill > 0.5 ? 1 : 0.4 }}
                fill={fill > 0.5 ? "#fff" : "rgba(255,255,255,0.5)"}
                initial={false}
                animate={{ opacity: fill > 0.5 ? 1 : 0.4 }}
                transition={{ duration: 0.3 }}
              >
                {zone.label}
              </motion.text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
