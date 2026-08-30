"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft, faPlus, faSearch, faUsers, faGlobe, faLock, faShieldHalved, faCrown,
  faUserPlus, faCheck, faXmark, faEllipsisH, faPen, faTrash, faEye, faEyeSlash,
  faImage, faMapPin, faCalendarDays, faMessage, faArrowTrendUp, faFilter,
  faChevronDown, faClock, faCircleCheck, faTriangleExclamation, faUserXmark, faBell,
  faBookmark, faStar, faGear, faChartColumn, faFlag, faFileLines, faNewspaper, faPhotoFilm, faLink,
  faHeart, faShareNodes, faPaperPlane, faThumbtack, faChevronLeft, faChevronRight, faBan, faCircleInfo,
  faBolt, faUsersGear, faCamera, faUpload, faHashtag, faAt, faWandSparkles, faArrowUpRightFromSquare,
  faBars, faBullhorn, faThumbsUp, faCopy, faEnvelope, faGift, faAward, faChartLine,
  faChevronUp, faCircleDot, faFile, faDownload, faPlay, faHourglass, faUsersRectangle,
  faBullseye, faChartPie, faUpRightFromSquare, faFireFlameCurved, faCircleQuestion,
  faRadio, faTag, faLocationDot, faFaceSmile, faPaperclip, faVideo,
  faTrophy, faRotate, faQrcode, faListCheck, faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { GroupsGridSkeleton, GroupDetailSkeleton } from "./Skeleton";
import CreatePostModal from "./CreatePostModal";
import PostCard from "./PostCard";
import PostViewerPreview from "./PostViewerPreview";
import ArticleViewerPreview from "./ArticleViewerPreview";
import EventViewerPreview from "./EventViewerPreview";
import AIVisualEditorModal from "./AIVisualEditorModal";

const makeFaIcon = (icon) => ({ size = 16, color, style, ...props }) => (
  <FontAwesomeIcon
    icon={icon}
    {...props}
    style={{
      width: size,
      height: size,
      color: color ?? style?.color ?? "currentColor",
      ...style,
    }}
  />
);
const ArrowLeft = makeFaIcon(faArrowLeft);
const Plus = makeFaIcon(faPlus);
const Search = makeFaIcon(faSearch);
const Users = makeFaIcon(faUsers);
const Globe = makeFaIcon(faGlobe);
const Lock = makeFaIcon(faLock);
const ShieldCheck = makeFaIcon(faShieldHalved);
const Crown = makeFaIcon(faCrown);
const UserPlus = makeFaIcon(faUserPlus);
const Check = makeFaIcon(faCheck);
const X = makeFaIcon(faXmark);
const MoreHorizontal = makeFaIcon(faEllipsisH);
const Pencil = makeFaIcon(faPen);
const Trash2 = makeFaIcon(faTrash);
const Eye = makeFaIcon(faEye);
const EyeOff = makeFaIcon(faEyeSlash);
const ImagePlus = makeFaIcon(faImage);
const MediaIcon = makeFaIcon(faPhotoFilm);
const MapPin = makeFaIcon(faMapPin);
const Calendar = makeFaIcon(faCalendarDays);
const MessageSquare = makeFaIcon(faMessage);
const TrendingUp = makeFaIcon(faArrowTrendUp);
const Filter = makeFaIcon(faFilter);
const ChevronDown = makeFaIcon(faChevronDown);
const Clock = makeFaIcon(faClock);
const CheckCircle2 = makeFaIcon(faCircleCheck);
const AlertTriangle = makeFaIcon(faTriangleExclamation);
const UserX = makeFaIcon(faUserXmark);
const Bell = makeFaIcon(faBell);
const Bookmark = makeFaIcon(faBookmark);
const Star = makeFaIcon(faStar);
const Settings = makeFaIcon(faGear);
const BarChart3 = makeFaIcon(faChartColumn);
const Flag = makeFaIcon(faFlag);
const FileText = makeFaIcon(faFileLines);
const ArticleIcon = makeFaIcon(faNewspaper);
const Link2 = makeFaIcon(faLink);
const Heart = makeFaIcon(faHeart);
const Share2 = makeFaIcon(faShareNodes);
const Send = makeFaIcon(faPaperPlane);
const Pin = makeFaIcon(faThumbtack);
const ChevronLeft = makeFaIcon(faChevronLeft);
const ChevronRight = makeFaIcon(faChevronRight);
const Ban = makeFaIcon(faBan);
const Info = makeFaIcon(faCircleInfo);
const Zap = makeFaIcon(faBolt);
const Users2 = makeFaIcon(faUsersGear);
const Camera = makeFaIcon(faCamera);
const Upload = makeFaIcon(faUpload);
const Hash = makeFaIcon(faHashtag);
const AtSign = makeFaIcon(faAt);
const Sparkles = makeFaIcon(faWandSparkles);
const ExternalLink = makeFaIcon(faArrowUpRightFromSquare);
const Menu = makeFaIcon(faBars);
const Megaphone = makeFaIcon(faBullhorn);
const ThumbsUp = makeFaIcon(faThumbsUp);
const Copy = makeFaIcon(faCopy);
const Mail = makeFaIcon(faEnvelope);
const Gift = makeFaIcon(faGift);
const Award = makeFaIcon(faAward);
const Activity = makeFaIcon(faChartLine);
const ChevronUp = makeFaIcon(faChevronUp);
const CircleDot = makeFaIcon(faCircleDot);
const Image = makeFaIcon(faImage);
const File = makeFaIcon(faFile);
const Download = makeFaIcon(faDownload);
const Play = makeFaIcon(faPlay);
const Timer = makeFaIcon(faHourglass);
const UsersRound = makeFaIcon(faUsersRectangle);
const Target = makeFaIcon(faBullseye);
const PieChart = makeFaIcon(faChartPie);
const ArrowUpRight = makeFaIcon(faUpRightFromSquare);
const Flame = makeFaIcon(faFireFlameCurved);
const MessageCircle = makeFaIcon(faMessage);
const HelpCircle = makeFaIcon(faCircleQuestion);
const Newspaper = makeFaIcon(faNewspaper);
const BarChart2 = makeFaIcon(faChartColumn);
const Radio = makeFaIcon(faRadio);
const LinkIcon = makeFaIcon(faLink);
const Tag = makeFaIcon(faTag);
const MapPinned = makeFaIcon(faLocationDot);
const Smile = makeFaIcon(faFaceSmile);
const Paperclip = makeFaIcon(faPaperclip);
const Video = makeFaIcon(faVideo);
const Trophy = makeFaIcon(faTrophy);
const Rotate = makeFaIcon(faRotate);
const QrCode = makeFaIcon(faQrcode);
const ListCheck = makeFaIcon(faListCheck);
const UserGroup = makeFaIcon(faUserGroup);
const Whatsapp = makeFaIcon(faWhatsapp);
const Linkedin = makeFaIcon(faLinkedin);

/* ================================================================== */
/*  COULEURS & CONSTANTES                                              */
/* ================================================================== */
const C = {
  navy900: "#0E1F17", navy800: "#146C4B", navy700: "#1D9468",
  navy100: "var(--app-border)", navy50: "var(--app-bg)",
  gold400: "#EFC069", gold600: "#C08A2E",
  ink: "var(--app-text)", muted: "var(--app-muted)", mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)", white: "var(--app-surface)",
  danger: "#C0473A", danger50: "#FDEEEC",
  success: "#15806D", success50: "#E4F5F0",
  warn: "#C08A2E", warn50: "#FCF3DF",
  paper: "var(--app-input)", surfaceAlt: "var(--app-bg)",
};

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy700} 0%, ${C.navy900} 100%)`;
const shadow = {
  xs: "0 1px 2px rgba(14,31,23,.06)",
  sm: "0 2px 8px rgba(14,31,23,.07)",
  md: "0 8px 24px rgba(14,31,23,.10)",
  lg: "0 20px 44px rgba(14,31,23,.16)",
  brand: "0 14px 30px rgba(20,108,75,.20)",
  gold: "0 10px 24px rgba(192,138,46,.28)",
};

const getGroupCoverStyle = (group) => group?.coverUrl
  ? {
      backgroundImage: `linear-gradient(180deg, rgba(15,26,18,.14), rgba(15,26,18,.45)), url(${group.coverUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }
  : { background: group?.coverGradient || navyGrad };

const AVATAR_COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316", "#6366F1"];

const REACTIONS = [
  { emoji: "👍", label: "J'aime", color: "#3B82F6" },
  { emoji: "❤️", label: "Amour", color: "#EF4444" },
  { emoji: "😂", label: "Haha", color: "#F59E0B" },
  { emoji: "💡", label: "Insightful", color: "#8B5CF6" },
  { emoji: "🙏", label: "Merci", color: "#10B981" },
  { emoji: "🔥", label: "Fire", color: "#F97316" },
];

const GROUP_EMOJIS = ["🌐","🚀","🎨","📊","💰","💼","🤖","🎓","🔬","📱","🎮","🏗️","🌱","⚡","💡","🎯","🏆","📡"];

const COVER_GRADIENTS = [
  { id: "navy", label: "Navy", value: "linear-gradient(160deg, #1F6F4C 0%, #122318 100%)" },
  { id: "ocean", label: "Océan", value: "linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)" },
  { id: "gold", label: "Or", value: "linear-gradient(135deg, #E4B65A 0%, #A5701F 100%)" },
  { id: "sunset", label: "Coucher de soleil", value: "linear-gradient(135deg, #F97316 0%, #BE185D 100%)" },
  { id: "forest", label: "Forêt", value: "linear-gradient(135deg, #34D399 0%, #047857 100%)" },
  { id: "violet", label: "Violet", value: "linear-gradient(135deg, #A78BFA 0%, #4C1D95 100%)" },
  { id: "rose", label: "Rose", value: "linear-gradient(135deg, #F472B6 0%, #9D174D 100%)" },
  { id: "slate", label: "Ardoise", value: "linear-gradient(135deg, #94A3B8 0%, #1E293B 100%)" },
];

const POST_PERMISSIONS = [
  { id: "all", label: "Tous les membres", desc: "Chacun peut publier librement" },
  { id: "admin", label: "Modérateurs & admins", desc: "Seule l'équipe peut publier" },
];

const POST_TYPES = {
  discussion: { label: "Discussion", icon: MessageCircle, color: C.navy800 },
  question: { label: "Question", icon: HelpCircle, color: "#8B5CF6" },
  article: { label: "Article", icon: Newspaper, color: "#3B82F6" },
  poll: { label: "Sondage", icon: BarChart2, color: "#10B981" },
  link: { label: "Lien", icon: LinkIcon, color: "#F97316" },
};

const FILE_ICONS = {
  pdf: { color: "#EF4444", icon: "PDF" },
  docx: { color: "#3B82F6", icon: "DOC" },
  xlsx: { color: "#10B981", icon: "XLS" },
  pptx: { color: "#F97316", icon: "PPT" },
  default: { color: C.muted, icon: "FIC" },
};

const CATEGORIES = [
  { id: "tech", label: "Technologie", color: "#3B82F6" },
  { id: "business", label: "Business", color: "#F59E0B" },
  { id: "design", label: "Design & Créativité", color: "#EC4899" },
  { id: "marketing", label: "Marketing", color: "#8B5CF6" },
  { id: "startup", label: "Startup & Entrepreneurship", color: "#10B981" },
  { id: "dev", label: "Développement Web", color: "#06B6D4" },
  { id: "data", label: "Data & IA", color: "#F97316" },
  { id: "carrieres", label: "Carrières & RH", color: "#6366F1" },
  { id: "finance", label: "Finance & Investissement", color: "#14B8A6" },
  { id: "education", label: "Éducation", color: "#EF4444" },
];

/* ================================================================== */
/*  UTILISATEUR COURANT (utilisateur simulé)                         */
/* ================================================================== */
const CURRENT_USER = { id: "current_user", name: "Vous", initials: "VO", online: true, title: "Membre" };

/**
 * Retourne le rôle de l'utilisateur courant dans un groupe,
 * ou null s'il n'en est pas membre.
 * userId doit être l'id réel de la session (session.user.id), et non le
 * mock CURRENT_USER.id — sinon la comparaison ne matche jamais un membre
 * venant de la base de données.
 */
const getUserRoleInGroup = (group, userId) => {
  if (!userId) return null;
  const member = (group.members || []).find(m => m.id === userId);
  return member ? member.role : null;
};

/** Vrai si l'utilisateur peut accéder au panneau admin du groupe */
const canAdminGroup = (group, userId) => {
  const role = getUserRoleInGroup(group, userId);
  return role === "admin" || role === "moderator";
};

/** Vrai si l'utilisateur peut publier dans le groupe */
const canPostInGroup = (group, userId) => {
  const role = getUserRoleInGroup(group, userId);
  if (!role) return false;
  // Si le champ n'est pas encore défini côté API (groupe existant, valeur
  // manquante/null), on retombe sur "all" plutôt que de bloquer tout le
  // monde, admins compris.
  const permission = group.postPermission || "all";
  if (permission === "all") return true;
  if (permission === "admin") return role === "admin" || role === "moderator";
  return false;
};

const EMPTY_GROUPS_INIT = [];

/* ================================================================== */
/*  COMPOSANTS UTILITAIRES                                           */
/* ================================================================== */
const getAvatarColor = (name) => {
  const code = (name || "").charCodeAt(0);
  return AVATAR_COLORS[Number.isNaN(code) ? 0 : code % AVATAR_COLORS.length];
};

const S = { font: "'Sora', sans-serif", display: "'Fraunces', 'Georgia', serif" };

const FontImports = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');

    .lynora-groupes * { box-sizing: border-box; }
    .lynora-groupes { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    .lynora-groupes button:not(:disabled) { transition: transform .16s cubic-bezier(.2,.8,.2,1), filter .16s ease, opacity .16s ease, box-shadow .16s ease, background .16s ease; }
    .lynora-groupes button:not(:disabled):active { transform: scale(0.97); }
    .lynora-groupes button:disabled { opacity: .85; }
    .lynora-groupes input:focus-visible,
    .lynora-groupes textarea:focus-visible,
    .lynora-groupes button:focus-visible {
      outline: 2px solid ${C.navy700};
      outline-offset: 2px;
    }
    .lynora-groupes ::-webkit-scrollbar { width: 8px; height: 8px; }
    .lynora-groupes ::-webkit-scrollbar-track { background: transparent; }
    .lynora-groupes ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 8px; }
    .lynora-groupes ::-webkit-scrollbar-thumb:hover { background: ${C.mutedLight}; }
    @media (min-width: 769px) {
      .lynora-groupes {
        height: calc(100dvh - var(--lynora-header-offset, 0px));
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
      }
    }
    @keyframes lynoraFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes lynoraSpin { to { transform: rotate(360deg); } }
    .lynora-fade-up { animation: lynoraFadeUp .45s cubic-bezier(.2,.8,.2,1) both; }
    .lynora-cta-primary {
      background: ${navyGrad};
      box-shadow: ${shadow.brand};
    }
    .lynora-cta-primary:hover:not(:disabled) { filter: brightness(1.08); box-shadow: 0 18px 36px rgba(20,108,75,.28); transform: translateY(-1px); }

    .lynora-detail-layout { display: grid !important; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); align-items: start !important; gap: 16px !important; }
    .lynora-group-detail,
    .lynora-detail-layout {
      position: static !important;
      overflow: visible !important;
      transform: none !important;
    }
    .lynora-group-sidebar {
      position: sticky;
      top: 16px;
      align-self: start;
      display: flex;
      flex-direction: column;
      gap: 12px;
      grid-column: 2;
      grid-row: 1;
      margin-top: 0;
    }
    .lynora-group-sidebar::-webkit-scrollbar { width: 6px; }
    .lynora-group-sidebar > * { flex-shrink: 0; }
    .lynora-group-sidebar { gap: 8px; }
    .lynora-group-sidebar .lynora-card { padding: 12px !important; }
    .lynora-group-sidebar .lynora-card:first-of-type { padding: 6px !important; }
    .lynora-group-sidebar .lynora-card:first-of-type button { padding: 8px 10px !important; margin-bottom: 1px !important; }
    .lynora-sidebar-header { display: none; }
    .lynora-detail-main { flex: 1 1 0; min-width: 0; max-width: 950px; grid-column: 1; grid-row: 1; align-self: start; margin-top: 0; }
    .lynora-detail-main > div { gap: 12px !important; }
    .lynora-detail-main .pc-card .pc-header { padding: 10px 14px 0 !important; }
    .lynora-detail-main .pc-card .pc-body-text { padding: 0 14px 8px !important; }
    .lynora-detail-main .pc-card .pc-actions { padding: 2px 6px !important; }
    @media (max-width: 640px) {
      .lynora-join-request-overlay { align-items: stretch !important; padding: 0 !important; overflow-y: auto !important; }
      .lynora-join-request-modal { width: 100% !important; min-height: 100dvh !important; max-height: none !important; border-radius: 0 !important; }
      .lynora-join-request-modal > div:last-child { padding: 18px !important; }
    }
    .lynora-groups-tabs { display: flex; gap: 6px; margin: 0 0 20px; border-bottom: 1px solid ${C.line}; }
    .lynora-groups-tabs button { display: inline-flex; align-items: center; gap: 7px; padding: 10px 14px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: ${C.muted}; font-family: ${S.font}; font-size: 13px; font-weight: 700; cursor: pointer; }
    .lynora-groups-tabs button.is-active { color: ${C.navy800}; border-bottom-color: ${C.navy800}; }
    .lynora-groups-tabs span { min-width: 20px; padding: 2px 6px; border-radius: 999px; background: ${C.navy50}; color: ${C.navy700}; font-size: 10px; text-align: center; }
    .lynora-header-title-copy { position: relative; padding-left: 16px; }
    .lynora-header-title-copy::before { content: ""; position: absolute; left: 0; top: 3px; bottom: 4px; width: 3px; border-radius: 3px; background: ${C.gold600}; }
    .lynora-header-eyebrow { display: block; margin-bottom: 7px; font-family: ${S.font}; font-size: 10px; font-weight: 800; letter-spacing: .14em; line-height: 1; text-transform: uppercase; color: ${C.navy700}; }
    .lynora-header-stats { background: linear-gradient(135deg, ${C.navy50} 0%, #F7F8F3 100%) !important; }
    .lynora-header-stats .lynora-stat-item { transition: background .18s ease; }
    .lynora-header-stats .lynora-stat-item:hover { background: rgba(255,255,255,.72); }

    /* ===== Sidebar en tiroir sur tablette / mobile ===== */
    @media (max-width: 768px) {
      .lynora-detail-layout { display: block !important; gap: 0 !important; }
      .lynora-sidebar-toggle { display: flex !important; }
      .lynora-group-sidebar {
        position: fixed !important; top: 0 !important; left: 0 !important; bottom: 0 !important;
        width: 100vw !important; max-width: none !important; height: 100dvh !important; max-height: 100dvh !important;
        background: ${C.paper}; padding: max(18px, env(safe-area-inset-top)) 14px calc(24px + env(safe-area-inset-bottom)); margin: 0; z-index: 1200; border-radius: 0 !important;
        box-sizing: border-box !important; overflow-y: auto !important; overflow-x: hidden !important; min-height: 0 !important; touch-action: pan-y; -webkit-overflow-scrolling: touch;
        box-shadow: 0 20px 50px rgba(0,0,0,.28);
        transform: translateX(-106%); transition: transform .28s cubic-bezier(.2,.8,.2,1);
      }
      .lynora-group-sidebar.is-open { transform: translateX(0); }
      .lynora-sidebar-header { display: none; }
      .lynora-group-sidebar-slot { min-height: 0 !important; }
    }

    /* ===== Adaptation mobile ===== */
    @media (max-width: 640px) {
      .lynora-groupes { min-height: 100dvh !important; overflow-x: hidden; }
      .lynora-page { padding-left: 14px !important; padding-right: 14px !important; }
      .lynora-groupes > .lynora-page { padding-left: 0 !important; padding-right: 0 !important; }
      .lynora-groups-index { padding: 0 0 24px !important; width: 100% !important; }
      .lynora-groups-index .lynora-hero { border-radius: 0 !important; margin-bottom: 20px !important; box-shadow: none !important; }
      .lynora-groups-index .lynora-groups-grid { gap: 10px !important; padding: 0 12px !important; grid-template-columns: 1fr !important; }
      .lynora-groups-index .lynora-groups-tabs { padding: 0 12px; margin-bottom: 16px; }
      .lynora-groups-index .lynora-groups-tabs button { flex: 1; justify-content: center; padding: 10px 6px; font-size: 12px; }
      .lynora-groups-index .lynora-group-card { display: grid !important; grid-template-columns: 72px minmax(0, 1fr) !important; min-height: 72px; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: transparent !important; }
      .lynora-groups-index .lynora-group-card > div:first-child { height: 72px !important; min-height: 72px !important; border-radius: 10px !important; }
      .lynora-groups-index .lynora-group-card > div:nth-child(2) { padding: 2px 0 2px 12px !important; min-width: 0; }
      .lynora-groups-index .lynora-group-card h3 { font-size: 13px !important; margin: 0 !important; }
      .lynora-groups-index .lynora-group-card p { font-size: 10.5px !important; margin: 5px 0 8px !important; min-height: 30px !important; }
      .lynora-groups-index .lynora-group-card .lynora-group-card-title-row { align-items: flex-start !important; }
      .lynora-groups-index .lynora-group-card .lynora-cover-member-badge { display: flex !important; }
      .lynora-groups-index .lynora-group-card .lynora-cover-owner-badge { display: none !important; }
      .lynora-groups-index .lynora-group-card .lynora-cover-privacy-badge,
      .lynora-groups-index .lynora-group-card .lynora-cover-category-badge { gap: 3px !important; padding: 3px 5px !important; font-size: 8px !important; line-height: 1.1 !important; }
      .lynora-groups-index .lynora-group-card .lynora-cover-privacy-badge { top: 6px !important; left: 6px !important; }
      .lynora-groups-index .lynora-group-card .lynora-cover-category-badge { right: 6px !important; bottom: 6px !important; left: auto !important; max-width: calc(100% - 12px) !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
      .lynora-groups-index .lynora-group-card .lynora-cover-privacy-badge svg { width: 8px !important; height: 8px !important; }
      .lynora-groups-index .lynora-group-card > div:first-child > div { top: 7px !important; left: 7px !important; right: 7px !important; }
      .lynora-groups-index .lynora-group-card > div:first-child > div:last-child { bottom: 7px !important; top: auto !important; }
      .lynora-groups-index .lynora-group-card > div:nth-child(2) > div:not(.lynora-group-card-title-row) { margin-bottom: 6px !important; padding-bottom: 6px !important; }
      .lynora-groups-index .lynora-group-card > div:nth-child(2) button,
      .lynora-groups-index .lynora-group-card > div:nth-child(2) > div:last-child { font-size: 10px !important; padding: 7px 6px !important; }
      .lynora-group-detail { padding: 0 0 24px !important; width: 100% !important; }
      .lynora-group-detail .lynora-card { border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
      .lynora-group-detail .lynora-detail-main { width: 100% !important; max-width: none !important; }
      .lynora-group-detail .lynora-detail-toolbar { padding: 10px 14px 0 !important; margin-bottom: 14px !important; }
      .lynora-group-detail .lynora-header-card { margin-bottom: 16px !important; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; box-shadow: none !important; }
      .lynora-group-detail .lynora-cover { height: 150px !important; }
      .lynora-group-detail .lynora-cover-chips { top: 10px !important; left: 12px !important; gap: 5px !important; max-width: calc(100% - 24px) !important; }
      .lynora-group-detail .lynora-cover-chips span { padding: 4px 7px !important; font-size: 10px !important; }
      .lynora-group-detail .lynora-header-card > div:nth-child(2) { padding: 0 16px 18px !important; }
      .lynora-group-detail .lynora-header-toprow { margin-top: -24px !important; margin-bottom: 12px !important; }
      .lynora-group-detail .lynora-title-row { gap: 8px !important; }
      .lynora-group-detail .lynora-detail-title { font-size: 22px !important; line-height: 1.2 !important; }
      .lynora-group-detail .lynora-header-title-copy { padding-left: 12px; }
      .lynora-group-detail .lynora-header-eyebrow { font-size: 9px; margin-bottom: 6px; }
      .lynora-group-detail .lynora-detail-layout { display: block !important; }
      .lynora-group-detail .lynora-detail-main > div { width: 100% !important; max-width: none !important; }
      .lynora-group-admin { width: 100% !important; max-width: none !important; min-height: 100dvh !important; padding: 0 0 24px !important; gap: 0 !important; }
      .lynora-group-admin > div:first-child { width: 100% !important; padding: 10px 14px 0 !important; }
      .lynora-group-admin > div:last-child { width: 100% !important; max-width: none !important; padding: 0 14px !important; }
      .lynora-group-admin .lynora-group-sidebar { max-height: 100dvh !important; }
      .lynora-group-admin .lynora-card { border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: transparent !important; }
      .lynora-group-detail .lynora-sidebar-header { display: flex !important; align-items: center; gap: 10px; min-height: 52px; padding: 0 2px 12px; margin-bottom: 4px; border-bottom: 1px solid ${C.line}; }
      .lynora-group-detail .lynora-sidebar-header strong { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${S.font}; font-size: 16px; color: ${C.ink}; }
      .lynora-group-detail .lynora-sidebar-header button { width: 36px; height: 36px; border: 0; border-radius: 10px; background: ${C.navy50}; color: ${C.navy800}; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .lynora-header-card { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
      .lynora-hero { padding: 22px 18px !important; }
      .lynora-hero-row { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .lynora-hero-title { font-size: 24px !important; }
      .lynora-hero-cta { width: 100%; }
      .lynora-groups-grid { gap: 14px !important; grid-template-columns: 1fr !important; }
      .lynora-group-card h3 { font-size: 15px !important; }
      .lynora-detail-toolbar { gap: 8px !important; }
      .lynora-cover { height: 140px !important; }
      .lynora-cover-btn { width: 36px !important; height: 36px !important; right: 12px !important; bottom: 12px !important; }
      .lynora-header-toprow { margin-top: -24px !important; }
      .lynora-title-row { flex-direction: column !important; align-items: stretch !important; }
      .lynora-detail-title { font-size: 21px !important; }
      .lynora-stats-row { flex-wrap: nowrap !important; overflow-x: auto !important; scrollbar-width: none; }
      .lynora-stats-row::-webkit-scrollbar { display: none; }
      .lynora-stats-row > .lynora-stat-item { flex: 0 0 116px !important; min-width: 116px !important; padding: 10px 12px !important; border-left: 1px solid ${C.line} !important; border-top: 0 !important; border-right: 0 !important; }
      .lynora-stats-row > .lynora-stat-item:first-child { border-left: 0 !important; }
      .lynora-stats-row > .lynora-stat-item > div:first-child { width: 28px !important; height: 28px !important; border-radius: 8px !important; }
      .lynora-stats-row > .lynora-stat-item > div:first-child svg { width: 14px !important; height: 14px !important; }
      .lynora-stats-row > .lynora-stat-item > div:last-child > div:first-child { font-size: 16px !important; }
      .lynora-stats-row > .lynora-stat-item > div:last-child > div:last-child { font-size: 10px !important; }
      .lynora-tabs-row { -ms-overflow-style: none; scrollbar-width: none; }
      .lynora-tabs-row::-webkit-scrollbar { display: none; }
      .lynora-create-header { padding: 16px 18px !important; }
      .lynora-create-steps { padding: 16px 18px 4px !important; }
      .lynora-create-overlay { padding: 0 !important; align-items: stretch !important; }
      .lynora-create-modal { width: 100% !important; max-width: none !important; height: 100dvh !important; max-height: 100dvh !important; border-radius: 0 !important; padding-bottom: env(safe-area-inset-bottom); }
      .lynora-create-modal input, .lynora-create-modal textarea, .lynora-create-modal select { font-size: 16px !important; }
      .lynora-event-overlay, .lynora-file-overlay { padding: 0 !important; align-items: stretch !important; }
      .lynora-event-modal, .lynora-file-modal { width: 100vw !important; max-width: none !important; height: 100dvh !important; max-height: 100dvh !important; border-radius: 0 !important; box-shadow: none !important; }
      .lynora-event-modal { display: flex !important; flex-direction: column !important; }
      .lynora-event-modal > div:first-child, .lynora-file-modal > div:first-child { flex-shrink: 0 !important; }
      .lynora-event-modal > div:last-child, .lynora-file-modal > div:last-child { overflow-y: auto !important; flex: 1 !important; box-sizing: border-box !important; }
      .lynora-detail-main { width: 100% !important; }
    }
    @media (max-width: 420px) {
      .lynora-hero-title { font-size: 21px !important; }
      .lynora-detail-title { font-size: 19px !important; }
      .lynora-toast { left: 14px !important; right: 14px !important; bottom: 14px !important; }
    }
  `}</style>
);

const Card = ({ children, style, onClick, className }) => (
  <div
    onClick={onClick}
    className={`lynora-card${className ? ` ${className}` : ""}`}
    onMouseEnter={onClick ? (e) => { e.currentTarget.style.boxShadow = shadow.brand; e.currentTarget.style.borderColor = C.navy700 + "55"; e.currentTarget.style.transform = "translateY(-4px)"; } : undefined}
    onMouseLeave={onClick ? (e) => { e.currentTarget.style.boxShadow = shadow.xs; e.currentTarget.style.borderColor = C.line; e.currentTarget.style.transform = "translateY(0)"; } : undefined}
    style={{
      background: C.white, borderRadius: 20, border: `1px solid ${C.line}`,
      overflow: "hidden", transition: "box-shadow .25s cubic-bezier(.2,.8,.2,1), border-color .25s ease, transform .25s cubic-bezier(.2,.8,.2,1)",
      cursor: onClick ? "pointer" : "default",
      boxShadow: shadow.xs,
      ...style,
    }}
  >
    {children}
  </div>
);

const Avatar = ({ src, initials, name, size = 40, style }) => {
  const bg = getAvatarColor(name || initials);
  const avatarSrc = src || null;
  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={name || initials || "Avatar"}
        onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.style.background = bg; e.currentTarget.parentElement.textContent = (initials || name || "?").slice(0, 2).toUpperCase(); }}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          border: "2px solid rgba(255,255,255,.9)",
          boxShadow: "0 0 0 2px rgba(255,255,255,.9)",
          ...style,
        }}
      />
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 700, fontFamily: S.font, fontSize: size * 0.35, flexShrink: 0, boxShadow: "0 0 0 2px rgba(255,255,255,.9)", letterSpacing: "-0.02em", ...style }}>
      {initials || "?"}
    </div>
  );
};

/** Pile d'avatars empilés (façon "vu par") — utilisée dans le header du groupe pour montrer les membres en un coup d'œil. */
const AvatarStack = ({ members = [], max = 5, size = 34, overlap = 12, ringColor = C.white, onClick }) => {
  const visible = members.slice(0, max);
  const remaining = Math.max(0, members.length - visible.length);
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={`${members.length} membre${members.length > 1 ? "s" : ""}`}
      style={{ display: "inline-flex", alignItems: "center", cursor: onClick ? "pointer" : "default" }}
    >
      {visible.map((m, i) => (
        <div
          key={m.id ?? i}
          style={{ marginLeft: i === 0 ? 0 : -overlap, position: "relative", zIndex: visible.length - i, transition: "transform .15s cubic-bezier(.2,.8,.2,1)" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.zIndex = 60; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.zIndex = visible.length - i; }}
        >
          <Avatar
            src={m.image || m.avatarUrl || m.photoUrl || null}
            name={m.name}
            initials={m.initials}
            size={size}
            style={{ border: `2.5px solid ${ringColor}`, boxShadow: "0 3px 8px rgba(14,31,23,.16)" }}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div style={{
          width: size, height: size, borderRadius: "50%", marginLeft: visible.length ? -overlap : 0,
          background: C.navy50, border: `2.5px solid ${ringColor}`, display: "flex",
          alignItems: "center", justifyContent: "center", fontFamily: S.font,
          fontSize: Math.max(10, size * 0.32), fontWeight: 800, color: C.navy800,
          boxShadow: "0 3px 8px rgba(14,31,23,.16)", position: "relative", zIndex: 0, flexShrink: 0,
        }}>
          +{remaining}
        </div>
      )}
    </div>
  );
};

const Badge = ({ children, color = C.navy800, style, small }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: small ? "4px 9px" : "6px 12px", borderRadius: 999, background: `${color}10`, border: `1px solid ${color}28`, color, fontSize: small ? 11 : 12, fontWeight: 700, lineHeight: 1.15, fontFamily: S.font, whiteSpace: "nowrap", boxShadow: `0 1px 3px ${color}10`, ...style }}>
    {children}
  </span>
);

const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const bg = type === "success" ? C.success : type === "error" ? C.danger : C.warn;
  return (
    <div className="lynora-fade-up lynora-toast" style={{ position: "fixed", bottom: 24, right: 24, padding: "13px 22px", borderRadius: 14, background: bg, color: C.white, fontSize: 14, fontWeight: 600, fontFamily: S.font, zIndex: 9999, boxShadow: "0 16px 34px rgba(14,31,23,.24)", display: "flex", alignItems: "center", gap: 10 }}>
      {type === "success" ? <CheckCircle2 size={16} /> : type === "error" ? <AlertTriangle size={16} /> : <Info size={16} />}
      {message}
      <X size={14} style={{ cursor: "pointer", opacity: 0.75, marginLeft: 6 }} onClick={onClose} />
    </div>
  );
};

/** Ferme une modale ouverte avec la touche Échap — comportement standard attendu d'une interface professionnelle. */
const useEscapeToClose = (open, onClose) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
};

const ConfirmModal = ({ open, title, text, onConfirm, onCancel }) => {
  useEscapeToClose(open, onCancel);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={onCancel}>
      <div style={{ background: C.white, borderRadius: 20, padding: 32, maxWidth: 400, width: "90%" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: S.font, fontSize: 18, fontWeight: 700, color: C.ink, margin: "0 0 8px" }}>{title}</h3>
        <p style={{ fontFamily: S.font, fontSize: 14, color: C.muted, margin: "0 0 24px", lineHeight: 1.6 }}>{text}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontWeight: 600, fontFamily: S.font, fontSize: 14, cursor: "pointer" }}>Annuler</button>
          <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.danger, color: C.white, fontWeight: 600, fontFamily: S.font, fontSize: 14, cursor: "pointer" }}>Confirmer</button>
        </div>
      </div>
    </div>
  );
};

/** Recherche debouncée d'utilisateurs de la plateforme, réutilisée par InviteModal. */
const usePlatformUserSearch = (active) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(query.trim())}&limit=20`);
        if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs");
        const data = await res.json();
        if (!cancelled) setResults(Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("usePlatformUserSearch", err);
        if (!cancelled) { setResults([]); setError(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 350 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, active]);

  return { query, setQuery, results, loading, error };
};

const InviteModal = ({ open, group, currentUserId, onClose, onToast, onUpdateGroup }) => {
  const fallbackLink = group?.name ? `https://lynora.app/g/${group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "";
  const [link, setLink] = useState(group?.inviteLink || fallbackLink);
  const [tab, setTab] = useState("platform");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [inviting, setInviting] = useState(false);
  const { query, setQuery, results, loading, error } = usePlatformUserSearch(open && tab === "platform");

  useEffect(() => { setLink(group?.inviteLink || (group?.name ? `https://lynora.app/g/${group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "")); }, [group]);
  useEffect(() => {
    if (!open) { setTab("platform"); setQuery(""); setSelectedUsers([]); setInviting(false); }
  }, [open]);
  useEscapeToClose(open, onClose);
  if (!open || !group) return null;

  const memberIds = new Set((group.members || []).map(m => m.id));
  const visibleResults = results.filter(u => !memberIds.has(u.id) && u.id !== currentUserId);
  const isSelected = (u) => selectedUsers.some(s => s.id === u.id);
  const toggleSelect = (u) => setSelectedUsers(prev => isSelected(u) ? prev.filter(s => s.id !== u.id) : [...prev, u]);

  const copyLink = () => { navigator.clipboard?.writeText(link); onToast("Lien copié dans le presse-papiers", "success"); };
  const regenerate = () => {
    const suffix = Math.random().toString(36).slice(2, 7);
    setLink(`https://lynora.app/g/${group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}`);
    onToast("Nouveau lien généré", "success");
  };
  const shareText = encodeURIComponent(`Rejoins "${group.name}" sur Lynora : ${link}`);

  const sendInvites = async () => {
    if (!selectedUsers.length || inviting) return;
    setInviting(true);
    try {
      await onUpdateGroup(group.id, g => ({
        ...g,
        members: [
          ...g.members,
          ...selectedUsers.map(u => ({
            id: u.id,
            name: u.name,
            initials: u.initials || (u.name || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase(),
            image: u.image || u.avatarUrl || u.photoUrl || null,
            role: "member",
            online: !!u.online,
            title: u.title || u.jobTitle || "Membre",
            joinedAt: "à l'instant",
            postsCount: 0,
          })),
        ],
      }));
      onToast(`${selectedUsers.length} membre${selectedUsers.length > 1 ? "s" : ""} ajouté${selectedUsers.length > 1 ? "s" : ""} au groupe`, "success");
      setSelectedUsers([]);
    } catch (err) {
      console.error("sendInvites", err);
      onToast("Impossible d'envoyer les invitations", "error");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="lynora-create-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,26,18,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, padding: 16 }} onClick={onClose}>
      <div className="lynora-share-modal" style={{ background: C.white, borderRadius: 22, width: "95%", maxWidth: 460, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 60px rgba(0,0,0,.22)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #1B5E40 0%, #122318 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <UserGroup size={18} style={{ color: C.gold400 }} />
            <h2 style={{ fontFamily: S.display, fontSize: 18, fontWeight: 600, color: C.white, margin: 0 }}>Inviter dans {group.name}</h2>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "rgba(255,255,255,.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={14} style={{ color: C.white }} /></button>
        </div>

        {/* Onglets */}
        <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", flexShrink: 0 }}>
          {[
            { id: "platform", label: "Membres de la plateforme", icon: Users },
            { id: "link", label: "Lien d'invitation", icon: LinkIcon },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 4px 11px", border: "none", borderBottom: `2px solid ${tab === t.id ? C.navy800 : "transparent"}`, background: "transparent", fontFamily: S.font, fontSize: 12.5, fontWeight: 700, color: tab === t.id ? C.navy800 : C.mutedLight, cursor: "pointer", marginRight: 18 }}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "platform" ? (
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
            <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.mutedLight }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un membre de la plateforme..."
                  style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.paper, fontFamily: S.font, fontSize: 13, color: C.ink, outline: "none" }}
                />
              </div>
              {selectedUsers.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {selectedUsers.map(u => (
                    <span key={u.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 6px 4px 4px", borderRadius: 20, background: C.navy50, fontFamily: S.font, fontSize: 11.5, fontWeight: 600, color: C.navy800 }}>
                      <Avatar src={u.image || u.avatarUrl || u.photoUrl || null} name={u.name} initials={u.initials} size={18} />
                      {u.name}
                      <X size={9} style={{ cursor: "pointer", opacity: .7 }} onClick={() => toggleSelect(u)} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 12px 8px", overflowY: "auto", flex: 1, minHeight: 160 }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", fontFamily: S.font, fontSize: 12.5, color: C.muted }}>
                  <Rotate size={14} style={{ color: C.mutedLight, animation: "lynoraSpin .8s linear infinite" }} /> Chargement des utilisateurs...
                </div>
              ) : error ? (
                <div style={{ textAlign: "center", padding: "28px 16px", fontFamily: S.font, fontSize: 12.5, color: C.muted }}>
                  Impossible de charger les utilisateurs de la plateforme pour le moment.
                </div>
              ) : visibleResults.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 16px", fontFamily: S.font, fontSize: 12.5, color: C.muted }}>
                  {query.trim() ? "Aucun utilisateur trouvé pour cette recherche." : "Aucun utilisateur disponible à inviter pour le moment."}
                </div>
              ) : (
                visibleResults.map(u => {
                  const selected = isSelected(u);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleSelect(u)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12, border: "none", background: selected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 2 }}
                      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = C.paper; }}
                      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                    >
                      <Avatar src={u.image || u.avatarUrl || u.photoUrl || null} name={u.name} initials={u.initials} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                        {(u.title || u.jobTitle || u.email) && (
                          <div style={{ fontFamily: S.font, fontSize: 11.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.title || u.jobTitle || u.email}</div>
                        )}
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${selected ? C.navy800 : C.line}`, background: selected ? C.navy800 : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {selected ? <Check size={12} style={{ color: C.white }} /> : <Plus size={12} style={{ color: C.mutedLight }} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.line}`, flexShrink: 0 }}>
              <button
                onClick={sendInvites}
                disabled={!selectedUsers.length || inviting}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", borderRadius: 11, border: "none", background: navyGrad, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: (!selectedUsers.length || inviting) ? "not-allowed" : "pointer", opacity: (!selectedUsers.length || inviting) ? .55 : 1 }}
              >
                {inviting ? <Rotate size={14} style={{ animation: "lynoraSpin .8s linear infinite" }} /> : <UserPlus size={14} />}
                {inviting ? "Envoi en cours..." : selectedUsers.length ? `Inviter (${selectedUsers.length})` : "Sélectionnez des membres"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 24, overflowY: "auto" }}>
            <label style={{ display: "block", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Lien d'invitation</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.paper, fontFamily: S.font, fontSize: 12.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</div>
              <button onClick={copyLink} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: C.navy800, color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Copy size={15} /></button>
              <button onClick={regenerate} title="Générer un nouveau lien" style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Rotate size={14} style={{ color: C.muted }} /></button>
            </div>

            <label style={{ display: "block", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Partager via</label>
            <div style={{ display: "flex", gap: 10 }}>
              <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 12, border: `1px solid ${C.line}` }}>
                <Whatsapp size={20} style={{ color: "#25D366" }} /><span style={{ fontFamily: S.font, fontSize: 11, color: C.muted }}>WhatsApp</span>
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 12, border: `1px solid ${C.line}` }}>
                <Linkedin size={20} style={{ color: "#0A66C2" }} /><span style={{ fontFamily: S.font, fontSize: 11, color: C.muted }}>LinkedIn</span>
              </a>
              <a href={`mailto:?subject=${encodeURIComponent("Rejoins " + group.name)}&body=${shareText}`} style={{ flex: 1, textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 12, border: `1px solid ${C.line}` }}>
                <Mail size={20} style={{ color: C.navy800 }} /><span style={{ fontFamily: S.font, fontSize: 11, color: C.muted }}>E-mail</span>
              </a>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 12, border: `1px solid ${C.line}`, opacity: .55 }}>
                <QrCode size={20} style={{ color: C.muted }} /><span style={{ fontFamily: S.font, fontSize: 11, color: C.muted }}>QR code</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="lynora-fade-up" style={{ textAlign: "center", padding: "64px 24px", background: C.white, borderRadius: 20, border: `1px dashed ${C.line}` }}>
    <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${C.navy800}12, ${C.gold400}18)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
      <Icon size={30} style={{ color: C.navy700 }} />
    </div>
    <h3 style={{ fontFamily: S.display, fontSize: 19, fontWeight: 600, color: C.ink, margin: "0 0 6px" }}>{title}</h3>
    <p style={{ fontFamily: S.font, fontSize: 13.5, color: C.muted, margin: 0 }}>{subtitle}</p>
  </div>
);

const StatBlock = ({ value, label, icon: Icon, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 18px", borderRadius: 14, background: C.white, border: `1px solid ${C.line}`, boxShadow: shadow.xs }}>
    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color || C.navy800}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={20} style={{ color: color || C.navy800 }} />
    </div>
    <div>
      <div style={{ fontFamily: S.display, fontSize: 23, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted, marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  </div>
);

const OnlineDot = ({ online, size = 10 }) => online ? (
  <div style={{ width: size, height: size, borderRadius: "50%", background: C.success, border: `2px solid ${C.white}`, position: "absolute", bottom: 0, right: 0 }} />
) : null;

/* ================================================================== */
/*  GROUP PREVIEW CARD — miniature utilisée dans l'aperçu en direct    */
/* ================================================================== */
const GroupPreviewCard = ({ form }) => {
  const cat = CATEGORIES.find(c => c.id === form.category);
  const cover = COVER_GRADIENTS.find(g => g.id === form.coverId)?.value || COVER_GRADIENTS[0].value;
  const rulesCount = form.rules.split("\n").map(r => r.trim()).filter(Boolean).length;

  return (
    <div style={{ background: C.white, borderRadius: 18, border: `1px solid ${C.line}`, overflow: "hidden", boxShadow: "0 16px 34px rgba(18,38,24,0.10)" }}>
      {/* Cover */}
      <div style={{ height: 96, background: cover, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 38, filter: "drop-shadow(0 3px 10px rgba(0,0,0,.2))" }}>{form.emoji}</span>
        <div style={{ position: "absolute", top: 10, left: 10, width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,.25)" }}>
          {form.privacy === "private" ? <Lock size={12} style={{ color: C.white }} /> : <Globe size={12} style={{ color: C.white }} />}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(255,255,255,.22)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.28)", fontFamily: S.font, fontSize: 10, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", gap: 4 }}>
          <Sparkles size={10} /> Nouveau
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 15 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
          <h3 style={{ fontFamily: S.font, fontSize: 14.5, fontWeight: 700, color: form.name.trim() ? C.ink : C.mutedLight, fontStyle: form.name.trim() ? "normal" : "italic", margin: 0, lineHeight: 1.3, flex: 1 }}>
            {form.name.trim() || "Nom du groupe"}
          </h3>
          {cat && <Badge small color={cat.color}>{cat.label}</Badge>}
        </div>
        <p style={{ fontFamily: S.font, fontSize: 12.5, color: form.description.trim() ? C.muted : C.mutedLight, fontStyle: form.description.trim() ? "normal" : "italic", margin: "0 0 12px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {form.description.trim() || "Ajoutez une description pour donner envie de rejoindre votre groupe."}
        </p>

        <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={12} style={{ color: C.mutedLight }} />
            <span style={{ fontFamily: S.font, fontSize: 11.5, color: C.muted }}>1 membre</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MessageSquare size={12} style={{ color: C.mutedLight }} />
            <span style={{ fontFamily: S.font, fontSize: 11.5, color: C.muted }}>0 posts</span>
          </div>
        </div>

        <div style={{ marginBottom: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: S.font, fontSize: 10.5, color: C.mutedLight }}>Engagement</span>
            <span style={{ fontFamily: S.font, fontSize: 10.5, fontWeight: 600, color: C.mutedLight }}>0%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: C.line }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.gold600, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font, fontSize: 11, fontWeight: 700, border: `2px solid ${C.white}`, boxShadow: "0 0 0 1px " + C.line }}>V</div>
              <Crown size={9} style={{ position: "absolute", top: -5, right: -4, color: C.gold600, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.25))" }} />
            </div>
            <span style={{ fontFamily: S.font, fontSize: 11, color: C.muted }}>Vous (admin)</span>
          </div>
          {form.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} style={{ color: C.mutedLight }} />
              <span style={{ fontFamily: S.font, fontSize: 10.5, color: C.mutedLight }}>{form.location}</span>
            </div>
          )}
        </div>
      </div>

      {rulesCount > 0 && (
        <div style={{ padding: "10px 15px", borderTop: `1px solid ${C.line}`, background: C.navy50, display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={13} style={{ color: C.navy800 }} />
          <span style={{ fontFamily: S.font, fontSize: 11.5, color: C.navy800, fontWeight: 600 }}>{rulesCount} règle{rulesCount > 1 ? "s" : ""} définie{rulesCount > 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
};

/* ================================================================== */
/*  CREATE GROUP MODAL                                                */
/* ================================================================== */
const CreateGroupModal = ({ open, onClose, onCreate }) => {
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [form, setForm] = useState({
    name: "", description: "", category: "", privacy: "public", emoji: "🌐",
    location: "", rules: "", coverId: "navy", postPermission: "all",
  });
  const [showEmojis, setShowEmojis] = useState(false);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [isWide, setIsWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 900 : true);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { setMaxStepReached(s => Math.max(s, step)); }, [step]);
  useEscapeToClose(open, onClose);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const steps = [
    { label: "Identité", icon: Sparkles },
    { label: "Détails", icon: Globe },
    { label: "Règles", icon: ShieldCheck },
  ];

  const nameValid = form.name.trim().length > 0;

  const goNext = () => {
    if (step === 0 && !nameValid) { setAttemptedNext(true); return; }
    setAttemptedNext(false);
    setStep(s => Math.min(s + 1, steps.length - 1));
  };

  const handleCreate = () => {
    if (!nameValid) { setStep(0); setAttemptedNext(true); return; }
    const cover = COVER_GRADIENTS.find(g => g.id === form.coverId)?.value || COVER_GRADIENTS[0].value;
    const slug = form.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    onCreate({
      id: `g_new_${Date.now()}`, name: form.name.trim(), emoji: form.emoji,
      description: form.description.trim() || "Nouveau groupe", category: form.category || "tech",
      coverGradient: cover, privacy: form.privacy, postPermission: form.postPermission,
      members: [{ id: CURRENT_USER.id, name: CURRENT_USER.name, initials: CURRENT_USER.initials, online: true, role: "admin", title: "Vous", joinedAt: "à l'instant", postsCount: 0 }],
      posts: [], events: [], media: [], files: [], announcements: [],
      rules: form.rules ? form.rules.split("\n").map(r => r.trim()).filter(Boolean) : ["Soyez respectueux"],
      createdAt: new Date().toISOString().slice(0, 10), postsCount: 0, pendingRequests: 0,
      tags: [], location: form.location || null, inviteLink: `https://lynora.app/g/${slug || "groupe"}`,
      topContributors: [], weeklyActive: 1, engagementRate: 0,
    });
    setForm({ name: "", description: "", category: "", privacy: "public", emoji: "🌐", location: "", rules: "", coverId: "navy", postPermission: "all" });
    setStep(0);
    setMaxStepReached(0);
    setAttemptedNext(false);
    onClose();
  };

  if (!open) return null;

  const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: 14, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 14, color: C.ink, outline: "none", transition: "border-color .2s, box-shadow .2s", boxSizing: "border-box", background: "#FAF8F2" };
  const labelStyle = { fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" };
  const counterStyle = { fontFamily: S.font, fontSize: 11, fontWeight: 500, color: C.mutedLight };

  const FormPane = (
    <div className="lynora-create-form" style={{ flex: 1, minWidth: 0, padding: 24 }}>
      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowEmojis(!showEmojis)} style={{ width: 56, height: 56, borderRadius: 14, border: `2px solid ${C.line}`, background: C.navy50, fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color .15s" }}>{form.emoji}</button>
              {showEmojis && (
                <>
                  <div onClick={() => setShowEmojis(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                  <div style={{ position: "absolute", top: 64, left: 0, background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, boxShadow: "0 12px 30px rgba(18,38,24,.16)", zIndex: 10 }}>
                    {GROUP_EMOJIS.map((e, i) => (
                      <button key={i} onClick={() => { update("emoji", e); setShowEmojis(false); }} style={{ width: 36, height: 36, border: form.emoji === e ? `2px solid ${C.gold600}` : "2px solid transparent", background: form.emoji === e ? C.navy50 : "transparent", borderRadius: 8, fontSize: 20, cursor: "pointer" }}>{e}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}><span>Nom du groupe *</span><span style={counterStyle}>{form.name.length}/60</span></label>
              <input
                style={{ ...inputStyle, borderColor: attemptedNext && !nameValid ? C.danger : C.line }}
                placeholder="Ex: TechAfrica Community"
                maxLength={60}
                value={form.name}
                onChange={e => { update("name", e.target.value); if (attemptedNext) setAttemptedNext(false); }}
              />
              {attemptedNext && !nameValid && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                  <AlertTriangle size={11} style={{ color: C.danger }} />
                  <span style={{ fontFamily: S.font, fontSize: 11.5, color: C.danger }}>Le nom du groupe est obligatoire.</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}><span>Description</span><span style={counterStyle}>{form.description.length}/220</span></label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} maxLength={220} placeholder="Décrivez l'objectif de votre groupe, qui devrait le rejoindre..." value={form.description} onChange={e => update("description", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}><span>Catégorie</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => update("category", cat.id)} style={{ padding: "8px 16px", borderRadius: 20, border: form.category === cat.id ? "none" : `1px solid ${C.line}`, background: form.category === cat.id ? cat.color : C.white, color: form.category === cat.id ? C.white : C.muted, fontFamily: S.font, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s" }}>{cat.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}><span>Couverture</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {COVER_GRADIENTS.map(g => (
                <button key={g.id} onClick={() => update("coverId", g.id)} title={g.label} style={{ width: 34, height: 34, borderRadius: 10, border: form.coverId === g.id ? `2px solid ${C.navy800}` : "2px solid transparent", padding: 0, cursor: "pointer", background: g.value, boxShadow: form.coverId === g.id ? `0 0 0 3px ${C.navy100}` : "0 1px 3px rgba(0,0,0,.12)", transition: "box-shadow .15s" }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={labelStyle}><span>Localisation</span></label>
            <div style={{ position: "relative" }}>
              <MapPin size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.mutedLight }} />
              <input style={{ ...inputStyle, paddingLeft: 38 }} placeholder="Ex: Antananarivo, Madagascar" value={form.location} onChange={e => update("location", e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}><span>Confidentialité</span></label>
            <div style={{ display: "flex", gap: 12 }}>
              {[{ val: "public", icon: Globe, label: "Public", desc: "Tout le monde peut trouver et rejoindre" }, { val: "private", icon: Lock, label: "Privé", desc: "Sur invitation uniquement" }].map(p => (
                <div key={p.val} onClick={() => update("privacy", p.val)} style={{ flex: 1, padding: 16, borderRadius: 14, border: `2px solid ${form.privacy === p.val ? C.navy800 : C.line}`, cursor: "pointer", background: form.privacy === p.val ? C.navy50 : C.white, transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p.icon size={20} style={{ color: form.privacy === p.val ? C.navy800 : C.muted }} />
                    {form.privacy === p.val && <CheckCircle2 size={16} style={{ color: C.navy800 }} />}
                  </div>
                  <div style={{ fontFamily: S.font, fontSize: 14, fontWeight: 600, color: C.ink, marginTop: 8 }}>{p.label}</div>
                  <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted, marginTop: 2 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}><span>Qui peut publier ?</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {POST_PERMISSIONS.map(p => (
                <div key={p.id} onClick={() => update("postPermission", p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `2px solid ${form.postPermission === p.id ? C.navy800 : C.line}`, background: form.postPermission === p.id ? C.navy50 : C.white, cursor: "pointer", transition: "all .15s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${form.postPermission === p.id ? C.navy800 : C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {form.postPermission === p.id && <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.navy800 }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: S.font, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{p.label}</div>
                    <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted, marginTop: 1 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={labelStyle}><span>Règles de la communauté (une par ligne)</span></label>
            <textarea style={{ ...inputStyle, minHeight: 110 }} placeholder={"Soyez respectueux\nPas de spam\nPartagez du contenu pertinent"} value={form.rules} onChange={e => update("rules", e.target.value)} />
          </div>
          {form.rules.trim() && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {form.rules.split("\n").map(r => r.trim()).filter(Boolean).map((rule, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: C.navy50 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: C.navy800, color: C.white, fontFamily: S.font, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontFamily: S.font, fontSize: 13, color: C.ink }}>{rule}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: 16, borderRadius: 14, background: C.warn50, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Info size={18} style={{ color: C.warn, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontFamily: S.font, fontSize: 13, color: C.ink, lineHeight: 1.5 }}>Vous pourrez modifier les règles et les paramètres du groupe à tout moment depuis le panneau d'administration.</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="lynora-create-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
        {step > 0 ? (
          <button onClick={() => setStep(s => s - 1)} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontWeight: 600, fontFamily: S.font, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><ArrowLeft size={16} /> Retour</button>
        ) : <div />}
        {step < steps.length - 1 ? (
          <button onClick={goNext} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: C.navy800, color: C.white, fontWeight: 600, fontFamily: S.font, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>Suivant <ChevronRight size={15} /></button>
        ) : (
          <button onClick={handleCreate} disabled={!nameValid} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: nameValid ? "linear-gradient(135deg, #1F6F4C 0%, #122318 100%)" : C.mutedLight, color: C.white, fontWeight: 700, fontFamily: S.font, fontSize: 14, cursor: nameValid ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8, boxShadow: nameValid ? "0 10px 22px rgba(18,38,24,0.24)" : "none" }}><Sparkles size={15} /> Créer le groupe</button>
        )}
      </div>
    </div>
  );

  const PreviewPane = (
    <div style={{ width: isWide ? 300 : "100%", flexShrink: 0, padding: isWide ? "24px 24px 24px 0" : "0 24px 24px", boxSizing: "border-box" }}>
      <div style={{ position: isWide ? "sticky" : "static", top: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, boxShadow: `0 0 0 3px ${C.success}22` }} />
          <span style={{ fontFamily: S.font, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .6 }}>Aperçu en direct</span>
        </div>
        <GroupPreviewCard form={form} />
        <p style={{ fontFamily: S.font, fontSize: 11.5, color: C.mutedLight, margin: "10px 4px 0", lineHeight: 1.5 }}>Voici comment votre groupe apparaîtra dans la liste des communautés.</p>
      </div>
    </div>
  );

  return (
    <div className="lynora-create-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,26,18,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, padding: 16 }} onClick={onClose}>
      <div className="lynora-create-modal" style={{ background: C.white, borderRadius: 24, width: "95%", maxWidth: isWide ? 880 : 560, maxHeight: "92vh", overflow: "auto", boxShadow: "0 30px 60px rgba(0,0,0,.22)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="lynora-create-header" style={{ padding: "22px 28px", background: "linear-gradient(135deg, #1B5E40 0%, #122318 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users2 size={19} style={{ color: C.gold400 }} />
            </div>
            <div>
              <h2 style={{ fontFamily: S.display, fontSize: 20, fontWeight: 600, color: C.white, margin: 0 }}>Créer un groupe</h2>
              <p style={{ fontFamily: S.font, fontSize: 12, color: "rgba(255,255,255,.65)", margin: "2px 0 0" }}>Configurez votre communauté professionnelle</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "rgba(255,255,255,.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={16} style={{ color: C.white }} /></button>
        </div>

        {/* Step indicator */}
        <div className="lynora-create-steps" style={{ display: "flex", alignItems: "flex-start", padding: "20px 28px 4px", overflowX: "auto" }}>
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const clickable = i <= maxStepReached;
            return (
              <React.Fragment key={i}>
                <div onClick={() => clickable && setStep(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: clickable ? "pointer" : "default", minWidth: 64 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? C.navy800 : active ? C.white : C.navy50,
                    border: active ? `2px solid ${C.navy800}` : "2px solid transparent",
                    color: done ? C.white : active ? C.navy800 : C.mutedLight, transition: "all .2s",
                  }}>
                    {done ? <Check size={14} /> : <s.icon size={14} />}
                  </div>
                  <span style={{ fontFamily: S.font, fontSize: 11, fontWeight: active ? 700 : 500, color: active ? C.navy800 : C.mutedLight }}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < step ? C.navy800 : C.line, marginTop: 15, borderRadius: 1, transition: "background .25s" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body: form + live preview */}
        <div style={{ display: "flex", flexDirection: isWide ? "row" : "column", alignItems: "flex-start" }}>
          {FormPane}
          {isWide ? PreviewPane : (
            <div style={{ padding: "0 24px 24px" }}>
              <button onClick={() => setShowPreviewMobile(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.navy50, cursor: "pointer", fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.navy800 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Eye size={15} /> {showPreviewMobile ? "Masquer l'aperçu" : "Voir l'aperçu du groupe"}</span>
                <ChevronDown size={15} style={{ transform: showPreviewMobile ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {showPreviewMobile && <div style={{ marginTop: 14 }}><GroupPreviewCard form={form} /></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================================================================== */
/*  GROUP CARD (enriched)                                              */
/* ================================================================== */
const GroupCard = ({ group, onClick, isSuggestion, suggestionReason, onJoin, onDismiss, isFavorite, onToggleFavorite }) => {
  const cat = CATEGORIES.find(c => c.id === group.category);
  const onlineCount = group.members.filter(m => m.online).length;
  const isTrending = group.engagementRate >= 75;

  return (
    <Card onClick={onClick} style={{ display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #FFFFFF 0%, #FBFAF4 100%)", border: `1px solid ${C.line}`, boxShadow: "0 12px 28px rgba(18,38,24,0.06)", transition: "transform .2s ease, boxShadow .2s ease" }}>
      {/* Cover */}
      <div style={{ height: 94, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,.2)", ...getGroupCoverStyle(group) }}>
        {!isSuggestion && onToggleFavorite && (
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.22)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.28)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Star size={14} style={{ color: isFavorite ? C.gold400 : C.white }} />
          </button>
        )}
        {isTrending && (
          <div style={{ position: "absolute", top: isSuggestion || !onToggleFavorite ? 10 : 44, right: 10, padding: "4px 10px", borderRadius: 20, background: "rgba(184,72,60,.88)", color: C.white, fontFamily: S.font, fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, boxShadow: "0 8px 16px rgba(184,72,60,.22)" }}><Flame size={12} /> Tendance</div>
        )}
        {group.privacy === "private" && (
          <div style={{ position: "absolute", top: 10, left: 10, width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,.25)" }}><Lock size={14} style={{ color: C.white }} /></div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: S.font, fontSize: 15, fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{group.name}</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {group.ownerId === CURRENT_USER.id && <Badge small color={C.navy800} style={{ background: `${C.navy800}20`, color: C.navy800 }}>Admin</Badge>}
            {cat && <Badge small color={cat.color}>{cat.label}</Badge>}
          </div>
        </div>
        <p style={{ fontFamily: S.font, fontSize: 13, color: C.muted, margin: "0 0 12px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{group.description}</p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={14} style={{ color: C.mutedLight }} />
            <span style={{ fontFamily: S.font, fontSize: 12, color: C.muted }}>{group.members.length} membres</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MessageSquare size={14} style={{ color: C.mutedLight }} />
            <span style={{ fontFamily: S.font, fontSize: 12, color: C.muted }}>{group.postsCount} posts</span>
          </div>
          {onlineCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <CircleDot size={14} style={{ color: C.success }} />
              <span style={{ fontFamily: S.font, fontSize: 12, color: C.success }}>{onlineCount} en ligne</span>
            </div>
          )}
        </div>

        {/* Engagement bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>Engagement</span>
            <span style={{ fontFamily: S.font, fontSize: 11, fontWeight: 600, color: group.engagementRate >= 70 ? C.success : C.muted }}>{group.engagementRate}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: C.line }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${group.engagementRate}%`, background: group.engagementRate >= 70 ? C.success : group.engagementRate >= 50 ? C.gold600 : C.mutedLight, transition: "width .5s" }} />
          </div>
        </div>

        {/* Member avatars */}
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
          <div style={{ display: "flex", marginLeft: -4 }}>
            {group.members.slice(0, 4).map((m, i) => (
              <div key={m.id} style={{ position: "relative", marginLeft: i > 0 ? -8 : 0 }}>
                <Avatar src={m.image || m.avatarUrl || m.photoUrl || null} name={m.name} initials={m.initials} size={28} style={{ border: `2px solid ${C.white}` }} />
                <OnlineDot online={m.online} size={8} />
              </div>
            ))}
            {group.members.length > 4 && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.navy50, border: `2px solid ${C.white}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font, fontSize: 10, fontWeight: 600, color: C.navy800, marginLeft: -8 }}>+{group.members.length - 4}</div>
            )}
          </div>
          {isSuggestion ? (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button onClick={e => { e.stopPropagation(); onDismiss?.(); }} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} style={{ color: C.muted }} /></button>
              <button onClick={e => { e.stopPropagation(); onJoin?.(); }} style={{ padding: "0 14px", height: 32, borderRadius: 8, border: "none", background: C.navy800, color: C.white, fontFamily: S.font, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Rejoindre</button>
            </div>
          ) : group.location && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} style={{ color: C.mutedLight }} />
              <span style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>{group.location}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ================================================================== */
/*  GROUPS GRID                                                       */
/* ================================================================== */
const NOTIF_FEED = [
  { id: "n1", icon: "🎉", text: "TechAfrica Community a dépassé 500 membres", time: "il y a 2 h" },
  { id: "n2", icon: "💬", text: "Nouvelle réponse à votre question dans Design & Produit MG", time: "il y a 5 h" },
  { id: "n3", icon: "📅", text: "Rappel : Meetup DevOps Antananarivo #12 demain", time: "il y a 1 j" },
];

const GroupsGrid = ({ groups, onCreateGroup, onSelectGroup, onJoinGroup, onDismissSuggestion, dismissedSuggestions = [], favorites = [], onToggleFavorite }) => {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy] = useState("members");
  const [showSort, setShowSort] = useState(false);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const isMemberOfGroup = (group) => group.ownerId === CURRENT_USER.id || (group.members || []).some((member) => member?.id === CURRENT_USER.id || member === CURRENT_USER.id);

  const filtered = useMemo(() => {
    let list = [...groups];
    if (search) list = list.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()));
    if (catFilter !== "all") list = list.filter(g => g.category === catFilter);
    if (showFavOnly) list = list.filter(g => favorites.includes(g.id));
    if (sortBy === "members") list.sort((a, b) => b.members.length - a.members.length);
    else if (sortBy === "posts") list.sort((a, b) => b.postsCount - a.postsCount);
    else if (sortBy === "engagement") list.sort((a, b) => b.engagementRate - a.engagementRate);
    else if (sortBy === "newest") list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [groups, search, catFilter, sortBy, showFavOnly, favorites]);

  // Recommandations : groupes publics dont l'utilisateur n'est pas membre,
  // non rejetés, triés par engagement puis taille de communauté.
  const suggestedGroups = useMemo(() => {
    return groups
      .filter(g => g.privacy === "public" && !dismissedSuggestions.includes(g.id) && !isMemberOfGroup(g))
      .sort((a, b) => (b.engagementRate - a.engagementRate) || (b.members.length - a.members.length))
      .slice(0, 3);
  }, [groups, dismissedSuggestions]);

  const sortOptions = [{ val: "members", label: "Membres" }, { val: "posts", label: "Posts" }, { val: "engagement", label: "Engagement" }, { val: "newest", label: "Récents" }];

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 32px" }}>
      <div style={{ padding: "20px 22px 18px", borderRadius: 22, background: "rgba(255,255,255,0.9)", border: `1px solid ${C.line}`, boxShadow: "0 10px 26px rgba(18,38,24,0.04)", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: S.font, fontSize: 11, fontWeight: 800, color: C.navy800, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 6 }}>Communauté</div>
            <h1 style={{ fontFamily: S.display, fontSize: 34, fontWeight: 600, color: C.ink, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Groupes professionnels</h1>
            <p style={{ fontFamily: S.font, fontSize: 14, color: C.muted, margin: 0 }}>{groups.length} groupes disponibles{favorites.length > 0 ? ` · ${favorites.length} en favoris` : ""}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifs(v => !v)} style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${C.line}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <Bell size={17} style={{ color: C.navy800 }} />
                <span style={{ position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: "50%", background: C.danger, border: `2px solid ${C.white}` }} />
              </button>
              {showNotifs && (
                <>
                  <div onClick={() => setShowNotifs(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
                  <div style={{ position: "absolute", top: 52, right: 0, width: 300, background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: "0 16px 36px rgba(18,38,24,.16)", zIndex: 30, overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 13, fontWeight: 700, color: C.ink }}>Notifications</div>
                    <div style={{ maxHeight: 260, overflowY: "auto" }}>
                      {NOTIF_FEED.map(n => (
                        <div key={n.id} style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
                          <span style={{ fontSize: 18, lineHeight: 1 }}>{n.icon}</span>
                          <div>
                            <div style={{ fontFamily: S.font, fontSize: 12.5, color: C.ink, lineHeight: 1.4 }}>{n.text}</div>
                            <div style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight, marginTop: 3 }}>{n.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={onCreateGroup} style={{ padding: "12px 22px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #1B5E40 0%, #122318 100%)", color: C.white, fontFamily: S.font, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 22px rgba(18,38,24,0.20)" }}><Plus size={18} /> Créer un groupe</button>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestedGroups.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Sparkles size={18} style={{ color: C.gold600 }} />
            <h2 style={{ fontFamily: S.font, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>Recommandations</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 16 }}>
            {suggestedGroups.map((g) => (
              <GroupCard key={g.id} group={g} isSuggestion suggestionReason={undefined} onClick={() => onSelectGroup(g)} onJoin={() => onJoinGroup?.(g.id)} onDismiss={() => onDismissSuggestion?.(g.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.mutedLight }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un groupe" style={{ width: "100%", padding: "12px 16px 12px 38px", borderRadius: 14, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 14, color: C.ink, outline: "none", boxSizing: "border-box", background: "#FFFFFF", boxShadow: "inset 0 1px 2px rgba(18,38,24,0.03)" }} />
        </div>
        <button onClick={() => setShowFavOnly(v => !v)} style={{ padding: "11px 16px", borderRadius: 14, border: `1px solid ${showFavOnly ? C.gold600 : C.line}`, background: showFavOnly ? C.warn50 : "#FFFFFF", fontFamily: S.font, fontSize: 13, fontWeight: 700, color: showFavOnly ? C.gold600 : C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Star size={14} style={{ color: showFavOnly ? C.gold600 : C.mutedLight }} /> Favoris
        </button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowSort(!showSort)} style={{ padding: "11px 16px", borderRadius: 14, border: `1px solid ${C.line}`, background: "#FFFFFF", fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 6px 16px rgba(18,38,24,.04)" }}><ArrowUpRight size={14} /> Trier par</button>
          {showSort && (
            <div style={{ position: "absolute", top: 44, right: 0, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,.1)", zIndex: 20, minWidth: 160 }}>
              {sortOptions.map(o => (
                <button key={o.val} onClick={() => { setSortBy(o.val); setShowSort(false); }} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, border: "none", background: sortBy === o.val ? C.navy50 : "transparent", color: sortBy === o.val ? C.navy800 : C.muted, fontFamily: S.font, fontSize: 13, textAlign: "left", cursor: "pointer" }}>{o.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        <button onClick={() => setCatFilter("all")} style={{ padding: "7px 16px", borderRadius: 999, border: "none", background: catFilter === "all" ? "linear-gradient(135deg, #1B5E40 0%, #122318 100%)" : "#EDEAE0", color: catFilter === "all" ? C.white : C.muted, fontFamily: S.font, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: catFilter === "all" ? "0 8px 18px rgba(18,38,24,0.18)" : "none" }}>Tous les groupes</button>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setCatFilter(cat.id)} style={{ padding: "7px 16px", borderRadius: 999, border: "none", background: catFilter === cat.id ? cat.color : "#F2F0E7", color: catFilter === cat.id ? C.white : cat.color, fontFamily: S.font, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: catFilter === cat.id ? `0 8px 18px ${cat.color}25` : "none" }}>{cat.label}</button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 20 }}>
          {filtered.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              onClick={() => onSelectGroup(g)}
              isFavorite={favorites.includes(g.id)}
              onToggleFavorite={() => onToggleFavorite?.(g.id)}
            />
          ))}
        </div>
      ) : showFavOnly ? (
        <EmptyState icon={Star} title="Aucun favori pour l'instant" subtitle="Cliquez sur l'étoile d'un groupe pour l'ajouter à vos favoris" />
      ) : (
        <EmptyState icon={Search} title="Aucun groupe correspondant" subtitle="Essayez de modifier les filtres de recherche" />
      )}
    </div>
  );
};

/* ================================================================== */
/*  GROUP TRIGGER ACTION BUTTON — pour le composer                    */
/* ================================================================== */
function GroupTriggerAction({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "8px 6px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: C.muted }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={17} color={color} />
      {label}
    </button>
  );
}

/* ================================================================== */
/*  UPDATE COVER MODAL                                                 */
/* ================================================================== */
const COVER_MAX_SIZE_MB = 8;

const UpdateCoverModal = ({ open, group, onClose, onSave }) => {
  const inputRef = useRef(null);
  const progressTimerRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPreview(group?.coverUrl || null);
    setIsUploading(false);
    setProgress(0);
    setError("");
    setIsDragging(false);
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open, group?.coverUrl]);

  useEffect(() => () => clearInterval(progressTimerRef.current), []);

  useEscapeToClose(open, !isUploading ? onClose : () => {});

  const readFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Format non pris en charge. Choisissez une image (JPG, PNG, WEBP...).");
      return;
    }
    if (file.size > COVER_MAX_SIZE_MB * 1024 * 1024) {
      setError(`L'image dépasse la taille maximale de ${COVER_MAX_SIZE_MB} Mo.`);
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event) => {
    readFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    readFile(event.dataTransfer.files?.[0]);
  };

  const handleSave = () => {
    if (!preview || isUploading) return;
    setIsUploading(true);
    setProgress(0);
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev;
        const step = prev < 55 ? 11 : prev < 80 ? 5 : 1.5;
        return Math.min(92, prev + step);
      });
    }, 110);

    setTimeout(() => {
      clearInterval(progressTimerRef.current);
      setProgress(100);
      setTimeout(() => {
        onSave(preview);
        setIsUploading(false);
        onClose();
      }, 280);
    }, 1450);
  };

  if (!open) return null;

  const RADIUS = 26;
  const CIRC = 2 * Math.PI * RADIUS;
  const dashOffset = CIRC - (Math.min(progress, 100) / 100) * CIRC;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,26,18,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }} onClick={!isUploading ? onClose : undefined}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(92vw, 560px)", background: C.white, borderRadius: 24, overflow: "hidden", boxShadow: "0 28px 60px rgba(18,38,24,.2)", animation: "modalSlideIn .25s ease-out" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.paper }}>
          <div>
            <div style={{ fontFamily: S.font, fontSize: 10, fontWeight: 800, color: C.navy800, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 4 }}>Couverture du groupe</div>
            <div style={{ fontFamily: S.font, fontSize: 18, fontWeight: 700, color: C.ink }}>{group?.name || "Groupe"}</div>
          </div>
          <button onClick={onClose} disabled={isUploading} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: `${C.muted}14`, cursor: isUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isUploading ? .5 : 1 }}><X size={16} style={{ color: C.muted }} /></button>
        </div>

        <div style={{ padding: 22 }}>
          <div
            onDragOver={e => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Déposer ou choisir une image de couverture"
            style={{
              height: 180, borderRadius: 18, overflow: "hidden", position: "relative", cursor: isUploading ? "default" : "pointer",
              border: isDragging ? `2px dashed ${C.navy800}` : `1px solid ${C.line}`,
              transition: "border .15s, transform .15s",
              transform: isDragging ? "scale(1.01)" : "scale(1)",
              ...getGroupCoverStyle({ ...group, coverUrl: preview || group?.coverUrl }),
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,26,18,0) 45%, rgba(15,26,18,.55) 100%)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}>
              {!isUploading && (
                <span style={{ fontFamily: S.font, fontSize: 12, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,.28)", padding: "6px 12px", borderRadius: 20, backdropFilter: "blur(4px)" }}>
                  <Camera size={13} /> {preview ? "Changer l'image" : "Glisser une image ou cliquer"}
                </span>
              )}
            </div>

            {isUploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(14,31,23,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="72" height="72" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="5" />
                    <circle
                      cx="32" cy="32" r={RADIUS} fill="none" stroke={C.gold400} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={CIRC} strokeDashoffset={dashOffset}
                      style={{ transition: "stroke-dashoffset .18s linear" }}
                    />
                  </svg>
                  <span style={{ position: "absolute", fontFamily: S.font, fontSize: 13, fontWeight: 800, color: C.white }}>{Math.round(progress)}%</span>
                </div>
              </div>
            )}
          </div>

          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

          {error && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: C.danger50, color: C.danger, fontFamily: S.font, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            <button onClick={() => !isUploading && inputRef.current?.click()} disabled={isUploading} style={{ padding: "12px 16px", borderRadius: 14, border: `1px dashed ${C.line}`, background: C.navy50, color: C.navy800, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: isUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isUploading ? .6 : 1 }}>
              <Upload size={16} /> Choisir une image
            </button>

            {isUploading && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: C.navy50, color: C.navy800, fontFamily: S.font, fontSize: 13, fontWeight: 700 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${C.navy100}`, borderTopColor: C.navy800, animation: "lynoraSpin 0.85s linear infinite", display: "inline-block" }} />
                {progress < 100 ? "Téléversement en cours..." : "Finalisation..."}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <button onClick={onClose} disabled={isUploading} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading ? .5 : 1 }}>Annuler</button>
            <button onClick={handleSave} disabled={!preview || isUploading} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: preview && !isUploading ? C.navy800 : C.mutedLight, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: preview && !isUploading ? "pointer" : "not-allowed", boxShadow: preview && !isUploading ? "0 10px 22px rgba(18,38,24,0.18)" : "none" }}>
              {isUploading ? `Envoi ${Math.round(progress)}%` : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(18px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

/* ================================================================== */
/*  CREATE EVENT MODAL                                                 */
/* ================================================================== */
const EVENT_DURATIONS = ["30 min", "1h", "1h30", "2h", "3h", "Journée entière"];

const CreateEventModal = ({ open, group, onClose, onCreate }) => {
  const emptyForm = { title: "", description: "", type: "in-person", location: "", date: "", time: "", duration: "1h", maxAttendees: "50" };
  const [form, setForm] = useState(emptyForm);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState(0);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setAttemptedSubmit(false);
    setIsSubmitting(false);
    setSubmitError("");
    setStep(0);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open]);

  useEscapeToClose(open, onClose);
  const titleValid = form.title.trim().length >= 3;
  const locationValid = form.location.trim().length > 0;
  const dateValid = !!form.date;

  if (!open) return null;

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const isValid = titleValid && locationValid && dateValid;
  const steps = ["Informations", "Date et lieu", "Configuration"];

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 13.5, color: C.ink, outline: "none", boxSizing: "border-box", background: "#FAF8F2" };
  const labelStyle = { fontFamily: S.font, fontSize: 12.5, fontWeight: 700, color: C.muted, marginBottom: 7, display: "block" };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setAttemptedSubmit(true);
    if (!isValid) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await onCreate({
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      location: form.location.trim(),
      date: form.date,
      time: form.time || "À définir",
      duration: form.duration,
      attendees: 0,
      maxAttendees: Math.max(1, Number(form.maxAttendees) || 50),
      });
    } catch (error) {
      setSubmitError(error.message || "Impossible de créer l’événement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lynora-event-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,26,18,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }} onClick={onClose}>
      <div className="lynora-event-modal" onClick={e => e.stopPropagation()} style={{ width: "min(94vw, 520px)", maxHeight: "88vh", overflowX: "hidden", overflowY: "auto", background: C.white, borderRadius: 24, boxShadow: "0 28px 60px rgba(18,38,24,.2)", animation: "modalSlideIn .25s ease-out" }}>
        <div style={{ padding: "20px 24px", background: navyGrad, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FontAwesomeIcon icon={faCalendarDays} style={{ color: C.gold400, fontSize: 18 }} />
            <div>
              <div style={{ fontFamily: S.font, fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: 1.1 }}>{group?.name}</div>
              <h2 style={{ fontFamily: S.display, fontSize: 18, fontWeight: 600, color: C.white, margin: 0 }}>Créer un événement</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "rgba(255,255,255,.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FontAwesomeIcon icon={faXmark} style={{ color: C.white, fontSize: 14 }} /></button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            {steps.map((label, index) => (
              <React.Fragment key={label}>
                <button type="button" onClick={() => index <= step && setStep(index)} style={{ border: 0, background: index === step ? C.navy50 : "transparent", color: index <= step ? C.navy800 : C.mutedLight, borderRadius: 8, padding: "6px 8px", fontFamily: S.font, fontSize: 11.5, fontWeight: index === step ? 800 : 600, cursor: index <= step ? "pointer" : "default" }}>{index + 1}. {label}</button>
                {index < steps.length - 1 && <ChevronRight size={13} style={{ color: C.line, flexShrink: 0 }} />}
              </React.Fragment>
            ))}
          </div>

          {step === 0 && <>
          <div>
            <label style={labelStyle}>Titre de l'événement *</label>
            <input ref={firstFieldRef} style={{ ...inputStyle, borderColor: attemptedSubmit && !titleValid ? C.danger : C.line }} placeholder="Ex: Atelier découverte, Meetup mensuel..." value={form.title} onChange={e => update("title", e.target.value)} />
            {attemptedSubmit && !titleValid && <span style={{ fontFamily: S.font, fontSize: 11.5, color: C.danger, marginTop: 4, display: "block" }}>Le titre doit contenir au moins 3 caractères.</span>}
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 78, resize: "vertical" }} placeholder="De quoi parle cet événement, à quoi doivent s'attendre les participants ?" value={form.description} onChange={e => update("description", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Format</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "in-person", label: "En présentiel", icon: faLocationDot }, { id: "online", label: "En ligne", icon: faVideo }].map(opt => (
                <button type="button" key={opt.id} onClick={() => update("type", opt.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 12px", borderRadius: 12, border: `2px solid ${form.type === opt.id ? C.navy800 : C.line}`, background: form.type === opt.id ? C.navy50 : C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, color: form.type === opt.id ? C.navy800 : C.muted, cursor: "pointer" }}>
                  <FontAwesomeIcon icon={opt.icon} style={{ fontSize: 14 }} /> {opt.label}
                </button>
              ))}
            </div>
          </div>
          </>}

          {step === 1 && <>
          <div>
            <label style={labelStyle}>{form.type === "online" ? "Lien de connexion *" : "Lieu *"}</label>
            <div style={{ position: "relative" }}>
              {form.type === "online" ? <FontAwesomeIcon icon={faVideo} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.mutedLight, fontSize: 14 }} /> : <FontAwesomeIcon icon={faLocationDot} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.mutedLight, fontSize: 14 }} />}
              <input style={{ ...inputStyle, paddingLeft: 34, borderColor: attemptedSubmit && !locationValid ? C.danger : C.line }} placeholder={form.type === "online" ? "Ex: lien Zoom, Google Meet..." : "Ex: Antananarivo, salle de coworking..."} value={form.location} onChange={e => update("location", e.target.value)} />
            </div>
            {attemptedSubmit && !locationValid && <span style={{ fontFamily: S.font, fontSize: 11.5, color: C.danger, marginTop: 4, display: "block" }}>Ce champ est requis.</span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" min={new Date().toISOString().slice(0, 10)} style={{ ...inputStyle, borderColor: attemptedSubmit && !dateValid ? C.danger : C.line }} value={form.date} onChange={e => update("date", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Heure</label>
              <input type="time" style={inputStyle} value={form.time} onChange={e => update("time", e.target.value)} />
            </div>
          </div>
          </>}

          {step === 2 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Durée</label>
              <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={form.duration} onChange={e => update("duration", e.target.value)}>
                {EVENT_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Places maximum</label>
              <input type="number" min={1} style={inputStyle} value={form.maxAttendees} onChange={e => update("maxAttendees", e.target.value)} />
            </div>
          </div>}

          {step === 2 && submitError && <div style={{ padding: "10px 12px", borderRadius: 10, background: C.danger50, color: C.danger, fontFamily: S.font, fontSize: 12.5, fontWeight: 600 }}>{submitError}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
            {step > 0 && <button type="button" onClick={() => setStep(value => value - 1)} style={{ marginRight: "auto", padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><ArrowLeft size={14} /> Retour</button>}
            <button type="button" onClick={onClose} disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1 }}>Annuler</button>
            {step < steps.length - 1 ? <button type="button" onClick={() => setStep(value => value + 1)} disabled={(step === 0 && !titleValid) || (step === 1 && (!locationValid || !dateValid))} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: navyGrad, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Suivant <ChevronRight size={14} /></button> : <button type="button" onClick={handleSubmit} disabled={isSubmitting} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: isSubmitting ? C.mutedLight : navyGrad, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: isSubmitting ? "wait" : "pointer", boxShadow: shadow.brand, display: "flex", alignItems: "center", gap: 8 }}><FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 14 }} /> {isSubmitting ? "Création..." : "Créer l'événement"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================================================================== */
/*  ADD FILE MODAL                                                     */
/* ================================================================== */
const FILE_MAX_SIZE_MB = 25;

const guessFileType = (fileName) => {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xlsx";
  if (["ppt", "pptx"].includes(ext)) return "pptx";
  return "default";
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const AddFileModal = ({ open, group, onClose, onAdd, currentUser }) => {
  const inputRef = useRef(null);
  const progressTimerRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setPending(null);
    setIsUploading(false);
    setProgress(0);
    setError("");
    setIsDragging(false);
    setDescription("");
  }, [open]);

  useEffect(() => () => clearInterval(progressTimerRef.current), []);
  useEscapeToClose(open, !isUploading ? onClose : () => {});
  if (!open) return null;

  const acceptFile = (file) => {
    if (!file) return;
    if (file.size > FILE_MAX_SIZE_MB * 1024 * 1024) {
      setError(`Le fichier dépasse la taille maximale de ${FILE_MAX_SIZE_MB} Mo.`);
      return;
    }
    setError("");
    setPending(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const handleFileChange = (event) => {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleConfirm = async () => {
    if (!pending || isUploading) return;
    setIsUploading(true);
    setProgress(12);
    try {
      const formData = new FormData();
      formData.append("file", pending);
      formData.append("type", "document");
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || "Le téléversement a échoué.");
      setProgress(100);
      await onAdd({
        id: `f_${Date.now()}`,
        name: pending.name,
        type: guessFileType(pending.name),
        mimeType: pending.type || "application/octet-stream",
        description: description.trim(),
        url: data.url,
        publicId: data.publicId || null,
        size: formatFileSize(pending.size),
        downloads: 0,
        time: "à l'instant",
        uploadedBy: currentUser?.name || CURRENT_USER.name,
        initials: currentUser?.initials || CURRENT_USER.initials,
        avatarUrl: currentUser?.avatarUrl || null,
      });
      onClose();
    } catch (uploadError) {
      setError(uploadError.message || "Le téléversement a échoué.");
    } finally {
      setIsUploading(false);
    }
  };

  const fi = pending ? (FILE_ICONS[guessFileType(pending.name)] || FILE_ICONS.default) : null;

  return (
    <div className="lynora-file-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,26,18,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }} onClick={!isUploading ? onClose : undefined}>
      <div className="lynora-file-modal" onClick={e => e.stopPropagation()} style={{ width: "min(92vw, 480px)", background: C.white, borderRadius: 24, overflow: "hidden", boxShadow: "0 28px 60px rgba(18,38,24,.2)", animation: "modalSlideIn .25s ease-out" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.paper }}>
          <div>
            <div style={{ fontFamily: S.font, fontSize: 10, fontWeight: 800, color: C.navy800, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 4 }}>{group?.name}</div>
            <div style={{ fontFamily: S.font, fontSize: 18, fontWeight: 700, color: C.ink }}>Ajouter un fichier</div>
          </div>
          <button onClick={onClose} disabled={isUploading} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: `${C.muted}14`, cursor: isUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isUploading ? .5 : 1 }}><X size={16} style={{ color: C.muted }} /></button>
        </div>

        <div style={{ padding: 22 }}>
          <div
            onDragOver={e => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Déposer ou choisir un fichier"
            style={{
              borderRadius: 18, padding: "28px 18px", textAlign: "center", cursor: isUploading ? "default" : "pointer",
              border: isDragging ? `2px dashed ${C.navy800}` : `2px dashed ${C.line}`,
              background: isDragging ? C.navy50 : C.paper,
              transition: "border .15s, background .15s",
            }}
          >
            {!pending ? (
              <>
                <Upload size={26} style={{ color: C.mutedLight, marginBottom: 10 }} />
                <div style={{ fontFamily: S.font, fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Glissez un fichier ici</div>
                <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted }}>ou cliquez pour parcourir · PDF, DOC, XLS, PPT... (max {FILE_MAX_SIZE_MB} Mo)</div>
              </>
            ) : isUploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="56" height="56" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
                    <circle cx="32" cy="32" r="26" fill="none" stroke={`${C.navy800}18`} strokeWidth="5" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={C.navy800} strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 - (Math.min(progress, 100) / 100) * (2 * Math.PI * 26)} style={{ transition: "stroke-dashoffset .18s linear" }} />
                  </svg>
                  <span style={{ fontFamily: S.font, fontSize: 12, fontWeight: 800, color: C.navy800 }}>{Math.round(progress)}%</span>
                </div>
                <span style={{ fontFamily: S.font, fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{progress < 100 ? "Téléversement en cours..." : "Finalisation..."}</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${fi.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font, fontSize: 12, fontWeight: 700, color: fi.color, flexShrink: 0 }}>{fi.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: S.font, fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pending.name}</div>
                  <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted, marginTop: 2 }}>{formatFileSize(pending.size)} · Cliquez pour changer</div>
                </div>
              </div>
            )}
          </div>

          <input ref={inputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} />

          {pending && !isUploading && (
            <div style={{ marginTop: 16 }}>
              <label htmlFor="group-file-description" style={{ fontFamily: S.font, fontSize: 12.5, fontWeight: 700, color: C.muted, marginBottom: 7, display: "block" }}>Description <span style={{ fontWeight: 500, color: C.mutedLight }}>(facultative)</span></label>
              <textarea
                id="group-file-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Ajoutez un contexte ou quelques mots sur ce fichier..."
                maxLength={500}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: "11px 13px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.paper, color: C.ink, fontFamily: S.font, fontSize: 13, lineHeight: 1.45, outline: "none" }}
              />
              <div style={{ marginTop: 4, textAlign: "right", fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>{description.length}/500</div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: C.danger50, color: C.danger, fontFamily: S.font, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button onClick={onClose} disabled={isUploading} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading ? .5 : 1 }}>Annuler</button>
            <button onClick={handleConfirm} disabled={!pending || isUploading} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: pending && !isUploading ? C.navy800 : C.mutedLight, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: pending && !isUploading ? "pointer" : "not-allowed", boxShadow: pending && !isUploading ? "0 10px 22px rgba(18,38,24,0.18)" : "none" }}>
              {isUploading ? `Envoi ${Math.round(progress)}%` : "Ajouter le fichier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GROUP_JOIN_QUESTIONS = [
  { id: "rules", label: "Acceptez-vous de respecter les règles du groupe ?" },
  { id: "participation", label: "Souhaitez-vous participer régulièrement aux échanges ?" },
  { id: "relevance", label: "Votre intérêt correspond-il au thème de ce groupe ?" },
];

const getGroupJoinQuestions = (group) => (Array.isArray(group?.joinQuestions) && group.joinQuestions.length > 0 ? group.joinQuestions : GROUP_JOIN_QUESTIONS);

const JoinRequestModal = ({ open, group, onClose, onSubmitted, onToast }) => {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setAnswers({}); setError(""); setSubmitting(false); }
  }, [open]);

  if (!open) return null;
  const questions = getGroupJoinQuestions(group);
  const complete = questions.every(question => typeof answers[question.id] === "boolean");
  const submit = async () => {
    if (!complete || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/groups/${group.id}/join-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible d'envoyer la demande");
      onSubmitted(data.request);
      onClose();
      onToast("Votre demande a bien été envoyée. Vous serez notifié après décision.", "success");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lynora-join-request-overlay" style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(15,26,18,.58)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="lynora-join-request-modal" onClick={event => event.stopPropagation()} style={{ width: "min(94vw, 520px)", maxHeight: "88vh", overflowY: "auto", background: C.white, borderRadius: 20, boxShadow: "0 28px 70px rgba(18,38,24,.25)" }}>
        <div style={{ padding: "20px 22px", background: navyGrad, color: C.white }}>
          <div style={{ fontFamily: S.font, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.gold400 }}>Demande d'adhésion</div>
          <h2 style={{ margin: "6px 0 0", fontFamily: S.display, fontSize: 22, fontWeight: 600 }}>Rejoindre {group.name}</h2>
        </div>
        <div style={{ padding: 22 }}>
          <p style={{ margin: "0 0 18px", fontFamily: S.font, fontSize: 13, lineHeight: 1.55, color: C.muted }}>Répondez à chaque question pour envoyer votre demande aux administrateurs.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map(question => (
              <div key={question.id} style={{ padding: "13px 14px", border: `1px solid ${C.line}`, borderRadius: 12 }}>
                <div style={{ fontFamily: S.font, fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.4 }}>{question.label}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {[true, false].map(value => <button key={String(value)} type="button" onClick={() => setAnswers(current => ({ ...current, [question.id]: value }))} style={{ flex: 1, padding: "8px 12px", borderRadius: 9, border: `1px solid ${answers[question.id] === value ? C.navy800 : C.line}`, background: answers[question.id] === value ? C.navy50 : C.white, color: answers[question.id] === value ? C.navy800 : C.muted, fontFamily: S.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{value ? "Oui" : "Non"}</button>)}
                </div>
              </div>
            ))}
          </div>
          {error && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: C.danger50, color: C.danger, fontFamily: S.font, fontSize: 12.5 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} disabled={submitting} style={{ padding: "10px 16px", borderRadius: 9, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
            <button type="button" onClick={submit} disabled={!complete || submitting} style={{ padding: "10px 18px", borderRadius: 9, border: "none", background: complete && !submitting ? navyGrad : C.mutedLight, color: C.white, fontFamily: S.font, fontWeight: 700, cursor: complete && !submitting ? "pointer" : "not-allowed" }}>{submitting ? "Envoi..." : "Envoyer la demande"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================================================================== */
/*  GROUP DETAIL (sidebar gauche + onglets enrichis)                   */
/* ================================================================== */
const GroupDetail = ({ group, currentUserId, onBack, onAdmin, onToast, onUpdateGroup, onPostCreated }) => {
  const { data: session } = useSession();
  const me = currentUserId ? { id: currentUserId, name: 'Vous', avatar: '', title: '' } : { id: '', name: 'Invité', avatar: '', title: '' };
  const userRole = getUserRoleInGroup(group, currentUserId);
  const isGroupAdmin = userRole === "admin" || userRole === "moderator";
  const canPublish = canPostInGroup(group, me?.id ?? currentUserId);
  const [activeTab, setActiveTab] = useState("posts");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [showReactions, setShowReactions] = useState(null);
  const [votedPolls, setVotedPolls] = useState({});
  const [rsvpdEvents, setRsvpdEvents] = useState([]);
  const [bookmarked, setBookmarked] = useState({});
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showCoverUpload, setShowCoverUpload] = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [modalMode, setModalMode] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then(async (response) => {
        if (!response.ok) throw new Error('Impossible de charger les paramètres');
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const nextValue = data?.groupNotifications?.[group.id] ?? true;
        setNotifOn(Boolean(nextValue));
      })
      .catch(() => {
        if (active) setNotifOn(true);
      });

    return () => {
      active = false;
    };
  }, [group.id]);

  const handleToggleGroupNotifications = async () => {
    const nextValue = !notifOn;
    setNotifOn(nextValue);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupNotifications: {
            [group.id]: nextValue,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Erreur de synchronisation des notifications');
      }

      onToast(nextValue ? 'Notifications du groupe activées' : 'Notifications du groupe désactivées', 'success');
    } catch (error) {
      setNotifOn(!nextValue);
      onToast(error.message || 'Impossible de mettre à jour les notifications', 'error');
    }
  };
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [showPendingPosts, setShowPendingPosts] = useState(false);
  const [showJoinRequest, setShowJoinRequest] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [openPostId, setOpenPostId] = useState(null);
  const [openArticleId, setOpenArticleId] = useState(null);
  const [openEventId, setOpenEventId] = useState(null);
  const reactionsRef = useRef(null);
  const visiblePendingPosts = (group.posts || []).filter(post => post.status === "pending_review" && (isGroupAdmin || post.authorId === currentUserId));
  const pendingReviewCount = visiblePendingPosts.length;
  const localPosts = (group.posts || []).filter(post => {
    if (post.status === "pending_review") return isGroupAdmin || post.authorId === currentUserId;
    return true;
  });
  const currentMember = (group.members || []).find(member => member.id === currentUserId || member.id === session?.user?.id);
  const currentMemberName = currentMember?.name || session?.user?.name || CURRENT_USER.name;
  const currentMemberInitials = currentMember?.initials || currentMemberName.split(" ").filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join("") || CURRENT_USER.initials;
  const currentMemberAvatar = currentMember?.image || currentMember?.avatarUrl || currentMember?.photoUrl || session?.user?.image || null;
  const isCurrentMember = Boolean(currentMember || group.ownerId === currentUserId);
  const hasPendingJoinRequest = (group.joinRequests || []).some(request => request.userId === currentUserId && (request.status || "pending") === "pending");
  const pendingPostsForViewer = visiblePendingPosts;
  const groupMedia = useMemo(() => {
    const postByUrl = new Map();
    for (const post of group.posts || []) {
      const items = Array.isArray(post?.media) ? post.media : Array.isArray(post?.images) ? post.images : [];
      for (const item of items) {
        const url = item?.url || item?.mediaUrl || item?.src;
        if (url) postByUrl.set(String(url), post);
      }
    }

    const mediaList = [
      ...(Array.isArray(group.media) ? group.media : []),
      ...((group.posts || []).flatMap((post) => {
        const items = Array.isArray(post?.media) ? post.media : Array.isArray(post?.images) ? post.images : [];
        return items.map((item) => ({ ...item, post }));
      }))
    ]
      .filter((item) => item && (item.url || item.mediaUrl || item.src))
      .map((item) => {
        const url = item.url || item.mediaUrl || item.src;
        const type = String(item.type || (/(?:\.mp4|\.webm|\.mov|\.m4v|\.ogg|\.mp3)(?:\?|$)/i.test(url) ? "video" : "image")).toLowerCase();
        const matchedPost = item.post || postByUrl.get(String(url)) || null;
        return {
          ...item,
          id: item.id || item.publicId || `${type}_${url}`,
          type,
          url,
          name: item.name || item.label || (type === "video" ? "Vidéo" : "Image"),
          uploadedBy: item.uploadedBy || matchedPost?.author || "Membre",
          initials: item.initials || matchedPost?.initials || "M",
          time: item.time || matchedPost?.createdAt || "",
          post: matchedPost,
        };
      });

    const unique = new Map();
    for (const item of mediaList) {
      const key = item.url;
      if (!unique.has(key)) unique.set(key, item);
    }
    return Array.from(unique.values());
  }, [group.media, group.posts]);
  const openPost = group.posts?.find((p) => p.id === openPostId);
  const openArticle = group.posts?.find((p) => p.id === openArticleId);
  const openEvent = localPosts?.find((p) => p.id === openEventId);
  const openInviteModal = () => setShowInvite(true);

  useEffect(() => {
    const userId = session?.user?.id || currentUserId;
    if (!userId) return;
    setRsvpdEvents((group.events || []).filter((event) => (event.attendeeIds || []).includes(userId)).map((event) => event.id));
  }, [group.events, currentUserId, session?.user?.id]);

  useEffect(() => {
    document.querySelector(".lynora-groupes")?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  const tabs = [
    { id: "posts", label: "Publications", icon: MessageSquare, count: localPosts.length },
    { id: "about", label: "À propos", icon: Info, count: null },
    { id: "events", label: "Événements", icon: Calendar, count: (group.events || []).length },
    { id: "media", label: "Médias", icon: Image, count: (group.media || []).length },
    { id: "files", label: "Fichiers", icon: FileText, count: (group.files || []).length },
    { id: "members", label: "Membres", icon: Users, count: group.members.length },
  ];

  const updatePosts = (updater) => onUpdateGroup(group.id, g => ({ ...g, posts: updater(g.posts) }));

  const handleReaction = (postId, emoji) => {
    updatePosts(posts => posts.map(p => {
      if (p.id !== postId) return p;
      const r = { ...p.reactions };
      r[emoji] = (r[emoji] || 0) + 1;
      return { ...p, reactions: r, reaction: emoji, liked: true };
    }));
    setShowReactions(null);
  };

  const updateCommentTree = (comments, commentId, updater) => (comments || []).map(comment => {
    if (comment.id === commentId) return updater(comment);
    return { ...comment, replies: updateCommentTree(comment.replies, commentId, updater) };
  });

  const handleCommentReaction = (postId, commentId, reactionKey) => {
    updatePosts(posts => posts.map(post => post.id !== postId ? post : {
      ...post,
      comments: updateCommentTree(post.comments, commentId, comment => ({
        ...comment,
        reactions: { ...(comment.reactions || {}), [reactionKey]: (comment.reactions?.[reactionKey] || 0) + 1 },
        likes: (comment.likes || 0) + 1,
        reaction: reactionKey,
        reactionKeys: [...new Set([...(comment.reactionKeys || []), reactionKey])],
        totalReactions: (comment.totalReactions || comment.likes || 0) + 1,
      })),
    }));
  };

  const handleCommentReply = (postId, commentId, text, media = []) => {
    if (!text?.trim()) return;
    const author = session?.user?.name || CURRENT_USER.name;
    const reply = {
      id: `reply_${Date.now()}`,
      author,
      initials: author.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?",
      avatarUrl: session?.user?.image || null,
      time: "à l'instant",
      text: text.trim(),
      media,
      replies: [],
      likes: 0,
      reactions: {},
    };
    updatePosts(posts => posts.map(post => post.id !== postId ? post : {
      ...post,
      comments: updateCommentTree(post.comments, commentId, comment => ({ ...comment, replies: [...(comment.replies || []), reply] })),
    }));
  };

  const handleVote = (postId, optionId) => {
    if (votedPolls[postId]) return;
    setVotedPolls(prev => ({ ...prev, [postId]: true }));
    updatePosts(posts => posts.map(p => {
      if (p.id !== postId || !p.poll) return p;
      const opts = p.poll.options.map(o => o.id === optionId ? { ...o, votes: [...o.votes, me?.id ?? "currentUser"] } : o);
      return { ...p, poll: { ...p.poll, options: opts, totalVotes: p.poll.totalVotes + 1 } };
    }));
  };

  const toggleBookmark = (postId) => {
    setBookmarked(prev => ({ ...prev, [postId]: !prev[postId] }));
    onToast(!bookmarked[postId] ? "Post sauvegardé" : "Post retiré des favoris", "success");
  };

  const handlePublish = async (postData = {}) => {
    const member = (group.members || []).find(m => m.id === me?.id || m.id === session?.user?.id);
    const requiresApproval = group.privacy === "private" && !isGroupAdmin;
    const roleLabel = member?.role === "admin" ? "Admin" : member?.role === "moderator" ? "Modérateur" : "Membre";
    const authorName = member?.name || session?.user?.name || CURRENT_USER.name;
    const authorInitials = member?.initials || authorName.split(" ").filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join("") || CURRENT_USER.initials;
    const createdAt = new Date().toISOString();
    const groupVisibility = group.privacy === "private" ? "Privé" : "Public";
    const isArticle = Boolean(postData.isArticle || postData.mode === "article");
    const articleBody = isArticle ? (postData.text || "") : "";
    const articleExcerpt = isArticle ? (postData.articleExcerpt || postData.excerpt || (articleBody || "").replace(/[#>*_\-\[\]()]/g, "").trim().slice(0, 180) || "") : "";

    const newPost = {
      id: `new_${Date.now()}`, 
      type: postData.mode || "post", 
      isArticle,
      authorId: member?.id || currentUserId || session?.user?.id || null,
      isPlatformAdmin: Boolean(session?.user?.isPlatformAdmin || session?.user?.role === "admin"),
      isPremium: Boolean(session?.user?.isPremium),
      author: authorName, 
      initials: authorInitials, 
      avatarUrl: member?.image || member?.avatarUrl || member?.photoUrl || session?.user?.image || null,
      authorTitle: roleLabel,
      createdAt,
      pinned: false, 
      text: isArticle ? articleExcerpt : (postData.text || ""),
      body: isArticle ? articleBody : null,
      media: postData.media || [], 
      images: postData.media || [], 
      coverUrl: postData.coverUrl || (Array.isArray(postData.media) && postData.media[0]?.url) || null,
      headline: postData.articleTitle || postData.headline || null,
      excerpt: articleExcerpt,
      link: postData.link, 
      poll: postData.poll,
      mood: postData.mood || null,
      identifiedUsers: postData.identifiedUsers || [],
      visibility: groupVisibility,
      tags: postData.tags || [], 
      presentation: postData.presentation || null,
      status: requiresApproval ? "pending_review" : "published",
      reactions: {}, 
      comments: [], 
      shares: 0,
    };
    try {
      if (group.privacy !== "private") {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: newPost.isArticle ? null : newPost.text,
            isArticle: newPost.isArticle,
            headline: newPost.headline,
            excerpt: newPost.excerpt,
            articleBody: newPost.isArticle ? newPost.text : undefined,
            presentation: newPost.presentation,
            media: newPost.media,
            mood: newPost.mood,
            identifiedUsers: newPost.identifiedUsers,
            visibility: groupVisibility,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "La publication n’a pas pu être enregistrée");
        const savedPost = data.post || {};
        const publishedPost = { ...newPost, id: savedPost.id || newPost.id, status: "published", time: savedPost.createdAt || createdAt };
        onUpdateGroup(group.id, g => ({ ...g, posts: [publishedPost, ...(g.posts || [])], postsCount: (g.postsCount || 0) + 1 }));
        onPostCreated?.(publishedPost);
        setModalMode(null);
        onToast("Publication partagée avec le groupe", "success");
        return;
      }
      onUpdateGroup(group.id, g => ({
        ...g,
        posts: [newPost, ...(g.posts || [])],
        postsCount: (g.postsCount || 0) + 1,
      }));
      if (requiresApproval) {
        const adminIds = new Set([
          ...(group.ownerId ? [group.ownerId] : []),
          ...((group.members || []).filter(member => ["admin", "moderator"].includes(member?.role)).map(member => member.id)),
        ]);
        await Promise.all([...adminIds].filter(Boolean).map(async (adminId) => {
          if (!adminId || adminId === (currentUserId || session?.user?.id)) return null;
          try {
            await fetch("/api/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: adminId,
                actor: authorName,
                type: "article",
                title: "Publication en attente",
                text: `${authorName} a publié un contenu dans ${group.name} et attend votre approbation.`,
                avatarUrl: currentMemberAvatar || session?.user?.image || null,
                coverUrl: group.coverUrl || group.avatarUrl || null,
                meta: {
                  kind: "group_post_pending_approval",
                  groupId: group.id,
                  groupName: group.name,
                  postId: newPost.id,
                  avatarUrl: currentMemberAvatar || session?.user?.image || null,
                  coverUrl: group.coverUrl || group.avatarUrl || null,
                },
              }),
            });
          } catch (error) {
            console.error("notifyGroupAdminsPendingPost", error);
          }
          return null;
        }));
      }
      setModalMode(null);
      onToast(requiresApproval ? "Votre publication a été envoyée pour approbation par les administrateurs" : "Publication partagée avec le groupe", "success");
    } catch (error) {
      console.error("handlePublish", error);
      onToast(error.message || "La publication n’a pas pu être enregistrée", "error");
    }
  };

  const handleAddComment = (postId) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const commentAuthor = session?.user?.name || CURRENT_USER.name;
    const commentInitials = commentAuthor
      .split(" ")
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase() || "?";
    const comment = { 
      id: `c_${Date.now()}`, 
      author: commentAuthor, 
      initials: commentInitials, 
      avatarUrl: session?.user?.image || null,
      time: "à l'instant", 
      text 
    };
    updatePosts(posts => posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
    setCommentDrafts(prev => ({ ...prev, [postId]: "" }));
  };

  const handleShare = (postId) => {
    updatePosts(posts => posts.map(p => p.id === postId ? { ...p, shares: (p.shares || 0) + 1 } : p));
    navigator.clipboard?.writeText(`https://lynora.app/g/${group.id}/p/${postId}`);
    onToast("Lien de la publication copié", "success");
  };

  const handleReport = (postId) => {
    setOpenMenuFor(null);
    onToast("Publication signalée aux modérateurs. Merci pour votre vigilance.", "success");
  };

  const handleTogglePin = (postId) => {
    updatePosts(posts => posts.map(p => p.id === postId ? { ...p, pinned: !p.pinned } : p));
    setOpenMenuFor(null);
    onToast("Publication mise à jour", "success");
  };

  const handleDeletePost = (postId) => {
    onUpdateGroup(group.id, g => ({ ...g, posts: g.posts.filter(p => p.id !== postId), postsCount: Math.max(0, (g.postsCount || 1) - 1) }));
    setOpenMenuFor(null);
    onToast("Publication supprimée", "success");
  };

  const toggleRsvp = async (eventId, currentAttending = rsvpdEvents.includes(eventId)) => {
    const nowRsvpd = currentAttending || rsvpdEvents.includes(eventId);
    try {
      const response = await fetch(`/api/groups/${group.id}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, attending: !nowRsvpd }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Impossible de mettre à jour la participation");
      setRsvpdEvents(prev => nowRsvpd ? prev.filter(id => id !== eventId) : [...prev, eventId]);
      onUpdateGroup(group.id, g => ({
        ...g,
        events: (g.events || []).map(ev => ev.id === eventId ? data.event : ev),
        posts: (g.posts || []).map(post => post.event?.id === eventId ? { ...post, event: data.event } : post),
      }), false);
    } catch (error) {
      onToast(error.message, "error");
    }
  };

  const handleCreateEvent = async (eventData) => {
    const response = await fetch(`/api/groups/${group.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Impossible de créer l’événement");

    const eventPost = {
      id: `event_post_${data.event.id}`,
      type: "event",
      isEvent: true,
      event: data.event,
      authorId: data.event.createdBy || currentUserId || session?.user?.id || null,
      author: data.event.createdByName || currentMemberName,
      initials: currentMemberInitials,
      avatarUrl: data.event.createdByAvatar || currentMemberAvatar,
      authorTitle: "Membre",
      title: "Membre",
      role: "Membre",
      createdAt: data.event.createdAt || new Date().toISOString(),
      time: data.event.createdAt || new Date().toISOString(),
      text: fileData.description?.trim() || "",
      media: [],
      images: [],
      visibility: group.privacy === "private" ? "Privé" : "Public",
      reactions: {},
      comments: [],
      shares: 0,
      group: {
        id: group.id,
        ownerId: group.ownerId,
        name: group.name,
        coverUrl: group.coverUrl || null,
        coverGradient: group.coverGradient || null,
        memberIds: (group.members || []).map((member) => member.id),
      },
    };

    onUpdateGroup(group.id, g => ({
      ...g,
      events: [data.event, ...(g.events || [])],
      posts: [eventPost, ...(g.posts || []).filter((post) => post.id !== eventPost.id)],
      postsCount: (g.postsCount || 0) + 1,
    }), false);
    onPostCreated?.(eventPost);
    setShowCreateEvent(false);
    onToast("Événement créé avec succès", "success");
  };

  const handleAddFile = async (fileData) => {
    const createdAt = new Date().toISOString();
    const requiresApproval = group.privacy === "private" && !isGroupAdmin;
    const filePost = {
      id: `file_post_${fileData.id || Date.now()}`,
      type: "file",
      isFile: true,
      file: fileData,
      fileDescription: fileData.description || "",
      authorId: currentUserId || session?.user?.id || null,
      author: currentMemberName,
      initials: currentMemberInitials,
      avatarUrl: currentMemberAvatar,
      authorTitle: "Membre",
      title: "Membre",
      role: "Membre",
      status: requiresApproval ? "pending_review" : "published",
      createdAt,
      time: createdAt,
      text: "",
      media: [],
      images: [],
      visibility: group.privacy === "private" ? "Privé" : "Public",
      reactions: {},
      comments: [],
      shares: 0,
      group: {
        id: group.id,
        ownerId: group.ownerId,
        name: group.name,
        coverUrl: group.coverUrl || null,
        coverGradient: group.coverGradient || null,
        memberIds: (group.members || []).map(member => member.id),
      },
    };

    await onUpdateGroup(group.id, g => ({
      ...g,
      files: [fileData, ...(g.files || [])],
      posts: [filePost, ...(g.posts || [])],
      postsCount: (g.postsCount || 0) + 1,
    }));
    setShowAddFile(false);
    onToast(requiresApproval ? "Fichier envoyé pour approbation par les administrateurs" : "Fichier ajouté avec succès", "success");
  };

  const handleJoinRequestSubmitted = (request) => {
    onUpdateGroup(group.id, g => ({ ...g, joinRequests: [request, ...(g.joinRequests || [])] }), false);
  };

  const totalReactions = (reactions) => Object.values(reactions || {}).reduce((a, b) => a + b, 0);
  const cat = CATEGORIES.find(c => c.id === group.category);
  const onlineCount = group.members.filter(m => m.online).length;
  const adminMembers = group.members.filter(m => m.role === "admin" || m.role === "moderator");
  const groupRules = group.rules || [];
  const visibleMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return group.members;
    return group.members.filter(m => m.name.toLowerCase().includes(q) || (m.title || "").toLowerCase().includes(q));
  }, [group.members, memberSearch]);

  return (
    <div className="lynora-page lynora-group-detail" style={{ width: "100%", maxWidth: "none", margin: "0 auto", padding: "0 20px 40px" }}>
      {/* Back + Admin buttons */}
      <div className="lynora-detail-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingTop: 8, gap: 10, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: C.navy50, fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.navy800, cursor: "pointer" }}><ArrowLeft size={16} /> Retour</button>
        <div className="lynora-detail-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!isCurrentMember && group.privacy === "private" && <button disabled={hasPendingJoinRequest} onClick={() => setShowJoinRequest(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: hasPendingJoinRequest ? C.mutedLight : navyGrad, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: hasPendingJoinRequest ? "default" : "pointer" }}>{hasPendingJoinRequest ? <Check size={15} /> : <UserPlus size={15} />} {hasPendingJoinRequest ? "Demande envoyée" : "Demander à rejoindre"}</button>}
          {isGroupAdmin && (
            <button
              onClick={onAdmin}
              title={pendingReviewCount > 0 ? `${pendingReviewCount} publication${pendingReviewCount > 1 ? "s" : ""} en attente d’approbation` : "Admin"}
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer" }}
            >
              <Settings size={15} />
              Admin
              {pendingReviewCount > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "#FF5A5F", color: "#fff", fontFamily: S.font, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, boxShadow: "0 4px 10px rgba(255,90,95,0.35)" }}>
                  {pendingReviewCount > 9 ? "9+" : pendingReviewCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={handleToggleGroupNotifications}
            title={notifOn ? "Désactiver les notifications" : "Activer les notifications"}
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.line}`, background: notifOn ? C.navy50 : C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          ><Bell size={15} style={{ color: notifOn ? C.navy800 : C.mutedLight }} /></button>
          <button type="button" onClick={openInviteModal} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: C.navy800, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><UserPlus size={15} /> Inviter</button>
        </div>
      </div>

      <InviteModal open={showInvite} group={group} currentUserId={currentUserId} onClose={() => setShowInvite(false)} onToast={onToast} onUpdateGroup={onUpdateGroup} />
      {modalMode && (
        modalMode === "visuelfocus" ? (
          <AIVisualEditorModal
            onClose={() => setModalMode(null)}
            onPublish={handlePublish}
            currentUser={{
              name: session?.user?.name || CURRENT_USER.name,
              title: session?.user?.title || CURRENT_USER.title,
              avatar: session?.user?.image || CURRENT_USER.avatar,
              avatarUrl: session?.user?.image || null,
            }}
          />
        ) : (
          <CreatePostModal
            initialMode={modalMode}
            initialVisibility={group.privacy === "private" ? "Privé" : "Public"}
            onClose={() => setModalMode(null)}
            onOpenVisualFocus={() => setModalMode("visuelfocus")}
            onPublish={handlePublish}
            group={group}
            currentUser={{
              name: currentMemberName,
              title: currentMember?.title || session?.user?.title || CURRENT_USER.title,
              avatar: currentMemberInitials,
              avatarUrl: currentMemberAvatar,
            }}
          />
        )
      )}
      <CreateEventModal open={showCreateEvent} group={group} onClose={() => setShowCreateEvent(false)} onCreate={handleCreateEvent} />
      <AddFileModal
        open={showAddFile}
        group={group}
        onClose={() => setShowAddFile(false)}
        onAdd={handleAddFile}
        currentUser={{ name: currentMemberName, initials: currentMemberInitials, avatarUrl: currentMemberAvatar }}
      />
      <JoinRequestModal
        open={showJoinRequest}
        group={group}
        onClose={() => setShowJoinRequest(false)}
        onSubmitted={handleJoinRequestSubmitted}
        onToast={onToast}
      />
      <UpdateCoverModal
        open={showCoverUpload}
        group={group}
        onClose={() => setShowCoverUpload(false)}
        onSave={(coverUrl) => onUpdateGroup(group.id, g => ({ ...g, coverUrl, coverGradient: g.coverGradient || "linear-gradient(160deg, #1F6F4C 0%, #122318 100%)" }))}
      />

      {/* En-tête du groupe — cover + carte d'identité unifiées */}
      <div className="lynora-header-card" style={{ borderRadius: 20, marginBottom: 24, background: C.white, border: `1px solid ${C.line}`, boxShadow: "0 18px 45px rgba(18,38,24,.09)", overflow: "hidden" }}>
        {/* Cover */}
        <div className="lynora-cover" style={{ height: 190, position: "relative", overflow: "hidden", backgroundPosition: "center", ...getGroupCoverStyle(group) }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "16px 16px", opacity: .5, pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,31,23,.02) 0%, rgba(14,31,23,.28) 100%)", pointerEvents: "none" }} />

          {/* Chips flottants : confidentialité / catégorie / lieu */}
          <div className="lynora-cover-chips" style={{ position: "absolute", top: 16, left: 18, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", maxWidth: "calc(100% - 80px)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px 5px 9px", borderRadius: 20, background: "rgba(15,26,18,.4)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.22)", fontFamily: S.font, fontSize: 11.5, fontWeight: 600, color: C.white }}>
              {group.privacy === "private" ? <Lock size={11} /> : <Globe size={11} />}
              {group.privacy === "private" ? "Privé" : "Public"}
            </span>
            {cat && (
              <span style={{ padding: "5px 12px", borderRadius: 20, background: "rgba(255,255,255,.94)", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: cat.color }}>{cat.label}</span>
            )}
            {group.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 20, background: "rgba(15,26,18,.4)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.22)", fontFamily: S.font, fontSize: 11.5, fontWeight: 600, color: C.white }}>
                <MapPin size={11} /> {group.location}
              </span>
            )}
          </div>

          {isGroupAdmin && (
            <button
              onClick={() => setShowCoverUpload(true)}
              title="Changer la couverture"
              aria-label="Changer la couverture du groupe"
              className="lynora-cover-btn"
              style={{ position: "absolute", right: 18, bottom: 18, width: 42, height: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.16)", backdropFilter: "blur(8px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(0,0,0,.14)", transition: "transform .15s ease, background .15s ease", zIndex: 2 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.28)"; e.currentTarget.style.transform = "scale(1.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.16)"; e.currentTarget.style.transform = "scale(1)"; }}
            >
              <Camera size={18} style={{ color: C.white }} />
            </button>
          )}
        </div>

        {/* Carte d'identité */}
        <div style={{ padding: "0 28px 26px" }}>
          {/* Avatars empilés des membres, à cheval sur la cover */}
          <div className="lynora-header-toprow" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: -34, marginBottom: 18 }}>
            <AvatarStack members={group.members} max={6} size={48} overlap={14} ringColor={C.white} onClick={() => setActiveTab("members")} />
            {group.tags && group.tags.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", paddingBottom: 6 }}>
                {group.tags.map(t => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 20, background: C.navy50, fontFamily: S.font, fontSize: 11.5, fontWeight: 600, color: C.navy800 }}><Hash size={10} />{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="lynora-title-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div className="lynora-header-title-copy" style={{ flex: 1, minWidth: "min(240px, 100%)" }}>
              <span className="lynora-header-eyebrow">Communauté professionnelle</span>
              <h1 className="lynora-detail-title" style={{ fontFamily: S.display, fontSize: 30, fontWeight: 600, color: C.ink, margin: "0 0 7px", letterSpacing: ".01em" }}>{group.name}</h1>
              <p style={{ fontFamily: S.font, fontSize: 14, color: C.muted, margin: "0 0 10px", lineHeight: 1.6, maxWidth: 620 }}>{group.description}</p>
              <button
                onClick={() => setActiveTab("members")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: S.font, fontSize: 12.5, fontWeight: 600, color: C.muted }}
                onMouseEnter={e => { e.currentTarget.style.color = C.navy800; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.muted; }}
              >
                <Users size={12} style={{ color: C.mutedLight }} />
                {group.members.length} membre{group.members.length > 1 ? "s" : ""}
                {onlineCount > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    · <CircleDot size={9} style={{ color: C.success }} /> {onlineCount} en ligne
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Barre de statistiques */}
          <div className="lynora-stats-row lynora-header-stats" style={{ display: "flex", alignItems: "stretch", marginTop: 22, borderRadius: 14, background: C.navy50, border: `1px solid ${C.line}`, overflow: "hidden" }}>
            {[
              { value: group.members.length, label: "Membres", icon: Users, color: C.navy800 },
              { value: group.postsCount, label: "Publications", icon: MessageSquare, color: "#3B82F6" },
              { value: onlineCount, label: "En ligne", icon: CircleDot, color: C.success },
              { value: `${group.engagementRate}%`, label: "Engagement", icon: TrendingUp, color: C.gold600 },
            ].map((s, i) => (
              <div key={s.label} className="lynora-stat-item" style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderLeft: i === 0 ? "none" : `1px solid ${C.line}`, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}16`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: S.display, fontSize: 18, fontWeight: 700, color: C.ink, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.value}</div>
                  <div style={{ fontFamily: S.font, fontSize: 11, color: C.muted, fontWeight: 500, whiteSpace: "nowrap" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements banner */}
      {(group.announcements || []).length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {(group.announcements || []).map(ann => (
            <div key={ann.id} style={{ padding: "14px 18px", borderRadius: 14, background: ann.priority === "high" ? C.warn50 : C.navy50, borderLeft: `4px solid ${ann.priority === "high" ? C.warn : C.navy800}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Megaphone size={18} style={{ color: ann.priority === "high" ? C.warn : C.navy800, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: S.font, fontSize: 14, fontWeight: 600, color: C.ink }}>{ann.title}</div>
                <div style={{ fontFamily: S.font, fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{ann.text}</div>
                <div style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight, marginTop: 6 }}>{ann.author} · {ann.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Layout : sidebar gauche + contenu */}
      <div className="lynora-detail-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", alignItems: "start", gap: 24 }}>

        {/* ============ SIDEBAR GAUCHE ============ */}
        <aside className={`lynora-group-sidebar ${sidebarOpen ? "is-open" : ""}`} style={{ minWidth: 0, position: "sticky", top: 16, alignSelf: "start" }}>
          <div className="lynora-sidebar-header">
            <strong>{group.name}</strong>
            <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu du groupe"><X size={17} /></button>
          </div>
          {/* Navigation */}
          <Card style={{ padding: 8 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: activeTab === t.id ? C.navy50 : "transparent", fontFamily: S.font, fontSize: 13.5, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? C.navy800 : C.muted, cursor: "pointer", marginBottom: 2, textAlign: "left" }}
              >
                <t.icon size={16} style={{ color: activeTab === t.id ? C.navy800 : C.mutedLight, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.label}</span>
                {typeof t.count === "number" && (
                  <span style={{ padding: "2px 8px", borderRadius: 10, background: activeTab === t.id ? `${C.navy800}15` : `${C.mutedLight}20`, fontSize: 11.5, fontWeight: 700 }}>{t.count}</span>
                )}
              </button>
            ))}
          </Card>

          {/* Aperçu rapide */}
          <Card style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
              <div style={{ fontFamily: S.font, fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: "uppercase", letterSpacing: .6 }}>Aperçu</div>
              <button
                onClick={() => setActiveTab("about")}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", margin: "-4px -8px", borderRadius: 7, border: "none", background: "transparent", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: C.navy800, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.navy50; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Voir tout <ChevronRight size={11} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {cat && (
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Tag size={13} style={{ color: C.mutedLight, flexShrink: 0 }} />
                  <span style={{ fontFamily: S.font, fontSize: 12.5, color: C.ink }}>{cat.label}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                {group.privacy === "private" ? <Lock size={13} style={{ color: C.mutedLight, flexShrink: 0 }} /> : <Globe size={13} style={{ color: C.mutedLight, flexShrink: 0 }} />}
                <span style={{ fontFamily: S.font, fontSize: 12.5, color: C.ink }}>{group.privacy === "private" ? "Groupe privé" : "Groupe public"}</span>
              </div>
              {group.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <MapPin size={13} style={{ color: C.mutedLight, flexShrink: 0 }} />
                  <span style={{ fontFamily: S.font, fontSize: 12.5, color: C.ink }}>{group.location}</span>
                </div>
              )}
              {group.createdAt && (
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Calendar size={13} style={{ color: C.mutedLight, flexShrink: 0 }} />
                  <span style={{ fontFamily: S.font, fontSize: 12.5, color: C.ink }}>Créé le {group.createdAt}</span>
                </div>
              )}
              {groupRules.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <ListCheck size={13} style={{ color: C.mutedLight, flexShrink: 0 }} />
                  <span style={{ fontFamily: S.font, fontSize: 12.5, color: C.ink }}>{groupRules.length} règle{groupRules.length > 1 ? "s" : ""} à respecter</span>
                </div>
              )}
            </div>
          </Card>

          {/* Équipe */}
          {adminMembers.length > 0 && (
            <Card style={{ padding: 18 }}>
              <div style={{ fontFamily: S.font, fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: "uppercase", letterSpacing: .6, marginBottom: 12 }}>Équipe</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {adminMembers.slice(0, 6).map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar src={m.image || m.avatarUrl || m.photoUrl || null} name={m.name} initials={m.initials} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: S.font, fontSize: 12.5, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    </div>
                    {m.role === "admin" ? <Crown size={12} style={{ color: C.gold600 }} /> : <ShieldCheck size={12} style={{ color: C.navy700 }} />}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Actions rapides */}
          {isCurrentMember && <Card style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={() => setShowCreateEvent(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, border: "none", background: "transparent", fontFamily: S.font, fontSize: 12.5, fontWeight: 600, color: C.navy800, cursor: "pointer", textAlign: "left" }}><Plus size={14} /> Créer un événement</button>
            <button onClick={() => setShowAddFile(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, border: "none", background: "transparent", fontFamily: S.font, fontSize: 12.5, fontWeight: 600, color: C.navy800, cursor: "pointer", textAlign: "left" }}><Upload size={14} /> Ajouter un fichier</button>
            <button type="button" onClick={openInviteModal} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, border: "none", background: "transparent", fontFamily: S.font, fontSize: 12.5, fontWeight: 600, color: C.navy800, cursor: "pointer", textAlign: "left" }}><UserPlus size={14} /> Inviter des membres</button>
          </Card>}
        </aside>
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,26,18,.4)", zIndex: 15 }} className="lynora-sidebar-backdrop" />}

        {/* ============ CONTENU PRINCIPAL ============ */}
        <div className="lynora-detail-main">
          <button onClick={() => setSidebarOpen(true)} className="lynora-sidebar-toggle" style={{ display: "none", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.navy800, cursor: "pointer", marginBottom: 16 }}><Menu size={15} /> Menu du groupe</button>

          {/* Tab content */}
          {activeTab === "posts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 900, minWidth: 0 }}>
          {/* Bouton pour créer une publication */}
          {canPublish && (
            <Card style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={currentMemberName} initials={currentMemberInitials} src={currentMemberAvatar} size={42} />
                <button
                  onClick={() => setModalMode("post")}
                  style={{ flex: 1, textAlign: "left", padding: "11px 16px", borderRadius: 22, border: `1.5px solid ${C.line}`, background: C.navy50, color: C.muted, fontSize: 14, cursor: "pointer" }}
                >
                  Partagez une actualité avec les membres du groupe...
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                <GroupTriggerAction icon={MediaIcon} label="Médias" color="#2E9E5B" onClick={() => setModalMode("image")} />
                <GroupTriggerDivider />
                <GroupTriggerAction icon={ArticleIcon} label="Article" color="#1B5386" onClick={() => setModalMode("article")} />
                <GroupTriggerDivider />
                <GroupTriggerAction icon={Paperclip} label="Fichier" color="#0A66C2" onClick={() => setShowAddFile(true)} />
                <GroupTriggerDivider />
                <GroupTriggerAction icon={Sparkles} label="VisuelFocus" color="#D9A536" onClick={() => setModalMode("visuelfocus")} />
              </div>
            </Card>
          )}

          {!canPublish && userRole && group.postPermission === "admin" && (
            <div style={{ padding: "16px 20px", borderRadius: 14, background: C.warn50, border: `1px solid ${C.gold400}30`, display: "flex", alignItems: "center", gap: 10 }}>
              <Info size={16} style={{ color: C.gold600 }} />
              <span style={{ fontFamily: S.font, fontSize: 13, color: C.warn, lineHeight: 1.5 }}>Seuls les administrateurs et modérateurs peuvent publier dans ce groupe.</span>
            </div>
          )}

          {pendingPostsForViewer.length > 0 && (
            <details open={showPendingPosts} onToggle={event => setShowPendingPosts(event.currentTarget.open)} style={{ border: `1px solid ${C.gold400}55`, borderRadius: 12, background: `${C.gold400}0D`, overflow: "hidden" }}>
              <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 14px", cursor: "pointer", listStyle: "none", fontFamily: S.font, fontSize: 12.5, fontWeight: 700, color: C.navy800 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Timer size={14} /> Publications en attente ({pendingPostsForViewer.length})</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>En validation admin</span>
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 10px 10px" }}>
                {pendingPostsForViewer.map(post => (
                  <button key={post.id} type="button" onClick={() => setOpenPostId(post.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10, background: C.white, color: C.ink, textAlign: "left", cursor: "pointer" }}>
                    {post.isFile || post.type === "file" ? <FileText size={18} style={{ color: C.navy700, flexShrink: 0 }} /> : <MessageSquare size={18} style={{ color: C.navy700, flexShrink: 0 }} />}
                    <span style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: S.font, fontSize: 12.5, fontWeight: 600 }}>{post.text || post.file?.name || post.headline || "Publication sans texte"}</span>
                    <span style={{ flexShrink: 0, fontFamily: S.font, fontSize: 10.5, color: C.gold600, fontWeight: 700 }}>En attente</span>
                  </button>
                ))}
              </div>
            </details>
          )}

          {localPosts.map(post => {
            const authorMember = (group.members || []).find(member =>
              (post.authorId && member.id === post.authorId) ||
              (post.author && post.author !== "Vous" && member.name === post.author) ||
              ((!post.authorId || post.author === "Vous") && group.ownerId && member.id === group.ownerId) ||
              (post.author === "Vous" && member.id === currentUserId)
            );
            const isCurrentAuthorAlias = post.author === "Vous";
            const authorName = isCurrentAuthorAlias ? (currentMemberName || authorMember?.name) : (post.author || authorMember?.name || "Utilisateur");
            const authorInitials = (isCurrentAuthorAlias ? null : post.initials) || authorMember?.initials || authorName.split(" ").filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join("") || "U";
            const authorAvatar = (isCurrentAuthorAlias ? currentMemberAvatar : post.avatarUrl) || authorMember?.image || authorMember?.avatarUrl || authorMember?.photoUrl || null;
            const authorRole = post.role || post.authorTitle || (authorMember?.role === "admin" ? "Admin" : authorMember?.role === "moderator" ? "Modérateur" : "Membre");
            const isPendingReview = post.status === "pending_review";
            return (
            <div key={post.id} style={{ filter: isPendingReview ? "blur(1.2px)" : "none", opacity: isPendingReview ? 0.72 : 1, pointerEvents: isPendingReview ? "none" : "auto", position: "relative" }}>
              {isPendingReview && (
                <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(15,51,82,0.7)", color: "#fff", fontFamily: S.font, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
                    En attente d’approbation
                  </span>
                </div>
              )}
              <PostCard
                post={{
                  ...post,
                  author: authorName,
                  initials: authorInitials,
                  avatarUrl: authorAvatar,
                  title: authorRole,
                  role: authorRole,
                  time: post.createdAt || post.time,
                  media: post.media || post.images || [],
                  liked: Boolean(post.liked || post.reaction),
                  bookmarked: bookmarked[post.id] || false,
                  likes: post.reactions ? Object.values(post.reactions).reduce((sum, count) => sum + count, 0) : 0,
                  comments: post.comments || [],
                  shares: post.shares || 0,
                  reaction: post.reaction || null,
                }}
                group={group}
                currentUser={{
                  id: currentUserId || session?.user?.id,
                  name: session?.user?.name || CURRENT_USER.name,
                  initials: (session?.user?.name || CURRENT_USER.name)
                    .split(" ")
                    .slice(0, 2)
                    .map(part => part[0])
                    .join("")
                    .toUpperCase() || "?",
                  avatarUrl: session?.user?.image || null,
                }}
                onToggleLike={isPendingReview ? undefined : (postId) => handleReaction(postId, "ok")}
                onSelectReaction={isPendingReview ? undefined : (postId, reactionKey) => handleReaction(postId, reactionKey)}
                onToggleBookmark={isPendingReview ? undefined : (postId) => toggleBookmark(postId)}
                onAddComment={isPendingReview ? undefined : (postId, text, media) => {
                  if (text?.trim()) {
                    const commentAuthor = session?.user?.name || CURRENT_USER.name;
                    const commentInitials = commentAuthor
                      .split(" ")
                      .slice(0, 2)
                      .map(part => part[0])
                      .join("")
                      .toUpperCase() || "?";
                    const comment = { 
                      id: `c_${Date.now()}`, 
                      author: commentAuthor, 
                      initials: commentInitials, 
                      avatarUrl: session?.user?.image || null,
                      time: "à l'instant",
                      text: text.trim(),
                      likes: 0,
                      liked: false,
                      replies: [],
                      media: media || [],
                    };
                    updatePosts(posts => posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
                  }
                }}
                onReplyComment={isPendingReview ? undefined : (postId, commentId, text, media) => {/* Handle reply */}}
                onToggleCommentLike={isPendingReview ? undefined : (commentId) => {/* Handle comment like */}}
                onShare={isPendingReview ? undefined : (postId) => handleShare(postId)}
                onOpenArticle={isPendingReview ? undefined : (post) => setOpenArticleId(post.id)}
                onOpenPost={isPendingReview ? undefined : (post) => setOpenPostId(post.id)}
                onJoinEvent={isPendingReview ? undefined : (_post, event, isAttending) => toggleRsvp(event.id, isAttending)}
                onOpenEvent={isPendingReview ? undefined : (post) => setOpenEventId(post.id)}
                onDelete={isPendingReview ? undefined : (postId) => handleDeletePost(postId)}
                isOwn={post.author === "Vous" || isGroupAdmin}
              />
            </div>
            );
          })}
        </div>
      )}

      {galleryOpen && groupMedia.length > 0 && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#131C33]/80 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Galerie de médias" onClick={() => setGalleryOpen(false)}>
          <div className="h-dvh w-screen max-w-none max-h-none overflow-y-auto rounded-none bg-white p-4 sm:h-auto sm:w-full sm:max-w-4xl sm:max-h-[90dvh] sm:rounded-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold" style={{ color: C.ink }}>Galerie de médias</h2>
              <button type="button" onClick={() => setGalleryOpen(false)} aria-label="Fermer la galerie" className="rounded-lg p-2" style={{ color: C.muted }}><X size={18} /></button>
            </div>
            {(() => {
              const currentIndex = Math.min(Math.max(galleryIndex, 0), Math.max(groupMedia.length - 1, 0));
              const currentMedia = groupMedia[currentIndex];
              const currentIsVideo = String(currentMedia?.type || "").toLowerCase() === "video" || /\.(mp4|webm|mov|m4v|ogg|mp3)$/i.test(currentMedia?.url || "");
              return (
                <div>
                  <div className="relative aspect-video overflow-hidden rounded-xl" style={{ background: C.surfaceAlt }}>
                    {currentMedia?.type === "video" || currentIsVideo ? (
                      <video src={currentMedia.url} controls autoPlay playsInline onClick={() => {
                        if (!currentMedia.post) return;
                        setGalleryOpen(false);
                        setOpenPostId(currentMedia.post.id);
                      }} className={`h-full w-full object-contain bg-black${currentMedia.post ? " cursor-pointer" : ""}`} />
                    ) : (
                      <img src={currentMedia?.url} alt="" onClick={() => {
                        if (!currentMedia?.post) return;
                        setGalleryOpen(false);
                        setOpenPostId(currentMedia.post.id);
                      }} className={`h-full w-full object-contain${currentMedia?.post ? " cursor-pointer" : ""}`} />
                    )}
                    {groupMedia.length > 1 && <>
                      <button type="button" onClick={() => setGalleryIndex((currentIndex - 1 + groupMedia.length) % groupMedia.length)} aria-label="Média précédent" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"><ChevronLeft size={18} /></button>
                      <button type="button" onClick={() => setGalleryIndex((currentIndex + 1) % groupMedia.length)} aria-label="Média suivant" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"><ChevronRight size={18} /></button>
                    </>}
                  </div>
                  <div className="mt-3 text-center text-xs" style={{ color: C.muted }}>{currentIndex + 1} / {groupMedia.length}</div>
                  {currentMedia?.post && (
                    <div className="mt-4 flex justify-center">
                      <button type="button" onClick={() => { setGalleryOpen(false); setOpenPostId(currentMedia.post.id); }} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: C.navy50, color: C.navy800 }}>Ouvrir la publication</button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {openPost && (
        <PostViewerPreview
          post={{
            ...openPost,
            title: openPost.authorTitle,
            media: openPost.media || openPost.images || [],
            liked: Boolean(openPost.liked || openPost.reaction),
            bookmarked: bookmarked[openPost.id] || false,
            likes: openPost.reactions ? Object.values(openPost.reactions).reduce((sum, count) => sum + count, 0) : 0,
            comments: openPost.comments || [],
            shares: openPost.shares || 0,
            reaction: openPost.reaction || null,
          }}
          currentUser={{
            name: session?.user?.name || CURRENT_USER.name,
            initials: (session?.user?.name || CURRENT_USER.name)
              .split(" ")
              .slice(0, 2)
              .map(part => part[0])
              .join("")
              .toUpperCase() || "?",
            avatarUrl: session?.user?.image || null,
          }}
          onClose={() => setOpenPostId(null)}
          onToggleLike={() => handleReaction(openPost.id, "ok")}
          onReact={(reactionKey) => handleReaction(openPost.id, reactionKey)}
          onToggleBookmark={() => toggleBookmark(openPost.id)}
          onAddComment={(postId, text, media) => {
            if (text?.trim()) {
              const commentAuthor = session?.user?.name || CURRENT_USER.name;
              const commentInitials = commentAuthor
                .split(" ")
                .slice(0, 2)
                .map(part => part[0])
                .join("")
                .toUpperCase() || "?";
              const comment = { 
                id: `c_${Date.now()}`, 
                author: commentAuthor, 
                initials: commentInitials, 
                avatarUrl: session?.user?.image || null,
                time: "à l'instant", 
                text: text.trim(),
                media: media || [],
              };
              updatePosts(posts => posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
            }
          }}
          onReplyComment={(postId, commentId, text, media) => handleCommentReply(postId, commentId, text, media)}
          onToggleCommentLike={(postId, commentId) => handleCommentReaction(postId, commentId, "ok")}
          onToggleCommentReaction={(postId, commentId, reactionKey) => handleCommentReaction(postId, commentId, reactionKey)}
          onShare={() => handleShare(openPost.id)}
        />
      )}

      {openArticle && (
        <ArticleViewerPreview
          article={{
            ...openArticle,
            ...(openArticle.isArticle ? { text: undefined } : {}),
            author: openArticle.author || currentMemberName,
            title: openArticle.authorTitle || openArticle.title || "Membre",
            time: openArticle.createdAt || openArticle.time,
            readingTime: openArticle.readingTime ?? Math.max(1, Math.round((openArticle.body || openArticle.text || "").split(/\s+/).filter(Boolean).length / 200)),
            likes: openArticle.reactions ? Object.values(openArticle.reactions).reduce((sum, count) => sum + Number(count || 0), 0) : Number(openArticle.likes || 0),
            liked: Boolean(openArticle.liked || openArticle.reaction),
            bookmarked: bookmarked[openArticle.id] || false,
            comments: openArticle.comments || [],
            shares: openArticle.shares || 0,
            reaction: openArticle.reaction || null,
          }}
          currentUser={{
            name: session?.user?.name || CURRENT_USER.name,
            initials: (session?.user?.name || CURRENT_USER.name)
              .split(" ")
              .slice(0, 2)
              .map(part => part[0])
              .join("")
              .toUpperCase() || "?",
            avatarUrl: session?.user?.image || null,
          }}
          onClose={() => setOpenArticleId(null)}
          onToggleLike={() => handleReaction(openArticle.id, "ok")}
          onSelectReaction={(reactionKey) => handleReaction(openArticle.id, reactionKey)}
          onToggleBookmark={() => toggleBookmark(openArticle.id)}
          onAddComment={(postId, text) => {
            if (!text?.trim()) return;
            const commentAuthor = session?.user?.name || CURRENT_USER.name;
            const commentInitials = commentAuthor
              .split(" ")
              .slice(0, 2)
              .map(part => part[0])
              .join("")
              .toUpperCase() || "?";
            const comment = {
              id: `c_${Date.now()}`,
              author: commentAuthor,
              initials: commentInitials,
              avatarUrl: session?.user?.image || null,
              time: "à l'instant",
              text: text.trim(),
              likes: 0,
              liked: false,
              replies: [],
            };
            updatePosts(posts => posts.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p));
          }}
          onReplyComment={(postId, commentId, text) => handleCommentReply(postId, commentId, text, [])}
          onToggleCommentReaction={(postId, commentId, reactionKey) => handleCommentReaction(postId, commentId, reactionKey)}
          onShare={() => handleShare(openArticle.id)}
        />
      )}

      {openEvent && (
        <EventViewerPreview
          post={{ ...openEvent, currentUserId }}
          onClose={() => setOpenEventId(null)}
        />
      )}

      {activeTab === "about" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 22 }}>
            <div style={{ fontFamily: S.font, fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: "uppercase", letterSpacing: .6, marginBottom: 10 }}>Description</div>
            <p style={{ fontFamily: S.font, fontSize: 14, color: C.ink, margin: 0, lineHeight: 1.7 }}>{group.description || "Aucune description pour ce groupe."}</p>
            {group.tags && group.tags.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 16 }}>
                {group.tags.map(t => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 20, background: C.navy50, fontFamily: S.font, fontSize: 11.5, fontWeight: 600, color: C.navy800 }}><Hash size={10} />{t}</span>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ padding: 22 }}>
            <div style={{ fontFamily: S.font, fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Informations générales</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {group.privacy === "private" ? <Lock size={15} style={{ color: C.navy800 }} /> : <Globe size={15} style={{ color: C.navy800 }} />}
                <div>
                  <div style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>Confidentialité</div>
                  <div style={{ fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.ink }}>{group.privacy === "private" ? "Groupe privé" : "Groupe public"}</div>
                </div>
              </div>
              {cat && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Tag size={15} style={{ color: C.navy800 }} />
                  <div>
                    <div style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>Catégorie</div>
                    <div style={{ fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.ink }}>{cat.label}</div>
                  </div>
                </div>
              )}
              {group.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <MapPin size={15} style={{ color: C.navy800 }} />
                  <div>
                    <div style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>Localisation</div>
                    <div style={{ fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.ink }}>{group.location}</div>
                  </div>
                </div>
              )}
              {group.createdAt && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Calendar size={15} style={{ color: C.navy800 }} />
                  <div>
                    <div style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>Créé le</div>
                    <div style={{ fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.ink }}>{group.createdAt}</div>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Users size={15} style={{ color: C.navy800 }} />
                <div>
                  <div style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>Membres</div>
                  <div style={{ fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.ink }}>{group.members.length}</div>
                </div>
              </div>
            </div>
          </Card>

          {groupRules.length > 0 && (
            <Card style={{ padding: 22 }}>
              <div style={{ fontFamily: S.font, fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Règles du groupe</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {groupRules.map((rule, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: C.navy50, color: C.navy800, fontFamily: S.font, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <span style={{ fontFamily: S.font, fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {adminMembers.length > 0 && (
            <Card style={{ padding: 22 }}>
              <div style={{ fontFamily: S.font, fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: "uppercase", letterSpacing: .6, marginBottom: 14 }}>Administré par</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {adminMembers.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar src={m.image || m.avatarUrl || m.photoUrl || null} name={m.name} initials={m.initials} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: S.font, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{m.name}</div>
                      <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted }}>{m.title}</div>
                    </div>
                    <Badge small color={m.role === "admin" ? C.gold600 : C.navy800}>{m.role === "admin" ? "Admin" : "Modérateur"}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "events" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: S.font, fontSize: 13, color: C.muted }}>{(group.events || []).length} événement{(group.events || []).length > 1 ? "s" : ""} au total</span>
            <button onClick={() => setShowCreateEvent(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: navyGrad, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand }}><Plus size={15} /> Créer un événement</button>
          </div>
          {(group.events || []).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(group.events || []).map(ev => {
                const isRsvpd = rsvpdEvents.includes(ev.id);
                const fillPct = Math.round((ev.attendees / ev.maxAttendees) * 100);
                return (
                  <Card key={ev.id} style={{ padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 14, background: ev.type === "online" ? `${C.navy800}10` : `${C.success}10`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Calendar size={20} style={{ color: ev.type === "online" ? C.navy800 : C.success }} />
                      <span style={{ fontFamily: S.font, fontSize: 10, fontWeight: 600, color: ev.type === "online" ? C.navy800 : C.success, marginTop: 2 }}>{ev.date.slice(5)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontFamily: S.font, fontSize: 15, fontWeight: 700, color: C.ink, margin: "0 0 4px" }}>{ev.title}</h3>
                      <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: S.font, fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {ev.time} · {ev.duration}</span>
                        <span style={{ fontFamily: S.font, fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>{ev.type === "online" ? <Video size={12} /> : <MapPin size={12} />} {ev.location}</span>
                        <span style={{ fontFamily: S.font, fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}><Users size={12} /> {ev.attendees}/{ev.maxAttendees}</span>
                      </div>
                      <p style={{ fontFamily: S.font, fontSize: 13, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>{ev.description}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => toggleRsvp(ev.id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: isRsvpd ? C.success : C.navy800, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>{isRsvpd ? <><Check size={14} /> Inscrit</> : <><UserPlus size={14} /> Participer</>}</button>
                        <div style={{ flex: 1, maxWidth: 200 }}>
                          <div style={{ height: 4, borderRadius: 2, background: C.line }}><div style={{ height: "100%", borderRadius: 2, width: `${fillPct}%`, background: fillPct > 80 ? C.danger : C.success, transition: "width .3s" }} /></div>
                        </div>
                        <span style={{ fontFamily: S.font, fontSize: 12, color: C.mutedLight }}>{fillPct}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="lynora-fade-up" style={{ textAlign: "center", padding: "64px 24px", background: C.white, borderRadius: 20, border: `1px dashed ${C.line}` }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${C.navy800}12, ${C.gold400}18)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <Calendar size={30} style={{ color: C.navy700 }} />
              </div>
              <h3 style={{ fontFamily: S.display, fontSize: 19, fontWeight: 600, color: C.ink, margin: "0 0 6px" }}>Aucun événement</h3>
              <p style={{ fontFamily: S.font, fontSize: 13.5, color: C.muted, margin: "0 0 18px" }}>Organisez une rencontre, un atelier ou une session en ligne pour votre communauté.</p>
              <button onClick={() => setShowCreateEvent(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: navyGrad, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand }}><Plus size={15} /> Créer le premier événement</button>
            </div>
          )}
        </div>
      )}

      {activeTab === "media" && (
        <div>
          {(groupMedia || []).length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, alignItems: "stretch" }}>
              {(groupMedia || []).map((m, index) => {
                const hasUrl = Boolean(m?.url);
                const isVideo = String(m?.type || "").toLowerCase() === "video" || /\.(mp4|webm|mov|m4v|ogg|mp3)$/i.test(m?.url || "");
                return (
                  <button
                    key={m.id || `${m.url || m.name}-${m.uploadedBy || "member"}`}
                    type="button"
                    onClick={() => {
                      if (!hasUrl) {
                        onToast("Média indisponible", "info");
                        return;
                      }
                      setGalleryIndex(index);
                      setGalleryOpen(true);
                    }}
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 14,
                      padding: 0,
                      border: `1px solid ${C.line}`,
                      background: `linear-gradient(135deg, ${C.navy50}, ${C.navy100})`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      justifyContent: "flex-end",
                      overflow: "hidden",
                      cursor: hasUrl ? "pointer" : "default",
                      position: "relative",
                      boxShadow: shadow.xs,
                    }}
                  >
                    {hasUrl ? (
                      isVideo ? (
                        <video src={m.url} playsInline muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#0B1A28" }} />
                      ) : (
                        <img src={m.url} alt={m.name || "Média du groupe"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      )
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Image size={32} style={{ color: C.mutedLight }} />
                        <span style={{ fontFamily: S.font, fontSize: 11, color: C.muted, textAlign: "center", padding: "0 8px" }}>{m.name}</span>
                      </div>
                    )}
                    {isVideo && hasUrl && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(11,26,40,0.64)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
                          <Play size={16} style={{ color: C.white, marginLeft: 2 }} />
                        </div>
                      </div>
                    )}
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "8px 8px 10px", background: "linear-gradient(180deg, rgba(11,26,40,0) 0%, rgba(11,26,40,0.72) 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontFamily: S.font, fontSize: 10, lineHeight: 1.2, color: C.white, maxWidth: "calc(100% - 34px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || (isVideo ? "Vidéo" : "Image")}</span>
                      <Avatar name={m.uploadedBy || "Membre"} initials={m.initials || "M"} size={20} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : <EmptyState icon={Camera} title="Aucun média" subtitle="Les images et vidéos partagées apparaîtront ici" />}
        </div>
      )}

      {activeTab === "files" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: S.font, fontSize: 13, color: C.muted }}>{(group.files || []).length} fichier{(group.files || []).length > 1 ? "s" : ""} partagé{(group.files || []).length > 1 ? "s" : ""}</span>
            <button onClick={() => setShowAddFile(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: navyGrad, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand }}><Upload size={15} /> Ajouter un fichier</button>
          </div>
          {(group.files || []).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(group.files || []).map(f => {
                const fi = FILE_ICONS[f.type] || FILE_ICONS.default;
                return (
                  <Card key={f.id} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${fi.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font, fontSize: 12, fontWeight: 700, color: fi.color }}>{fi.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: S.font, fontSize: 14, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                      <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted, marginTop: 2, display: "flex", gap: 12 }}>{f.size} · {f.downloads} téléchargements · {f.time}</div>
                    </div>
                    <Avatar name={f.uploadedBy} initials={f.initials} src={f.avatarUrl} size={28} />
                    {f.url ? (
                      <button
                        type="button"
                        aria-label={`Télécharger ${f.name}`}
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/groups/${group.id}/files/${encodeURIComponent(f.id)}/download`, { credentials: "include" });
                            if (!response.ok) throw new Error();
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = f.name;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            URL.revokeObjectURL(url);
                            onToast(`Téléchargement de ${f.name}`, "success");
                          } catch {
                            onToast("Le téléchargement du fichier a échoué", "error");
                          }
                        }}
                        style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: C.navy50, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Download size={16} style={{ color: C.navy800 }} />
                      </button>
                    ) : (
                      <button disabled aria-label="Fichier indisponible" style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: C.line, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>
                        <Download size={16} style={{ color: C.muted }} />
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="lynora-fade-up" style={{ textAlign: "center", padding: "64px 24px", background: C.white, borderRadius: 20, border: `1px dashed ${C.line}` }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${C.navy800}12, ${C.gold400}18)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <FileText size={30} style={{ color: C.navy700 }} />
              </div>
              <h3 style={{ fontFamily: S.display, fontSize: 19, fontWeight: 600, color: C.ink, margin: "0 0 6px" }}>Aucun fichier</h3>
              <p style={{ fontFamily: S.font, fontSize: 13.5, color: C.muted, margin: "0 0 18px" }}>Partagez des documents utiles avec les membres du groupe.</p>
              <button onClick={() => setShowAddFile(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: navyGrad, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand }}><Upload size={15} /> Ajouter le premier fichier</button>
            </div>
          )}
        </div>
      )}

      {activeTab === "members" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.mutedLight }} />
              <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Rechercher un membre..." style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: 12, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 14, color: C.ink, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          {visibleMembers.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleMembers.map(m => {
                const roleBadge = m.role === "admin" ? { label: "Admin", color: C.gold600 } : m.role === "moderator" ? { label: "Modérateur", color: C.navy800 } : null;
                const isSelf = m.id === me?.id;
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: `1px solid ${C.line}` }}>
                    <div style={{ position: "relative" }}>
                      <Avatar src={m.image || m.avatarUrl || m.photoUrl || null} name={m.name} initials={m.initials} size={40} />
                      <OnlineDot online={m.online} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: S.font, fontSize: 14, fontWeight: 600, color: C.ink }}>{m.name}</span>
                        {roleBadge && <Badge small color={roleBadge.color}>{roleBadge.label}</Badge>}
                      </div>
                      <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted, marginTop: 2 }}>{m.title} · {m.postsCount} posts</div>
                    </div>
                    {!isSelf && (
                      <button onClick={() => onToast(`Messagerie avec ${m.name} bientôt disponible`, "info")} title={`Envoyer un message à ${m.name}`} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: C.navy50, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><MessageCircle size={16} style={{ color: C.navy800 }} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <EmptyState icon={Search} title="Aucun membre trouvé" subtitle="Essayez un autre nom ou un autre titre" />}
        </div>
      )}
        </div>
        {/* fin contenu principal */}
      </div>
      {/* fin layout sidebar */}
    </div>
  );
};


/* ================================================================== */
/*  GROUP ADMIN PANEL (enriched)                                      */
/* ================================================================== */
const ROLE_LABELS = { admin: "Admin", moderator: "Modérateur", member: "Membre" };

const GroupAdminPanel = ({ group, onBack, onToast, onDeleteGroup, onUpdateGroup }) => {
  const { data: session } = useSession();
  const [adminTab, setAdminTab] = useState("overview");
  const announcements = group.announcements || [];
  const [newAnn, setNewAnn] = useState({ title: "", text: "", priority: "normal" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const localMembers = group.members;
  const [roleMenuFor, setRoleMenuFor] = useState(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: group.name, description: group.description, privacy: group.privacy, postPermission: group.postPermission, joinQuestions: getGroupJoinQuestions(group) });
  const [isWide, setIsWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 860 : true);

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 860);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [joinRequests, setJoinRequests] = useState(() => group.joinRequests || []);
  const [pendingPosts, setPendingPosts] = useState(() => (group.posts || []).filter(post => post.status === "pending_review"));
  const [reports, setReports] = useState(() => (group.posts || []).filter(post => post.reported).map(post => ({
    id: `report_${post.id}`,
    postId: post.id,
    targetAuthor: post.author || "Utilisateur",
    preview: post.text || post.headline || "",
    reason: post.reportReason || "Signalement utilisateur",
    reportedBy: post.reportedBy || "Utilisateur",
    time: post.reportedAt || post.time || "",
    severity: post.reportSeverity || "normal",
  })));

  useEffect(() => {
    setPendingPosts((group.posts || []).filter(post => post.status === "pending_review"));
    setReports((group.posts || []).filter(post => post.reported).map(post => ({
      id: `report_${post.id}`,
      postId: post.id,
      targetAuthor: post.author || "Utilisateur",
      preview: post.text || post.headline || "",
      reason: post.reportReason || "Signalement utilisateur",
      reportedBy: post.reportedBy || "Utilisateur",
      time: post.reportedAt || post.time || "",
      severity: post.reportSeverity || "normal",
    })));
  }, [group.posts]);

  const addAnnouncement = () => {
    if (!newAnn.title.trim()) return;
    const author = session?.user?.name || "Utilisateur";
    const ann = { id: `ann_${Date.now()}`, title: newAnn.title, text: newAnn.text, author, initials: author.split(" ").filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join("") || "U", time: "à l'instant", priority: newAnn.priority };
    onUpdateGroup(group.id, g => ({ ...g, announcements: [ann, ...(g.announcements || [])] }));
    setNewAnn({ title: "", text: "", priority: "normal" });
    onToast("Annonce publiée", "success");
  };

  const removeAnnouncement = (id) => {
    onUpdateGroup(group.id, g => ({ ...g, announcements: (g.announcements || []).filter(a => a.id !== id) }));
    setConfirmDelete(null);
    onToast("Annonce supprimée", "success");
  };

  const decideRequest = async (req, decision) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/join-requests`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: req.id, decision }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible de traiter la demande");
      onUpdateGroup(group.id, g => ({ ...g, members: data.group.members, joinRequests: data.group.joinRequests }), false);
      setJoinRequests(data.group.joinRequests);
      onToast(decision === "approved" ? `${req.name} a rejoint le groupe` : "Demande refusée", decision === "approved" ? "success" : "info");
    } catch (error) {
      onToast(error.message, "error");
    }
  };
  const acceptRequest = (req) => decideRequest(req, "approved");
  const declineRequest = (req) => decideRequest(req, "rejected");

  const notifyPostDecision = async (post, decision) => {
    if (!post?.authorId) return;
    const message = decision === "approved"
      ? `Votre publication a été approuvée dans le groupe ${group.name}.`
      : `Votre publication a été rejetée dans le groupe ${group.name}.`;

    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: post.authorId,
          actor: group.name,
          type: decision === "approved" ? "article" : "warning",
          title: decision === "approved" ? "Publication approuvée" : "Publication rejetée",
          text: message,
          meta: {
            kind: decision === "approved" ? "group_post_approved" : "group_post_rejected",
            groupId: group.id,
            groupName: group.name,
            postId: post.id,
            status: decision === "approved" ? "published" : "rejected",
          },
        }),
      });
    } catch (error) {
      console.error("notifyPostDecision", error);
    }
  };

  const approvePost = async (post) => {
    const nextPost = { ...post, status: "published" };
    onUpdateGroup(group.id, g => ({
      ...g,
      posts: (g.posts || []).map(existing => existing.id === post.id ? nextPost : existing),
    }));
    setPendingPosts(prev => prev.filter(p => p.id !== post.id));
    await notifyPostDecision(post, "approved");
    onToast("Publication approuvée et mise en ligne", "success");
  };
  const rejectPost = async (post) => {
    const nextPost = { ...post, status: "rejected" };
    onUpdateGroup(group.id, g => ({
      ...g,
      posts: (g.posts || []).map(existing => existing.id === post.id ? nextPost : existing),
    }));
    setPendingPosts(prev => prev.filter(p => p.id !== post.id));
    await notifyPostDecision(post, "rejected");
    onToast("Publication rejetée", "info");
  };

  const dismissReport = (id) => {
    const report = reports.find(item => item.id === id);
    if (report?.postId) {
      onUpdateGroup(group.id, g => ({ ...g, posts: g.posts.map(post => post.id === report.postId ? { ...post, reported: false } : post) }));
    }
    setReports(prev => prev.filter(r => r.id !== id));
    onToast("Signalement ignoré", "success");
  };
  const removeReportedContent = (id) => {
    const report = reports.find(r => r.id === id);
    if (report?.postId) {
      onUpdateGroup(group.id, g => ({ ...g, posts: g.posts.filter(p => p.id !== report.postId), postsCount: Math.max(0, (g.postsCount || 1) - 1) }));
    }
    setReports(prev => prev.filter(r => r.id !== id));
    onToast("Contenu supprimé du groupe", "success");
  };

  const changeRole = (memberId, newRole) => {
    onUpdateGroup(group.id, g => ({ ...g, members: g.members.map(m => m.id === memberId ? { ...m, role: newRole } : m) }));
    setRoleMenuFor(null);
    onToast("Rôle mis à jour", "success");
  };
  const removeMember = (id) => {
    onUpdateGroup(group.id, g => ({ ...g, members: g.members.filter(m => m.id !== id) }));
    setConfirmRemoveMember(null);
    onToast("Membre retiré du groupe", "success");
  };

  const saveSettings = () => {
    onUpdateGroup(group.id, g => ({ ...g, name: settingsForm.name.trim() || g.name, description: settingsForm.description, privacy: settingsForm.privacy, postPermission: settingsForm.postPermission, joinQuestions: settingsForm.joinQuestions.filter(question => question.label.trim()).map(question => ({ ...question, label: question.label.trim() })) }));
    onToast("Paramètres enregistrés", "success");
  };

  const confirmDeletion = () => {
    setConfirmDeleteGroup(false);
    onDeleteGroup?.(group.id);
    onToast("Le groupe a été supprimé", "success");
  };

  const topContribs = (group.topContributors || []).map(id => localMembers.find(m => m.id === id)).filter(Boolean);
  const pendingCount = joinRequests.length;
  const roleCounts = { admin: localMembers.filter(m => m.role === "admin").length, moderator: localMembers.filter(m => m.role === "moderator").length, member: localMembers.filter(m => m.role === "member").length };
  const weeklyActivity = Array.from({ length: 7 }, () => 0);
  (group.posts || []).forEach(post => {
    const createdAt = new Date(post.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;
    const daysAgo = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
    if (daysAgo >= 0 && daysAgo < 7) weeklyActivity[6 - daysAgo] += 1;
  });
  const maxWeeklyActivity = Math.max(...weeklyActivity, 1);
  const weeklyActivityPercentages = weeklyActivity.map(count => count ? Math.max(8, Math.round((count / maxWeeklyActivity) * 100)) : 0);

  const analyticsData = [
    { label: "Taux d'engagement", value: `${group.engagementRate}%`, color: group.engagementRate >= 70 ? C.success : C.gold600, icon: Target },
    { label: "Actifs / semaine", value: group.weeklyActive, color: "#3B82F6", icon: Activity },
    { label: "Demandes en attente", value: pendingCount, color: pendingCount > 0 ? C.warn : C.success, icon: UserPlus },
    { label: "Publications à approuver", value: pendingPosts.length, color: pendingPosts.length > 0 ? C.warn : C.success, icon: ListCheck },
    { label: "Signalements actifs", value: reports.length, color: reports.length > 0 ? C.danger : C.success, icon: Flag },
    { label: "Membres", value: localMembers.length, color: C.navy800, icon: Users },
  ];

  const adminTabs = [
    { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
    { id: "requests", label: "Demandes d'adhésion", icon: UserPlus, badge: joinRequests.length },
    { id: "members", label: "Membres", icon: Users },
    { id: "posts", label: "Publications à approuver", icon: ListCheck, badge: pendingPosts.length },
    { id: "reports", label: "Signalements", icon: Flag, badge: reports.length },
    { id: "announcements", label: "Annonces", icon: Megaphone },
    { id: "content", label: "Règles & modération", icon: ShieldCheck },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <div className="lynora-page lynora-group-admin" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 40px", display: "flex", gap: 24, alignItems: "flex-start", flexDirection: isWide ? "row" : "column" }}>
      {/* ============ SIDEBAR GAUCHE ============ */}
      <div style={{ width: isWide ? 256 : "100%", flexShrink: 0, position: isWide ? "sticky" : "static", top: 20 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: C.navy50, fontFamily: S.font, fontSize: 13, fontWeight: 600, color: C.navy800, cursor: "pointer", marginTop: 8, marginBottom: 16 }}><ArrowLeft size={16} /> Retour au groupe</button>

        <Card style={{ padding: 0, marginBottom: 16 }}>
          <div style={{ height: 88, position: "relative", ...getGroupCoverStyle(group) }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,31,23,.04), rgba(14,31,23,.42))" }} />
            <div style={{ position: "absolute", left: 14, bottom: 12, width: 38, height: 38, borderRadius: 11, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, overflow: "hidden", boxShadow: shadow.sm }}>
              {group.avatarUrl ? <img src={group.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : group.emoji}
            </div>
          </div>
          <div style={{ padding: "14px 16px 16px" }}>
            <div style={{ fontFamily: S.font, fontSize: 14, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</div>
            <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>{group.privacy === "public" ? <Globe size={11} /> : <Lock size={11} />} {localMembers.length} membres</div>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: isWide ? "column" : "row", gap: 4, overflowX: isWide ? "visible" : "auto", paddingBottom: isWide ? 0 : 4 }}>
          {adminTabs.map(t => (
            <button key={t.id} onClick={() => { setAdminTab(t.id); setRoleMenuFor(null); }} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12,
              border: "none", background: adminTab === t.id ? C.navy800 : "transparent",
              color: adminTab === t.id ? C.white : C.ink, fontFamily: S.font, fontSize: 13.5,
              fontWeight: adminTab === t.id ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              textAlign: "left", width: isWide ? "100%" : "auto",
            }}>
              <t.icon size={15} style={{ color: adminTab === t.id ? C.white : C.mutedLight, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.label}</span>
              {!!t.badge && (
                <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: adminTab === t.id ? "rgba(255,255,255,.28)" : C.danger, color: C.white, fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============ CONTENU PRINCIPAL ============ */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Crown size={20} style={{ color: C.gold600 }} />
          <h2 style={{ fontFamily: S.font, fontSize: 20, fontWeight: 700, color: C.ink, margin: 0 }}>{adminTabs.find(t => t.id === adminTab)?.label}</h2>
        </div>

        {adminTab === "overview" && (
          <div>
            {(pendingCount > 0 || pendingPosts.length > 0 || reports.length > 0) && (
              <Card style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontFamily: S.font, fontSize: 15, fontWeight: 700, color: C.ink, margin: "0 0 14px" }}>Actions requises</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { show: pendingCount > 0, icon: UserPlus, label: `${pendingCount} demande${pendingCount > 1 ? "s" : ""} d'adhésion`, desc: "En attente de votre validation", color: C.warn, tab: "requests" },
                    { show: pendingPosts.length > 0, icon: ListCheck, label: `${pendingPosts.length} publication${pendingPosts.length > 1 ? "s" : ""} à approuver`, desc: "Postées par des membres, en attente de validation", color: C.warn, tab: "posts" },
                    { show: reports.length > 0, icon: Flag, label: `${reports.length} signalement${reports.length > 1 ? "s" : ""}`, desc: "Contenu signalé par des membres à examiner", color: C.danger, tab: "reports" },
                  ].filter(a => a.show).map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: `${a.color}0F`, gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a.icon size={18} style={{ color: a.color }} />
                        <div>
                          <div style={{ fontFamily: S.font, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{a.label}</div>
                          <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted }}>{a.desc}</div>
                        </div>
                      </div>
                      <button onClick={() => setAdminTab(a.tab)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: a.color, color: C.white, fontFamily: S.font, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Examiner</button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Analytics cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))", gap: 14, marginBottom: 24 }}>
              {analyticsData.map((d, i) => (
                <Card key={i} style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${d.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}><d.icon size={22} style={{ color: d.color }} /></div>
                    <span style={{ fontFamily: S.font, fontSize: 13, color: C.muted }}>{d.label}</span>
                  </div>
                  <div style={{ fontFamily: S.font, fontSize: 28, fontWeight: 800, color: C.ink }}>{d.value}</div>
                </Card>
              ))}
            </div>

            {/* Engagement visualization */}
            <Card style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontFamily: S.font, fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 20px" }}>Engagement hebdomadaire</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                {weeklyActivityPercentages.map((percentage, index) => (
                  <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: "100%", height: `${percentage}%`, borderRadius: 6, background: index === 6 ? C.navy800 : `${C.navy800}30`, minHeight: 8, transition: "height .5s" }} />
                    <span style={{ fontFamily: S.font, fontSize: 10, color: C.mutedLight }}>{["L", "M", "M", "J", "V", "S", "D"][index]}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top contributors */}
            {topContribs.length > 0 && (
              <Card style={{ padding: 24 }}>
                <h3 style={{ fontFamily: S.font, fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}><Award size={18} style={{ color: C.gold600 }} /> Top contributeurs</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {topContribs.map((m, i) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 24, fontFamily: S.font, fontSize: 14, fontWeight: 700, color: i === 0 ? C.gold600 : C.mutedLight }}>#{i + 1}</span>
                      <Avatar name={m.name} initials={m.initials} size={36} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: S.font, fontSize: 14, fontWeight: 600, color: C.ink }}>{m.name}</div>
                        <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted }}>{m.postsCount} posts</div>
                      </div>
                      {i === 0 && <Trophy size={18} style={{ color: C.gold600 }} />}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {adminTab === "requests" && (
          <div>
            {joinRequests.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {joinRequests.map(r => (
                  <Card key={r.id} style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <Avatar name={r.name} initials={r.initials} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: S.font, fontSize: 14, fontWeight: 700, color: C.ink }}>{r.name}</span>
                          <span style={{ fontFamily: S.font, fontSize: 12, color: C.mutedLight }}>· {r.requestedAt}</span>
                        </div>
                        <div style={{ fontFamily: S.font, fontSize: 12.5, color: C.muted, margin: "2px 0 6px" }}>{r.title}</div>
                        {r.mutual > 0 && <div style={{ fontFamily: S.font, fontSize: 11.5, color: C.mutedLight }}>{r.mutual} relation{r.mutual > 1 ? "s" : ""} en commun</div>}
                        {r.answers && <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                          {getGroupJoinQuestions(group).map(question => <div key={question.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontFamily: S.font, fontSize: 11.5, color: C.muted }}><span>{question.label}</span><strong style={{ color: r.answers[question.id] === true ? C.success : C.danger, flexShrink: 0 }}>{r.answers[question.id] === true ? "Oui" : "Non"}</strong></div>)}
                        </div>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => declineRequest(r)} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} style={{ color: C.muted }} /></button>
                        <button onClick={() => acceptRequest(r)} style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: C.success, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={15} style={{ color: C.white }} /></button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon={UserPlus} title="Aucune demande en attente" subtitle="Les nouvelles demandes d'adhésion apparaîtront ici" />
            )}
          </div>
        )}

        {adminTab === "members" && (
          <div>
            {/* Role distribution */}
            <Card style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontFamily: S.font, fontSize: 15, fontWeight: 700, color: C.ink, margin: "0 0 16px" }}>Distribution des rôles</h3>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {Object.entries(roleCounts).map(([role, count]) => (
                  <div key={role} style={{ padding: "12px 20px", borderRadius: 12, background: C.navy50, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontFamily: S.font, fontSize: 20, fontWeight: 800, color: C.ink }}>{count}</div>
                    <div style={{ fontFamily: S.font, fontSize: 13, color: C.muted, textTransform: "capitalize" }}>{role === "moderator" ? "Modérateurs" : role === "admin" ? "Admins" : "Membres"}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pending requests shortcut */}
            {pendingCount > 0 && (
              <Card style={{ padding: 20, marginBottom: 20, borderLeft: `4px solid ${C.warn}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <UserPlus size={20} style={{ color: C.warn }} />
                    <div>
                      <div style={{ fontFamily: S.font, fontSize: 14, fontWeight: 600, color: C.ink }}>{pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente</div>
                      <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted }}>Cliquez pour gérer les demandes d'adhésion</div>
                    </div>
                  </div>
                  <button onClick={() => setAdminTab("requests")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.navy800, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Voir</button>
                </div>
              </Card>
            )}

            {/* Search + role filter */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.mutedLight }} />
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Rechercher un membre..." style={{ width: "100%", padding: "9px 14px 9px 34px", borderRadius: 10, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 13, color: C.ink, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ id: "all", label: "Tous" }, { id: "admin", label: "Admins" }, { id: "moderator", label: "Modérateurs" }, { id: "member", label: "Membres" }].map(r => (
                  <button key={r.id} onClick={() => setRoleFilter(r.id)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: roleFilter === r.id ? C.navy800 : C.navy50, color: roleFilter === r.id ? C.white : C.muted, fontFamily: S.font, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{r.label}</button>
                ))}
              </div>
            </div>

            {/* Members list */}
            {(() => {
              const visibleMembers = localMembers.filter(m =>
                (roleFilter === "all" || m.role === roleFilter) &&
                (!memberSearch.trim() || m.name.toLowerCase().includes(memberSearch.trim().toLowerCase()) || (m.title || "").toLowerCase().includes(memberSearch.trim().toLowerCase()))
              );
              return visibleMembers.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {visibleMembers.map(m => (
                    <Card key={m.id} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, overflow: "visible" }}>
                      <div style={{ position: "relative" }}>
                        <Avatar src={m.image || m.avatarUrl || m.photoUrl || null} name={m.name} initials={m.initials} size={38} />
                        <OnlineDot online={m.online} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: S.font, fontSize: 14, fontWeight: 600, color: C.ink }}>{m.name}</span>
                          <Badge small color={m.role === "admin" ? C.gold600 : m.role === "moderator" ? C.navy800 : C.mutedLight}>{ROLE_LABELS[m.role]}</Badge>
                        </div>
                        <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted }}>{m.title} · {m.joinedAt} · {m.postsCount} posts</div>
                      </div>
                      {m.role !== "admin" && (
                        <div style={{ display: "flex", gap: 4, position: "relative" }}>
                          <div style={{ position: "relative" }}>
                            <button onClick={() => setRoleMenuFor(roleMenuFor === m.id ? null : m.id)} title="Changer le rôle" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.navy50, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Pencil size={14} style={{ color: C.navy800 }} /></button>
                            {roleMenuFor === m.id && (
                              <div style={{ position: "absolute", right: 0, top: 38, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 12px 28px rgba(18,38,24,.16)", padding: 6, zIndex: 30, minWidth: 190 }}>
                                {["admin", "moderator", "member"].filter(role => role !== m.role).map(role => (
                                  <button key={role} onClick={() => changeRole(m.id, role)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", border: "none", background: "transparent", borderRadius: 8, cursor: "pointer", fontFamily: S.font, fontSize: 13, color: C.ink, textAlign: "left" }}>
                                    {role === "admin" ? <Crown size={13} style={{ color: C.gold600 }} /> : role === "moderator" ? <ShieldCheck size={13} style={{ color: C.navy800 }} /> : <Users size={13} style={{ color: C.mutedLight }} />}
                                    Nommer {ROLE_LABELS[role].toLowerCase()}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => setConfirmRemoveMember(m.id)} title="Retirer du groupe" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.danger50, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><UserX size={14} style={{ color: C.danger }} /></button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Search} title="Aucun membre trouvé" subtitle="Modifiez votre recherche ou le filtre de rôle" />
              );
            })()}
          </div>
        )}

        {adminTab === "posts" && (
          <div>
            {pendingPosts.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, min(100%, 340px)))", gap: 14, justifyContent: "flex-start" }}>
                {pendingPosts.map(p => {
                  const meta = POST_TYPES[p.type] || POST_TYPES.discussion;
                  const previewText = p.text || p.headline || p.file?.name || "Publication sans texte";
                  const mediaPreview = Array.isArray(p.media) && p.media.length > 0 ? p.media[0] : Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
                  const postAuthorAvatar = p.avatarUrl || p.image || p.authorAvatar || p.authorImage || null;
                  return (
                    <Card key={p.id} style={{ padding: 0, overflow: "hidden", border: `1px solid ${C.line}`, background: C.white, width: "100%", maxWidth: 340 }}>
                      {mediaPreview && (
                        <div style={{ height: 120, background: "#EAF1F8", position: "relative", overflow: "hidden" }}>
                          {mediaPreview.type?.startsWith("video/") || mediaPreview.mimeType?.startsWith("video/") ? (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(17,24,39,.26), rgba(17,24,39,.52))", color: C.white }}>
                              <Video size={28} />
                            </div>
                          ) : (
                            <img src={mediaPreview.url || mediaPreview.src || mediaPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          )}
                        </div>
                      )}

                      <div style={{ padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <Avatar src={postAuthorAvatar} name={p.author} initials={p.initials} size={32} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: S.font, fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{p.author}</div>
                            <div style={{ fontFamily: S.font, fontSize: 11, color: C.muted }}>{p.authorTitle || "Membre"} · {p.time}</div>
                          </div>
                          <Badge small color={C.warn}>À valider</Badge>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <meta.icon size={12} style={{ color: meta.color }} />
                          <span style={{ fontFamily: S.font, fontSize: 11.5, color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                        </div>

                        <div style={{ fontFamily: S.font, fontSize: 13, lineHeight: 1.5, color: C.ink, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {previewText}
                        </div>

                        {(p.headline || p.file?.name) && (
                          <div style={{ fontFamily: S.font, fontSize: 11.5, color: C.muted, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                            {p.headline ? <span>{p.headline}</span> : <FileText size={12} />}
                            {p.file?.name && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.file.name}</span>}
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                          <button onClick={() => rejectPost(p)} style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontFamily: S.font, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><X size={13} /> Rejeter</button>
                          <button onClick={() => approvePost(p)} style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "none", background: C.success, color: C.white, fontFamily: S.font, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={13} /> Approuver</button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={ListCheck} title="Aucune publication en attente" subtitle="Les publications soumises pour approbation apparaîtront ici" />
            )}
          </div>
        )}

        {adminTab === "reports" && (
          <div>
            {reports.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reports.map(r => (
                  <Card key={r.id} style={{ padding: 18, borderLeft: `4px solid ${r.severity === "high" ? C.danger : C.warn}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Flag size={15} style={{ color: r.severity === "high" ? C.danger : C.warn }} />
                        <span style={{ fontFamily: S.font, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{r.reason}</span>
                        <Badge small color={r.severity === "high" ? C.danger : C.warn}>{r.severity === "high" ? "Priorité haute" : "Priorité normale"}</Badge>
                      </div>
                      <span style={{ fontFamily: S.font, fontSize: 11.5, color: C.mutedLight }}>{r.time}</span>
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: C.navy50, marginBottom: 10 }}>
                      <div style={{ fontFamily: S.font, fontSize: 12, color: C.muted, marginBottom: 4 }}>Publication de <strong style={{ color: C.ink }}>{r.targetAuthor}</strong></div>
                      <div style={{ fontFamily: S.font, fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{r.preview}</div>
                    </div>
                    <div style={{ fontFamily: S.font, fontSize: 12, color: C.mutedLight, marginBottom: 14 }}>Signalé par {r.reportedBy}</div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button onClick={() => dismissReport(r.id)} style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${C.line}`, background: C.white, color: C.muted, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ignorer</button>
                      <button onClick={() => removeReportedContent(r.id)} style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: C.danger, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Trash2 size={13} /> Supprimer le contenu</button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon={ShieldCheck} title="Aucun signalement" subtitle="Tout est calme, aucun contenu signalé à examiner" />
            )}
          </div>
        )}

        {adminTab === "announcements" && (
          <div>
            {/* Create announcement */}
            <Card style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontFamily: S.font, fontSize: 15, fontWeight: 700, color: C.ink, margin: "0 0 16px" }}>Nouvelle annonce</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input value={newAnn.title} onChange={e => setNewAnn(p => ({ ...p, title: e.target.value }))} placeholder="Titre de l'annonce" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 14, color: C.ink, outline: "none", boxSizing: "border-box" }} />
                <textarea value={newAnn.text} onChange={e => setNewAnn(p => ({ ...p, text: e.target.value }))} placeholder="Contenu de l'annonce..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 14, color: C.ink, outline: "none", minHeight: 80, resize: "vertical", boxSizing: "border-box" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setNewAnn(p => ({ ...p, priority: p.priority === "high" ? "normal" : "high" }))} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${newAnn.priority === "high" ? C.warn : C.line}`, background: newAnn.priority === "high" ? C.warn50 : C.white, fontFamily: S.font, fontSize: 12, fontWeight: 600, color: newAnn.priority === "high" ? C.warn : C.muted, cursor: "pointer" }}><AlertTriangle size={12} /> Prioritaire</button>
                  </div>
                  <button onClick={addAnnouncement} disabled={!newAnn.title.trim()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: newAnn.title.trim() ? C.navy800 : C.mutedLight, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: newAnn.title.trim() ? "pointer" : "not-allowed" }}>Publier</button>
                </div>
              </div>
            </Card>

            {/* Existing announcements */}
            {announcements.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {announcements.map(ann => (
                  <Card key={ann.id} style={{ padding: 16, borderLeft: `4px solid ${ann.priority === "high" ? C.warn : C.navy800}` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {ann.priority === "high" && <AlertTriangle size={14} style={{ color: C.warn }} />}
                          <span style={{ fontFamily: S.font, fontSize: 14, fontWeight: 700, color: C.ink }}>{ann.title}</span>
                        </div>
                        <p style={{ fontFamily: S.font, fontSize: 13, color: C.muted, margin: "0 0 6px", lineHeight: 1.5 }}>{ann.text}</p>
                        <span style={{ fontFamily: S.font, fontSize: 11, color: C.mutedLight }}>{ann.author} · {ann.time}</span>
                      </div>
                      <button onClick={() => setConfirmDelete(ann.id)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.danger50, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Trash2 size={14} style={{ color: C.danger }} /></button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : <EmptyState icon={Megaphone} title="Aucune annonce" subtitle="Créez la première annonce pour votre groupe" />}

            <ConfirmModal open={!!confirmDelete} title="Supprimer l'annonce" text="Cette action est irréversible. Voulez-vous continuer ?" onConfirm={() => removeAnnouncement(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
          </div>
        )}

        {adminTab === "content" && (
          <div>
            <Card style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontFamily: S.font, fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 8px" }}>File de modération</h3>
              <p style={{ fontFamily: S.font, fontSize: 13, color: C.muted, margin: "0 0 20px", lineHeight: 1.5 }}>Les publications signalées apparaissent dans l'onglet "Signalements" et les publications en attente dans "Publications à approuver".</p>
              {reports.length === 0 && pendingPosts.length === 0 ? (
                <div style={{ padding: 32, borderRadius: 14, background: C.navy50, textAlign: "center" }}>
                  <CheckCircle2 size={40} style={{ color: C.success, marginBottom: 12 }} />
                  <h4 style={{ fontFamily: S.font, fontSize: 15, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>Tout est en ordre</h4>
                  <p style={{ fontFamily: S.font, fontSize: 13, color: C.muted, margin: 0 }}>Aucun contenu en attente de modération</p>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {reports.length > 0 && <button onClick={() => setAdminTab("reports")} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: C.danger, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{reports.length} signalement{reports.length > 1 ? "s" : ""} à traiter</button>}
                  {pendingPosts.length > 0 && <button onClick={() => setAdminTab("posts")} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: C.warn, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{pendingPosts.length} publication{pendingPosts.length > 1 ? "s" : ""} à approuver</button>}
                </div>
              )}
            </Card>

            {/* Group rules */}
            <Card style={{ padding: 24 }}>
              <h3 style={{ fontFamily: S.font, fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={18} style={{ color: C.navy800 }} /> Règles du groupe</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(group.rules || []).map((rule, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: C.navy50 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: C.navy800, color: C.white, fontFamily: S.font, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontFamily: S.font, fontSize: 14, color: C.ink }}>{rule}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {adminTab === "settings" && (
          <div>
            <Card style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontFamily: S.font, fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 16px" }}>Informations générales</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Nom du groupe</label>
                  <input value={settingsForm.name} onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 14, color: C.ink, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Description</label>
                  <textarea value={settingsForm.description} onChange={e => setSettingsForm(p => ({ ...p, description: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 14, color: C.ink, outline: "none", minHeight: 80, resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Confidentialité</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ id: "public", label: "Public", icon: Globe }, { id: "private", label: "Privé", icon: Lock }].map(opt => (
                      <button key={opt.id} onClick={() => setSettingsForm(p => ({ ...p, privacy: opt.id }))} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${settingsForm.privacy === opt.id ? C.navy800 : C.line}`, background: settingsForm.privacy === opt.id ? C.navy50 : C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, color: settingsForm.privacy === opt.id ? C.navy800 : C.muted, cursor: "pointer" }}><opt.icon size={14} /> {opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Qui peut publier</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {POST_PERMISSIONS.map(opt => (
                      <button key={opt.id} onClick={() => setSettingsForm(p => ({ ...p, postPermission: opt.id }))} style={{ flex: 1, minWidth: 180, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${settingsForm.postPermission === opt.id ? C.navy800 : C.line}`, background: settingsForm.postPermission === opt.id ? C.navy50 : C.white, fontFamily: S.font, fontSize: 13, fontWeight: 600, color: settingsForm.postPermission === opt.id ? C.navy800 : C.muted, cursor: "pointer", textAlign: "left" }}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Questions d'adhésion FAQ</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {settingsForm.joinQuestions.map((question, index) => (
                      <div key={question.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input value={question.label} onChange={event => setSettingsForm(current => ({ ...current, joinQuestions: current.joinQuestions.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} placeholder="Écrivez une question" maxLength={180} style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontFamily: S.font, fontSize: 13, color: C.ink, outline: "none" }} />
                        <button type="button" onClick={() => setSettingsForm(current => ({ ...current, joinQuestions: current.joinQuestions.filter((_, itemIndex) => itemIndex !== index) }))} aria-label="Supprimer cette question" style={{ width: 34, height: 34, flexShrink: 0, border: "none", borderRadius: 8, background: C.danger50, color: C.danger, cursor: "pointer" }}><X size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setSettingsForm(current => ({ ...current, joinQuestions: [...current.joinQuestions, { id: `question_${Date.now()}`, label: "" }] }))} style={{ alignSelf: "flex-start", padding: "8px 12px", borderRadius: 9, border: `1px dashed ${C.navy700}`, background: "transparent", color: C.navy800, fontFamily: S.font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}><Plus size={13} /> Ajouter une question</button>
                  </div>
                  <div style={{ marginTop: 5, fontFamily: S.font, fontSize: 11.5, color: C.mutedLight }}>Les candidats répondront uniquement par Oui ou Non.</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={saveSettings} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.navy800, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Enregistrer les modifications</button>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 24, border: `1px solid ${C.danger}30` }}>
              <h3 style={{ fontFamily: S.font, fontSize: 16, fontWeight: 700, color: C.danger, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={17} /> Zone de danger</h3>
              <p style={{ fontFamily: S.font, fontSize: 13, color: C.muted, margin: "0 0 16px", lineHeight: 1.6 }}>La suppression du groupe est définitive. Tous les membres, publications, fichiers et annonces seront perdus. Cette action ne peut pas être annulée.</p>
              <button onClick={() => setConfirmDeleteGroup(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, border: "none", background: C.danger, color: C.white, fontFamily: S.font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Trash2 size={14} /> Supprimer définitivement ce groupe</button>
            </Card>
          </div>
        )}
      </div>

      <ConfirmModal open={confirmDeleteGroup} title="Supprimer le groupe" text={`Cette action est définitive : "${group.name}" et tout son contenu (publications, membres, fichiers) seront supprimés. Cette action est irréversible.`} onConfirm={confirmDeletion} onCancel={() => setConfirmDeleteGroup(false)} />
      <ConfirmModal open={!!confirmRemoveMember} title="Retirer ce membre" text="Ce membre perdra l'accès au groupe immédiatement. Voulez-vous continuer ?" onConfirm={() => removeMember(confirmRemoveMember)} onCancel={() => setConfirmRemoveMember(null)} />
    </div>
  );
};


/* ================================================================== */
/*  MAIN EXPORT: Groupe                                               */
/* ================================================================== */
export default function Groupe({ onBack, initialGroupId = null, onPostCreated }) {
  const { data: session, status } = useSession();
  const groupScrollRef = useRef(null);
  const [view, setView] = useState(() => initialGroupId ? "detail" : "grid");
  const [groupTab, setGroupTab] = useState("mine");
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);

  const loadGroups = useCallback(async () => {
    if (!session?.user?.id) {
      setGroups([]);
      setLoadingGroups(false);
      return;
    }

    try {
      setLoadingGroups(true);
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Erreur lors du chargement des groupes");
      const data = await res.json();
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch (error) {
      console.error("loadGroups", error);
      setGroups([]);
      showToast("Impossible de charger les groupes", "error");
    } finally {
      setLoadingGroups(false);
    }
  }, [session?.user?.id, showToast]);

  useEffect(() => {
    if (status === "loading") return;
    loadGroups();
  }, [status, loadGroups]);

  useEffect(() => {
    if (!initialGroupId || !groups.some((group) => String(group.id) === String(initialGroupId))) return;
    setSelectedGroupId(initialGroupId);
    setView("detail");
  }, [initialGroupId, groups]);

  useEffect(() => {
    groupScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  // Le groupe sélectionné est toujours dérivé de la liste à jour : toute
  // modification (posts, membres, paramètres...) reste visible en revenant
  // sur le détail ou le panneau admin, au lieu de retomber sur un instantané figé.
  const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId) || null, [groups, selectedGroupId]);
  const visibleGridGroups = useMemo(() => groups.filter((group) => {
    const isOwner = group.ownerId === session?.user?.id;
    const isMember = isOwner || (group.members || []).some((member) => member?.id === session?.user?.id || member === session?.user?.id);
    return groupTab === "mine" ? isMember : !isMember;
  }), [groups, groupTab, session?.user?.id]);
  const myGroupCount = groups.filter((group) => group.ownerId === session?.user?.id || (group.members || []).some((member) => member?.id === session?.user?.id || member === session?.user?.id)).length;
  const discoverGroupCount = groups.filter((group) => group.ownerId !== session?.user?.id && !(group.members || []).some((member) => member?.id === session?.user?.id || member === session?.user?.id)).length;

  // Point d'écriture unique pour toute mutation d'un groupe (posts, membres,
  // annonces, paramètres...). updater peut être un objet (merge partiel) ou
  // une fonction (group) => group pour les mutations qui dépendent de l'état actuel.
  const updateGroup = useCallback(async (groupId, updater, persist = true) => {
    const currentGroup = groups.find(g => g.id === groupId);
    if (!currentGroup) return;

    const nextGroup = typeof updater === "function" ? updater(currentGroup) : { ...currentGroup, ...updater };
    setGroups(prev => prev.map(g => g.id !== groupId ? g : nextGroup));
    if (!persist) return;

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextGroup),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "La mise à jour du groupe a échoué");
      }
    } catch (error) {
      console.error("updateGroup", error);
      setGroups(prev => prev.map(g => g.id !== groupId ? g : currentGroup));
      showToast("La modification du groupe n’a pas été enregistrée", "error");
    }
  }, [groups, showToast]);

  const handleSelectGroup = useCallback((g) => { setSelectedGroupId(g.id); setView("detail"); }, []);
  const handleBack = useCallback(() => { setView("grid"); setSelectedGroupId(null); }, []);
  const handleAdmin = useCallback(() => setView("admin"), []);
  const handleAdminBack = useCallback(() => setView("detail"), []);

  const toggleFavorite = useCallback((groupId) => {
    setFavorites(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  }, []);

  const handleCreateGroup = useCallback(async (g) => {
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(g),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur lors de la création du groupe");
      setGroups(prev => [data.group, ...prev]);
      showToast("Groupe créé avec succès !");
    } catch (error) {
      console.error("handleCreateGroup", error);
      showToast(error.message || "Impossible de créer le groupe", "error");
    }
  }, [showToast]);

  const handleDeleteGroup = useCallback(async (groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression du groupe");
      setGroups(prev => prev.filter(g => g.id !== groupId));
      setSelectedGroupId(null);
      setView("grid");
      showToast("Groupe supprimé", "success");
    } catch (error) {
      console.error("handleDeleteGroup", error);
      showToast(error.message || "Suppression impossible", "error");
    }
  }, [showToast]);

  // Rejoindre un groupe suggéré : persiste l'adhésion avant de confirmer
  // l'action à l'utilisateur.
  const handleJoinGroup = useCallback(async (groupId) => {
    const currentUser = session?.user;
    const group = groups.find((item) => item.id === groupId);
    if (!currentUser?.id || !group) return;

    const member = {
      id: currentUser.id,
      name: currentUser.name || "Vous",
      initials: (currentUser.name || "Vous").split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "VO",
      image: currentUser.image || null,
      avatarUrl: currentUser.image || null,
      photoUrl: currentUser.image || null,
      online: true,
      role: "member",
      title: "Vous",
      joinedAt: "à l'instant",
      postsCount: 0,
    };
    const previousGroups = groups;

    setGroups(prev => prev.map(item => item.id !== groupId || (item.members || []).some(existing => existing.id === currentUser.id)
      ? item
      : { ...item, members: [...(item.members || []), member] }));

    try {
      const response = await fetch(`/api/groups/${groupId}/join`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Impossible de rejoindre le groupe");
      setDismissedSuggestions(prev => [...prev, groupId]);
      showToast(`Vous avez rejoint ${group.name}`, "success");
    } catch (error) {
      console.error("handleJoinGroup", error);
      setGroups(previousGroups);
      showToast(error.message || "Impossible de rejoindre le groupe", "error");
    }
  }, [groups, session?.user, showToast]);

  const handleDismissSuggestion = useCallback((groupId) => {
    setDismissedSuggestions(prev => [...prev, groupId]);
  }, []);

  return (
    <div ref={groupScrollRef} className="lynora-groupes" style={{ minHeight: "100vh", background: `radial-gradient(circle at 8% 0%, ${C.navy700}10, transparent 34%), radial-gradient(circle at 92% 4%, ${C.gold400}14, transparent 30%), linear-gradient(180deg, #FAF8F1 0%, #F1EEE1 100%)`, fontFamily: S.font }}>
      <FontImports />
      {view === "grid" && (
        <>
          {status === "loading" || loadingGroups ? (
            <GroupsGridSkeleton count={6} />
          ) : !session?.user?.id ? (
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px", fontFamily: S.font, color: C.muted, textAlign: "center", minHeight: "60vh" }}>
              Veuillez vous connecter pour voir les groupes.
            </div>
          ) : (
            <div className="lynora-page lynora-groups-index" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px 60px" }}>
              {/* Bandeau d'en-tête */}
              <div className="lynora-fade-up lynora-hero" style={{ position: "relative", borderRadius: 24, padding: "34px 32px", marginBottom: 32, overflow: "hidden", background: navyGrad, boxShadow: shadow.lg }}>
                <div style={{ position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,192,105,.25), transparent 70%)" }} />
                <div style={{ position: "absolute", bottom: -80, left: "30%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.06), transparent 70%)" }} />
                <div className="lynora-hero-row" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", marginBottom: 14 }}>
                      <Sparkles size={12} style={{ color: C.gold400 }} />
                      <span style={{ fontFamily: S.font, fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,.9)", letterSpacing: .3 }}>Espace communautaire</span>
                    </div>
                    <h1 className="lynora-hero-title" style={{ fontFamily: S.display, fontSize: 34, fontWeight: 700, color: C.white, margin: 0, letterSpacing: "-0.01em" }}>Vos groupes</h1>
                    <p style={{ fontFamily: S.font, fontSize: 14, color: "rgba(255,255,255,.72)", margin: "8px 0 0", maxWidth: 460, lineHeight: 1.5 }}>
                      Retrouvez vos communautés, échangez avec vos membres et suivez l'activité en un coup d'œil.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="lynora-cta-primary lynora-hero-cta"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.98)", color: C.navy900, fontFamily: S.font, fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 26px rgba(0,0,0,.18)" }}
                  >
                    <Plus size={16} /> Créer un groupe
                  </button>
                </div>
              </div>

              <div className="lynora-groups-tabs" role="tablist" aria-label="Filtrer les groupes">
                <button type="button" role="tab" aria-selected={groupTab === "mine"} className={groupTab === "mine" ? "is-active" : ""} onClick={() => setGroupTab("mine")}>
                  Mes groupes <span>{myGroupCount}</span>
                </button>
                <button type="button" role="tab" aria-selected={groupTab === "discover"} className={groupTab === "discover" ? "is-active" : ""} onClick={() => setGroupTab("discover")}>
                  Découvrir <span>{discoverGroupCount}</span>
                </button>
              </div>

              {visibleGridGroups.length === 0 ? (
                <EmptyState icon={Users} title="Aucun groupe pour l'instant" subtitle="Créez votre premier groupe pour commencer !" />
              ) : (
                <div className="lynora-groups-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 22 }}>
                  {visibleGridGroups.map((group, idx) => {
                    const isMember = (group.members || []).some(m => m.id === session?.user?.id);
                    const cat = CATEGORIES.find(c => c.id === group.category);
                    const memberCount = (group.members || []).length;
                    const previewMembers = (group.members || []).slice(0, 4);
                    return (
                      <Card
                        key={group.id}
                        onClick={() => handleSelectGroup(group)}
                        className="lynora-group-card"
                        style={{ cursor: "pointer", display: "flex", flexDirection: "column", animation: `lynoraFadeUp .45s cubic-bezier(.2,.8,.2,1) both`, animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                      >
                        {/* Couverture — sans icône centrale */}
                        <div style={{ ...getGroupCoverStyle(group), height: 108, position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,31,23,.05) 0%, rgba(14,31,23,.05) 55%, rgba(14,31,23,.4) 100%)" }} />

                          <div className="lynora-cover-privacy-badge" style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 8px", borderRadius: 20, background: "rgba(15,26,18,.38)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.2)" }}>
                            {group.privacy === "private" ? <Lock size={11} style={{ color: C.white }} /> : <Globe size={11} style={{ color: C.white }} />}
                            <span style={{ fontFamily: S.font, fontSize: 10.5, fontWeight: 600, color: C.white }}>{group.privacy === "private" ? "Privé" : "Public"}</span>
                          </div>

                          {isMember && (
                            <div className="lynora-cover-member-badge" style={{ position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,.94)", fontFamily: S.font, fontSize: 10.5, fontWeight: 700, color: C.navy800, display: "flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle2 size={10} /> Membre
                            </div>
                          )}

                          {group.ownerId === session?.user?.id && (
                            <div className="lynora-cover-owner-badge" style={{ position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,.94)", fontFamily: S.font, fontSize: 10.5, fontWeight: 700, color: C.gold600, display: "flex", alignItems: "center", gap: 4 }}>
                              <Crown size={10} /> Admin
                            </div>
                          )}

                          {cat && (
                            <div className="lynora-cover-category-badge" style={{ position: "absolute", bottom: 12, left: 12, padding: "4px 11px", borderRadius: 20, background: "rgba(255,255,255,.92)", fontFamily: S.font, fontSize: 10.5, fontWeight: 700, color: cat.color, letterSpacing: "-0.01em" }}>
                              {cat.label}
                            </div>
                          )}
                        </div>

                        {/* Corps */}
                        <div className="lynora-group-card-body" style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                          <div className="lynora-group-card-title-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                            <h3 style={{ fontFamily: S.font, fontSize: 15.5, fontWeight: 700, color: C.ink, margin: "0 0 6px", letterSpacing: "-0.01em", lineHeight: 1.3, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</h3>
                          </div>
                          <p style={{ fontFamily: S.font, fontSize: 12.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 36 }}>{group.description || "Sans description"}</p>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <div style={{ display: "flex" }}>
                                {previewMembers.length > 0 ? previewMembers.map((m, i) => (
                                  <div key={m.id} style={{ width: 22, height: 22, borderRadius: "50%", background: getAvatarColor(m.name), border: `2px solid ${C.white}`, marginLeft: i === 0 ? 0 : -8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.font, fontSize: 8.5, fontWeight: 700, color: C.white, boxShadow: shadow.xs }}>
                                    {(m.initials || m.name || "?").slice(0, 2).toUpperCase()}
                                  </div>
                                )) : <Users size={13} style={{ color: C.navy700 }} />}
                              </div>
                              <span style={{ fontFamily: S.font, fontSize: 12, color: C.muted, fontWeight: 500 }}>{memberCount} membre{memberCount > 1 ? "s" : ""}</span>
                            </div>
                            {typeof group.postsCount === "number" && (
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <MessageSquare size={12} style={{ color: C.mutedLight }} />
                                <span style={{ fontFamily: S.font, fontSize: 12, color: C.muted, fontWeight: 500 }}>{group.postsCount}</span>
                              </div>
                            )}
                          </div>

                          {!isMember && (
                            <button onClick={(e) => { e.stopPropagation(); group.privacy === "private" ? handleSelectGroup(group) : handleJoinGroup(group.id); }} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "none", background: navyGrad, color: C.white, fontFamily: S.font, fontSize: 11.5, fontWeight: 700, cursor: "pointer", boxShadow: shadow.sm }}>{group.privacy === "private" ? "Voir et demander à rejoindre" : "Rejoindre le groupe"}</button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {view === "detail" && (selectedGroup ? (
        <GroupDetail group={selectedGroup} currentUserId={session?.user?.id} onBack={handleBack} onAdmin={handleAdmin} onToast={showToast} onUpdateGroup={updateGroup} onPostCreated={onPostCreated} />
      ) : (
        <GroupDetailSkeleton />
      ))}
      {view === "admin" && selectedGroup && (
        <GroupAdminPanel group={selectedGroup} onBack={handleAdminBack} onToast={showToast} onDeleteGroup={handleDeleteGroup} onUpdateGroup={updateGroup} />
      )}
      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreateGroup} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function GroupTriggerDivider() {
  return <div style={{ width: 1, background: C.line, margin: "6px 0", alignSelf: "stretch" }} />;
}
