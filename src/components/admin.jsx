"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, UsersRound, Building2, Flag, BarChart3,
  Settings as SettingsIcon, Search, ChevronDown, ChevronUp, MoreHorizontal,
  Eye, Ban, Trash2, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  TrendingUp, TrendingDown, UserPlus, MessageSquare, Bell, Globe, Lock,
  Unlock, Edit3, Download, Filter, ArrowLeft, Clock, Crown, Star,
  Activity, PieChart, Calendar, Mail, AtSign, MapPin, Briefcase, Megaphone,
  Check, X, ChevronRight, CircleDot, Bookmark, Share2, ThumbsUp, MessageCircle,
  BookOpen,
} from "lucide-react";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import RelativeTime from "./RelativeTime";
import PostCard from "./PostCard";
import EnterpriseBadge from "./EnterpriseBadge";
import LogoBadge from "./LogoBadge";
import AdminSupportPage from "./admin/AdminSupportPage";

/* ================================================================== */
/*  TOKENS - palette LynoraLink (identique au feed)                    */
/* ================================================================== */
const C = {
  navy900: "var(--admin-heading)",
  navy800: "#1B5386",
  navy700: "#2C6BA0",
  navy100: "var(--app-border)",
  navy50: "var(--app-bg)",
  gold400: "#F6D374",
  gold600: "#D9A536",
  ink: "var(--app-text)",
  muted: "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)",
  white: "var(--app-surface)",
  danger: "#C24444",
  danger50: "var(--admin-danger-bg)",
  success: "#2E9E5B",
  success50: "var(--admin-success-bg)",
  warning: "#D9A536",
  warning50: "var(--admin-warning-bg)",
  info: "#2C6BA0",
  info50: "var(--admin-info-bg)",
};

const ADMIN_CACHE_PREFIX = "lynoralink:admin-cache:";
const ADMIN_CACHE_TTL_MS = 72 * 60 * 60 * 1000;

function cleanupAdminCache() {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(ADMIN_CACHE_PREFIX))
      .forEach((key) => {
        try {
          const entry = JSON.parse(window.localStorage.getItem(key) || "null");
          if (!entry?.savedAt || now - entry.savedAt >= ADMIN_CACHE_TTL_MS) window.localStorage.removeItem(key);
        } catch {
          window.localStorage.removeItem(key);
        }
      });
  } catch {
    // Le nettoyage reste optionnel si le navigateur bloque le stockage local.
  }
}

function saveAdminCache(name, data) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ADMIN_CACHE_PREFIX}${name}`, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Ne jamais bloquer le chargement admin à cause du stockage local.
  }
}

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;
const APP_NAME = "LynoraLink";

/* ================================================================== */
/*  DONNEES ADMIN - Les données viennent maintenant de l'API          */
/* ================================================================== */

// Constantes UI uniquement
const DEFAULT_PLATFORM_SETTINGS = {
  maintenanceMode: false, allowRegistration: true, requireEmailVerification: true,
  maxPostsPerDay: 10, maxGroupMembers: 50000, autoApprovePosts: true,
  enableArticles: true, enableGroups: true, enableMessages: true, enablePages: true,
  contentFilterLevel: "medium", defaultGroupPrivacy: "public",
  allowedFileTypes: "jpg, png, gif, pdf, mp4", maxFileSize: 25,
};

const EMPTY_ANALYTICS = {
  totalUsers: 0,
  newUsersThisMonth: 0,
  activeUsersMonth: 0,
  totalPosts: 0,
  postsThisMonth: 0,
  messagesThisMonth: 0,
  totalGroups: 0,
  userGrowth: [],
  postGrowth: [],
  topCategories: [],
  avgSessionDuration: null,
  dailyActive: [],
};

/* ================================================================== */
/*  COMPOSANTS UTILITAIRES                                             */
/* ================================================================== */

function Avatar({ initials, size = 40, ring = false, gradient, status, imgUrl = null }) {
  const grad = gradient || navyGrad;
  const hasImage = Boolean(imgUrl);

  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: hasImage ? C.navy50 : grad, color: C.white,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
        fontSize: size * 0.36, fontFamily: "'Sora', sans-serif", overflow: "hidden",
        boxShadow: ring ? `0 0 0 2px ${C.white}, 0 0 0 4px ${C.gold600}` : "none", letterSpacing: "-0.02em",
        position: "relative",
      }}>
        {hasImage ? (
          <img
            src={imgUrl}
            alt={initials || "Avatar utilisateur"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          initials || "L"
        )}
      </div>
      {status && (
        <div style={{
          position: "absolute", bottom: -2, right: -2, width: 12, height: 12, borderRadius: "50%",
          background: status === "active" ? C.success : status === "suspended" ? C.warning : C.danger,
          border: `2px solid ${C.white}`,
        }} />
      )}
    </div>
  );
}

function Card({ children, style = {}, hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className="lm-admin-card"
      style={{
        background: C.white, border: `1px solid ${C.line}`, borderRadius: 14,
        transition: "box-shadow 0.2s ease", cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onMouseEnter={(e) => { if (hover) e.currentTarget.style.boxShadow = "0 8px 24px rgba(15,51,82,0.1)"; }}
      onMouseLeave={(e) => { if (hover) e.currentTarget.style.boxShadow = "none"; }}
    >
      {children}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{ width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer", background: checked ? goldGrad : C.line, position: "relative", flexShrink: 0, transition: "background 0.2s ease" }}>
      <span style={{ position: "absolute", top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: C.white, boxShadow: "0 1px 3px rgba(15,51,82,0.35)", transition: "left 0.2s ease" }} />
    </button>
  );
}

function formatAverageSessionDuration(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function Badge({ label, color = "default", small = false }) {
  const colors = {
    default: { bg: C.navy50, fg: C.navy800 }, success: { bg: C.success50, fg: C.success },
    danger: { bg: C.danger50, fg: C.danger }, warning: { bg: C.warning50, fg: C.warning },
    info: { bg: C.info50, fg: C.info }, muted: { bg: C.navy50, fg: C.muted }, gold: { bg: C.warning50, fg: C.gold600 },
  };
  const c = colors[color] || colors.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "4px 8px" : "5px 10px", borderRadius: 999, border: `1px solid ${c.fg}24`, fontSize: small ? 10.5 : 11.5, fontWeight: 700, lineHeight: 1, background: c.bg, color: c.fg, whiteSpace: "nowrap", boxShadow: "0 1px 2px rgba(15,51,82,0.06)" }}>
      <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: "50%", background: c.fg, opacity: 0.8 }} />
      {label}
    </span>
  );
}

function Btn({ label, icon: Icon, onClick, variant = "primary", size = "default", disabled = false, iconOnly = false, style = {} }) {
  const styles = {
    primary: { bg: goldGrad, color: C.navy900, fontWeight: 700, border: "none" },
    secondary: { bg: "transparent", color: C.ink, fontWeight: 600, border: `1.5px solid ${C.line}` },
    danger: { bg: C.danger50, color: C.danger, fontWeight: 700, border: "none" },
    ghost: { bg: "transparent", color: C.navy800, fontWeight: 600, border: "none" },
    success: { bg: C.success50, color: C.success, fontWeight: 700, border: "none" },
  };
  const s = styles[variant];
  const sz = size === "small" ? { padding: "5px 10px", fontSize: 11.5, borderRadius: 8 } : size === "large" ? { padding: "10px 20px", fontSize: 13.5, borderRadius: 11 } : { padding: "7px 14px", fontSize: 12.5, borderRadius: 10 };
  return (
    <button onClick={onClick} disabled={disabled} title={iconOnly ? label : undefined} aria-label={iconOnly ? label : undefined} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s", ...sz, ...s, ...style }}>
      {Icon && <Icon size={sz.fontSize + 1} />}{!iconOnly && label}
    </button>
  );
}

function KpiCard({ icon: Icon, label, value, change, changeDir = "up", iconBg = C.navy50, iconColor = C.navy800 }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 6 }}>{label}</div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 26, color: C.ink, lineHeight: 1 }}>{value}</div>
          {change !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 6, fontSize: 11.5, fontWeight: 600, color: changeDir === "up" ? C.success : C.danger }}>
              {changeDir === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{change}
            </div>
          )}
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={iconColor} />
        </div>
      </div>
    </Card>
  );
}

function SearchBar({ value, onChange, placeholder = "Rechercher..." }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 12px" }}>
      <Search size={15} color={C.mutedLight} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: C.ink, flex: 1, width: "100%" }} />
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 20px" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: C.navy50, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={22} color={C.mutedLight} /></div>
      <div style={{ fontSize: 13.5, color: C.muted, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, background: C.white, borderRadius: 16, padding: 24, boxShadow: "0 24px 60px rgba(15,51,82,0.35)" }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 22 }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn label="Annuler" variant="secondary" onClick={onCancel} />
          <Btn label={confirmLabel} variant={danger ? "danger" : "primary"} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type = "success", onClose }) {
  const colors = { success: { bg: C.success50, fg: C.success, icon: CheckCircle2 }, danger: { bg: C.danger50, fg: C.danger, icon: XCircle }, warning: { bg: C.warning50, fg: C.warning, icon: AlertTriangle }, info: { bg: C.info50, fg: C.info, icon: Eye } };
  const c = colors[type];
  const Icon = c.icon;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 12, background: c.bg, boxShadow: "0 8px 24px rgba(15,51,82,0.15)" }}>
      <Icon size={16} color={c.fg} />
      <span style={{ fontSize: 13, fontWeight: 600, color: c.fg }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: c.fg, display: "flex", marginLeft: 4 }}><X size={14} /></button>
    </div>
  );
}

function MiniBarChart({ data, maxVal, color = C.navy800, height = 120 }) {
  const safeData = Array.isArray(data) && data.length > 0 ? data : [{ month: "0", value: 0 }];
  const values = safeData.map((d) => Number(d.value) || 0);
  const max = maxVal || Math.max(...values, 1);
  const width = 320;
  const chartHeight = height - 24;
  const paddingX = 12;
  const paddingY = 10;
  const stepX = (width - paddingX * 2) / Math.max(safeData.length - 1, 1);

  const points = safeData.map((d, index) => {
    const x = paddingX + index * stepX;
    const y = chartHeight - paddingY - (Number(d.value) / max) * (chartHeight - paddingY * 2);
    return { ...d, x, y, value: Number(d.value) || 0 };
  });

  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = points[index - 1];
    const midX = (prev.x + point.x) / 2;
    return `${path} Q ${prev.x} ${prev.y} ${midX} ${(prev.y + point.y) / 2} T ${point.x} ${point.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;
  const strokeColor = color;
  const fillColor = `${strokeColor}22`;

  return (
    <div style={{ borderRadius: 14, padding: "8px 6px 0", background: "linear-gradient(180deg, rgba(27,83,134,0.02) 0%, rgba(27,83,134,0.06) 100%)", border: `1px solid ${C.line}` }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Courbe de performance">
        {[0, 1, 2, 3].map((line) => {
          const y = paddingY + (line / 3) * (chartHeight - paddingY * 2);
          return <line key={line} x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke={C.line} strokeDasharray="3 5" strokeWidth="1" />;
        })}
        <path d={areaPath} fill={fillColor} />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4.5" fill={strokeColor} stroke={C.white} strokeWidth="2" />
            <text x={point.x} y={height - 4} textAnchor="middle" fill={C.muted} fontSize="10" fontWeight="700">{point.month || point.day}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ data = [], size = 180, centerLabel = "" }) {
  const palette = [C.navy800, C.gold600, C.success, C.info, C.warning, C.danger, C.purple, C.navy500];
  const safeData = Array.isArray(data) && data.length > 0 ? data : [{ label: "Aucune donnée", value: 1, color: C.line }];
  const total = safeData.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0) || 1;
  const radius = (size - 26) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(170px, 220px) 1fr", gap: 18, alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel || "Diagramme circulaire"}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={C.line} strokeWidth="18" />
          {safeData.map((item, index) => {
            const value = Math.max(0, Number(item.value) || 0);
            const segmentLength = (value / total) * circumference;
            const dashArray = `${segmentLength} ${circumference - segmentLength}`;
            const stroke = item.color || palette[index % palette.length];
            const circle = (
              <circle
                key={`${item.label || index}-segment`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={stroke}
                strokeWidth="18"
                strokeDasharray={dashArray}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += segmentLength;
            return circle;
          })}
          <text x="50%" y="47%" textAnchor="middle" fontSize="17" fontWeight="800" fill={C.ink}>{safeData.length === 1 && safeData[0].label === "Aucune donnée" ? "0" : total}</text>
          <text x="50%" y="61%" textAnchor="middle" fontSize="10" fill={C.muted} fontWeight="700">total</text>
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {safeData.map((item, index) => {
          const label = item.label || `Élément ${index + 1}`;
          const value = Number(item.value) || 0;
          const pct = total ? Math.round((value / total) * 100) : 0;
          const color = item.color || palette[index % palette.length];
          return (
            <div key={`${label}-${index}`} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: "inline-block", boxShadow: `0 0 0 2px ${color}22` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.ink, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ fontSize: 11, color: C.mutedLight, marginTop: 2 }}>{value.toLocaleString("fr-FR")}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ value, max = 100, color = C.navy800, label, showPct = true }) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const safeMax = Number.isFinite(Number(max)) && Number(max) > 0 ? Number(max) : 0;
  const pct = safeMax > 0 ? Math.min(100, Math.max(0, Math.round((safeValue / safeMax) * 100))) : 0;
  const fill = `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {label && <span style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>{label}</span>}
        {showPct && <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{pct}%</span>}
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "linear-gradient(90deg, rgba(27,83,134,0.08) 0%, rgba(27,83,134,0.12) 100%)", overflow: "hidden", border: `1px solid ${C.line}` }}>
        <div style={{ height: "100%", borderRadius: 999, background: fill, width: `${pct}%`, transition: "width 0.4s ease", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, count, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={18} color={C.navy800} />
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>{label}</span>
        {count !== undefined && <Badge label={String(count)} color="info" small />}
      </div>
      {action}
    </div>
  );
}

function TableWrapper({ children, className = "" }) {
  return (
    <Card style={{ overflow: "hidden" }}>
      <div className={`lm-table-scroll ${className}`} style={{ width: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>{children}</div>
    </Card>
  );
}

function AdminTabs({ tabs, active, onChange }) {
  return (
    <div className="lm-admin-tabs" style={{ display: "flex", gap: 4, padding: "4px", background: C.navy50, borderRadius: 12, marginBottom: 20 }}>
      {tabs.map((t) => (
        <button
          key={t.id} onClick={() => onChange(t.id)}
          style={{
            flex: 1, padding: "8px 6px", borderRadius: 9, border: "none", cursor: "pointer",
            fontSize: 12.5, fontWeight: 600, textAlign: "center", transition: "all 0.2s ease",
            background: active === t.id ? C.white : "transparent",
            color: active === t.id ? C.navy800 : C.muted,
            boxShadow: active === t.id ? "0 1px 4px rgba(15,51,82,0.1)" : "none",
          }}
        >
          {t.icon && <t.icon size={14} style={{ marginRight: 4, verticalAlign: -2 }} />}
          {t.label}
          {t.count > 0 && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, background: active === t.id ? C.navy50 : C.navy100, padding: "1px 6px", borderRadius: 999 }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function SettingRow({ title, desc, checked, onChange, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 11.5, color: C.mutedLight, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: C.navy50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={14} color={C.muted} /></div>
      <div><div style={{ fontSize: 10.5, color: C.mutedLight, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{value}</div></div>
    </div>
  );
}

/* ================================================================== */
/*  SIDEBAR ADMIN                                                      */
/* ================================================================== */
function SidebarItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 10,
        border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? C.navy800 : C.muted, background: active ? C.navy50 : "transparent",
        transition: "all 0.15s ease", marginBottom: 2, textAlign: "left",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.navy50; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={17} />
      {item.label}
      {item.count > 0 && (
        <span style={{ marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 999, background: active ? C.navy800 : C.navy100, color: active ? C.white : C.navy800, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{item.count}</span>
      )}
    </button>
  );
}

function AdminSidebar({ activeSection, onNavigate, onBack, pendingReports, adminEmail, adminEventCount = 0, mobileOpen = false }) {
  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { id: "users", icon: Users, label: "Utilisateurs" },
    { id: "posts", icon: FileText, label: "Publications" },
    { id: "groups", icon: UsersRound, label: "Groupes" },
    { id: "pages", icon: Building2, label: "Pages entreprise" },
    { id: "campaigns", icon: Megaphone, label: "Campagnes sponsorisées" },
    { id: "subscriptions", icon: Briefcase, label: "Abonnements" },
    { id: "reports", icon: Flag, label: "Signalements", count: pendingReports || 0 },
    { id: "support", icon: MessageSquare, label: "Support & contenus" },
    { id: "analytics", icon: BarChart3, label: "Statistiques" },
    { id: "settings", icon: SettingsIcon, label: "Parametres" },
  ];

  return (
    <div className={`lm-admin-sidebar${mobileOpen ? ' open' : ''}`} style={{ width: 256, background: C.white, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoBadge size={32} />
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 13.5, color: C.ink }}>LynoraLink</div>
            <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 500 }}>Administration</div>
            {adminEmail && <div style={{ marginTop: 4, fontSize: 10.5, color: C.mutedLight, wordBreak: "break-all" }}>{adminEmail}</div>}
          </div>
          <button onClick={() => onNavigate("dashboard")} aria-label={`${adminEventCount} événement${adminEventCount > 1 ? "s" : ""} administratif${adminEventCount > 1 ? "s" : ""}`} title="Événements administratifs" style={{ position: "relative", marginLeft: "auto", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line}`, borderRadius: 9, background: C.navy50, color: C.navy800, cursor: "pointer" }}>
            <Bell size={16} />
            {adminEventCount > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999, background: C.danger, color: C.white, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.white}` }}>{adminEventCount > 99 ? "99+" : adminEventCount}</span>}
          </button>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.mutedLight, textTransform: "uppercase", letterSpacing: "0.06em", padding: "8px 10px 6px" }}>Gestion</div>
        {navItems.slice(0, 6).map((item) => (
          <SidebarItem key={item.id} item={item} active={activeSection === item.id} onClick={() => onNavigate(item.id)} />
        ))}
        <div style={{ fontSize: 10, fontWeight: 700, color: C.mutedLight, textTransform: "uppercase", letterSpacing: "0.06em", padding: "16px 10px 6px" }}>Moderation & Outils</div>
        {navItems.slice(6).map((item) => (
          <SidebarItem key={item.id} item={item} active={activeSection === item.id} onClick={() => onNavigate(item.id)} />
        ))}
      </nav>

      <div style={{ padding: "12px 8px", borderTop: `1px solid ${C.line}` }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: C.muted, fontSize: 12.5, fontWeight: 600 }}
          onMouseEnter={(e) => e.currentTarget.style.background = C.navy50}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <ArrowLeft size={15} /> Retour au feed
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  PAGE TABLEAU DE BORD                                               */
/* ================================================================== */
function DashboardPage({ users, posts, groups, reports, onNavigate, analytics }) {
  const safeAnalytics = analytics || EMPTY_ANALYTICS;
  const safeTopCategories = safeAnalytics.topCategories || [];
  const pendingReports = reports.filter((r) => r.status === "pending").length;
  const suspendedUsers = users.filter((u) => u.status === "suspended" || u.status === "banned").length;
  const [taskAnalysis, setTaskAnalysis] = useState(null);
  const [analyzingTasks, setAnalyzingTasks] = useState(false);
  const [taskError, setTaskError] = useState("");

  const analyzeAdminTasks = async () => {
    setAnalyzingTasks(true);
    setTaskError("");
    try {
      const response = await fetch("/api/admin/ai/tasks", { method: "POST", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analyse indisponible");
      setTaskAnalysis(data);
    } catch (error) {
      setTaskError(error.message || "Impossible d'analyser les tâches.");
    } finally {
      setAnalyzingTasks(false);
    }
  };

  const now = Date.now();
  const m = 60000;
  const h = 3600000;
  const j = 86400000;

  const recentActivity = [...posts]
    .sort((a, b) => new Date(b.time || b.createdAt || 0) - new Date(a.time || a.createdAt || 0))
    .slice(0, 5)
    .map((post) => ({
      id: post.id,
      time: new Date(post.time || post.createdAt || now),
      text: post.group
        ? `${post.author} a publié dans ${post.group.name}`
        : post.companyPage
          ? `${post.author} a publié depuis ${post.companyPage.name}`
          : `${post.author} a publié une nouvelle publication`,
      icon: post.isArticle ? BookOpen : FileText,
      color: post.group ? C.gold600 : post.companyPage ? C.navy800 : C.success,
    }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 22, color: C.ink }}>Tableau de bord</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Vue d'ensemble de la plateforme {APP_NAME}.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <KpiCard icon={Users} label="Utilisateurs totaux" value={safeAnalytics.totalUsers.toLocaleString("fr-FR")} change={"+" + safeAnalytics.newUsersThisMonth + " ce mois"} iconBg={C.info50} iconColor={C.info} />
        <KpiCard icon={Activity} label="Utilisateurs actifs (30j)" value={safeAnalytics.activeUsersMonth.toLocaleString("fr-FR")} change={"0% du total"} iconBg={C.success50} iconColor={C.success} />
        <KpiCard icon={FileText} label="Publications totales" value={safeAnalytics.totalPosts.toLocaleString("fr-FR")} change={"+" + safeAnalytics.postsThisMonth + " ce mois"} iconBg={C.warning50} iconColor={C.gold600} />
        <KpiCard icon={MessageSquare} label="Messages ce mois" value={safeAnalytics.messagesThisMonth.toLocaleString("fr-FR")} change={"0% vs mois dernier"} iconBg={C.info50} iconColor={C.navy700} />
        <KpiCard icon={Flag} label="Signalements en attente" value={pendingReports} change={pendingReports > 0 ? "Necessite attention" : "Tout est calme"} changeDir={pendingReports > 0 ? "down" : "up"} iconBg={C.danger50} iconColor={C.danger} />
        <KpiCard icon={UsersRound} label="Groupes actifs" value={safeAnalytics.totalGroups} change={groups.filter((g) => g.status === "active").length + " actifs"} iconBg={C.success50} iconColor={C.success} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}><TrendingUp size={15} color={C.navy800} /><span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Croissance utilisateurs</span></div>
          <MiniBarChart data={safeAnalytics.userGrowth || []} color={C.navy800} height={100} />
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}><FileText size={15} color={C.gold600} /><span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Publications par mois</span></div>
          <MiniBarChart data={safeAnalytics.postGrowth || []} color={C.gold600} height={100} />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 18 }}>
          <SectionHeader icon={PieChart} label="Repartition par categorie" />
          {safeTopCategories.length > 0 ? (
            <DonutChart
              data={safeTopCategories.map((cat, index) => ({
                label: cat.name,
                value: Number(cat.count) || 0,
                color: [C.navy800, C.gold600, C.success, C.info, C.warning, C.danger][index % 6],
              }))}
              size={180}
              centerLabel="Categories"
            />
          ) : (
            <div style={{ padding: "18px 6px 4px", fontSize: 12.5, color: C.muted }}>Aucune donnée de répartition par catégorie disponible.</div>
          )}
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionHeader icon={Clock} label="Activite recente" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentActivity.length > 0 ? recentActivity.map((act, i) => {
              const Icon = act.icon;
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: i < recentActivity.length - 1 ? `1px solid ${C.line}` : "none" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${act.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}><Icon size={14} color={act.color} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>{act.text}</div>
                    <div style={{ fontSize: 11, color: C.mutedLight, marginTop: 2 }}><RelativeTime date={act.time} /></div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: "18px 6px 4px", fontSize: 12.5, color: C.muted }}>Aucune activité récente à afficher.</div>
            )}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Mail size={18} color={C.navy800} />
              <div style={{ fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>Assistant IA (Administration)</div>
            </div>
            <div>
              <button onClick={analyzeAdminTasks} disabled={analyzingTasks} style={{ padding: "8px 12px", borderRadius: 8, background: C.navy800, color: C.white, border: "none", cursor: analyzingTasks ? "wait" : "pointer", fontWeight: 700, opacity: analyzingTasks ? 0.7 : 1 }}>{analyzingTasks ? "Analyse en cours..." : "Analyser les actions manuelles"}</button>
              <button onClick={async () => {
                try {
                  const resp = await fetch('/api/admin/ai/announcement', { method: 'POST' });
                  const json = await resp.json();
                  if (!resp.ok) throw new Error(json.error || `Erreur ${resp.status}`);
                  alert(`Annonce publiée dans le feed${json.source === 'fallback' ? ' avec le message de secours' : ' par l\'IA'}.`);
                } catch (e) { alert('Erreur de génération: ' + e.message); }
              }} style={{ padding: '8px 12px', borderRadius: 8, background: goldGrad, color: C.navy900, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Générer annonce</button>
              <button onClick={async () => {
                try {
                  const resp = await fetch('/api/admin/ai/config', { cache: 'no-store' });
                  const json = await resp.json();
                  if (!resp.ok) throw new Error(json.error || `Erreur ${resp.status}`);
                  alert(`Agent config\nprovider: ${json.provider}\nmodel: ${json.model}\nconnexion: ${json.configured ? 'configurée' : 'non configurée'}`);
                } catch (e) { alert('Erreur: ' + e.message); }
              }} style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 8, background: C.line, color: C.ink, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Agent config</button>
            </div>
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>L’assistant analyse les données administratives et propose les prochaines tâches prioritaires. Les actions sensibles nécessitent confirmation.</div>
          {taskError && <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: C.danger50, color: C.danger, fontSize: 12.5 }}>{taskError}</div>}
          {taskAnalysis && (() => {
            const manualTasks = taskAnalysis.tasks.filter((task) => task.requiresManualAction !== false);
            const automaticTasks = taskAnalysis.tasks.filter((task) => task.requiresManualAction === false);

            return (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{taskAnalysis.summary}</span>
                  <span style={{ fontSize: 11, color: C.mutedLight }}>{new Date(taskAnalysis.generatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                {manualTasks.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ marginBottom: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted }}>Actions manuelles admin</div>
                    {manualTasks.map((task) => {
                      const TaskIcon = task.priority === "high" ? AlertTriangle : task.section === "support" ? Mail : task.section === "users" ? Users : FileText;
                      const taskColor = task.priority === "high" ? C.danger : task.priority === "medium" ? C.warning : C.info;
                      return (
                        <button key={task.id} onClick={() => onNavigate(task.section)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 0", border: "none", borderBottom: `1px solid ${C.line}`, background: "transparent", color: C.ink, textAlign: "left", cursor: "pointer" }}>
                          <TaskIcon size={16} color={taskColor} />
                          <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", fontSize: 12.5 }}>{task.label}</strong><span style={{ display: "block", marginTop: 2, fontSize: 11.5, color: C.muted }}>{task.description}</span></span>
                          <ChevronRight size={15} color={C.mutedLight} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {automaticTasks.length > 0 && (
                  <div>
                    <div style={{ marginBottom: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted }}>Rappels automatiques utilisateurs</div>
                    {automaticTasks.map((task) => {
                      const TaskIcon = task.section === "users" ? Users : Bell;
                      const taskColor = C.info;
                      return (
                        <button key={task.id} onClick={() => onNavigate(task.section)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 0", border: "none", borderBottom: `1px solid ${C.line}`, background: "transparent", color: C.ink, textAlign: "left", cursor: "pointer" }}>
                          <TaskIcon size={16} color={taskColor} />
                          <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", fontSize: 12.5 }}>{task.label}</strong><span style={{ display: "block", marginTop: 2, fontSize: 11.5, color: C.muted }}>{task.description}</span></span>
                          <ChevronRight size={15} color={C.mutedLight} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {manualTasks.length === 0 && automaticTasks.length === 0 && (
                  <div style={{ fontSize: 12.5, color: C.success }}>Aucune action prioritaire à effectuer.</div>
                )}
              </div>
            );
          })()}
        </Card>
      </div>

      {(pendingReports > 0 || suspendedUsers > 0) && (
        <Card style={{ padding: 16, borderColor: C.gold400, background: C.warning50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><AlertTriangle size={16} color={C.gold600} /><span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Points d'attention</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingReports > 0 && (
              <button onClick={() => onNavigate("reports")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: C.white, border: `1px solid ${C.gold400}`, cursor: "pointer", textAlign: "left", color: C.ink, fontSize: 12.5 }}>
                <Flag size={14} color={C.danger} /> {pendingReports} signalement{pendingReports > 1 ? "s" : ""} en attente <ChevronRight size={14} color={C.mutedLight} style={{ marginLeft: "auto" }} />
              </button>
            )}
            {suspendedUsers > 0 && (
              <button onClick={() => onNavigate("users")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: C.white, border: `1px solid ${C.gold400}`, cursor: "pointer", textAlign: "left", color: C.ink, fontSize: 12.5 }}>
                <Ban size={14} color={C.danger} /> {suspendedUsers} utilisateur{suspendedUsers > 1 ? "s" : ""} suspendu{suspendedUsers > 1 ? "s" : ""} ou banni{suspendedUsers > 1 ? "s" : ""} <ChevronRight size={14} color={C.mutedLight} style={{ marginLeft: "auto" }} />
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ================================================================== */
/*  PAGE GESTION UTILISATEURS                                          */
/* ================================================================== */
function UserDetailPanel({ user, onClose, onRoleChange, onBan, onSuspend, onDelete }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.4)", display: "flex", justifyContent: "flex-end", zIndex: 150 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, height: "100%", background: C.white, boxShadow: "-8px 0 30px rgba(15,51,82,0.2)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Detail utilisateur</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.navy50, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Avatar initials={user.initials} imgUrl={user.image} size={64} ring /></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 17, color: C.ink }}>
              {user.name}
              {user.role === "admin" && <EnterpriseBadge size={17} label="Administrateur officiel LynoraLink" />}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{user.title}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <InfoRow icon={Mail} label="E-mail" value={user.email} />
            <InfoRow icon={MapPin} label="Localisation" value={user.location} />
            <InfoRow icon={Calendar} label="Inscrit le" value={new Date(user.joined).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} />
            <InfoRow icon={Clock} label="Derniere activite" value={<RelativeTime date={user.lastActive} />} />
            <InfoRow icon={FileText} label="Publications" value={String(user.posts)} />
            <InfoRow icon={Users} label="Connexions" value={String(user.connections)} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Role</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["user", "moderator", "admin"].map((r) => (
                <button key={r} onClick={() => onRoleChange(user.id, r)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1.5px solid ${user.role === r ? C.navy800 : C.line}`, background: user.role === r ? C.navy50 : "transparent", color: user.role === r ? C.navy800 : C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {r === "user" ? "Membre" : r === "moderator" ? "Moderateur" : "Admin"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Statut</div>
            <div style={{ padding: "10px 14px", borderRadius: 10, background: user.status === "active" ? C.success50 : user.status === "suspended" ? C.warning50 : C.danger50, fontSize: 13, fontWeight: 600, color: user.status === "active" ? C.success : user.status === "suspended" ? C.warning : C.danger, display: "flex", alignItems: "center", gap: 8 }}>
              {user.status === "active" ? <><CheckCircle2 size={15} /> Actif</> : user.status === "suspended" ? <><AlertTriangle size={15} /> Suspendu</> : <><XCircle size={15} /> Banni</>}
            </div>
          </div>
        </div>
        <div style={{ padding: 16, borderTop: `1px solid ${C.line}`, display: "flex", gap: 8 }}>
          {user.status === "active" ? (
            <>
              <Btn label="Suspendre" icon={Ban} variant="danger" size="small" onClick={onSuspend} style={{ flex: 1 }} />
              <Btn label="Bannir" icon={XCircle} variant="danger" size="small" onClick={onBan} style={{ flex: 1 }} />
            </>
          ) : (
            <Btn label={user.status === "suspended" ? "Réactiver" : "Libérer"} icon={Unlock} variant="success" size="small" onClick={user.status === "suspended" ? onSuspend : onBan} style={{ flex: 1 }} />
          )}
          <Btn label="Supprimer" icon={Trash2} variant="danger" size="small" onClick={onDelete} style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}

function UsersPage({ users, setUsers, showToast }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const ms = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.title.toLowerCase().includes(search.toLowerCase());
      return ms && (filterStatus === "all" || u.status === filterStatus) && (filterRole === "all" || u.role === filterRole);
    });
  }, [users, search, filterStatus, filterRole]);

  const updateUserInState = (id, updates) => {
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    setSelectedUser((current) => (current && current.id === id ? { ...current, ...updates } : current));
  };

  const persistUserUpdate = async (id, updates) => {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Impossible de mettre a jour l'utilisateur.");
    }

    const data = await response.json().catch(() => ({}));
    if (data.user) {
      updateUserInState(id, { ...data.user, name: data.user.name || "Utilisateur", role: data.user.role || "user", status: data.user.status || "active" });
    }
    return data.user;
  };

  const notifyUser = (userId, message, type = "info") => {
    fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, message, type }) }).catch(() => {});
  };

  const handleAction = async (user, type) => {
    try {
      if (type === "delete") {
        const response = await fetch("/api/admin/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Impossible de supprimer cet utilisateur.");
        }

        const now = new Date().toISOString();
        setUsers((us) => us.map((u) => u.id === user.id ? { ...u, status: "deleted", deletedAt: now } : u));
        setSelectedUser((current) => (current && current.id === user.id ? { ...current, status: "deleted", deletedAt: now } : current));
        showToast("Compte marque comme supprime. Il restera visible 7 jours pour validation.", "warning");
        notifyUser(user.id, "Votre compte a ete supprime par un administrateur. L'acces sera verrouille pendant la verification finale.", "danger");
      }
      else if (type === "ban") {
        const nextStatus = user.status === "banned" ? "active" : "banned";
        await persistUserUpdate(user.id, { status: nextStatus });
        const banAction = nextStatus === "active" ? "reactive" : "banni";
        showToast(nextStatus === "active" ? "Utilisateur reactive." : "Utilisateur banni.", nextStatus === "active" ? "success" : "warning");
        notifyUser(user.id, "Votre compte a ete " + banAction + " par un administrateur.", "warning");
      }
      else if (type === "suspend") {
        const nextStatus = user.status === "suspended" ? "active" : "suspended";
        await persistUserUpdate(user.id, { status: nextStatus });
        const suspendAction = nextStatus === "active" ? "reactive" : "suspendu";
        showToast(nextStatus === "active" ? "Utilisateur reactive." : "Utilisateur suspendu.", nextStatus === "active" ? "success" : "warning");
        notifyUser(user.id, "Votre compte a ete " + suspendAction + " par un administrateur.", "warning");
      }
      setConfirmAction(null);
    } catch (error) {
      showToast(error.message || "Erreur lors de la mise a jour.", "danger");
    }
  };
  const handleRoleChange = async (id, role) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Impossible de modifier le role.");
      }

      const data = await response.json().catch(() => ({}));
      if (data.user) {
        updateUserInState(id, { ...data.user, role: data.user.role || role });
      }
      showToast("Role mis a jour.", "success");
    } catch (error) {
      showToast(error.message || "Erreur lors du changement de role.", "danger");
    }
  };

  const statusBadge = (s) => <Badge label={s === "active" ? "Actif" : s === "suspended" ? "Suspendu" : s === "deleted" ? "Supprime" : "Banni"} color={s === "active" ? "success" : s === "suspended" ? "warning" : s === "deleted" ? "danger" : "danger"} small />;
  const roleBadge = (r) => <Badge label={r === "admin" ? "Admin" : r === "moderator" ? "Moderateur" : "Membre"} color={r === "admin" ? "gold" : r === "moderator" ? "info" : "default"} small />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader icon={Users} label="Gestion des utilisateurs" count={users.length} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}><SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom, e-mail, poste..." /></div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, background: C.white, cursor: "pointer", fontWeight: 500 }}>
          <option value="all">Tous statuts</option><option value="active">Actifs</option><option value="suspended">Suspendus</option><option value="banned">Bannis</option><option value="deleted">Supprimes</option>
        </select>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, background: C.white, cursor: "pointer", fontWeight: 500 }}>
          <option value="all">Tous roles</option><option value="admin">Admins</option><option value="moderator">Moderateurs</option><option value="user">Membres</option>
        </select>
      </div>
      <TableWrapper className="lm-users-wrapper">
        <table className="lm-users-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ borderBottom: `2px solid ${C.line}` }}>
            <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Utilisateur</th>
            <th style={{ textAlign: "left", padding: "12px 12px", fontSize: 11, fontWeight: 700, color: C.muted }}>Statut</th>
            <th style={{ textAlign: "left", padding: "12px 12px", fontSize: 11, fontWeight: 700, color: C.muted }}>Role</th>
            <th style={{ textAlign: "center", padding: "12px 12px", fontSize: 11, fontWeight: 700, color: C.muted }}>Publ.</th>
            <th style={{ textAlign: "left", padding: "12px 12px", fontSize: 11, fontWeight: 700, color: C.muted }}>Derniere activite</th>
            <th style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: C.muted }}>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.line}` }} onMouseEnter={(e) => e.currentTarget.style.background = C.navy50} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => setSelectedUser(u)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                    <Avatar initials={u.initials} imgUrl={u.image} size={36} status={u.status} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.ink }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
                        {u.role === "admin" && <EnterpriseBadge size={14} label="Administrateur officiel LynoraLink" />}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{u.email}</div>
                    </div>
                  </button>
                </td>
                <td style={{ padding: "12px" }}>{statusBadge(u.status)}</td>
                <td style={{ padding: "12px" }}>{roleBadge(u.role)}</td>
                <td style={{ padding: "12px", textAlign: "center", fontWeight: 600, color: C.ink }}>{u.posts}</td>
                <td style={{ padding: "12px", fontSize: 12, color: C.muted }}>{u.lastActive}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                    <button onClick={() => setSelectedUser(u)} title="Voir" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Eye size={14} /></button>
                    {u.status === "active" ? (
                      <button onClick={() => setConfirmAction({ type: "suspend", user: u })} title="Suspendre" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ban size={14} /></button>
                    ) : (
                      <button onClick={() => setConfirmAction({ type: u.status === "banned" ? "ban" : "suspend", user: u })} title={u.status === "banned" ? "Libérer" : "Réactiver"} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: C.success, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Unlock size={14} /></button>
                    )}
                    <button onClick={() => setConfirmAction({ type: "delete", user: u })} title="Supprimer" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={Users} text="Aucun utilisateur ne correspond." />}
      </TableWrapper>
      {selectedUser && <UserDetailPanel user={selectedUser} onClose={() => setSelectedUser(null)} onRoleChange={handleRoleChange} onBan={() => setConfirmAction({ type: "ban", user: selectedUser })} onSuspend={() => setConfirmAction({ type: "suspend", user: selectedUser })} onDelete={() => setConfirmAction({ type: "delete", user: selectedUser })} />}
      {confirmAction && <ConfirmModal title={confirmAction.type === "delete" ? "Supprimer cet utilisateur ?" : confirmAction.type === "ban" ? (confirmAction.user.status === "banned" ? "Libérer cet utilisateur ?" : "Bannir cet utilisateur ?") : confirmAction.user.status === "suspended" ? "Réactiver cet utilisateur ?" : "Suspendre cet utilisateur ?"} message={confirmAction.type === "delete" ? `Suppression definitive de ${confirmAction.user.name}.` : confirmAction.type === "ban" ? (confirmAction.user.status === "banned" ? `${confirmAction.user.name} sera de nouveau actif.` : `${confirmAction.user.name} ne pourra plus se connecter.`) : confirmAction.user.status === "suspended" ? `${confirmAction.user.name} pourra de nouveau se connecter.` : `${confirmAction.user.name} sera temporairement suspendu.`} confirmLabel={confirmAction.type === "delete" ? "Supprimer" : confirmAction.type === "ban" ? (confirmAction.user.status === "banned" ? "Libérer" : "Bannir") : (confirmAction.user.status === "suspended" ? "Réactiver" : "Suspendre")} danger onCancel={() => setConfirmAction(null)} onConfirm={() => handleAction(confirmAction.user, confirmAction.type)} />}
    </div>
  );
}

/* ================================================================== */
/*  PAGE MODERATION PUBLICATIONS                                       */
/* ================================================================== */
function PostsPage({ posts, setPosts, showToast }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const filtered = useMemo(() => posts.filter((p) => {
    const author = String(p.author || "").trim();
    const preview = String(p.headline || p.body || p.text || p.excerpt || "").trim();
    const ms = (author + " " + preview).toLowerCase().includes(search.toLowerCase());
    return ms && (filter === "all" || (filter === "reported" && p.reported) || (filter === "pending" && p.status === "pending_review") || (filter === "featured" && p.featured) || (filter === "articles" && p.isArticle));
  }), [posts, search, filter]);

  const toggleFeatured = async (id) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    try {
      const res = await fetch("/api/admin/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, featured: !post.featured }),
      });
      if (res.ok) {
        setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, featured: !post.featured } : p)));
        showToast("Mise en vedette modifiee.", "success");
      }
    } catch (e) {
      showToast("Erreur lors de la modification.", "danger");
    }
  };
  const deletePost = async (p) => {
    try {
      const res = await fetch("/api/admin/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id }),
      });
      if (res.ok) {
        setPosts((ps) => ps.filter((x) => x.id !== p.id));
        setConfirmDelete(null);
        showToast("Publication supprimee.", "danger");
      }
    } catch (e) {
      showToast("Erreur lors de la suppression.", "danger");
    }
  };
  const approvePost = async (id) => {
    try {
      const res = await fetch("/api/admin/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "published" }),
      });
      if (res.ok) {
        setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, status: "published" } : p)));
        showToast("Publication approuvee.", "success");
      }
    } catch (e) {
      showToast("Erreur lors de l'approbation.", "danger");
    }
  };

  const tabs = [
    { id: "all", label: "Toutes", icon: FileText, count: posts.length },
    { id: "reported", label: "Signalees", icon: Flag, count: posts.filter((p) => p.reported).length },
    { id: "pending", label: "En attente", icon: Clock, count: posts.filter((p) => p.status === "pending_review").length },
    { id: "featured", label: "Vedette", icon: Star, count: posts.filter((p) => p.featured).length },
    { id: "articles", label: "Articles", icon: BookOpen, count: posts.filter((p) => p.isArticle).length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader icon={FileText} label="Moderation des publications" count={posts.length} />
      <AdminTabs tabs={tabs} active={filter} onChange={setFilter} />
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher par auteur, titre, contenu..." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 980, margin: "0 auto" }}>
        {filtered.map((post) => (
          <Card key={post.id} style={{ padding: 16, width: "100%", maxWidth: 980, margin: "0 auto" }}>
            <div className="lm-post-row" style={{ display: "flex", gap: 14, width: "100%", maxWidth: 980, margin: "0 auto" }}>
              <Avatar initials={post.initials} imgUrl={post.avatarUrl} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{post.author}</span>
                  <span style={{ fontSize: 11, color: C.mutedLight }}><RelativeTime date={post.time} /></span>
                  {post.companyPage && <EnterpriseBadge size={12} label={`Page entreprise ${post.companyPage.name}`} />}
                  {post.group && <Badge label="Groupe" color="gold" small />}
                  {post.isArticle && <Badge label="Article" color="info" small />}
                  {post.featured && <Badge label="Vedette" color="gold" small />}
                  {post.reported && <Badge label="Signalee" color="danger" small />}
                  {post.status === "pending_review" && <Badge label="En attente" color="warning" small />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginTop: 4 }}>{(post.headline || post.body || post.text || post.excerpt || "").slice(0, 180) || "Aucun contenu textuel"}</div>
                {post.mediaUrl && (
                  <button
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    title="Voir le détail"
                    style={{
                      marginTop: 12,
                      width: 170,
                      maxWidth: "100%",
                      borderRadius: 12,
                      overflow: "hidden",
                      border: `1px solid ${C.line}`,
                      background: C.navy50,
                      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
                      cursor: "pointer",
                      padding: 0,
                      textAlign: "left",
                    }}
                  >
                    {post.mediaType === "video" ? (
                      <div style={{ position: "relative", width: "100%", height: 120, background: "#000" }}>
                        <video src={post.mediaUrl} controls style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />
                      </div>
                    ) : (
                      <img src={post.mediaUrl} alt="Média de la publication" style={{ display: "block", width: "100%", height: 120, objectFit: "cover" }} />
                    )}
                  </button>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: C.mutedLight, display: "flex", alignItems: "center", gap: 4 }}><ThumbsUp size={12} /> {post.likes}</span>
                  <span style={{ fontSize: 11.5, color: C.mutedLight, display: "flex", alignItems: "center", gap: 4 }}><MessageCircle size={12} /> {post.comments}</span>
                  <span style={{ fontSize: 11.5, color: C.mutedLight, display: "flex", alignItems: "center", gap: 4 }}><Share2 size={12} /> {post.shares}</span>
                </div>
              </div>
              <div className="lm-post-actions" style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                <button onClick={() => toggleFeatured(post.id)} title={post.featured ? "Retirer vedette" : "Mettre en vedette"} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: post.featured ? C.warning50 : "transparent", color: post.featured ? C.gold600 : C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Star size={14} fill={post.featured ? C.gold600 : "none"} /></button>
                {post.status === "pending_review" && <button onClick={() => approvePost(post.id)} title="Approuver" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: C.success, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={14} /></button>}
                <button onClick={() => setConfirmDelete(post)} title="Supprimer" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <EmptyState icon={FileText} text="Aucune publication ne correspond." />}
      </div>
      {selectedPost && (
        <div className="lm-post-viewer-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.58)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={() => setSelectedPost(null)}>
          <div className="lm-post-viewer" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 760, position: "relative" }}>
            <button type="button" onClick={() => setSelectedPost(null)} style={{ position: "absolute", top: 12, right: 12, zIndex: 5, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(15,51,82,0.12)", color: C.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 999 }} aria-label="Fermer le détail">
              <X size={18} />
            </button>

            <div className="lm-post-viewer-content" style={{ maxHeight: "82vh", overflowY: "auto", paddingRight: 4 }}>
              <PostCard
                post={{
                  ...selectedPost,
                  title: selectedPost.title || selectedPost.author || "Publication",
                  visibility: "Public",
                  media: selectedPost.media || (selectedPost.mediaUrl ? [{ url: selectedPost.mediaUrl, type: selectedPost.mediaType || "image", label: "Média" }] : []),
                  comments: Array.isArray(selectedPost.comments) ? selectedPost.comments : [],
                  liked: false,
                  bookmarked: false,
                  shares: selectedPost.shares || 0,
                  reactions: {},
                }}
                currentUser={{
                  name: selectedPost.author || "Vous",
                  initials: selectedPost.initials || "V",
                  avatarUrl: selectedPost.avatarUrl || null,
                }}
                onToggleLike={() => {}}
                onSelectReaction={() => {}}
                onToggleBookmark={() => {}}
                onAddComment={() => {}}
                onReplyComment={() => {}}
                onToggleCommentLike={() => {}}
                onShare={() => {}}
                onOpenPost={() => setSelectedPost(null)}
                onOpenArticle={() => setSelectedPost(null)}
              />
            </div>
          </div>
        </div>
      )}
      {confirmDelete && <ConfirmModal title="Supprimer cette publication ?" message={`La publication de ${confirmDelete.author} sera definitivement supprimee.`} confirmLabel="Supprimer" danger onCancel={() => setConfirmDelete(null)} onConfirm={() => deletePost(confirmDelete)} />}
    </div>
  );
}

/* ================================================================== */
/*  PAGE GESTION GROUPES                                               */
/* ================================================================== */
function GroupsPage({ groups, setGroups, showToast }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [confirmAction, setConfirmAction] = useState(null);

  const categories = ["all", ...new Set(groups.map((g) => g.category))];
  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()) && (filterCat === "all" || g.category === filterCat));

  const toggleStatus = async (group) => {
    const ns = group.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch("/api/admin/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: group.id, status: ns }),
      });
      if (res.ok) {
        setGroups((gs) => gs.map((g) => (g.id === group.id ? { ...g, status: ns } : g)));
        setConfirmAction(null);
        showToast(`Groupe ${ns === "active" ? "reactive" : "suspendu"}.`, ns === "active" ? "success" : "warning");
      }
    } catch (e) {
      showToast("Erreur lors de la modification du groupe.", "danger");
    }
  };
  const deleteGroup = async (group) => {
    try {
      const res = await fetch("/api/admin/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: group.id }),
      });
      if (res.ok) {
        setGroups((gs) => gs.filter((g) => g.id !== group.id));
        setConfirmAction(null);
        showToast("Groupe supprime.", "danger");
      }
    } catch (e) {
      showToast("Erreur lors de la suppression.", "danger");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader icon={UsersRound} label="Gestion des groupes" count={groups.length} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}><SearchBar value={search} onChange={setSearch} placeholder="Rechercher un groupe..." /></div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, background: C.white, cursor: "pointer" }}>
          {categories.map((c) => <option key={c} value={c}>{c === "all" ? "Toutes categories" : c}</option>)}
        </select>
      </div>
      <div className="lm-groups-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {filtered.map((g) => (
          <Card key={g.id} style={{ padding: 10 }} hover>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
              <div style={{ width: 76, height: 88, borderRadius: 9, background: g.coverUrl ? `center / cover no-repeat url(${g.coverUrl})` : g.coverGradient || navyGrad, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {!g.coverUrl && <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16, color: C.white }}>{g.initials}</span>}
              </div>
              <div style={{ minWidth: 0, flex: 1, padding: "1px 0" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5, minWidth: 0, marginBottom: 4 }}>
                  <span style={{ width: "100%", minWidth: 0, fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13.5, color: C.ink, overflowWrap: "anywhere" }}>{g.name}</span>
                  <span style={{ display: "inline-flex", flexShrink: 0 }}><Badge label={g.status === "active" ? "Actif" : "Suspendu"} color={g.status === "active" ? "success" : "warning"} small /></span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.category} · {g.privacy === "public" ? "Public" : "Prive"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 5, fontSize: 11, color: C.muted }}>
                  <span><strong style={{ color: C.ink }}>{g.members.toLocaleString("fr-FR")}</strong> membres</span>
                  <span><strong style={{ color: C.ink }}>{g.postsCount}</strong> publ.</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", marginTop: 8 }}>
                  <Btn label={g.status === "active" ? "Suspendre" : "Reactiver"} icon={g.status === "active" ? Ban : Unlock} variant={g.status === "active" ? "secondary" : "success"} size="small" onClick={() => setConfirmAction({ type: "toggle", group: g })} style={{ padding: "6px 9px", whiteSpace: "nowrap" }} />
                  <Btn label="Supprimer" icon={Trash2} variant="danger" size="small" onClick={() => setConfirmAction({ type: "delete", group: g })} style={{ padding: "6px 9px", whiteSpace: "nowrap" }} />
                </div>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <EmptyState icon={UsersRound} text="Aucun groupe ne correspond." />}
      </div>
      {confirmAction && <ConfirmModal title={confirmAction.type === "delete" ? `Supprimer le groupe ${confirmAction.group.name} ?` : `${confirmAction.group.status === "active" ? "Suspendre" : "Reactiver"} le groupe ${confirmAction.group.name} ?`} message={confirmAction.type === "delete" ? "Cette action est irreversible." : "Les membres ne pourront plus acceder au groupe."} confirmLabel={confirmAction.type === "delete" ? "Supprimer" : confirmAction.group.status === "active" ? "Suspendre" : "Reactiver"} danger={confirmAction.type === "delete"} onCancel={() => setConfirmAction(null)} onConfirm={() => confirmAction.type === "delete" ? deleteGroup(confirmAction.group) : toggleStatus(confirmAction.group)} />}
    </div>
  );
}

/* ================================================================== */
/*  PAGE GESTION ABONNEMENTS                                           */
/* ================================================================== */
function SubscriptionsPage({ subscriptions, setSubscriptions, users, showToast }) {
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const filtered = subscriptions.filter((s) => {
    return (s.userName || (users.find(u => u.id === s.userId) || {}).name || "").toLowerCase().includes(search.toLowerCase()) || s.plan.toLowerCase().includes(search.toLowerCase());
  });

  const updateSubscription = (id, updates) => { setSubscriptions((ss) => ss.map((s) => s.id === id ? { ...s, ...updates } : s)); showToast("Abonnement mis a jour.", "success"); };
  const notifyUser = (userId, message, type = "info") => { fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, message, type }) }).catch(() => {}); };

  const changePlan = async (sub, newPlan) => {
    const response = await fetch("/api/admin/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sub.id, plan: newPlan }) }).catch(() => null);
    if (!response?.ok) { showToast("Impossible de modifier le plan.", "danger"); return; }
    updateSubscription(sub.id, { plan: newPlan.toUpperCase() });
    notifyUser(sub.userId, `Votre abonnement a ete modifie vers ${newPlan}.`, "info");
  };
  const toggleCancel = async (sub) => {
    const newStatus = sub.status === 'canceled' ? 'active' : 'canceled';
    const response = await fetch("/api/admin/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sub.id, status: newStatus }) }).catch(() => null);
    if (!response?.ok) { showToast("Impossible de modifier le statut.", "danger"); return; }
    updateSubscription(sub.id, { status: newStatus });
    notifyUser(sub.userId, `Votre abonnement a ete ${newStatus === 'canceled' ? 'annule' : 'reactive'} par un administrateur.`, newStatus === 'canceled' ? 'warning' : 'success');
    setConfirmAction(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader icon={Briefcase} label="Gestion des abonnements" count={subscriptions.length} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}><SearchBar value={search} onChange={setSearch} placeholder="Rechercher par utilisateur ou plan..." /></div>
      </div>
      <TableWrapper className="lm-subscriptions-wrapper">
        <table className="lm-subscriptions-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ borderBottom: `2px solid ${C.line}` }}>
            <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: C.muted }}>Utilisateur</th>
            <th style={{ textAlign: "left", padding: "12px 12px", fontSize: 11, fontWeight: 700, color: C.muted }}>Plan</th>
            <th style={{ textAlign: "center", padding: "12px 12px", fontSize: 11, fontWeight: 700, color: C.muted }}>Statut</th>
            <th style={{ textAlign: "center", padding: "12px 12px", fontSize: 11, fontWeight: 700, color: C.muted }}>Montant</th>
            <th style={{ textAlign: "center", padding: "12px 12px", fontSize: 11, fontWeight: 700, color: C.muted }}>Prochain paiement</th>
            <th style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: C.muted }}>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${C.line}` }} onMouseEnter={(e) => e.currentTarget.style.background = C.navy50} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td data-label="Utilisateur" style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar initials={(users.find(u => u.id === s.userId) || { initials: s.userName.slice(0,2) }).initials || s.userName.slice(0,2)} size={36} />
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.userName}</div><div style={{ fontSize: 11, color: C.muted }}>{(users.find(u => u.id === s.userId) || {}).email || ''}</div></div>
                  </div>
                </td>
                <td data-label="Plan" style={{ padding: "12px" }}>
                  <select value={s.plan} onChange={(e) => changePlan(s, e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}>
                    <option value="FREE">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </td>
                <td data-label="Statut" style={{ padding: "12px", textAlign: "center" }}><Badge label={s.status === "active" ? "Active" : s.status === "canceled" ? "Annule" : "Echec"} color={s.status === "active" ? "success" : s.status === "canceled" ? "warning" : "danger"} small /></td>
                <td data-label="Montant" style={{ padding: "12px", textAlign: "center", fontWeight: 600, color: C.ink }}>{s.amount ? `${s.amount} ${s.currency}` : "-"}</td>
                <td data-label="Prochain paiement" style={{ padding: "12px", textAlign: "center", fontSize: 12, color: C.muted }}>{s.nextBilling || "-"}</td>
                <td data-label="Actions" style={{ padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                    <button onClick={() => setConfirmAction({ type: s.status === 'canceled' ? 'reactivate' : 'cancel', sub: s })} title={s.status === 'canceled' ? 'Reactiver' : 'Annuler'} style={{ width: 110, height: 34, borderRadius: 8, border: "none", background: s.status === 'canceled' ? C.success50 : C.danger50, color: s.status === 'canceled' ? C.success : C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.status === 'canceled' ? 'Reactiver' : 'Annuler'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={Briefcase} text="Aucun abonnement ne correspond." />}
      </TableWrapper>
      {confirmAction && <ConfirmModal title={confirmAction.type === 'cancel' ? 'Annuler cet abonnement ?' : 'Reactiver cet abonnement ?'} message={confirmAction.type === 'cancel' ? `L'abonnement de ${confirmAction.sub.userName} sera annule.` : `L'abonnement de ${confirmAction.sub.userName} sera reactive.`} confirmLabel={confirmAction.type === 'cancel' ? 'Annuler' : 'Reactiver'} danger={confirmAction.type === 'cancel'} onCancel={() => setConfirmAction(null)} onConfirm={() => toggleCancel(confirmAction.sub)} />}
    </div>
  );
}

/* ================================================================== */
/*  PAGE PAGES ENTREPRISE                                              */
/* ================================================================== */
function PagesPage({ pages, setPages, showToast }) {
  const [search, setSearch] = useState("");
  const [confirmVerify, setConfirmVerify] = useState(null);

  const filtered = pages.filter((p) => String(p.name || "").toLowerCase().includes(search.toLowerCase()));
  const toggleVerified = (page) => { setPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, verified: !p.verified } : p))); setConfirmVerify(null); showToast(page.verified ? "Verification retiree." : "Page verifiee.", "success"); };
  const deletePage = (page) => { setPages((ps) => ps.filter((p) => p.id !== page.id)); showToast("Page supprimee.", "danger"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader icon={Building2} label="Pages entreprise" count={pages.length} />
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher une page..." />
      <div className="lm-pages-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((page) => (
          <Card key={page.id} style={{ padding: 10 }} hover>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ position: "relative", width: 84, height: 58, borderRadius: 9, flexShrink: 0, overflow: "visible", display: "flex", alignItems: "center", justifyContent: "center", background: page.coverUrl ? `center / cover no-repeat url(${page.coverUrl})` : navyGrad }}>
                <div style={{ position: "absolute", left: 8, bottom: -10, padding: 2, borderRadius: "50%", background: C.white, boxShadow: "0 2px 7px rgba(15,51,82,0.18)" }}>
                  <Avatar initials={page.initials} imgUrl={page.logoUrl} size={34} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, overflowWrap: "anywhere" }}>{page.name}</span>
                  {page.verified && <ShieldCheck size={14} color={C.info} />}
                </div>
                <div style={{ marginTop: 3, fontSize: 11.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.category} · {page.followers.toLocaleString("fr-FR")} abonnés · {page.postsCount} publ.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <Badge label={page.status === "active" ? "Active" : "En attente"} color={page.status === "active" ? "success" : "warning"} small />
                  <button onClick={() => setConfirmVerify(page)} title={page.verified ? "Retirer la verification" : "Verifier la page"} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.line}`, background: C.navy50, color: page.verified ? C.info : C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldCheck size={14} /></button>
                  <button onClick={() => deletePage(page)} title="Supprimer la page" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.danger}`, background: C.danger50, color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <EmptyState icon={Building2} text="Aucune page ne correspond." />}
      </div>
      {confirmVerify && <ConfirmModal title={confirmVerify.verified ? "Retirer la verification ?" : "Verifier cette page ?"} message={confirmVerify.verified ? `${confirmVerify.name} perdra son badge.` : `${confirmVerify.name} recevra le badge officiel.`} confirmLabel={confirmVerify.verified ? "Retirer" : "Verifier"} onCancel={() => setConfirmVerify(null)} onConfirm={() => toggleVerified(confirmVerify)} />}
    </div>
  );
}

/* ================================================================== */
/*  PAGE CAMPAGNES SPONSORISEES                                        */
/* ================================================================== */
function CampaignsPage({ campaigns, setCampaigns, showToast }) {
  const objectiveLabels = { visibilite: "Visibilité", engagement: "Engagement", trafic: "Trafic", leads: "Leads" };
  const updateStatus = async (campaign, status) => {
    const response = await fetch("/api/admin/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaign.storageId, status }),
    }).catch(() => null);
    if (!response?.ok) {
      showToast("Impossible de modifier la campagne.", "danger");
      return;
    }
    const data = await response.json().catch(() => ({}));
    setCampaigns((current) => current.map((item) => item.storageId === campaign.storageId ? { ...item, ...data.campaign } : item));
    showToast("Statut de campagne mis à jour.", "success");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader icon={Megaphone} label="Campagnes sponsorisées" count={campaigns.length} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {campaigns.map((campaign) => (
          <Card key={campaign.storageId} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 220, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ color: C.ink, fontSize: 14 }}>{campaign.ownerName}</strong>
                  <Badge label={campaign.status} color={campaign.status === "APPROVED" ? "success" : campaign.status === "REJECTED" ? "danger" : campaign.status === "PAUSED" ? "warning" : "info"} small />
                </div>
                <div style={{ marginTop: 8, color: C.muted, fontSize: 12.5, lineHeight: 1.6 }}>
                  Objectif : <strong style={{ color: C.ink }}>{objectiveLabels[campaign.objective] || campaign.objective}</strong> · Budget : <strong style={{ color: C.ink }}>{campaign.budget} € / jour</strong><br />
                  Audience : {campaign.ageMin}–{campaign.ageMax} ans, {campaign.gender} · {campaign.location || "Lieu non précisé"}<br />
                  Du {campaign.startDate || "-"} au {campaign.endDate || "-"} · Créée le {new Date(campaign.createdAt).toLocaleDateString("fr-FR")}
                </div>
                {campaign.interests && <div style={{ marginTop: 6, color: C.mutedLight, fontSize: 11.5 }}>Centres d’intérêt : {campaign.interests}</div>}
              </div>
              <select value={campaign.status} onChange={(event) => updateStatus(campaign, event.target.value)} style={{ minWidth: 140, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, color: C.ink, background: C.white, fontSize: 12 }}>
                <option value="PENDING">En attente</option>
                <option value="APPROVED">Approuvée</option>
                <option value="PAUSED">En pause</option>
                <option value="REJECTED">Rejetée</option>
                <option value="COMPLETED">Terminée</option>
              </select>
            </div>
          </Card>
        ))}
        {campaigns.length === 0 && <EmptyState icon={Megaphone} text="Aucune campagne sponsorisée enregistrée." />}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  PAGE SIGNALEMENTS                                                  */
/* ================================================================== */
function ReportsPage({ reports, setReports, showToast }) {
  const [filter, setFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);

  const reasonColors = { "Contenu inapproprie": "danger", "Spam": "warning", "Compte suspect": "warning", "Activite frauduleuse": "danger", "Droits d'auteur": "info" };
  const typeLabel = { post: "Publication", user: "Utilisateur", group: "Groupe" };
  const filtered = reports.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  const resolveReport = (id, resolution) => { setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status: "reviewed", resolvedAt: new Date().toISOString(), resolution } : r))); setSelectedReport(null); showToast("Signalement resolu.", "success"); };
  const dismissReport = (id) => { setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r))); setSelectedReport(null); showToast("Signalement rejete.", "warning"); };

  const tabs = [
    { id: "all", label: "Tous", icon: Flag, count: reports.length },
    { id: "pending", label: "En attente", icon: AlertTriangle, count: pendingCount },
    { id: "reviewed", label: "Resolus", icon: CheckCircle2, count: reports.filter((r) => r.status === "reviewed").length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader icon={Flag} label="Signalements & Moderation" count={reports.length} />
      <AdminTabs tabs={tabs} active={filter} onChange={setFilter} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((report) => {
          const rc = reasonColors[report.reason] || "muted";
          return (
            <Card key={report.id} style={{ padding: 16, borderLeft: `4px solid ${report.status === "pending" ? C.danger : report.status === "dismissed" ? C.mutedLight : C.success}` }}>
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: rc === "danger" ? C.danger50 : rc === "warning" ? C.warning50 : C.info50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Flag size={16} color={rc === "danger" ? C.danger : rc === "warning" ? C.warning : C.info} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{report.targetLabel}</span>
                    <Badge label={typeLabel[report.type] || report.type} color="default" small />
                    <Badge label={report.reason} color={rc === "danger" ? "danger" : rc === "warning" ? "warning" : "info"} small />
                    <Badge label={report.status === "pending" ? "En attente" : report.status === "reviewed" ? "Resolu" : "Rejete"} color={report.status === "pending" ? "warning" : report.status === "reviewed" ? "success" : "muted"} small />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginBottom: 4 }}>{report.details}</div>
                  <div style={{ fontSize: 11, color: C.mutedLight }}>Signale par <strong style={{ color: C.ink }}>{report.reporter}</strong> · {new Date(report.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  {report.resolution && <div style={{ fontSize: 12, color: C.success, marginTop: 6, padding: "8px 12px", background: C.success50, borderRadius: 8 }}>Resolution : {report.resolution}</div>}
                </div>
                {report.status === "pending" && (
                  <button onClick={() => setSelectedReport(report)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: C.navy800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Eye size={14} /></button>
                )}
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Flag} text="Aucun signalement." />}
      </div>

      {selectedReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={() => setSelectedReport(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: C.white, borderRadius: 16, padding: 24, boxShadow: "0 24px 60px rgba(15,51,82,0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>Traiter le signalement</div>
              <button onClick={() => setSelectedReport(null)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: C.navy50, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
            </div>
            <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginBottom: 4 }}>{selectedReport.targetLabel}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Raison : <strong>{selectedReport.reason}</strong></div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, padding: "12px 14px", background: C.navy50, borderRadius: 10, marginBottom: 16 }}>{selectedReport.details}</div>
            <div style={{ fontSize: 11.5, color: C.mutedLight, marginBottom: 16 }}>Signale par {selectedReport.reporter} le {new Date(selectedReport.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn label="Rejeter" variant="secondary" onClick={() => dismissReport(selectedReport.id)} style={{ flex: 1 }} />
              <Btn label="Avertissement" variant="success" onClick={() => resolveReport(selectedReport.id, "Avertissement envoye.")} style={{ flex: 1 }} />
              <Btn label="Suspension" variant="danger" onClick={() => resolveReport(selectedReport.id, "Contenu supprime, utilisateur suspendu.")} style={{ flex: 1 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  PAGE STATISTIQUES                                                 */
/* ================================================================== */
function AnalyticsPage({ analytics, users, posts, groups, pages }) {
  const [period, setPeriod] = useState("7d");
  const safeAnalytics = analytics || EMPTY_ANALYTICS;
  const safeDailyActive = safeAnalytics.dailyActive || [];
  const safeTopCategories = safeAnalytics.topCategories || [];
  const safeGeographicDistribution = safeAnalytics.geographicDistribution || [];

  const countryFlag = (code) => {
    if (!code || code === "UNKNOWN" || code.length !== 2) return "";
    return code.toUpperCase().split("").map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 22, color: C.ink }}>Statistiques</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Metriques detaillees de la plateforme.</div>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 3, background: C.navy50, borderRadius: 10 }}>
          {[{ id: "7d", label: "7 jours" }, { id: "30d", label: "30 jours" }, { id: "90d", label: "90 jours" }].map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: period === p.id ? C.white : "transparent", color: period === p.id ? C.navy800 : C.muted, boxShadow: period === p.id ? "0 1px 4px rgba(15,51,82,0.1)" : "none" }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KpiCard
          icon={Users}
          label="Taux de retention"
          value={`${Math.min(100, Math.round(((safeAnalytics.activeUsersMonth || 0) / Math.max(1, safeAnalytics.totalUsers || 1)) * 100))}%`}
          change={`${safeAnalytics.activeUsersMonth || 0} actifs / ${safeAnalytics.totalUsers || 0} total`}
          iconBg={C.success50}
          iconColor={C.success}
        />
        <KpiCard
          icon={Clock}
          label="Duree moy. session"
          value={formatAverageSessionDuration(safeAnalytics.avgSessionDuration)}
          change={safeAnalytics.avgSessionDuration ? `${safeAnalytics.messagesThisMonth || 0} messages ce mois` : "Données de session non suivies"}
          iconBg={C.info50}
          iconColor={C.info}
        />
        <KpiCard
          icon={TrendingUp}
          label="Taux d'engagement"
          value={`${Math.min(100, Math.round((((safeAnalytics.postsThisMonth || 0) + (safeAnalytics.messagesThisMonth || 0)) / Math.max(1, safeAnalytics.totalUsers || 1)) * 100))}%`}
          change={`${(safeAnalytics.postsThisMonth || 0) + (safeAnalytics.messagesThisMonth || 0)} événements ce mois`}
          iconBg={C.warning50}
          iconColor={C.gold600}
        />
        <KpiCard
          icon={UserPlus}
          label="Nouveaux / jour"
          value={safeAnalytics.newUsersThisMonth ? Math.max(1, Math.round((safeAnalytics.newUsersThisMonth || 0) / 30)) : 0}
          change={"Base 30j"}
          iconBg={C.info50}
          iconColor={C.navy700}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}><TrendingUp size={15} color={C.navy800} /><span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Croissance utilisateurs</span></div><MiniBarChart data={safeAnalytics.userGrowth || []} color={C.navy800} height={130} /></Card>
        <Card style={{ padding: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}><FileText size={15} color={C.gold600} /><span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Publications par mois</span></div><MiniBarChart data={safeAnalytics.postGrowth || []} color={C.gold600} height={130} /></Card>
      </div>

      <Card style={{ padding: 18, background: "linear-gradient(180deg, rgba(20,52,83,0.02) 0%, rgba(20,52,83,0.05) 100%)" }}>
        <SectionHeader icon={Activity} label="Utilisateurs actifs par jour" />
        <div style={{ padding: "8px 8px 0", borderRadius: 14, background: "rgba(15,51,82,0.02)", border: `1px solid ${C.line}` }}>
          <MiniBarChart data={safeDailyActive} color={C.navy700} height={110} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
          {safeDailyActive.map((d) => (
            <div key={d.day} style={{ textAlign: "center", padding: "8px 6px", borderRadius: 10, background: d.value > 0 ? "rgba(15,51,82,0.03)" : "transparent", border: d.value > 0 ? `1px solid ${C.line}` : "1px solid transparent" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: d.value > 0 ? C.ink : C.mutedLight }}>{d.value.toLocaleString("fr-FR")}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontWeight: 600 }}>{d.day}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionHeader icon={Globe} label="Répartition géographique mondiale" count={safeGeographicDistribution.length} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, padding: "11px 13px", background: C.navy50, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={15} color={C.navy800} />
            <span style={{ fontSize: 12.5, color: C.muted }}>
              {safeGeographicDistribution.some((item) => item.code !== "UNKNOWN") ? "Localisations reconnues automatiquement" : "Localisation declarative / fallback"}
            </span>
          </div>
          <strong style={{ color: C.navy800, fontSize: 14 }}>{safeAnalytics.geographicCoverage || 0}%</strong>
        </div>
        {safeGeographicDistribution.length > 0 ? (
          <DonutChart
            data={safeGeographicDistribution.slice(0, 6).map((entry, index) => ({
              label: `${countryFlag(entry.code)} ${entry.country}`,
              value: Number(entry.count) || 0,
              color: [C.navy800, C.gold600, C.success, C.info, C.warning, C.danger][index % 6],
            }))}
            size={180}
            centerLabel="Geo"
          />
        ) : (
          <div style={{ padding: "18px 6px 4px", fontSize: 12.5, color: C.muted }}>Aucune localisation utilisateur disponible.</div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 18 }}>
          <SectionHeader icon={PieChart} label="Repartition par categorie" />
          {safeTopCategories.length > 0 ? (
            <DonutChart
              data={safeTopCategories.map((cat, index) => ({
                label: cat.name,
                value: Number(cat.count) || 0,
                color: [C.navy800, C.gold600, C.success, C.info, C.warning, C.danger][index % 6],
              }))}
              size={180}
              centerLabel="Categories"
            />
          ) : (
            <div style={{ padding: "18px 6px 4px", fontSize: 12.5, color: C.muted }}>Aucune donnée de répartition par catégorie disponible.</div>
          )}
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionHeader icon={Users} label="Statuts utilisateurs" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
            <ProgressBar label="Actifs" value={users.filter((u) => u.status === "active").length} max={users.length} color={C.success} />
            <ProgressBar label="Suspendus" value={users.filter((u) => u.status === "suspended").length} max={users.length} color={C.warning} />
            <ProgressBar label="Bannis" value={users.filter((u) => u.status === "banned").length} max={users.length} color={C.danger} />
          </div>
          <div style={{ marginTop: 16, padding: "14px", background: C.navy50, borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Resume entites</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ fontSize: 12.5, color: C.muted }}><strong style={{ color: C.ink }}>{users.length}</strong> utilisateurs</div>
              <div style={{ fontSize: 12.5, color: C.muted }}><strong style={{ color: C.ink }}>{safeAnalytics.totalPosts ?? posts.length}</strong> publications</div>
              <div style={{ fontSize: 12.5, color: C.muted }}><strong style={{ color: C.ink }}>{groups.length}</strong> groupes</div>
              <div style={{ fontSize: 12.5, color: C.muted }}><strong style={{ color: C.ink }}>{pages.length}</strong> pages</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  PAGE PARAMETRES PLATEFORME                                        */
/* ================================================================== */
function PlatformSettingsPage({ settings, setSettings, showToast }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const update = (key, val) => setSettings((s) => ({ ...s, [key]: val }));
  const save = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: {
          ...settings,
          maxPostsPerDay: Number(settings.maxPostsPerDay) || 1,
          maxGroupMembers: Number(settings.maxGroupMembers) || 100,
          maxFileSize: Number(settings.maxFileSize) || 1,
        } }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Impossible d'enregistrer les paramètres.");
      }

      setSaved(true);
      showToast("Parametres enregistres.", "success");
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      showToast(error.message || "Echec de sauvegarde.", "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <SectionHeader icon={SettingsIcon} label="Parametres de la plateforme" />

      <Card style={{ padding: 20 }}>
        <SectionHeader icon={Globe} label="General" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <SettingRow title="Mode maintenance" desc="Desactive temporairement l'acces a la plateforme." checked={settings.maintenanceMode} onChange={(v) => update("maintenanceMode", v)} />
          <SettingRow title="Autoriser les inscriptions" desc="Permet aux nouveaux utilisateurs de creer un compte." checked={settings.allowRegistration} onChange={(v) => update("allowRegistration", v)} />
          <SettingRow title="Verification e-mail obligatoire" desc="Les utilisateurs doivent verifier leur e-mail." checked={settings.requireEmailVerification} onChange={(v) => update("requireEmailVerification", v)} />
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <SectionHeader icon={Star} label="Fonctionnalites" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <SettingRow title="Articles" desc="Permet la redaction d'articles longs." checked={settings.enableArticles} onChange={(v) => update("enableArticles", v)} />
          <SettingRow title="Groupes" desc="Active les groupes communautaires." checked={settings.enableGroups} onChange={(v) => update("enableGroups", v)} />
          <SettingRow title="Messagerie" desc="Permet les messages prives." checked={settings.enableMessages} onChange={(v) => update("enableMessages", v)} />
          <SettingRow title="Pages entreprise" desc="Permet aux entreprises de creer des pages." checked={settings.enablePages} onChange={(v) => update("enablePages", v)} last />
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <SectionHeader icon={ShieldCheck} label="Moderation & Securite" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Niveau de filtrage de contenu</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["low", "medium", "high"].map((level) => (
                <button key={level} onClick={() => update("contentFilterLevel", level)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1.5px solid ${settings.contentFilterLevel === level ? C.navy800 : C.line}`, background: settings.contentFilterLevel === level ? C.navy50 : "transparent", color: settings.contentFilterLevel === level ? C.navy800 : C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {level === "low" ? "Faible" : level === "medium" ? "Moyen" : "Strict"}
                </button>
              ))}
            </div>
          </div>
          <SettingRow title="Approbation automatique" desc="Les publications sont publiees sans validation." checked={settings.autoApprovePosts} onChange={(v) => update("autoApprovePosts", v)} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Publications max. par jour / utilisateur</div>
            <input type="number" value={settings.maxPostsPerDay} onChange={(e) => update("maxPostsPerDay", parseInt(e.target.value) || 1)} style={{ width: 100, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Membres max. par groupe</div>
            <input type="number" value={settings.maxGroupMembers} onChange={(e) => update("maxGroupMembers", parseInt(e.target.value) || 100)} style={{ width: 140, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, outline: "none" }} />
          </div>
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <SectionHeader icon={Mail} label="Fichiers & Uploads" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Extensions acceptees</div>
            <input value={settings.allowedFileTypes} onChange={(e) => update("allowedFileTypes", e.target.value)} style={{ width: "100%", padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Taille max. fichier (Mo)</div>
            <input type="number" value={settings.maxFileSize} onChange={(e) => update("maxFileSize", parseInt(e.target.value) || 1)} style={{ width: 120, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Confidentialite par defaut des groupes</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["public", "private"].map((p) => (
                <button key={p} onClick={() => update("defaultGroupPrivacy", p)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1.5px solid ${settings.defaultGroupPrivacy === p ? C.navy800 : C.line}`, background: settings.defaultGroupPrivacy === p ? C.navy50 : "transparent", color: settings.defaultGroupPrivacy === p ? C.navy800 : C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {p === "public" ? "Public" : "Prive"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Btn label={saving ? "Enregistrement..." : "Enregistrer les parametres"} icon={CheckCircle2} variant="primary" size="large" onClick={save} disabled={saving} />
        {saved && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.success, fontWeight: 600 }}><CheckCircle2 size={14} /> Enregistre</span>}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  COMPOSANT RACINE - ADMIN LynoraLink                                */
/* ================================================================== */
export default function LynoraAdmin({ onBack, adminEmail }) {
  const router = useRouter();
  const handleBack = onBack || (() => router.push("/feed"));
  const [section, setSection] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pages, setPages] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_PLATFORM_SETTINGS);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [adminEventCount, setAdminEventCount] = useState(0);

  const showToast = useCallback((message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); }, []);
  const pendingReportsCount = reports.filter((r) => r.status === "pending").length;
  const navigate = useCallback((id) => setSection(id), []);
  const navigateMobile = useCallback((id) => { setSection(id); setMobileNavOpen(false); }, []);

  const markAdminNotificationsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "admin_ai_tasks", read: true }),
      });
      setAdminEventCount(0);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshAdminEvents = async () => {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const unreadAdminNotifications = Array.isArray(data.notifications)
          ? data.notifications.filter((notification) => notification.type === "admin_ai_tasks" && !notification.read).length
          : 0;
        if (!cancelled) setAdminEventCount(unreadAdminNotifications);
      } catch {}
    };

    markAdminNotificationsRead();
    refreshAdminEvents();
    const refreshTimer = window.setInterval(refreshAdminEvents, 15000);
    return () => { cancelled = true; window.clearInterval(refreshTimer); };
  }, [markAdminNotificationsRead]);

  useEffect(() => {
    cleanupAdminCache();
    const cleanupTimer = window.setInterval(cleanupAdminCache, 60 * 60 * 1000);
    return () => window.clearInterval(cleanupTimer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const cachedAppearance = (() => {
      try { return JSON.parse(localStorage.getItem("lynoralink:appearance") || "null"); } catch { return null; }
    })();
    let activeAppearance = cachedAppearance || {};
    const applyAppearance = (appearance = {}) => {
      activeAppearance = appearance;
      const theme = appearance.theme || "system";
      root.dataset.theme = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
      root.dataset.density = appearance.density || "comfortable";
      root.dataset.fontScale = appearance.fontScale || "medium";
    };
    const handleAppearanceChange = (event) => {
      try { localStorage.setItem("lynoralink:appearance", JSON.stringify(event.detail)); } catch {}
      applyAppearance(event.detail);
    };
    const loadAppearance = async () => {
      if (cachedAppearance?.theme) return;
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (response.ok) {
          const appearance = (await response.json()).appearance;
          try { localStorage.setItem("lynoralink:appearance", JSON.stringify(appearance)); } catch {}
          applyAppearance(appearance);
        }
      } catch {
        applyAppearance(cachedAppearance || {});
      }
    };
    applyAppearance(cachedAppearance || {});
    loadAppearance();
    window.addEventListener("lynora:appearance-updated", handleAppearanceChange);
    const handleSystemThemeChange = () => applyAppearance(activeAppearance);
    mediaQuery.addEventListener?.("change", handleSystemThemeChange);
    return () => {
      window.removeEventListener("lynora:appearance-updated", handleAppearanceChange);
      mediaQuery.removeEventListener?.("change", handleSystemThemeChange);
    };
  }, []);

  // Charger les données depuis l'API au montage
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      try {
        const [usersRes, postsRes, groupsRes, pagesRes, publicPagesRes, campaignsRes, subscriptionsRes, reportsRes, analyticsRes, settingsRes, supportRes] = await Promise.all([
          fetch("/api/admin/users").then(r => r.ok ? r.json() : { users: [] }).catch(() => ({ users: [] })),
          fetch("/api/admin/posts")
            .then(async (r) => {
              if (!r.ok) {
                return { posts: [] };
              }
              const data = await r.json();
              return data && Array.isArray(data.posts) ? data : { posts: [] };
            })
            .catch(() => ({ posts: [] })),
          fetch("/api/admin/groups").then(r => r.ok ? r.json() : { groups: [] }).catch(() => ({ groups: [] })),
          fetch("/api/admin/pages").then(r => r.ok ? r.json() : { pages: [] }).catch(() => ({ pages: [] })),
          fetch("/api/company/pages").then(r => r.ok ? r.json() : { pages: [] }).catch(() => ({ pages: [] })),
          fetch("/api/admin/campaigns").then(r => r.ok ? r.json() : { campaigns: [] }).catch(() => ({ campaigns: [] })),
          fetch("/api/admin/subscriptions").then(r => r.ok ? r.json() : { subscriptions: [] }).catch(() => ({ subscriptions: [] })),
          fetch("/api/admin/reports").then(r => r.ok ? r.json() : { reports: [] }).catch(() => ({ reports: [] })),
          fetch("/api/admin/analytics").then(r => r.ok ? r.json() : { analytics: null }).catch(() => ({ analytics: null })),
          fetch("/api/admin/settings").then(r => r.ok ? r.json() : { settings: DEFAULT_PLATFORM_SETTINGS }).catch(() => ({ settings: DEFAULT_PLATFORM_SETTINGS })),
          fetch("/api/admin/support").then(r => r.ok ? r.json() : { requests: [] }).catch(() => ({ requests: [] })),
        ]);

        if (!cancelled) {
          saveAdminCache("users", usersRes.users || []);
          saveAdminCache("posts", postsRes.posts || []);
          saveAdminCache("groups", groupsRes.groups || []);
          const loadedPages = [...(pagesRes.pages || []), ...(publicPagesRes.pages || [])];
          saveAdminCache("pages", loadedPages);
          saveAdminCache("subscriptions", subscriptionsRes.subscriptions || []);
          saveAdminCache("reports", reportsRes.reports || []);
          saveAdminCache("analytics", analyticsRes.analytics || null);
          if (usersRes.users) setUsers(usersRes.users);
          if (postsRes.posts) setPosts(postsRes.posts);
          if (groupsRes.groups) setGroups(groupsRes.groups);
          if (Array.isArray(loadedPages)) setPages(Array.from(new Map(loadedPages.filter((page) => page && page.id).map((page) => [String(page.id), page])).values()).map((page) => ({
            ...page,
            name: page.name || page.displayName || "Page entreprise",
            initials: page.initials || "EP",
            followers: Number(page.followers || 0),
            postsCount: Number(page.postsCount || 0),
          })));
          if (subscriptionsRes.subscriptions) setSubscriptions(subscriptionsRes.subscriptions);
          if (Array.isArray(campaignsRes.campaigns)) setCampaigns(campaignsRes.campaigns);
          if (reportsRes.reports) setReports(reportsRes.reports);
          if (analyticsRes.analytics) setAnalytics(analyticsRes.analytics);
          if (settingsRes.settings) setSettings(settingsRes.settings);
          if (supportRes.requests) setSupportRequests(supportRes.requests);
        }
      } catch (e) {
        console.error("Erreur chargement admin:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  const renderSection = () => {
    switch (section) {
      case "dashboard": return <DashboardPage users={users} posts={posts} groups={groups} reports={reports} onNavigate={navigate} analytics={analytics} />;
      case "users": return <UsersPage users={users} setUsers={setUsers} showToast={showToast} />;
      case "posts": return <PostsPage posts={posts} setPosts={setPosts} showToast={showToast} />;
      case "groups": return <GroupsPage groups={groups} setGroups={setGroups} showToast={showToast} />;
      case "subscriptions": return <SubscriptionsPage subscriptions={subscriptions} setSubscriptions={setSubscriptions} users={users} showToast={showToast} />;
      case "pages": return <PagesPage pages={pages} setPages={setPages} showToast={showToast} />;
      case "campaigns": return <CampaignsPage campaigns={campaigns} setCampaigns={setCampaigns} showToast={showToast} />;
      case "reports": return <ReportsPage reports={reports} setReports={setReports} showToast={showToast} />;
      case "support": return <AdminSupportPage showToast={showToast} />;
      case "analytics": return <AnalyticsPage analytics={analytics} users={users} posts={posts} groups={groups} pages={pages} />;
      case "settings": return <PlatformSettingsPage settings={settings} setSettings={setSettings} showToast={showToast} />;
      default: return null;
    }
  };

  const globalStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input, textarea, button, select { font-family: inherit; }
        ::-webkit-scrollbar { width: 7px; height: 7px; }
        ::-webkit-scrollbar-thumb { background: ${C.navy100}; border-radius: 7px; }
        table { border-collapse: collapse; }
        th, td { vertical-align: middle; }
      `;

  return (
    <div className="lm-admin-root" style={{ fontFamily: "'Inter', sans-serif", background: C.navy50, minHeight: "100vh", display: "flex", alignItems: "flex-start" }}>
      <style dangerouslySetInnerHTML={{ __html: globalStyles + `
        .lm-mobile-topbar { display: none; }
        .lm-admin-sidebar-overlay { display: none; }
        .lm-admin-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          align-self: flex-start;
          height: 100dvh;
          min-height: 0;
          max-height: 100dvh;
          overflow: hidden;
          z-index: 200;
        }
        .lm-admin-sidebar > nav {
          min-height: 0;
        }
        .lm-admin-main {
          padding: 24px 28px 48px;
          overflow: visible;
          min-width: 0;
          width: calc(100% - 256px);
          margin-left: 256px;
          min-height: 100dvh;
        }

        @media (max-width: 900px) {
          .lm-admin-root { flex-direction: column; width: 100%; min-height: 100dvh; overflow-x: hidden; }
          .lm-mobile-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-width: 0; align-self: stretch; margin: 0; padding: 12px 16px; background: ${C.white}; border-bottom: 1px solid ${C.line}; position: sticky; top: 0; z-index: 220; }
          .lm-mobile-topbar .lm-mobile-title { display: flex; align-items: center; gap: 10px; font-weight: 700; color: ${C.navy900}; }
          .lm-admin-sidebar { position: fixed; inset: 0; width: 100vw !important; max-width: 100vw; transform: translateX(-100%); transition: transform 0.25s ease; z-index: 230; box-shadow: 0 20px 60px rgba(15,51,82,0.18); height: 100dvh; max-height: 100dvh; }
          .lm-admin-sidebar.open { transform: translateX(0); }
          .lm-admin-sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(15,51,82,0.35); z-index: 220; opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }
          .lm-admin-sidebar-overlay.open { opacity: 1; pointer-events: auto; }
          .lm-admin-main { padding: 0 0 32px; min-height: calc(100dvh - 62px); height: auto; max-width: 100%; width: 100%; margin-left: 0; overflow-x: hidden; }
          .lm-admin-main > * { max-width: 100%; min-width: 0; }
          .lm-admin-card { border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: transparent !important; }
          .lm-admin-main [style*="grid-template-columns: 1fr 1fr"],
          .lm-admin-main [style*="grid-template-columns: repeat(7"] { grid-template-columns: 1fr !important; }
          .lm-admin-main [style*="grid-template-columns: repeat(auto-fit"],
          .lm-admin-main [style*="grid-template-columns: repeat(auto-fill"] { grid-template-columns: minmax(0, 1fr) !important; }
          .lm-admin-main .lm-groups-list { grid-template-columns: minmax(0, 1fr) !important; }
          .lm-groups-list > .lm-admin-card > div > div:last-child { width: auto; justify-content: flex-start; }
          .lm-admin-main table { min-width: 640px; }
          .lm-table-scroll { max-width: 100%; overscroll-behavior-x: contain; }
          .lm-table-scroll table { max-width: none; }
          .lm-subscriptions-wrapper { max-height: none; overflow-x: auto; overflow-y: hidden; }
          .lm-subscriptions-table { display: table !important; min-width: 720px !important; width: 100%; }
          .lm-subscriptions-table thead { display: table-header-group; }
          .lm-subscriptions-table tbody { display: table-row-group; }
          .lm-subscriptions-table tr { display: table-row; }
          .lm-subscriptions-table td { display: table-cell; white-space: nowrap; }
          .lm-subscriptions-table td::before { content: none; }
          .lm-users-wrapper { max-width: 100%; overflow-x: auto; overflow-y: hidden; }
          .lm-users-table { display: table !important; min-width: 720px !important; width: 100%; }
          .lm-users-table thead { display: table-header-group; }
          .lm-users-table tbody { display: table-row-group; }
          .lm-users-table tr { display: table-row; }
          .lm-users-table td { display: table-cell; white-space: nowrap; }
          .lm-admin-main input, .lm-admin-main select, .lm-admin-main textarea { max-width: 100%; }
          .lm-admin-main h1, .lm-admin-main h2, .lm-admin-main h3 { max-width: 100%; overflow-wrap: anywhere; }
          .lm-support-admin-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .lm-post-viewer-overlay { padding: 0 !important; align-items: stretch !important; }
          .lm-post-viewer { width: 100vw !important; max-width: 100vw !important; height: 100dvh !important; max-height: 100dvh !important; overflow-y: auto; background: ${C.white}; }
          .lm-post-viewer-content { max-height: none !important; min-height: 100dvh; padding: 0 !important; }
          .lm-post-viewer > button { position: fixed !important; top: 12px !important; right: 12px !important; }
          .lm-admin-tabs { overflow-x: auto; justify-content: flex-start; scrollbar-width: none; }
          .lm-admin-tabs::-webkit-scrollbar { display: none; }
          .lm-admin-tabs button { flex: 0 0 auto !important; min-width: 88px; white-space: nowrap; }
          .lm-post-row { flex-wrap: wrap; gap: 10px !important; }
          .lm-post-row > div:nth-child(2) { width: calc(100% - 50px); flex: 1 1 calc(100% - 50px); min-width: 0; }
          .lm-post-actions { width: 100%; flex-direction: row !important; justify-content: flex-end; border-top: 1px solid ${C.line}; padding-top: 8px; }
          .lm-admin-sidebar { border-right: none; }
          .lm-admin-sidebar > nav { flex: 1; overflow-y: auto; }
          .lm-admin-root { min-height: 100vh; }
        }
      ` }} />

      <div className="lm-mobile-topbar">
        <button onClick={() => setMobileNavOpen((open) => !open)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, border: `1px solid ${C.line}`, background: C.white, color: C.navy800, cursor: 'pointer' }}>
          <MoreHorizontal size={20} />
        </button>
        <div className="lm-mobile-title">
          <LogoBadge size={28} />
          <span>Admin</span>
        </div>
        <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, border: `1px solid ${C.line}`, background: C.white, color: C.navy800, cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className={`lm-admin-sidebar-overlay${mobileNavOpen ? ' open' : ''}`} onClick={() => setMobileNavOpen(false)} />
          <AdminSidebar activeSection={section} onNavigate={navigateMobile} onBack={handleBack} pendingReports={pendingReportsCount} adminEmail={adminEmail} adminEventCount={adminEventCount} mobileOpen={mobileNavOpen} />
      <main className="lm-admin-main" style={{ flex: 1 }}>{renderSection()}</main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

