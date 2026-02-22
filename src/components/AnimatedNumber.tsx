"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

function formatNumber(value: number, suffix: string, decimals: number): string {
  const n = decimals === 0 ? Math.round(value) : value;
  return (
    new Intl.NumberFormat("ru-RU", {
      style: "decimal",
      useGrouping: true,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n) + suffix
  );
}

interface AnimatedNumberProps {
  value: number;
  /** Суффикс после числа (по умолчанию " ₽"). */
  suffix?: string;
  /** Количество знаков после запятой (по умолчанию 0). */
  decimals?: number;
}

export function AnimatedNumber({
  value,
  suffix = " ₽",
  decimals = 0,
}: AnimatedNumberProps) {
  const spring = useSpring(value, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });
  const display = useTransform(spring, (v) => formatNumber(v, suffix, decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span
      className="tabular-nums"
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-geist-mono), ui-monospace, 'SF Mono', monospace",
        fontSize: "inherit",
        color: "inherit",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {display}
    </motion.span>
  );
}
