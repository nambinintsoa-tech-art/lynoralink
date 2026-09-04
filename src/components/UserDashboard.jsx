"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn } from "@fortawesome/free-solid-svg-icons";
import {
  LayoutDashboard, Users, BarChart3, TrendingUp, TrendingDown,
  Eye, MousePointerClick, Clock, ArrowUpRight, ArrowDownRight,
  Settings, Bell, Search, ChevronDown, Calendar, Download,
  Filter, MoreHorizontal, Globe, Briefcase, Mail, User,
  Activity, Zap, Target, PieChart, Layers, Star, MessageSquare,
  ChevronLeft, ChevronRight, Menu, X, ArrowLeft,
  ThumbsUp, Send, Share2, Bookmark, Image as ImageIcon,
  Video, FileText, Check, Copy, Link2, Lock, AtSign,
  CheckCircle2, Heart, PenSquare, BarChart2,
} from "lucide-react";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import RelativeTime from "@/components/RelativeTime";
import PostCard from "@/components/PostCard";
import { fetchBackendApi } from "@/lib/backend-api";

/* ------------------------------------------------------------------ */
/*  TOKENS — palette LynoraLink identique au Feed                    */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy700: "#2C6BA0",
  navy600: "#3B7FBE",
  navy100: "#DCE7F1",
  navy50: "#EFF4F9",
  gold400: "#F6D374",
  gold600: "#D9A536",
  ink: "#132433",
  muted: "#5C7488",
  mutedLight: "#8CA0B3",
  line: "#E3EAF1",
  white: "#FFFFFF",
  danger: "#C24444",
  danger50: "#FBEDED",
  success: "#2D9E6F",
  success50: "#E8F5EF",
  warning: "#E8A838",
  warning50: "#FEF7E8",
  purple: "#7C5CFC",
  purple50: "#F0EDFF",
  teal: "#14B8A6",
  teal50: "#E6FAF8",
};

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;
const APP_NAME = "LynoraLink";

/* ------------------------------------------------------------------ */
/*  DONNÉES DE DÉMONSTRATION                                          */
/* ------------------------------------------------------------------ */
const CURRENT_USER = { name: "Utilisateur", title: "Membre LynoraLink", avatar: "U" };

function formatPostTime(dateTime) {
  if (!dateTime) return "Récemment";
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "Récemment";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDateRangeDays(rangeLabel) {
  const map = {
    "7 derniers jours": 7,
    "30 derniers jours": 30,
    "90 derniers jours": 90,
    "12 derniers mois": 365,
  };
  return map[rangeLabel] || 30;
}

function isWithinSelectedRange(dateValue, rangeLabel) {
  const days = getDateRangeDays(rangeLabel);
  const rawDate = new Date(dateValue);
  if (Number.isNaN(rawDate.getTime())) return true;

  const now = new Date();
  const differenceInDays = (now - rawDate) / (1000 * 60 * 60 * 24);
  return differenceInDays <= days;
}

function normalizePostData(post) {
  const title = post.headline || post.text?.slice(0, 80) || post.author || "Publication";
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const likes = Number(post.likes) || 0;
  const shares = Number(post.shares) || 0;
  const impressions = Number(post.impressions ?? post.views ?? post.reach ?? 0) || 0;
  const engagement = impressions > 0 ? Math.min(100, Math.round(((likes + comments.length + shares) / impressions) * 100)) : 0;

  return {
    ...post,
    title,
    rawTime: post.time || post.createdAt || null,
    time: post.time || post.createdAt || null,
    impressions,
    reach: Math.max(0, impressions),
    engagement,
    status: "published",
    text: post.text || post.excerpt || "",
    shares,
    bookmarked: !!post.bookmarked,
    liked: !!post.liked,
    comments,
  };
}

function buildVisitorSeries(posts) {
  const livePosts = posts.filter((post) => Number(post.impressions) > 0 || Number(post.likes) > 0 || Number(post.shares) > 0);
  if (!livePosts.length) return [];

  return livePosts.slice(0, 6).map((post, index) => {
    const visitors = Number(post.impressions) || 0;
    return {
      month: `P${index + 1}`,
      visitors,
      pageViews: visitors,
      sessions: Math.max(0, Math.round(visitors * 0.75)),
    };
  });
}

function buildEngagementSeries(posts) {
  const livePosts = posts.filter((post) => Number(post.likes) > 0 || (Array.isArray(post.comments) && post.comments.length > 0) || Number(post.shares) > 0);
  if (!livePosts.length) return [];

  return livePosts.slice(0, 7).map((post, index) => ({
    day: `P${index + 1}`,
    likes: Number(post.likes) || 0,
    comments: Array.isArray(post.comments) ? post.comments.length : 0,
    shares: Number(post.shares) || 0,
    clicks: Math.max(0, Number(post.impressions) || 0),
  }));
}

function buildAudienceSeries(posts) {
  const livePosts = posts.filter((post) => post && typeof post === "object");
  if (!livePosts.length) return [];

  const articleCount = livePosts.filter((post) => post.isArticle).length;
  const textCount = livePosts.length - articleCount;

  const values = [
    { label: "Articles", value: articleCount ? Math.round((articleCount / livePosts.length) * 100) : 0, color: C.navy700 },
    { label: "Publications", value: textCount ? Math.round((textCount / livePosts.length) * 100) : 0, color: C.gold600 },
  ].filter((item) => item.value > 0);

  return values.length ? values : [{ label: "Aucune donnée", value: 100, color: C.line }];
}

function buildStatsCards(posts) {
  const totalComments = posts.reduce((sum, post) => sum + (Array.isArray(post.comments) ? post.comments.length : 0), 0);
  const totalLikes = posts.reduce((sum, post) => sum + (Number(post.likes) || 0), 0);
  const totalImpressions = posts.reduce((sum, post) => sum + (Number(post.impressions) || 0), 0);
  const totalInteractions = totalLikes + totalComments;
  const avgEngagement = posts.length
    ? posts.reduce((sum, post) => sum + (Number(post.engagement) || 0), 0) / posts.length
    : 0;

  return [
    { id: "views", label: "Impressions totales", value: totalImpressions, change: 0, trend: "up", icon: Eye, color: C.navy700, bg: C.navy50, sparkline: [10, 14, 12, 18, 17, 21, 19, 24, 28, 32, 30, 35] },
    { id: "connections", label: "Interactions", value: totalInteractions, change: 0, trend: "up", icon: Users, color: C.success, bg: C.success50, sparkline: [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 8, 9] },
    { id: "engagement", label: "Taux d'engagement", value: Number(avgEngagement.toFixed(1)) || 0, suffix: "%", change: 0, trend: "up", icon: MousePointerClick, color: C.warning, bg: C.warning50, sparkline: [10, 12, 11, 14, 13, 17, 16, 18, 20, 21, 19, 22] },
    { id: "posts", label: "Publications", value: posts.length, change: 0, trend: "up", icon: Zap, color: C.purple, bg: C.purple50, sparkline: [1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 7, 8] },
  ];
}

// Activity feed is driven by live data when available.

/* ------------------------------------------------------------------ */
/*  UTILITAIRES                                                        */
/* ------------------------------------------------------------------ */
function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return n.toString();
}

function percentFormat(v) {
  return (v > 0 ? "+" : "") + v.toFixed(1) + "%";
}

function timeAgo() {
  return "À l'instant";
}

/* ------------------------------------------------------------------ */
/*  PETITS COMPOSANTS UTILITAIRES                                      */
/* ------------------------------------------------------------------ */
function Avatar({ initials, size = 44, ring = false, gradient = navyGrad, imgUrl = null }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: imgUrl ? C.navy100 : gradient, color: C.white,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
        fontSize: size * 0.36, fontFamily: "'Sora', sans-serif", flexShrink: 0, overflow: "hidden",
        boxShadow: ring ? `0 0 0 2px ${C.white}, 0 0 0 4px ${C.gold600}` : "none", letterSpacing: "-0.02em",
      }}
    >
      {imgUrl ? <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

function Card({ children, style = {}, onClick, hover = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: C.white, border: `1px solid ${C.line}`, borderRadius: 16,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hover && hovered ? "translateY(-2px)" : "none",
        boxShadow: hover && hovered ? "0 8px 25px rgba(15,51,82,0.1)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TOAST NOTIFICATION                                                */
/* ------------------------------------------------------------------ */
function Toast({ message, icon: ToastIcon, color, visible, onDone }) {
  const [exited, setExited] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setExited(true), 2200);
    const t2 = setTimeout(() => { setExited(false); onDone(); }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible, onDone]);

  if (!visible && !exited) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: `translateX(-50%) translateY(${exited ? 20 : 0}px)`,
      background: C.ink, color: C.white, padding: "12px 22px", borderRadius: 12,
      display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600,
      boxShadow: "0 12px 32px rgba(15,51,82,0.35)", zIndex: 100,
      opacity: exited ? 0 : 1, transition: "all 0.35s ease", pointerEvents: "none",
    }}>
      <ToastIcon size={18} color={color} />
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MOBILE DETECTION HOOK                                              */
/* ------------------------------------------------------------------ */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener?.("change", handler) || mql.addListener?.(handler);
    return () => {
      mql.removeEventListener?.("change", handler) || mql.removeListener?.(handler);
    };
  }, [query]);
  return matches;
}

/* ------------------------------------------------------------------ */
/*  SPARKLINE / AREA / BAR / DONUT / COUNTER  (animations identiques) */
/* ------------------------------------------------------------------ */
function Sparkline({ data, color, width = 100, height = 32, delay = 0, animated = true }) {
  const [progress, setProgress] = useState(animated ? 0 : 1);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { if (!animated) return; const t = setTimeout(() => setProgress(1), delay); return () => clearTimeout(t); }, [delay, animated]);
  const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1; const step = width / (data.length - 1);
  const points = data.map((v, i) => ({ x: i * step, y: height - ((v - min) / range) * (height * 0.8) - height * 0.1 }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const gid = `spark-${color.replace("#", "")}-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible", cursor: "pointer", transition: "transform 0.2s ease", transform: hovered ? "scaleY(1.05)" : "scaleY(1)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
      <clipPath id={`clip-${gid}`}><rect x="0" y="0" width={width * progress} height={height} /></clipPath>
      <g clipPath={`url(#clip-${gid})`}><path d={areaD} fill={`url(#${gid})`} /><path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={C.white} stroke={color} strokeWidth={2} /></g>
    </svg>
  );
}

function AnimatedAreaChart({ data, dataKeys, colors, width = 700, height = 300, delay = 0 }) {
  const [progress, setProgress] = useState(0); const [activePoint, setActivePoint] = useState(null); const ref = useRef(null);
  const chartData = (Array.isArray(data) ? data : []).map((item) => Object.fromEntries([
    ...Object.entries(item || {}),
    ...dataKeys.map((key) => [key, Number.isFinite(Number(item?.[key])) ? Number(item[key]) : 0]),
  ]));
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  useEffect(() => { const t = setTimeout(() => setProgress(1), delay); return () => clearTimeout(t); }, [delay]);
  const chartW = width - padding.left - padding.right; const chartH = height - padding.top - padding.bottom;
  const allValues = chartData.flatMap((d) => dataKeys.map((k) => d[k])); const maxVal = allValues.length ? Math.max(...allValues) : 0; const range = maxVal || 1; const xStep = chartData.length > 1 ? chartW / (chartData.length - 1) : 0;
  const gridLines = 5; const gridVals = Array.from({ length: gridLines }, (_, i) => Math.round((range / (gridLines - 1)) * i));
  const handleMouseMove = useCallback((e) => { if (!ref.current || chartData.length < 2) return; const rect = ref.current.getBoundingClientRect(); const x = e.clientX - rect.left - padding.left; const idx = Math.round(x / xStep); setActivePoint(idx >= 0 && idx < chartData.length ? idx : null); }, [chartData.length, xStep]);
  const handleMouseLeave = useCallback(() => setActivePoint(null), []);
  const gradIds = colors.map((c, i) => `area-grad-${i}-${Math.random().toString(36).slice(2, 8)}`);
  return (
    <div style={{ width: "100%", maxWidth: width, overflow: "visible" }}>
      <svg ref={ref} width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <defs>{colors.map((c, i) => (<linearGradient key={i} id={gradIds[i]} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.25 * progress} /><stop offset="100%" stopColor={c} stopOpacity={0.01 * progress} /></linearGradient>))}</defs>
        {gridVals.map((v, i) => { const y = padding.top + chartH - (v / range) * chartH; return (<g key={i}><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={C.line} strokeWidth={1} strokeDasharray="4 4" /><text x={padding.left - 10} y={y + 4} textAnchor="end" fill={C.mutedLight} fontSize={11}>{formatNumber(v)}</text></g>); })}
        {chartData.map((d, i) => (<text key={i} x={padding.left + i * xStep} y={height - 8} textAnchor="middle" fill={C.mutedLight} fontSize={11}>{d.month || d.day}</text>))}
        <clipPath id={`chart-clip-${delay}`}><rect x={padding.left} y={0} width={chartW * progress} height={height} /></clipPath>
        <g clipPath={`url(#chart-clip-${delay})`}>
          {dataKeys.map((key, si) => {
            const pts = chartData.map((d, i) => ({ x: padding.left + i * xStep, y: padding.top + chartH - (d[key] / range) * chartH }));
            if (pts.length === 0) return null;
            const smooth = pts.reduce((a, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${a} C ${pts[i - 1].x + xStep * 0.4} ${pts[i - 1].y} ${p.x - xStep * 0.4} ${p.y} ${p.x} ${p.y}`, "");
            const area = `${smooth} L ${pts[pts.length - 1].x} ${padding.top + chartH} L ${pts[0].x} ${padding.top + chartH} Z`;
            return (<g key={key}><path d={area} fill={`url(#${gradIds[si]})`} /><path d={smooth} fill="none" stroke={colors[si]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />{pts.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r={activePoint === i ? 5 : 3} fill={C.white} stroke={colors[si]} strokeWidth={2} style={{ transition: "r 0.15s ease" }} />))}</g>);
          })}
        </g>
        {activePoint !== null && <line x1={padding.left + activePoint * xStep} y1={padding.top} x2={padding.left + activePoint * xStep} y2={padding.top + chartH} stroke={C.navy100} strokeWidth={1} strokeDasharray="4 3" />}
      </svg>
      {activePoint !== null && data[activePoint] && (
        <div style={{ position: "absolute", left: `${((padding.left + activePoint * xStep) / width) * 100}%`, top: 8, transform: "translateX(-50%)", background: C.ink, borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(15,51,82,0.25)", zIndex: 10, pointerEvents: "none", whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12, color: C.white, marginBottom: 6 }}>{chartData[activePoint].month || chartData[activePoint].day}</div>
          {dataKeys.map((key, i) => (<div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.navy100 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i], flexShrink: 0 }} /><span style={{ color: C.white, fontWeight: 600 }}>{formatNumber(chartData[activePoint][key])}</span></div>))}
        </div>
      )}
    </div>
  );
}

function AnimatedBarChart({ data, labelKey, valueKey, color = C.navy700, height = 200, delay = 0 }) {
  const [progress, setProgress] = useState(0); const maxVal = Math.max(...data.map((d) => d[valueKey]));
  useEffect(() => { const t = setTimeout(() => setProgress(1), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height }}>
      {data.map((d, i) => { const h = (d[valueKey] / maxVal) * (height * 0.85) * progress; return (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: "100%", maxWidth: 48, height: h, borderRadius: 6, background: d[valueKey] / maxVal > 0.75 ? goldGrad : color, transition: `height 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.05}s`, boxShadow: d[valueKey] / maxVal > 0.75 ? `0 4px 12px ${C.gold600}40` : "none", position: "relative", minHeight: 4 }}>{d[valueKey] / maxVal > 0.75 && <Star size={12} color={C.white} style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)" }} />}</div>
          <span style={{ fontSize: 11, color: C.mutedLight }}>{d[labelKey]}</span>
        </div>); })}
    </div>
  );
}

function DonutChart({ data, size = 140, delay = 0 }) {
  const [progress, setProgress] = useState(0); const [hoveredIdx, setHoveredIdx] = useState(null);
  useEffect(() => { const t = setTimeout(() => setProgress(1), delay); return () => clearTimeout(t); }, [delay]);
  const total = data.reduce((s, d) => s + d.value, 0); const radius = size / 2 - 12; const cx = size / 2; const cy = size / 2; const strokeWidth = 18;
  /* eslint-disable react-hooks/immutability */
  let cumA = -90; const arcs = data.map((d, i) => { const a = (d.value / total) * 360; const s = cumA; cumA += a; return { ...d, startAngle: s, angle: a }; });
  /* eslint-enable react-hooks/immutability */
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc, i) => {
          const sr = (arc.startAngle * Math.PI) / 180; const er = ((arc.startAngle + arc.angle * progress) * Math.PI) / 180;
          const x1 = cx + radius * Math.cos(sr); const y1 = cy + radius * Math.sin(sr); const x2 = cx + radius * Math.cos(er); const y2 = cy + radius * Math.sin(er);
          const la = arc.angle * progress > 180 ? 1 : 0; const exp = hoveredIdx === i ? 4 : 0;
          return <path key={i} d={`M ${x1} ${y1} A ${radius + exp} ${radius + exp} 0 ${la} 1 ${x2} ${y2}`} fill="none" stroke={arc.color} strokeWidth={strokeWidth} strokeLinecap="round" style={{ transition: "all 0.3s ease", opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.4 : 1 }} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 22, color: C.ink }}>{hoveredIdx !== null ? data[hoveredIdx].value + "%" : total + "%"}</span>
        <span style={{ fontSize: 11, color: C.mutedLight }}>{hoveredIdx !== null ? data[hoveredIdx].label : "Total"}</span>
      </div>
    </div>
  );
}

function AnimatedCounter({ value, suffix = "", duration = 1200, delay = 0 }) {
  const [display, setDisplay] = useState(0); const startRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => { startRef.current = Date.now(); const step = () => { const p = Math.min((Date.now() - startRef.current) / duration, 1); setDisplay((1 - Math.pow(1 - p, 3)) * value); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }, delay); return () => clearTimeout(t); }, [value, duration, delay]);
  return <span>{value < 100 ? display.toFixed(1) : formatNumber(Math.round(display))}{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  STAT CARD                                                         */
/* ------------------------------------------------------------------ */
function StatCard({ stat, index }) {
  const Icon = stat.icon;
  return (
    <Card hover className="dash-stat-card dash-card" style={{ padding: 20, position: "relative", overflow: "hidden", animationDelay: `${index * 0.1}s` }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: stat.color, opacity: 0.06, animation: `pulse-subtle 3s ease-in-out ${index * 0.5}s infinite` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600, marginBottom: 8 }}>{stat.label}</div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 28, color: C.ink, lineHeight: 1 }}><AnimatedCounter value={stat.value} suffix={stat.suffix || ""} delay={index * 150} /></div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={22} color={stat.color} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: stat.trend === "up" ? C.success50 : C.danger50, color: stat.trend === "up" ? C.success : C.danger }}>{stat.trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{percentFormat(stat.change)}</span>
        <span style={{ fontSize: 11, color: C.mutedLight }}>vs mois dernier</span>
      </div>
      <div style={{ marginTop: 14 }}><Sparkline data={stat.sparkline} color={stat.color} width={200} height={36} delay={index * 200 + 400} /></div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  QUICK POST COMPOSER — compact, dans l'overview                   */
/* ------------------------------------------------------------------ */
function QuickPostComposer({ onPublish, profile }) {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [visibility, setVisibility] = useState("Public");
  const [publishing, setPublishing] = useState(false);
  const [showVis, setShowVis] = useState(false);
  const textareaRef = useRef(null);

  const handlePublish = () => {
    if (!text.trim()) return;
    setPublishing(true);
    setTimeout(() => {
      onPublish({ text: text.trim(), visibility });
      setText("");
      setExpanded(false);
      setPublishing(false);
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handlePublish(); }
  };

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Avatar initials={CURRENT_USER.avatar} size={40} imgUrl={profile?.avatarUrl || profile?.image || null} />
          <div style={{ flex: 1 }}>
            {!expanded ? (
              <div
                onClick={() => { setExpanded(true); setTimeout(() => textareaRef.current?.focus(), 100); }}
                style={{ padding: "10px 16px", borderRadius: 20, border: `1.5px solid ${C.line}`, background: C.navy50, color: C.mutedLight, fontSize: 14, cursor: "pointer", transition: "border-color 0.2s ease" }}
              >
                Partagez une actualité, une idée...
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Partagez une actualité, une idée, une réflexion..."
                  rows={3}
                  style={{
                    width: "100%", resize: "none", border: `1.5px solid ${C.line}`, borderRadius: 12,
                    padding: "12px 14px", fontSize: 14, lineHeight: 1.6, color: C.ink, background: C.navy50,
                    outline: "none", fontFamily: "'Inter', sans-serif", transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = C.navy700}
                  onBlur={(e) => e.currentTarget.style.borderColor = C.line}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setShowVis(!showVis)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", cursor: "pointer", fontSize: 12, color: C.muted, fontWeight: 600, transition: "all 0.2s ease" }}
                      >
                        {visibility === "Public" ? <Globe size={13} /> : visibility === "Réseau" ? <Users size={13} /> : <Lock size={13} />}
                        {visibility} <ChevronDown size={12} />
                      </button>
                      {showVis && (
                        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(15,51,82,0.15)", padding: "4px 0", zIndex: 5, minWidth: 130, animation: "fadeSlideIn 0.2s ease" }}>
                          {["Public", "Réseau", "Abonnés"].map((v) => (
                            <button key={v} onClick={() => { setVisibility(v); setShowVis(false); }} style={{ width: "100%", textAlign: "left", padding: "8px 14px", border: "none", background: v === visibility ? C.navy50 : "transparent", cursor: "pointer", fontSize: 13, color: v === visibility ? C.navy800 : C.muted, fontWeight: v === visibility ? 700 : 500 }}>
                              {v}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button title="Photo" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.success, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={18} /></button>
                      <button title="Vidéo" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.navy700, display: "flex", alignItems: "center", justifyContent: "center" }}><Video size={18} /></button>
                      <button title="Article" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.gold600, display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={18} /></button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setText(""); setExpanded(false); }} style={{ padding: "7px 16px", borderRadius: 10, border: `1px solid ${C.line}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Annuler</button>
                    <button
                      onClick={handlePublish}
                      disabled={!text.trim() || publishing}
                      style={{
                        padding: "7px 20px", borderRadius: 10, border: "none",
                        background: text.trim() ? goldGrad : C.line,
                        color: text.trim() ? C.navy900 : C.mutedLight,
                        fontWeight: 700, fontSize: 13, cursor: text.trim() ? "pointer" : "default",
                        display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s ease",
                      }}
                    >
                      {publishing ? <span style={{ width: 14, height: 14, border: `2px solid ${C.navy900}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> : <Send size={14} />}
                      Publier
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  CONTENT POST ROW — analytics + inline comment / share            */
/* ------------------------------------------------------------------ */
function ContentPostRow({ post, onLike, onReact, onComment, onShare, onBookmark, index, profile }) {
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const commentInputRef = useRef(null);
  const mediaItems = Array.isArray(post.media) ? post.media : post.media ? [post.media] : [];
  const previewMedia = mediaItems[0];
  const reactionEmojis = { ok: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡" };
  const reactionCounts = Object.entries(post.reactions || {}).filter(([, count]) => Number(count) > 0);

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    setCommentSending(true);
    setTimeout(() => {
      onComment(post.id, commentText.trim());
      setCommentText("");
      setCommentSending(false);
    }, 400);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }
  };

  return (
    <div style={{ width: "min(100%, 540px)" }}>
      <PostCard
        post={post}
        currentUser={{
          id: profile?.id,
          name: profile?.name || CURRENT_USER.name,
          initials: profile?.initials || CURRENT_USER.avatar,
          avatarUrl: profile?.avatarUrl || profile?.image || null,
        }}
        onToggleLike={() => onLike(post.id)}
        onSelectReaction={(postId, reaction) => onReact(postId, reaction)}
        onToggleBookmark={onBookmark}
        onAddComment={onComment}
        onShare={onShare}
      />
    </div>
  );

  return (
    <Card hover className="dash-card" style={{ width: "min(100%, 540px)", padding: 0, overflow: "hidden", opacity: 0, animation: `fadeSlideIn 0.4s ease ${index * 0.08 + 0.2}s forwards` }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px 12px" }}>
        <Avatar initials={post.initials || (post.author || "U").slice(0, 1).toUpperCase()} size={42} imgUrl={post.avatarUrl || null} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 14.5, fontWeight: 700, color: C.ink }}>{post.title}</span>
            {post.status === "draft" && (
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: C.warning50, color: C.warning, letterSpacing: "0.03em", textTransform: "uppercase" }}>Brouillon</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{post.text}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <RelativeTime date={post.time} />
          <button style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.mutedLight, display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={16} /></button>
        </div>
      </div>

      {previewMedia?.url && (
        <div style={{ width: "100%", maxHeight: 360, background: C.navy900, overflow: "hidden" }}>
          {previewMedia.type === "video" ? (
            <video src={previewMedia.url} controls playsInline preload="metadata" style={{ display: "block", width: "100%", maxHeight: 360, objectFit: "contain" }} />
          ) : (
            <img src={previewMedia.url} alt={previewMedia.label || post.title} style={{ display: "block", width: "100%", maxHeight: 360, objectFit: "contain" }} />
          )}
        </div>
      )}

      {reactionCounts.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px 4px", color: C.muted }}>
          <span style={{ display: "flex", alignItems: "center" }}>
            {reactionCounts.map(([reaction]) => <span key={reaction} style={{ marginRight: -2, fontSize: 15 }}>{reactionEmojis[reaction] || "👍"}</span>)}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{reactionCounts.reduce((sum, [, count]) => sum + Number(count), 0)} réaction{reactionCounts.reduce((sum, [, count]) => sum + Number(count), 0) !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 20px", borderTop: `1px solid ${C.line}`, borderBottom: showComments ? `1px solid ${C.line}` : "none" }}>
        {[
          { icon: Eye, label: formatNumber(post.impressions), tooltip: "Impressions" },
          { icon: Users, label: formatNumber(post.reach), tooltip: "Portée" },
          { icon: TrendingUp, label: post.engagement + "%", tooltip: "Engagement" },
        ].map(({ icon: StatIcon, label, tooltip }, i) => (
          <div key={i} title={tooltip} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "10px 0", borderRight: i < 2 ? `1px solid ${C.line}` : "none", justifyContent: "center" }}>
            <StatIcon size={15} color={C.mutedLight} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px 8px" }}>
        <div style={{ position: "relative" }}>
          <ActionButton icon={post.liked ? Heart : ThumbsUp} label={post.likes} active={post.liked} activeColor={C.danger} onClick={() => setShowReactions((visible) => !visible)} />
          {showReactions && (
            <div style={{ position: "absolute", left: 0, bottom: 42, display: "flex", gap: 4, padding: 6, background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(15,51,82,0.16)", zIndex: 3 }}>
              {["ok", "love", "haha", "wow", "sad", "angry"].map((reaction) => (
                <button key={reaction} type="button" title={reaction} onClick={() => { onReact(post.id, reaction); setShowReactions(false); }} style={{ width: 28, height: 28, padding: 0, border: "none", borderRadius: 7, background: post.reaction === reaction ? C.navy50 : "transparent", cursor: "pointer", fontSize: 16 }}>
                  {reaction === "ok" ? "👍" : reaction === "love" ? "❤️" : reaction === "haha" ? "😂" : reaction === "wow" ? "😮" : reaction === "sad" ? "😢" : "😡"}
                </button>
              ))}
            </div>
          )}
        </div>
        <ActionButton icon={MessageSquare} label={post.comments.length} onClick={() => { setShowComments(!showComments); if (!showComments) setTimeout(() => commentInputRef.current?.focus(), 150); }} />
        <ActionButton icon={Share2} label={post.shares} onClick={() => onShare(post.id)} />
        <div style={{ flex: 1 }} />
        <button onClick={() => onBookmark(post.id)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: post.bookmarked ? C.navy50 : "transparent", cursor: "pointer", color: post.bookmarked ? C.gold600 : C.mutedLight, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
          <Bookmark size={16} fill={post.bookmarked ? C.gold600 : "none"} />
        </button>
      </div>

      {/* Inline comments section */}
      {showComments && (
        <div style={{ borderTop: `1px solid ${C.line}`, margin: "0 20px", padding: "12px 0 14px", animation: "fadeSlideIn 0.3s ease" }}>
          {post.comments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {post.comments.map((c) => (
                <CommentBubble key={c.id} comment={c} />
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar initials={CURRENT_USER.avatar} size={28} imgUrl={profile?.avatarUrl || profile?.image || null} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.navy50, borderRadius: 20, padding: "6px 6px 6px 14px", border: `1.5px solid ${C.line}` }}>
              <input
                ref={commentInputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Répondre..."
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: C.ink, minWidth: 0 }}
              />
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || commentSending}
                style={{
                  width: 30, height: 30, borderRadius: "50%", border: "none",
                  background: commentText.trim() ? goldGrad : C.line, cursor: commentText.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center", color: commentText.trim() ? C.navy900 : C.mutedLight,
                  transition: "all 0.2s ease", flexShrink: 0,
                }}
              >
                {commentSending ? <span style={{ width: 12, height: 12, border: `2px solid ${C.navy900}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ActionButton({ icon: Icon, label, active, activeColor, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8,
        border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 600,
        background: active ? `${activeColor}15` : hover ? C.navy50 : "transparent",
        color: active ? activeColor : C.muted, transition: "all 0.2s ease",
      }}
    >
      <Icon size={18} fill={active ? activeColor : "none"} style={{ transition: "transform 0.2s ease", transform: active ? "scale(1.15)" : "none" }} />
      {label > 0 && <span>{label}</span>}
    </button>
  );
}

function CommentBubble({ comment }) {
  const [liked, setLiked] = useState(false);
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <Avatar initials={comment.initials} size={28} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{comment.author}</span>
          <span style={{ fontSize: 11, color: C.mutedLight }}>{comment.time}</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: C.ink }}>{comment.text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <button onClick={() => setLiked(!liked)} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: liked ? C.danger : C.mutedLight }}>
            <Heart size={13} fill={liked ? C.danger : "none"} /> {comment.likes + (liked ? 1 : 0)}
          </button>
          <button style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.mutedLight }}>Répondre</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SHARE MODAL                                                       */
/* ------------------------------------------------------------------ */
function ShareModal({ post, onClose, onShared }) {
  const [copied, setCopied] = useState(false);
  const [sharedNetwork, setSharedNetwork] = useState(null);

  const shareNetworks = [
    { id: "linkedin", label: "LinkedIn", icon: <Briefcase size={22} />, color: "#0077B5" },
    { id: "twitter", label: "X (Twitter)", icon: <AtSign size={22} />, color: "#1DA1F2" },
    { id: "whatsapp", label: "WhatsApp", icon: <MessageSquare size={22} />, color: "#25D366" },
    { id: "facebook", label: "Facebook", icon: <Globe size={22} />, color: "#1877F2" },
  ];

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareNetwork = (network) => {
    setSharedNetwork(network);
    setTimeout(() => {
      onShared(post.id, network);
      setSharedNetwork(null);
    }, 600);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, animation: "fadeIn 0.2s ease" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, background: C.white, borderRadius: 16, boxShadow: "0 24px 60px rgba(15,51,82,0.3)", padding: 24, animation: "fadeSlideIn 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>Partager cette publication</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.navy50, cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
        </div>

        <div style={{ fontSize: 13, color: C.ink, background: C.navy50, borderRadius: 10, padding: "10px 14px", marginBottom: 16, lineHeight: 1.5 }}>{post.title}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {shareNetworks.map((net) => (
            <button
              key={net.id}
              onClick={() => handleShareNetwork(net.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12,
                border: `1.5px solid ${C.line}`, background: sharedNetwork === net.id ? `${net.color}10` : "transparent",
                cursor: "pointer", color: sharedNetwork === net.id ? net.color : C.ink,
                transition: "all 0.2s ease", fontWeight: 600, fontSize: 14,
              }}
            >
              <span style={{ color: net.color }}>{net.icon}</span>
              {sharedNetwork === net.id ? <Check size={18} /> : net.label}
            </button>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mutedLight, marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>Ou copier le lien</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.navy50, borderRadius: 10, border: `1px solid ${C.line}` }}>
              <Link2 size={14} color={C.mutedLight} />
              <span style={{ fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>https://lynoralink.com/post/{post.id}</span>
            </div>
            <button
              onClick={handleCopyLink}
              style={{
                padding: "10px 18px", borderRadius: 10, border: "none",
                background: copied ? C.success : navyGrad,
                color: C.white, fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s ease",
              }}
            >
              {copied ? <><CheckCircle2 size={16} /> Copié</> : <><Copy size={16} /> Copier</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ACTIVITY ITEM                                                     */
/* ------------------------------------------------------------------ */
function ActivityItem({ item, index }) {
  const iconMap = { like: <TrendingUp size={14} />, comment: <MessageSquare size={14} />, connect: <User size={14} />, share: <Globe size={14} />, view: <Eye size={14} />, post: <Send size={14} /> };
  return (
    <div className="dash-activity-item dash-interactive" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: index > 0 ? `1px solid ${C.line}` : "none", animationDelay: `${index * 0.08 + 0.3}s` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${item.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: item.color, flexShrink: 0 }}>{iconMap[item.type]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>{item.user}</span>{" "}
          <span style={{ color: C.muted }}>{item.action}</span>
          {item.target && <span style={{ fontWeight: 600, color: C.navy800 }}> {item.target}</span>}
        </div>
        <div style={{ fontSize: 11, color: C.mutedLight, marginTop: 2 }}>{item.time}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SIDEBAR                                                           */
/* ------------------------------------------------------------------ */
function DashboardSidebar({ activeTab, onTabChange, collapsed, onToggle, profile, isMobile = false, onCloseMobile, mobileMenuOpen = false }) {
  const menuItems = [
    { id: "overview", icon: LayoutDashboard, label: "Vue d'ensemble" },
    { id: "content", icon: BarChart2, label: "Contenu" },
    { id: "audience", icon: Users, label: "Audience" },
    { id: "engagement", icon: Activity, label: "Engagement" },
    { id: "activity", icon: Clock, label: "Activité récente" },
  ];

  const displayName = profile?.name || CURRENT_USER.name;
  const displayTitle = profile?.title || CURRENT_USER.title;
  const displayInitials = profile?.avatar || displayName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || CURRENT_USER.avatar;

  const menuContent = (
    <div style={{ width: "100%", height: "100%", background: C.white, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
      <div className="dashboard-sidebar-header" style={{ padding: collapsed ? "16px 0" : "16px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 12, justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: navyGrad, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold400, flexShrink: 0 }}>
          <FontAwesomeIcon icon={faChartColumn} size="sm" />
        </div>
        {!collapsed && <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}><div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 14, color: C.ink }}>{APP_NAME}</div><div style={{ fontSize: 10.5, color: C.mutedLight }}>Analytics</div></div>}
        {isMobile && (
          <button onClick={onCloseMobile} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
            <X size={20} />
          </button>
        )}
      </div>
      <nav className="dashboard-sidebar-nav" style={{ padding: "12px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
        {!collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mutedLight, padding: "0 10px 8px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Navigation</div>}
        {menuItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => { onTabChange(id); onCloseMobile?.(); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "10px 0" : "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: isActive ? C.navy50 : "transparent", color: isActive ? C.navy800 : C.muted, fontWeight: isActive ? 700 : 500, fontSize: 13.5, justifyContent: collapsed ? "center" : "flex-start", transition: "all 0.2s ease", position: "relative", width: "100%" }} onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = C.navy50; }} onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: "0 3px 3px 0", background: goldGrad }} />}
              <Icon size={20} /><span style={{ display: collapsed ? "none" : "inline" }}>{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="dashboard-sidebar-footer" style={{ padding: collapsed ? "12px 0" : "12px 16px", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: collapsed ? "center" : "flex-start", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexDirection: collapsed ? "column" : "row", textAlign: collapsed ? "center" : "left" }}>
          <Avatar initials={displayInitials} imgUrl={profile?.avatarUrl || profile?.image || null} size={36} />
          {!collapsed && <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div><div style={{ fontSize: 11, color: C.mutedLight, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayTitle}</div></div>}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className={`mobile-sidebar-overlay ${mobileMenuOpen ? "open" : ""}`} onClick={onCloseMobile} />
        <div className={`mobile-sidebar ${mobileMenuOpen ? "open" : ""}`}>
          {menuContent}
        </div>
      </>
    );
  }

  return (
    <div style={{ width: collapsed ? 72 : 260, height: "calc(100vh - 64px)", position: "fixed", top: 64, left: 0, background: C.white, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden", flexShrink: 0, zIndex: 20 }}>
      <button onClick={onToggle} style={{ position: "absolute", top: 24, right: -14, width: 28, height: 28, borderRadius: "50%", background: C.white, border: `1.5px solid ${C.line}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, boxShadow: "0 2px 8px rgba(15,51,82,0.1)", zIndex: 5 }} onMouseEnter={(e) => { e.currentTarget.style.background = C.navy50; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}>{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
      {menuContent}
    </div>
  );
}

function DashboardTopBar({ title, dateRange, onDateRangeChange, onMenuToggle, onExport, onBack, isMobile = false }) {
  const [hoveredExport, setHoveredExport] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const dateOptions = ["7 derniers jours", "30 derniers jours", "90 derniers jours", "12 derniers mois"];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="dash-top-bar" style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24, background: C.navy50, paddingTop: 8, paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && (
          <button
            onClick={onBack}
            className="dash-button"
            style={{
              width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.line}`,
              background: C.white, cursor: "pointer", color: C.ink,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.navy50; e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.transform = "scale(1)"; }}
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {isMobile && (
          <button onClick={onMenuToggle} className="dash-button" style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, cursor: "pointer", color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.navy50; e.currentTarget.style.transform = "scale(1.05)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.transform = "scale(1)"; }}>
            <Menu size={20} />
          </button>
        )}
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: isMobile ? 20 : 24, color: C.ink, margin: 0, letterSpacing: "-0.02em", animation: "fadeSlideIn 0.5s ease" }}>{title}</h1>
          {!isMobile && <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0", animation: "fadeSlideIn 0.5s ease 0.1s both" }}>Suivez vos performances et l'activité de votre réseau</p>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
        <div ref={menuRef} style={{ position: "relative", width: isMobile ? "100%" : 190, flex: isMobile ? 1 : "none" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, width: "100%", background: C.white,
              border: `1px solid ${hoveredDate ? C.navy700 : C.line}`,
              borderRadius: 12, padding: isMobile ? "10px 12px" : "9px 12px",
              cursor: "pointer", color: C.ink, boxShadow: hoveredDate ? "0 6px 18px rgba(15,51,82,0.08)" : "0 2px 10px rgba(15,51,82,0.03)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={() => setHoveredDate(true)}
            onMouseLeave={() => setHoveredDate(false)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Calendar size={15} color={C.navy700} />
              <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dateRange}</span>
            </span>
            <ChevronDown size={15} color={C.muted} style={{ transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
          </button>

          {menuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 12px 28px rgba(15,51,82,0.12)", overflow: "hidden", zIndex: 30 }}>
              {dateOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onDateRangeChange?.(option);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "11px 12px", border: "none",
                    background: option === dateRange ? C.navy50 : "transparent",
                    color: option === dateRange ? C.navy800 : C.ink,
                    fontSize: 13, fontWeight: option === dateRange ? 700 : 600,
                    cursor: "pointer", textAlign: "left",
                    borderBottom: option === dateOptions[dateOptions.length - 1] ? "none" : `1px solid ${C.line}`
                  }}
                >
                  <span>{option}</span>
                  {option === dateRange && <Check size={14} color={C.navy700} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onExport} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, padding: isMobile ? "10px 14px" : "8px 16px",
          borderRadius: 12, border: "none",
          background: goldGrad, color: C.navy900, fontWeight: 800, fontSize: 13,
          cursor: "pointer", width: isMobile ? "100%" : "auto",
          minWidth: isMobile ? 0 : 120, flex: isMobile ? 1 : "none",
          boxShadow: hoveredExport ? `0 6px 18px ${C.gold600}45` : `0 3px 10px ${C.gold600}30`,
          transform: hoveredExport ? "translateY(-1px)" : "translateY(0)", transition: "all 0.2s ease"
        }} onMouseEnter={() => setHoveredExport(true)} onMouseLeave={() => setHoveredExport(false)}>
          <Download size={15} />Exporter
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TABS                                                              */
/* ------------------------------------------------------------------ */
function OverviewTab({ onPublish, profile, stats = [], posts = [] }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const areaWidth = isMobile ? 360 : 700;
  const areaHeight = isMobile ? 220 : 300;
  const bottomAreaWidth = isMobile ? 340 : 450;
  const bottomAreaHeight = isMobile ? 200 : 250;
  const donutSize = isMobile ? 120 : 150;

  const statCards = buildStatsCards(posts);
  const visitorSeries = buildVisitorSeries(posts);
  const engagementSeries = buildEngagementSeries(posts);
  const audienceSeries = buildAudienceSeries(posts);

  const topPosts = posts.slice(0, 5).map((post) => ({
    id: post.id,
    title: post.title,
    impressions: post.impressions,
    engagement: post.engagement,
    date: post.time,
  }));

  if (!posts.length && !stats.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 8 }}>Aucune donnée disponible</div>
          <div style={{ fontSize: 13, color: C.muted }}>Les statistiques apparaîtront ici dès qu’une publication ou une interaction sera enregistrée.</div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stat Cards */}
      <div className="dash-stat-grid" style={{ display: "grid", gap: 12 }}>{statCards.map((s, i) => <StatCard key={s.id} stat={s} index={i} />)}</div>

      {/* Main charts */}
      {visitorSeries.length > 0 && (
        <div className="dash-grid-2" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div><div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>Visiteurs et impressions</div><div style={{ fontSize: 12, color: C.mutedLight, marginTop: 2 }}>Données réelles de vos publications</div></div>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted }}><span style={{ width: 10, height: 3, borderRadius: 2, background: C.navy700 }} />Visiteurs</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted }}><span style={{ width: 10, height: 3, borderRadius: 2, background: C.gold600 }} />Impressions</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted }}><span style={{ width: 10, height: 3, borderRadius: 2, background: C.teal }} />Sessions</span>
              </div>
            </div>
            <div style={{ position: "relative" }}><AnimatedAreaChart data={visitorSeries} dataKeys={["visitors", "pageViews", "sessions"]} colors={[C.navy700, C.gold600, C.teal]} width={areaWidth} height={areaHeight} delay={500} /></div>
          </Card>
          <Card style={{ padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 4 }}>Audience</div>
            <div style={{ fontSize: 12, color: C.mutedLight, marginBottom: 16 }}>Répartition des contenus</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><DonutChart data={audienceSeries} size={donutSize} delay={700} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>{audienceSeries.map((d, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} /><span style={{ color: C.muted, flex: 1 }}>{d.label}</span><span style={{ fontWeight: 700, color: C.ink }}>{d.value}%</span></div>))}</div>
          </Card>
        </div>
      )}

      {/* Bottom row */}
      {engagementSeries.length > 0 && (
        <div className="dash-grid-2" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 4 }}>Engagement hebdomadaire</div>
            <div style={{ fontSize: 12, color: C.mutedLight, marginBottom: 16 }}>Interactions réelles sur vos publications</div>
            <div style={{ position: "relative" }}><AnimatedAreaChart data={engagementSeries} dataKeys={["likes", "comments", "shares"]} colors={[C.danger, C.navy700, C.purple]} width={bottomAreaWidth} height={bottomAreaHeight} delay={800} /></div>
          </Card>

          {topPosts.length > 0 && (
            <Card style={{ padding: 24 }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 4 }}>Publications les plus vues</div>
              <div style={{ fontSize: 12, color: C.mutedLight, marginBottom: 16 }}>Top 5 de vos contenus</div>
              {topPosts.map((post, i) => (
                <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i > 0 ? `1px solid ${C.line}` : "none", opacity: 0, animation: `fadeSlideIn 0.35s ease ${i * 0.07 + 1}s forwards` }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? goldGrad : C.navy50, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 12, color: i === 0 ? C.navy900 : C.muted, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.title}</div><div style={{ fontSize: 11, color: C.mutedLight, marginTop: 2 }}>{post.date}</div></div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{formatNumber(post.impressions)}</div><div style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>{post.engagement}% eng.</div></div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ContentTab({ posts, onLike, onReact, onComment, onShare, onBookmark, profile }) {
  const [filter, setFilter] = useState("all");
  const filteredPosts = filter === "all" ? posts : filter === "published" ? posts.filter((p) => p.status === "published") : posts.filter((p) => p.status === "draft");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary bar */}
      <div className="dash-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Publications", value: posts.length, color: C.navy700, bg: C.navy50 },
          { label: "Total impressions", value: posts.reduce((s, p) => s + p.impressions, 0), color: C.purple, bg: C.purple50 },
          { label: "Total engagements", value: posts.reduce((s, p) => s + p.likes + p.comments.length + p.shares, 0), color: C.success, bg: C.success50 },
          { label: "Engagement moy.", value: (posts.reduce((s, p) => s + p.engagement, 0) / posts.length).toFixed(1) + "%", color: C.gold600, bg: C.warning50 },
        ].map((item, i) => (
          <Card key={i} className="dash-card dash-stat-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, animationDelay: `${i * 0.1}s` }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><BarChart2 size={18} color={item.color} /></div>
            <div><div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{item.label}</div><div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 18, color: C.ink }}>{typeof item.value === "number" ? formatNumber(item.value) : item.value}</div></div>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "all", label: "Toutes" },
            { id: "published", label: "Publiées" },
            { id: "draft", label: "Brouillons" },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="dash-button" style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: filter === f.id ? 700 : 500, background: filter === f.id ? navyGrad : "transparent", color: filter === f.id ? C.white : C.muted, transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12.5, color: C.mutedLight }}>{filteredPosts.length} publication{filteredPosts.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Post list */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
        {filteredPosts.map((post, i) => (
          <ContentPostRow key={post.id} post={post} onLike={onLike} onReact={onReact} onComment={onComment} onShare={onShare} onBookmark={onBookmark} index={i} profile={profile} />
        ))}
      </div>
    </div>
  );
}

function AudienceTab({ posts = [], stats = [] }) {
  const demographicsData = buildAudienceSeries(posts, stats);
  const deviceData = [
    { label: "Mobile", value: Math.max(42, 58 + (posts.length || 1) * 2), color: C.navy700 },
    { label: "Desktop", value: Math.max(20, 31 + (posts.length || 1) * 1.2), color: C.gold600 },
    { label: "Tablet", value: Math.max(8, 11 + (posts.length || 1) * 0.8), color: C.teal },
  ].map((item) => ({ ...item, value: Math.min(100, item.value) }));
  const totalDevice = deviceData.reduce((sum, item) => sum + item.value, 0) || 1;
  const normalizedDevice = deviceData.map((item) => ({ ...item, value: Math.round((item.value / totalDevice) * 100) }));

  const totalVisitors = posts.reduce((sum, post) => sum + (Number(post.impressions) || 0), 0);
  const sessionMinutes = posts.length ? Number((posts.length * 0.8).toFixed(1)) : 0;
  const bounceRate = posts.length ? Math.max(18, Math.min(65, 25 + posts.length * 3)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="dash-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[
          { label: "Total visiteurs uniques", value: totalVisitors, color: C.navy700 },
          { label: "Durée moy. session", value: sessionMinutes, suffix: " min", color: C.success },
          { label: "Taux de rebond", value: bounceRate, suffix: "%", color: C.warning },
        ].map((item, i) => (
          <Card key={i} hover className="dash-card dash-stat-card" style={{ padding: 24, textAlign: "center", animationDelay: `${i * 0.15 + 0.2}s` }}>
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600, marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 32, color: C.ink }}><AnimatedCounter value={item.value} suffix={item.suffix || ""} delay={i * 200 + 200} /></div>
          </Card>
        ))}
      </div>
      <div className="dash-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 24 }}><div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 4 }}>Démographie par âge</div><div style={{ fontSize: 12, color: C.mutedLight, marginBottom: 20 }}><AnimatedBarChart data={demographicsData} labelKey="label" valueKey="value" color={C.navy700} height={180} delay={300} /></div></Card>
        <Card style={{ padding: 24 }}><div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 4 }}>Appareils utilisés</div><div style={{ fontSize: 12, color: C.mutedLight, marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}><DonutChart data={normalizedDevice} size={160} delay={500} /></div></div></Card>
      </div>
    </div>
  );
}

function EngagementTab({ posts = [] }) {
  const engagementData = buildEngagementSeries(posts);
  const totalLikes = posts.reduce((sum, post) => sum + (Number(post.likes) || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (Array.isArray(post.comments) ? post.comments.length : 0), 0);
  const totalShares = posts.reduce((sum, post) => sum + (Number(post.shares) || 0), 0);
  const totalClicks = Math.max(200, totalLikes + totalComments * 2 + totalShares * 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="dash-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "J'aime", value: totalLikes, icon: <TrendingUp size={18} />, color: C.danger, bg: C.danger50 },
          { label: "Commentaires", value: totalComments, icon: <MessageSquare size={18} />, color: C.navy700, bg: C.navy50 },
          { label: "Partages", value: totalShares, icon: <Globe size={18} />, color: C.purple, bg: C.purple50 },
          { label: "Clics", value: totalClicks, icon: <MousePointerClick size={18} />, color: C.success, bg: C.success50 },
        ].map((item, i) => (
          <Card key={i} hover className="dash-card dash-stat-card" style={{ padding: 20, textAlign: "center", animationDelay: `${i * 0.1 + 0.2}s` }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: item.color }}>{item.icon}</div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 24, color: C.ink }}><AnimatedCounter value={item.value} delay={i * 150 + 200} /></div>
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600, marginTop: 4 }}>{item.label}</div>
          </Card>
        ))}
      </div>
      <Card style={{ padding: 24 }}><div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 4 }}>Tendance d'engagement</div><div style={{ fontSize: 12, color: C.mutedLight, marginBottom: 16 }}>Évolution sur la semaine</div><div style={{ position: "relative" }}><AnimatedAreaChart data={engagementData} dataKeys={["likes", "comments", "shares", "clicks"]} colors={[C.danger, C.navy700, C.purple, C.success]} width={700} height={280} delay={400} /></div></Card>
    </div>
  );
}

function ActivityTab({ activityFeed }) {
  if (!activityFeed.length) {
    return (
      <Card style={{ padding: 24 }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 8 }}>Activité récente</div>
        <div style={{ fontSize: 12, color: C.mutedLight }}>Aucune activité récente n'a encore été enregistrée. Les actions sur vos publications apparaîtront ici.</div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>Activité récente</div><div style={{ fontSize: 12, color: C.mutedLight, marginTop: 2 }}>Dernières interactions sur votre profil</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, color: C.muted, cursor: "pointer" }}><Filter size={14} />Filtrer</div>
      </div>
      {activityFeed.map((item, i) => <ActivityItem key={item.id} item={item} index={i} />)}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  COMPOSANT PRINCIPAL                                                */
/* ------------------------------------------------------------------ */
export default function UserDashboard({ profile: initialProfile }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState("30 derniers jours");
  const [ready, setReady] = useState(false);
  const importInputRef = useRef(null);

  /* ---- POSTS STATE ---- */
  const [posts, setPosts] = useState([]);
  const [sharePost, setSharePost] = useState(null);

  /* ---- ACTIVITY STATE ---- */
  const [activityFeed, setActivityFeed] = useState([]);

  /* ---- STATS STATE ---- */
  const [stats, setStats] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  /* ---- TOAST STATE ---- */
  const [toast, setToast] = useState({ message: "", icon: CheckCircle2, color: C.success, visible: false, key: 0 });
  const showToast = useCallback((message, icon, color) => {
    setToast({ message, icon, color, visible: true, key: Date.now() });
  }, []);

  const profile = initialProfile || CURRENT_USER;

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const query = profile?.id ? `?userId=${encodeURIComponent(profile.id)}` : "";
      const res = await fetchBackendApi(`/api/posts${query}`);
      if (!res.ok) throw new Error("Impossible de charger les publications");
      const data = await res.json();
      const postsData = Array.isArray(data.posts) ? data.posts.map(normalizePostData) : [];
      setPosts(postsData);
    } catch (error) {
      console.error("Erreur posts:", error);
      showToast("Impossible de charger les publications", MessageSquare, C.danger);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, [profile?.id, showToast]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetchBackendApi("/api/stats");
      if (!res.ok) throw new Error("Impossible de charger les statistiques");
      const data = await res.json();
      const statsData = Array.isArray(data.stats)
        ? data.stats.map((item) => ({ ...item, value: Number(item.value) || 0 }))
        : [];
      setStats(statsData);
    } catch (error) {
      console.error("Erreur stats:", error);
      showToast("Impossible de charger les statistiques", Download, C.danger);
      setStats([]);
    } finally {
      setLoadingStats(false);
    }
  }, [showToast]);

  useEffect(() => { const t = setTimeout(() => setReady(true), 100); return () => clearTimeout(t); }, []);
  useEffect(() => { loadPosts(); loadStats(); }, [loadPosts, loadStats]);

  const filteredPosts = posts.filter((post) => isWithinSelectedRange(post.rawTime || post.time, dateRange));

  const handleExport = useCallback(() => {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), posts, stats }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lynoralink-dashboard.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Export JSON réussi", Download, C.success);
  }, [posts, showToast, stats]);

  const handleLike = useCallback(async (postId, reaction = "ok") => {
    let previousPosts;
    setPosts((ps) => {
      previousPosts = ps;
      return ps.map((p) => p.id === postId ? { ...p, liked: !(p.liked && p.reaction === reaction), reaction } : p);
    });

    try {
      const res = await fetchBackendApi(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      if (!res.ok) throw new Error("Erreur like");
      const data = await res.json();
      setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, liked: data.liked, likes: data.likes, reaction: data.reaction || null } : p));
    } catch (error) {
      console.error("Erreur like:", error);
      showToast("Impossible d'aimer cette publication", Heart, C.danger);
      if (previousPosts) setPosts(previousPosts);
    }
  }, [showToast]);

  const handleComment = useCallback(async (postId, text) => {
    const tempId = `c${Date.now()}`;
    const newComment = { id: tempId, author: CURRENT_USER.name, initials: CURRENT_USER.avatar, avatarUrl: profile?.avatarUrl || profile?.image || null, text, time: "À l'instant", likes: 0 };
    
    // Optimistic update
    setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p));
    setActivityFeed((prev) => [{ id: Date.now() + 1, type: "comment", user: CURRENT_USER.name, action: "a commenté", target: posts.find((p) => p.id === postId)?.title || "", time: "À l'instant", color: C.navy700 }, ...prev]);
    showToast("Commentaire ajouté", MessageSquare, C.navy700);

    try {
      const res = await fetchBackendApi(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Erreur lors de la création du commentaire");

      const savedComment = await res.json();
      // Replace temp comment with saved one
      setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, comments: p.comments.map((c) => (c.id === tempId ? savedComment : c)) } : p));
    } catch (error) {
      console.error("Erreur:", error);
      // Remove temp comment on error
      setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== tempId) } : p));
      showToast("Erreur lors de l'ajout du commentaire", MessageSquare, C.danger);
    }
  }, [posts, showToast, profile]);

  const handleShare = useCallback((postId) => {
    setSharePost(posts.find((p) => p.id === postId));
  }, [posts]);

  const handleShared = useCallback((postId, network) => {
    setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, shares: p.shares + 1 } : p));
    const networkNames = { linkedin: "LinkedIn", twitter: "X", whatsapp: "WhatsApp", facebook: "Facebook", link: "lien copié" };
    setActivityFeed((prev) => [{ id: Date.now() + 2, type: "share", user: CURRENT_USER.name, action: `a partagé via ${networkNames[network] || network}`, target: posts.find((p) => p.id === postId)?.title || "", time: "À l'instant", color: C.purple }, ...prev]);
    setSharePost(null);
    showToast(`Partagé sur ${networkNames[network] || network}`, Share2, C.purple);
  }, [posts, showToast]);

  const handleBookmark = useCallback(async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const nextBookmarked = !post.bookmarked;
    setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, bookmarked: nextBookmarked } : p));
    try {
      const res = await fetchBackendApi(`/api/posts/${postId}/save`, { method: "POST" });
      if (!res.ok) throw new Error("Erreur favori");
      const data = await res.json();
      setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, bookmarked: data.bookmarked } : p));
      showToast(data.bookmarked ? "Ajouté aux favoris" : "Retiré des favoris", Bookmark, C.gold600);
    } catch (error) {
      console.error("Erreur favori:", error);
      setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, bookmarked: post.bookmarked } : p));
      showToast("Impossible de modifier le favori", Bookmark, C.danger);
    }
  }, [posts, showToast]);

  const handlePublish = useCallback(async ({ text, visibility }) => {
    if (!text.trim()) {
      showToast("Le contenu est vide", Send, C.danger);
      return;
    }

    showToast("Publication en cours...", Send, C.navy700);

    try {
      const res = await fetchBackendApi("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, isArticle: false, headline: null, excerpt: null, articleBody: null, media: [], visibility }),
      });
      if (!res.ok) throw new Error("Erreur création publication");
      const data = await res.json();
      const newPost = normalizePostData({
        ...data.post,
        author: profile?.name || CURRENT_USER.name,
        image: profile?.avatarUrl || profile?.image || null,
        comments: [],
        likes: 0,
        shares: 0,
        bookmarked: false,
        liked: false,
      });

      setPosts((ps) => [newPost, ...ps]);
      setActivityFeed((prev) => [{ id: Date.now() + 3, type: "post", user: CURRENT_USER.name, action: `a publié (${visibility})`, target: newPost.title, time: "À l'instant", color: C.success }, ...prev]);
      showToast("Publication créée !", CheckCircle2, C.success);
    } catch (error) {
      console.error("Erreur publication:", error);
      showToast("Impossible de publier", Send, C.danger);
    }
  }, [showToast, profile]);

  const tabTitles = { overview: "Vue d'ensemble", content: "Contenu", audience: "Audience", engagement: "Engagement", activity: "Activité récente" };

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab onPublish={handlePublish} profile={profile} stats={stats} posts={filteredPosts} />;
      case "content": return <ContentTab posts={filteredPosts} onLike={handleLike} onReact={handleLike} onComment={handleComment} onShare={handleShare} onBookmark={handleBookmark} profile={profile} />;
      case "audience": return <AudienceTab posts={filteredPosts} stats={stats} />;
      case "engagement": return <EngagementTab posts={filteredPosts} />;
      case "activity": return <ActivityTab activityFeed={activityFeed} />;
      default: return <OverviewTab onPublish={handlePublish} profile={profile} stats={stats} posts={filteredPosts} />;
    }
  };

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="user-dashboard-root" style={{ fontFamily: "'Inter', sans-serif", background: C.navy50, minHeight: "calc(100vh - 64px)", display: "flex", padding: isMobile ? "0" : "24px 24px 32px", overflowX: "hidden", width: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea, button { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.navy100}; border-radius: 6px; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeSlideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse-subtle { 0%, 100% { opacity: 0.06; transform: scale(1); } 50% { opacity: 0.12; transform: scale(1.15); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dash-tab-content { animation: fadeSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .dash-card { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }
        .dash-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(15,51,82,0.12); }
        .dash-grid-2, .dash-grid-3, .dash-grid-4 { transition: all 0.3s ease; }
        .dash-sidebar { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .dash-stat-card { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .dash-activity-item { animation: slideUp 0.4s ease forwards; opacity: 0; }
        .dash-counter { animation: countUp 0.8s ease forwards; }
        .dash-button { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }
        .dash-button:hover { transform: translateY(-2px) scale(1.02); }
        .dash-button:active { transform: translateY(0) scale(0.98); }
        .dash-interactive { transition: all 0.2s ease; cursor: pointer; }
        .dash-interactive:hover { transform: translateY(-2px); }
        .dash-interactive:active { transform: translateY(0); }
        .mobile-sidebar-overlay {
          position: fixed; inset: 0; background: rgba(15,51,82,0.5); z-index: 110;
          opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
        }
        .mobile-sidebar-overlay.open { opacity: 1; pointer-events: auto; }
        .mobile-sidebar {
          position: fixed; left: 0; top: 0; bottom: 0; width: min(360px, 100vw); max-width: 100vw;
          background: ${C.white}; z-index: 120; transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 4px 0 24px rgba(15,51,82,0.15);
        }
        .dash-stat-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
        .mobile-sidebar.open { transform: translateX(0); }
        html, body, #__next { overflow-x: hidden; }
        @media (max-width: 1024px) { .dash-grid-2, .dash-grid-3, .dash-grid-4 { grid-template-columns: 1fr 1fr !important; } .hide-tablet { display: none !important; } }
        @media (max-width: 768px) {
          .user-dashboard-root { width: 100% !important; min-width: 0 !important; min-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important; display: block !important; }
          .dash-grid-2, .dash-grid-3, .dash-grid-4 { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
          .dash-main { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 8px 8px 24px !important; min-width: 0 !important; overflow: visible !important; box-sizing: border-box !important; }
          .dash-main \\3e *, .dash-tab-content, .dash-tab-content \\3e * { width: 100% !important; max-width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; }
          .dash-main img, .dash-main video, .dash-main canvas { max-width: 100% !important; }
          .dash-top-bar { flex-direction: column; gap: 8px; align-items: stretch !important; }
          .dash-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          h1 { font-size: 18px !important; }
          p { font-size: 12px !important; }
          .dash-stat-card { padding: 12px !important; }
          .dash-card { margin-bottom: 8px !important; padding: 12px !important; }
          .dash-stat-grid { grid-template-columns: 1fr !important; }
          svg { max-width: 100% !important; height: auto !important; }
          textarea { font-size: 14px !important; padding: 10px !important; }
          input { font-size: 14px !important; padding: 8px !important; }
          button { font-size: 12px !important; padding: 6px 10px !important; }
          [role="main"] svg { max-width: 100% !important; }
          .mobile-sidebar { width: 100vw !important; max-width: 100vw !important; box-shadow: none !important; }
          .mobile-sidebar \\3e div { position: relative; height: 100dvh; min-height: 100dvh; }
          .mobile-sidebar nav { padding: 16px 12px !important; gap: 6px !important; }
          .mobile-sidebar nav button { min-height: 52px; padding: 12px 14px !important; font-size: 14px !important; }
          .mobile-sidebar nav button svg { width: 21px; height: 21px; }
          .dashboard-sidebar-header { padding: calc(18px + env(safe-area-inset-top)) 16px 18px !important; min-height: 72px; }
          .dashboard-sidebar-footer { position: absolute; left: 0; right: 0; bottom: 16px; padding: 10px 16px !important; margin: 0 !important; transform: none !important; background: ${C.white}; }
          .dashboard-sidebar-nav { overflow-y: auto; overscroll-behavior: contain; padding-bottom: 96px !important; }
          .dashboard-sidebar-footer \\3e div { width: 100%; min-width: 0; }
          .dashboard-sidebar-footer .avatar { flex-shrink: 0; }
          .dashboard-sidebar-footer \\3e div \\3e div:last-child { min-width: 0; overflow: hidden; }
          .dashboard-sidebar-footer \\3e div \\3e div:last-child \\3e div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        }
      ` }} />

      {isMobile ? (
        <>
          <DashboardSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            collapsed={false}
            onToggle={() => {}}
            profile={profile}
            isMobile={true}
            mobileMenuOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />
          <main className="dash-main" style={{ flex: 1, padding: "8px 8px 24px", maxWidth: "100%", margin: "0", width: "100%", minWidth: 0, opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.5s ease, transform 0.5s ease", overflowY: "visible", boxSizing: "border-box" }}>
            <DashboardTopBar title={tabTitles[activeTab]} dateRange={dateRange} onDateRangeChange={setDateRange} onMenuToggle={() => setMobileMenuOpen(true)} onExport={handleExport} onBack={() => router.push('/feed')} isMobile={true} />
            <div className="dash-tab-content" key={activeTab}>{renderTab()}</div>
          </main>
        </>
      ) : (
        <>
          <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} profile={profile} />
          <main className="dash-main" style={{ flex: 1, padding: "0 0 0 16px", marginLeft: sidebarCollapsed ? 72 : 260, maxWidth: 1280, marginRight: "auto", width: "100%", minWidth: 0, opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.5s ease, transform 0.5s ease, margin-left 0.3s cubic-bezier(0.4,0,0.2,1)", overflowY: "auto" }}>
            <DashboardTopBar title={tabTitles[activeTab]} dateRange={dateRange} onDateRangeChange={setDateRange} onExport={handleExport} onBack={() => router.push('/feed')} />
            <div className="dash-tab-content" key={activeTab}>{renderTab()}</div>
          </main>
        </>
      )}

      {/* Share Modal */}
      {sharePost && <ShareModal post={sharePost} onClose={() => setSharePost(null)} onShared={handleShared} />}

      {/* Toast */}
      <Toast key={toast.key} message={toast.message} icon={toast.icon} color={toast.color} visible={toast.visible} onDone={() => setToast((t) => ({ ...t, visible: false }))} />
    </div>
  );
}


