import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX,
  Play, Pause, MoreHorizontal, Music2, Plus, Check, ChevronUp, ChevronDown, X, Send,
  Link2, Download, Flag, Trash2, UserMinus, EyeOff, Pencil, Image as ImageIcon,
  ThumbsUp, Smile, ListFilter,
} from "lucide-react";

import ReactionPicker, { DEFAULT_REACTIONS } from "@/components/ReactionPicker";
import Emojipicker from "@/components/Emojipicker";
import RelativeTime from "@/components/RelativeTime";
import EnterpriseBadge from "@/components/EnterpriseBadge";
import PremiumBadge from "@/components/PremiumBadge";
import ProfileHoverPreview from "@/components/ProfileHoverPreview";
import { ShareModal } from "@/components/PostViewerPreview";
import { CommentSkeleton } from "@/components/Skeleton";
import { normalizeReelPayload } from "@/lib/reels";
import { backendApiUrl, fetchBackendApi } from "@/lib/backend-api";

const getReactionImagePath = (reactionKey) => {
  if (!reactionKey || typeof reactionKey !== 'string') return null;
  const reaction = DEFAULT_REACTIONS.find((r) => r.key === reactionKey);
  if (reaction && reaction.src && typeof reaction.src === 'string') {
    return reaction.src;
  }
  return null;
};

/* ---------------------------------------------------------------
   Design tokens — shared navy / gold system
----------------------------------------------------------------*/
const C = {
  ink: "#1C1E21",
  inkSoft: "#65676B",
  inkFaint: "#8A8D91",
  surface: "#F4F6FB",
  card: "#FFFFFF",
  border: "#E4E6EB",
  navy: "#0F1E42",
  navyMid: "#1D2F5C",
  navyDeep: "#0A1530",
  navyLight: "#E7EDFB",
  navySoft: "#F0F3FA",
  navyGlow: "#2A4278",
  gold: "#F0B429",
  goldBright: "#FFCB4D",
  goldDeep: "#B9781A",
  goldLight: "#FFF8EB",
  goldSoft: "#FEF3D8",
  red: "#E5484D",
  navyGradSolid: "linear-gradient(135deg, #1D2F5C 0%, #0A1530 100%)",
  goldGrad: "linear-gradient(135deg, #FFCB4D 0%, #B9781A 100%)",
};

/* ---------------------------------------------------------------
   Tokens section commentaires — alignés sur PostViewerPreview
----------------------------------------------------------------*/
const LINKEDIN_BLUE = "#0a66c2";
const LI_BORDER = "var(--app-border)";
const LI_INPUT_BORDER = "var(--app-border)";
const LI_HOVER = "var(--app-input)";
const LI_TEXT = "var(--app-text)";
const LI_SECONDARY = "var(--app-muted)";
const LI_DIVIDER = "var(--app-border)";

const LC = {
  navy900: "#0F3352", navy800: "#1B5386", navy700: "#2C6BA0",
  navy100: "var(--app-border)", navy50: "var(--app-bg)",
  gold400: "#F6D374", gold600: "#D9A536",
  ink: "var(--app-text)", muted: "var(--app-muted)", mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)", white: "var(--app-surface)",
  danger: "#C24444", danger50: "#FBEDED", success: "#2E9E5B",
};
const commentNavyGrad = `linear-gradient(160deg, ${LC.navy800} 0%, ${LC.navy900} 100%)`;

/* Réactions de commentaires — identiques à PostViewerPreview */
const REACTIONS = [
  { key: "ok", label: "J'aime", src: "/emoji_picker/j'aime.png", icon: ThumbsUp, color: LC.white },
  { key: "love", label: "Love", src: "/emoji_picker/love.png", icon: ThumbsUp, color: "#C24444" },
  { key: "triste", label: "Triste", src: "/emoji_picker/triste.png", icon: ThumbsUp, color: LC.muted },
  { key: "hahaha", label: "Hahaha", src: "/emoji_picker/hahaha.png", icon: ThumbsUp, color: LC.gold600 },
  { key: "colere", label: "Colère", src: "/emoji_picker/colere.png", icon: ThumbsUp, color: "#C24444" },
  { key: "waouh", label: "Waouh", src: "/emoji_picker/waouh.png", icon: ThumbsUp, color: "#C97A2E" },
];
const REACTION_KEY_ALIASES = { like: "ok", j_aime: "ok", "j'aime": "ok" };
function normalizeReactionKey(key) { return REACTION_KEY_ALIASES[String(key || "").trim().toLowerCase()] || String(key || "").trim().toLowerCase(); }
const reactionByKey = (key) => REACTIONS.find((r) => r.key === normalizeReactionKey(key));
const LIKE_REACTION = REACTIONS[0];

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + "k";
  return String(num);
}

function filterHiddenComments(comments = [], hiddenIds = []) {
  return comments
    .filter((comment) => !hiddenIds.includes(String(comment.id)))
    .map((comment) => ({ ...comment, replies: filterHiddenComments(comment.replies || [], hiddenIds) }));
}

function countComments(comments = []) { return comments.reduce((total, comment) => total + 1 + countComments(comment.replies || []), 0); }

function findCommentById(comments = [], commentId) {
  for (const comment of comments) {
    if (String(comment.id) === String(commentId)) return comment;
    if (comment.replies?.length) {
      const found = findCommentById(comment.replies, commentId);
      if (found) return found;
    }
  }
  return null;
}

function appendReplyById(comments = [], parentId, reply) {
  for (const comment of comments) {
    if (String(comment.id) === String(parentId)) {
      comment.replies = [...(comment.replies || []), reply];
      return true;
    }
    if (comment.replies?.length && appendReplyById(comment.replies, parentId, reply)) return true;
  }
  return false;
}

// Fallback vide - les reels doivent être chargés depuis l'API
const FALLBACK_REELS = [];

/* ---------------------------------------------------------------
   Small building blocks
----------------------------------------------------------------*/
const Avatar = React.memo(function Avatar({ name, src, size = 44, ring = true }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg, ${C.navyMid}, ${C.navyDeep})`,
        overflow: "hidden",
        border: ring ? `2px solid ${C.gold}` : "2px solid rgba(255,255,255,.7)",
        boxShadow: "0 4px 12px rgba(0,0,0,.35)",
      }}
    >
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "#fff", fontWeight: 800, fontSize: size * 0.36 }}>{initials}</span>}
    </div>
  );
});

const ActionButton = React.memo(function ActionButton({ icon: Icon, label, active, activeColor = C.red, onClick, filled = false, reactionImage = null, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="reel-action-btn"
      {...props}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        background: "none", border: "none", cursor: "pointer", padding: 0,
        color: "#fff", fontFamily: FONT,
      }}
    >
      <span
        style={{
          width: 44, height: 44, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(10,21,48,.45)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,.14)",
          transition: "transform .15s ease, background .15s ease",
          position: "relative",
          overflow: "visible",
        }}
      >
        {reactionImage && reactionImage.length > 0 ? (
          <img 
            src={reactionImage} 
            alt="reaction" 
            style={{ 
              width: 26, 
              height: 26, 
              objectFit: "contain",
              display: "block",
            }} 
          />
        ) : (
          <Icon
            size={21}
            style={{ color: active ? activeColor : "#fff" }}
            fill={active && filled ? activeColor : "none"}
            strokeWidth={2}
          />
        )}
      </span>
      {label !== undefined && (
        <span className="reel-action-count" style={{ minWidth: 44, maxWidth: 72, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, lineHeight: 1.2, textAlign: "center", textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>{label}</span>
      )}
    </button>
  );
});

/* ---------------------------------------------------------------
   Primitives commentaires — alignées sur PostViewerPreview
----------------------------------------------------------------*/
function CommentAvatar({ initials, size = 44, imgUrl = null, gradient = commentNavyGrad }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: imgUrl ? LC.navy100 : gradient, color: LC.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, fontFamily: "'Sora', sans-serif", flexShrink: 0, overflow: "hidden" }}>
      {imgUrl ? <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initials}
    </div>
  );
}

function ReactionIcon({ reaction = LIKE_REACTION, selected = false, size = 22 }) {
  return (
    <span style={{ width: size + 10, height: size + 10, borderRadius: "50%", border: selected ? `2px solid ${LC.gold600}` : `1px solid ${LC.line}`, background: selected ? "rgba(217,165,54,0.18)" : "#F8FBFF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <img src={reaction.src} alt={reaction.label} style={{ width: size, height: size, objectFit: "contain", borderRadius: 6 }} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  COMMENT ITEM — structure & UI identiques à PostViewerPreview      */
/* ------------------------------------------------------------------ */
function ReelCommentItem({ comment, currentUser, onToggleLike, onReply, onStartReply, onToggleCommentReaction, onReportComment, onHideComment, onEditComment, onDeleteComment, reelId, postAuthorId, depth = 0 }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [localReaction, setLocalReaction] = useState(comment.reaction || null);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");
  const [displayText, setDisplayText] = useState(comment.text || "");
  const reactionBtnRef = useRef(null);
  const reactionCloseTimer = useRef(null);
  const commentLongPressTimer = useRef(null);
  const commentLongPressFired = useRef(false);
  const submitReply = () => { if (!replyText.trim()) return; onReply(comment.id, replyText.trim()); setReplyText(""); setReplying(false); };
  const cInitials = comment.initials || (comment.author || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const commentAuthorId = comment.authorId || comment.userId || comment.author?.id;
  const isReelAuthorComment = Boolean(postAuthorId && commentAuthorId && String(commentAuthorId) === String(postAuthorId));

  // Close reaction picker when clicking outside
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClick = (e) => {
      if (reactionBtnRef.current && !reactionBtnRef.current.contains(e.target)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showReactionPicker]);

  const handleCommentTouchStart = () => {
    commentLongPressFired.current = false;
    commentLongPressTimer.current = window.setTimeout(() => {
      commentLongPressFired.current = true;
      setShowReactionPicker(true);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 380);
  };
  const handleCommentTouchEnd = (event) => {
    clearTimeout(commentLongPressTimer.current);
    if (commentLongPressFired.current) event.preventDefault();
  };

  const handleReactionSelect = async (reactionKey) => {
    const newReaction = localReaction === reactionKey ? null : reactionKey;
    setLocalReaction(newReaction);
    setShowReactionPicker(false);

    // Call API to save reaction
    if (onToggleCommentReaction) {
      try {
        await onToggleCommentReaction(reelId, comment.id, newReaction);
      } catch (error) {
        console.error("Erreur lors de la réaction au commentaire:", error);
        // Revert on error
        setLocalReaction(localReaction);
      }
    }
  };
  const scheduleReactionClose = () => {
    clearTimeout(reactionCloseTimer.current);
    reactionCloseTimer.current = window.setTimeout(() => setShowReactionPicker(false), 180);
  };
  const keepReactionPickerOpen = () => clearTimeout(reactionCloseTimer.current);

  useEffect(() => {
    setLocalReaction(comment.reaction || null);
  }, [comment.reaction]);

  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        {commentAuthorId ? (
          <ProfileHoverPreview type={comment.authorType === "page" ? "page" : "person"} fallback={{ id: comment.authorType === "page" ? (comment.companyPageId || commentAuthorId) : commentAuthorId, name: comment.author, avatarUrl: comment.avatarUrl, coverUrl: comment.coverUrl, bio: comment.description, location: comment.location }}>
            <Link href={comment.authorType === "page" ? `/feed?view=company&pageId=${encodeURIComponent(comment.companyPageId || commentAuthorId)}` : `/feed?view=profile&userId=${encodeURIComponent(commentAuthorId)}`} aria-label={`Voir ${comment.authorType === "page" ? "la page" : "le profil"} de ${comment.author}`} style={{ display: "inline-flex", flexShrink: 0 }}>
              <CommentAvatar initials={cInitials} imgUrl={comment.avatarUrl} size={depth > 0 ? 32 : 40} />
            </Link>
          </ProfileHoverPreview>
        ) : <CommentAvatar initials={cInitials} imgUrl={comment.avatarUrl} size={depth > 0 ? 32 : 40} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {commentAuthorId ? <ProfileHoverPreview type={comment.authorType === "page" ? "page" : "person"} fallback={{ id: comment.authorType === "page" ? (comment.companyPageId || commentAuthorId) : commentAuthorId, name: comment.author, avatarUrl: comment.avatarUrl, coverUrl: comment.coverUrl, bio: comment.description, location: comment.location }}><Link href={comment.authorType === "page" ? `/feed?view=company&pageId=${encodeURIComponent(comment.companyPageId || commentAuthorId)}` : `/feed?view=profile&userId=${encodeURIComponent(commentAuthorId)}`} style={{ fontWeight: 700, fontSize: 14, color: LI_TEXT, textDecoration: "none" }}>{comment.author}</Link></ProfileHoverPreview> : <span style={{ fontWeight: 700, fontSize: 14, color: LI_TEXT }}>{comment.author}</span>}
            {isReelAuthorComment && <span title="Auteur du reel" style={{ color: LINKEDIN_BLUE, background: "#E8F3FF", border: "1px solid #B9D9F5", borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>Auteur</span>}
            {comment.isPlatformAdmin && <EnterpriseBadge size={13} label="Administrateur officiel LynoraLink" />}
            {!comment.isPlatformAdmin && comment.isPremium && <PremiumBadge size={13} />}
            {comment.connectionBadge && (
              <span style={{ fontSize: 12, color: LI_SECONDARY }}>&middot; {comment.connectionBadge}</span>
            )}
            <span style={{ fontSize: 12, color: LI_SECONDARY, marginLeft: "auto", flexShrink: 0 }}>
              <RelativeTime date={comment.time || comment.createdAt} />
            </span>
          </div>
          {/* Headline */}
          {comment.headline && (
            <div style={{ fontSize: 12, color: LI_SECONDARY, marginTop: 1, lineHeight: 1.4 }}>{comment.headline}</div>
          )}
          {/* Body */}
          {isEditing ? (
            <div style={{ marginTop: 6 }}>
              <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={3} style={{ width: "100%", padding: 8, border: `1px solid ${LI_INPUT_BORDER}`, borderRadius: 8, resize: "vertical", font: "inherit" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button type="button" onClick={async () => { if (editText.trim()) { try { await onEditComment?.(comment.id, editText.trim()); setDisplayText(editText.trim()); setIsEditing(false); } catch (error) { console.error("Erreur lors de la modification du commentaire:", error); } } }} style={{ border: "none", borderRadius: 6, padding: "5px 10px", background: LC.navy800, color: LC.white, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Enregistrer</button>
                <button type="button" onClick={() => { setEditText(comment.text || ""); setIsEditing(false); }} style={{ border: "none", borderRadius: 6, padding: "5px 10px", background: LC.navy50, color: LI_SECONDARY, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: LI_TEXT, lineHeight: 1.55, marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{displayText}</div>
          )}
          {Array.isArray(comment.media) && comment.media.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {comment.media.map((item, index) => item?.url ? (
                item.type === "video"
                  ? <video key={index} src={item.url} controls style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
                  : <img key={index} src={item.url} alt={item.label || "Média du commentaire"} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
              ) : null)}
            </div>
          )}
          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
            {/* Reaction button with picker */}
            <div
              style={{ position: "relative" }}
              ref={reactionBtnRef}
              onMouseEnter={() => setShowReactionPicker(true)}
              onMouseLeave={scheduleReactionClose}
              onTouchStart={handleCommentTouchStart}
              onTouchEnd={handleCommentTouchEnd}
              onTouchCancel={handleCommentTouchEnd}
            >
              <button
                onClick={() => handleReactionSelect("ok")}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: localReaction ? LC.gold600 : LI_SECONDARY, padding: "4px 0" }}
              >
                {localReaction ? <ReactionIcon reaction={reactionByKey(localReaction) || LIKE_REACTION} selected size={13} /> : <ThumbsUp size={13} />}
                J'aime
              </button>
              {showReactionPicker && (
                <div onMouseEnter={keepReactionPickerOpen} onMouseLeave={scheduleReactionClose} style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 6, zIndex: 20 }}>
                  <ReactionPicker
                    selectedKey={localReaction}
                    onSelect={handleReactionSelect}
                  />
                </div>
              )}
            </div>
            {/* Total reactions count */}
            {(comment.totalReactions || 0) > 0 && (
              <span style={{ fontSize: 12, color: LI_SECONDARY, display: "inline-flex", alignItems: "center", gap: 2 }}>
                {comment.reactionKeys?.map((key) => reactionByKey(key)).filter(Boolean).map((item) => <ReactionIcon key={item.key} reaction={item} size={11} />)}
                <span>&middot; {comment.totalReactions}</span>
              </span>
            )}
            <button onClick={() => { setReplying(false); onStartReply?.(comment); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: LI_SECONDARY, padding: "4px 0 4px 8px" }}>Répondre</button>
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button type="button" onClick={() => setShowMenu((value) => !value)} aria-label="Options du commentaire" aria-expanded={showMenu} style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", color: LI_SECONDARY, cursor: "pointer", padding: 4 }}><MoreHorizontal size={15} /></button>
              {showMenu && (
                <div className="reel-comment-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onReportComment?.(comment.id); }}><Flag size={14} /> Signaler</button>
                  <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onHideComment?.(comment.id); }}><EyeOff size={14} /> Masquer</button>
                  {(comment.isOwn || String(commentAuthorId) === String(currentUser?.id)) && <button type="button" role="menuitem" onClick={() => { setShowMenu(false); setIsEditing(true); }}><Pencil size={14} /> Modifier</button>}
                  {(comment.isOwn || String(commentAuthorId) === String(currentUser?.id)) && <button type="button" role="menuitem" onClick={() => { setShowMenu(false); onDeleteComment?.(comment.id); }} className="reel-comment-menu-danger"><Trash2 size={14} /> Supprimer</button>}
                </div>
              )}
            </div>
          </div>
          {/* Reply input */}
          {replying && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitReply()} placeholder="Écrire une réponse..." style={{ flex: 1, padding: "8px 14px", borderRadius: 20, border: `1px solid ${LI_INPUT_BORDER}`, outline: "none", fontSize: 13 }} />
              <button onClick={submitReply} disabled={!replyText.trim()} style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: replyText.trim() ? LINKEDIN_BLUE : LI_BORDER, color: replyText.trim() ? LC.white : LI_SECONDARY, fontWeight: 600, fontSize: 12.5, cursor: replyText.trim() ? "pointer" : "default" }}>Envoyer</button>
            </div>
          )}
        </div>
      </div>
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <button
          type="button"
          onClick={() => setShowReplies((value) => !value)}
          aria-expanded={showReplies}
          style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, marginLeft: 50, padding: "4px 0", background: "none", border: "none", color: LI_SECONDARY, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showReplies ? "Masquer les réponses" : `Afficher les ${comment.replies.length} réponse${comment.replies.length > 1 ? "s" : ""}`}
        </button>
      )}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: 8, marginLeft: 50, display: "flex", flexDirection: "column" }}>
          {comment.replies.map((r) => <ReelCommentItem key={r.id} comment={r} currentUser={currentUser} onToggleLike={onToggleLike} onReply={onReply} onStartReply={onStartReply} onToggleCommentReaction={onToggleCommentReaction} onReportComment={onReportComment} onHideComment={onHideComment} onEditComment={onEditComment} onDeleteComment={onDeleteComment} reelId={reelId} postAuthorId={postAuthorId} depth={depth + 1} />)}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------
   Single reel slide
----------------------------------------------------------------*/
const ReelSlide = React.memo(function ReelSlide({ reel, active, nearby, muted, commentsOpen, onToggleMute, onOpenComments, onToggleLike, onToggleSave, onShare, onOpenAuthor, onReelDeleted, session }) {
  const videoRef = useRef(null);
  const router = useRouter();
  const [playing, setPlaying] = useState(true);
  const [liked, setLiked] = useState(Boolean(reel.liked));
  const [saved, setSaved] = useState(Boolean(reel.saved));
  const [selectedReaction, setSelectedReaction] = useState(reel.reaction || (reel.liked ? "ok" : null));
  const [reactionCounts, setReactionCounts] = useState({});
  const [totalReactionCount, setTotalReactionCount] = useState(0);
  const [localComments, setLocalComments] = useState(Number(reel.comments ?? reel.commentCount ?? 0));
  const [following, setFollowing] = useState(reel.following);
  const [showHeart, setShowHeart] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const reactionHoverTimerRef = useRef(null);
  const reactionWrapRef = useRef(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
  const topMenuRef = useRef(null);
  const railMenuRef = useRef(null);
  const isPageAuthor = Boolean(
    reel?.author?.type === "page"
    || reel?.author?.type === "company"
    || reel?.author?.accountType === "company"
    || reel?.author?.pageId
    || reel?.author?.companyPageId
    || reel?.author?.isPage
  );
  const authorId = reel?.author?.id || reel?.author?.userId || reel?.author?.profileId || null;
  const isOwnReel = Boolean(session?.user?.id && authorId && String(session.user.id) === String(authorId));

  useEffect(() => {
    setLocalComments(Number(reel.comments ?? reel.commentCount ?? 0));
  }, [reel.comments, reel.commentCount]);

  const clearReactionHoverTimer = useCallback(() => {
    if (reactionHoverTimerRef.current) {
      clearTimeout(reactionHoverTimerRef.current);
      reactionHoverTimerRef.current = null;
    }
  }, []);

  const openReactionPicker = useCallback(() => {
    clearReactionHoverTimer();
    reactionHoverTimerRef.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 120);
  }, [clearReactionHoverTimer]);

  const closeReactionPicker = useCallback(() => {
    clearReactionHoverTimer();
    reactionHoverTimerRef.current = setTimeout(() => {
      setShowReactionPicker(false);
    }, 180);
  }, [clearReactionHoverTimer]);

  useEffect(() => {
    if (!showReactionPicker || typeof window === "undefined" || window.innerWidth < 768) return undefined;
    const updatePosition = () => {
      const bounds = reactionWrapRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setReactionPickerPosition({ left: bounds.left + bounds.width / 2, top: bounds.top - 10 });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      setReactionPickerPosition(null);
    };
  }, [showReactionPicker]);

  // Ferme le menu "options" (3 points) au clic extérieur ou avec Échap.
  // On surveille les deux emplacements possibles du bouton (desktop en haut,
  // mobile dans le rail) car un seul des deux est visible à la fois selon le CSS.
  useEffect(() => {
    if (!showOptionsMenu) return undefined;
    const handlePointerDown = (event) => {
      const inTop = topMenuRef.current && topMenuRef.current.contains(event.target);
      const inRail = railMenuRef.current && railMenuRef.current.contains(event.target);
      if (!inTop && !inRail) setShowOptionsMenu(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setShowOptionsMenu(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showOptionsMenu]);

  // Referme le menu si on change de reel (scroll vers un autre slide)
  useEffect(() => {
    setShowOptionsMenu(false);
  }, [reel?.id]);

  // Reset caption expand state when switching reels
  useEffect(() => {
    setCaptionExpanded(false);
  }, [reel?.id]);

  const handleCopyReelLink = useCallback(async () => {
    const shareUrl = typeof window !== "undefined"
      ? `${window.location.origin}/feed?reel=${encodeURIComponent(reel?.id || "")}`
      : `reel:${reel?.id || ""}`;
    try {
      if (navigator?.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.warn("Impossible de copier le lien du reel:", error);
    }
    setLinkCopied(true);
    setTimeout(() => {
      setLinkCopied(false);
      setShowOptionsMenu(false);
    }, 1200);
  }, [reel?.id]);

  const handleDownloadReel = useCallback(() => {
    const url = reel?.videoUrl || reel?.poster;
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `reel-${reel?.id || "video"}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setShowOptionsMenu(false);
  }, [reel]);

  const handleReportReel = useCallback(async () => {
    try {
      if (reel?.id) {
        const response = await fetchBackendApi("/api/admin/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "reel",
            targetId: String(reel.id),
            targetLabel: reel.caption || `Reel ${reel.id}`,
            reason: "inappropriate_content",
          }),
        });
        if (!response.ok) throw new Error("Le signalement a échoué");
      }
    } catch (error) {
      console.warn("Erreur lors du signalement du reel:", error);
    }
    setReportSent(true);
    setTimeout(() => {
      setReportSent(false);
      setShowOptionsMenu(false);
    }, 1200);
  }, [reel?.id]);

  const handleToggleFollowFromMenu = useCallback(async () => {
    const author = reel?.author || {};
    const targetPageId = author.pageId || author.companyPageId || author.companyId || null;
    const targetUserId = author.id || author.userId || author.profileId || null;
    if (!targetPageId && !targetUserId) return;

    try {
      const response = targetPageId
        ? await fetch(backendApiUrl("/api/company/follow"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: targetPageId }),
        })
        : await fetchBackendApi("/api/connections", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId, action: following ? "remove" : "invite" }),
        });

      if (!response.ok) throw new Error("Le suivi a échoué");
      const data = await response.json().catch(() => ({}));
      setFollowing(targetPageId ? Boolean(data.followed) : !following);
    } catch (error) {
      console.warn("Erreur lors du suivi du reel:", error);
    }
    setShowOptionsMenu(false);
  }, [following, reel]);

  const handleDeleteReel = useCallback(async () => {
    if (typeof window !== "undefined" && !window.confirm("Supprimer définitivement ce reel ?")) return;
    setShowOptionsMenu(false);
    try {
      if (reel?.id) {
        const response = await fetch(backendApiUrl(`/api/reels/${reel.id}`), {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) throw new Error("La suppression a échoué");
        onReelDeleted?.(reel.id);
      }
    } catch (error) {
      console.warn("Erreur lors de la suppression du reel:", error);
    }
  }, [onReelDeleted, reel?.id]);

  useEffect(() => {
    setLiked(Boolean(reel.liked));
    setSaved(Boolean(reel.saved));
    setLocalComments(Number(reel.comments || 0));
    setMediaFailed(false);
    // Reset reaction states when reel changes
    setSelectedReaction(null);
    setReactionCounts({});
    // Initialize total with reel's likes count
    setTotalReactionCount(Number(reel.likes || 0));
  }, [reel]);

  useEffect(() => () => clearReactionHoverTimer(), [clearReactionHoverTimer]);

  // Load saved reaction and counts from backend
  useEffect(() => {
    const loadReactionData = async () => {
      if (typeof reel?.id === "string" && reel.id.startsWith("fallback-")) {
        setSelectedReaction(null);
        setLiked(false);
        setReactionCounts({});
        setTotalReactionCount(Number(reel.likes || 0));
        return;
      }

      try {
        const response = await fetch(backendApiUrl(`/api/reels/${reel.id}/reaction`), { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          
          if (data.userReaction) {
            setSelectedReaction(data.userReaction);
            setLiked(true);
          } else {
            setSelectedReaction(null);
            setLiked(false);
          }
          
          if (data.reactionCounts) {
            setReactionCounts(data.reactionCounts);
            const newReactionsCount = data.totalCount || 0;
            setTotalReactionCount(newReactionsCount);
          }
        }
      } catch (error) {
        console.error("Failed to load reaction data:", error);
      }
    };
    
    if (active && reel?.id) {
      loadReactionData();
    }
  }, [reel.id, active, reel.likes]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) {
      el.currentTime = 0;
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [active]);

  // Pause playback while the comments panel is open for this reel, resume when it closes
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !active) return;
    if (commentsOpen) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => {});
      setPlaying(true);
    }
  }, [commentsOpen, active]);

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  };

  const togglePlay = () => {
    if (commentsOpen) return;
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  const handleDoubleTap = async () => {
    if (!reel?.id || !session?.user?.id) return;
    if (typeof reel.id === "string" && reel.id.startsWith("fallback-")) return;

    if (!selectedReaction) {
      try {
        // If no reaction yet, set to "ok"
        setSelectedReaction("ok");
        setLiked(true);
        setShowHeart(true);

        const response = await fetch(backendApiUrl(`/api/reels/${reel.id}/reaction`), {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction: "ok" }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.reactionCounts && data.totalCount !== undefined) {
            setReactionCounts(data.reactionCounts);
            setTotalReactionCount(data.totalCount);
            onToggleLike?.(reel.id, true, data.totalCount);
          }
        } else {
          console.error("Failed to save reaction");
          setSelectedReaction(null);
        }
      } catch (error) {
        console.error("Error saving reaction:", error);
        setSelectedReaction(null);
      }
    }
    window.setTimeout(() => setShowHeart(false), 700);
  };

  const handleLikeToggle = async () => {
    if (!reel?.id || !session?.user?.id) return;
    if (typeof reel.id === "string" && reel.id.startsWith("fallback-")) return;

    try {
      if (selectedReaction) {
        // Remove reaction
        setSelectedReaction(null);
        setLiked(false);

        const response = await fetch(backendApiUrl(`/api/reels/${reel.id}/reaction`), {
          credentials: "include",
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.reactionCounts && data.totalCount !== undefined) {
            setReactionCounts(data.reactionCounts);
            setTotalReactionCount(data.totalCount);
            onToggleLike?.(reel.id, false, data.totalCount);
          }
        } else {
          console.error("Failed to remove reaction");
          setSelectedReaction(selectedReaction); // Revert optimistic update
        }
      } else {
        // Add "ok" reaction
        setSelectedReaction("ok");
        setLiked(true);

        const response = await fetch(backendApiUrl(`/api/reels/${reel.id}/reaction`), {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction: "ok" }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.reactionCounts && data.totalCount !== undefined) {
            setReactionCounts(data.reactionCounts);
            setTotalReactionCount(data.totalCount);
            onToggleLike?.(reel.id, true, data.totalCount);
          }
        } else {
          console.error("Failed to add reaction");
          setSelectedReaction(null); // Revert optimistic update
        }
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleReactionSelect = async (key) => {
    if (!reel?.id || !session?.user?.id) return;
    if (typeof reel.id === "string" && reel.id.startsWith("fallback-")) return;

    try {
      setLiked(true);
      setSelectedReaction(key);

      const response = await fetch(backendApiUrl(`/api/reels/${reel.id}/reaction`), {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: key }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reactionCounts && data.totalCount !== undefined) {
          setReactionCounts(data.reactionCounts);
          // Total = reel.likes + backend reactions
          setTotalReactionCount(data.totalCount);
        }
      } else {
        console.error("Failed to record reaction");
        setSelectedReaction(null);
      }
      
      setShowReactionPicker(false);
    } catch (error) {
      console.error("Error recording reaction:", error);
      setSelectedReaction(null);
    }
  };

  const handleSaveToggle = async () => {
    if (!reel?.id || !session?.user?.id) return;
    if (typeof reel.id === "string" && reel.id.startsWith("fallback-")) return;

    const nextSaved = !saved;
    setSaved(nextSaved);
    onToggleSave?.(reel.id, nextSaved);
    try {
      const response = await fetch(backendApiUrl(`/api/reels/${reel.id}/save`), { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Impossible d'enregistrer le reel");
      const data = await response.json();
      setSaved(Boolean(data.saved));
      onToggleSave?.(reel.id, Boolean(data.saved));
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du reel:", error);
      setSaved(!nextSaved);
      onToggleSave?.(reel.id, !nextSaved);
    }
  };

  const handleCommentOpen = () => {
    onOpenComments?.(reel);
  };

  const handleOpenAuthor = () => {
    if (typeof onOpenAuthor === "function") {
      onOpenAuthor(reel.author);
      return;
    }

    const author = reel?.author || {};
    const authorId = author.id || author.userId || author.profileId || null;
    const targetPageId = author.pageId || author.companyPageId || author.companyId || null;
    const isPage = author.type === "page" || author.type === "company" || Boolean(targetPageId);

    if (isPage && targetPageId) {
      router.push(`/feed?view=company&pageId=${encodeURIComponent(targetPageId)}`);
      return;
    }

    if (authorId) {
      router.push(`/feed?view=profile&userId=${encodeURIComponent(authorId)}`);
    }
  };

  const [g1, g2] = reel.tone || [C.navyMid, C.navyDeep];
  const hasMedia = Boolean(reel?.videoUrl || reel?.poster);

  const captionText = reel.caption || "";
  const CAPTION_LIMIT = 120;
  const captionIsLong = captionText.length > CAPTION_LIMIT;
  const captionPreview = captionIsLong
    ? captionText.slice(0, CAPTION_LIMIT).replace(/\s+\S*$/, "").trimEnd()
    : captionText;
  const handleToggleCaption = useCallback(() => setCaptionExpanded((v) => !v), []);

  if (!hasMedia) {
    return null;
  }

  const slideBackground = `linear-gradient(160deg, ${g1}, ${g2})`;
  const videoSrc = typeof reel?.videoUrl === "string" && reel.videoUrl.trim() ? reel.videoUrl : null;
  const playbackSrc = videoSrc
    ? `${videoSrc}${videoSrc.includes("?") ? "&" : "?"}lynora_reel=${encodeURIComponent(reel.updatedAt || reel.id || "1")}`
    : null;

  useEffect(() => {
    setMediaLoading(Boolean(videoSrc && nearby));
  }, [videoSrc, nearby]);
  const authorName = reel?.author?.name || "cet auteur";

  const optionsMenuContent = (
    <div className="reel-options-menu" role="menu" onClick={(e) => e.stopPropagation()}>
      <button type="button" role="menuitem" className="reel-options-item" onClick={handleCopyReelLink}>
        <Link2 size={16} />
        <span>{linkCopied ? "Lien copié !" : "Copier le lien"}</span>
      </button>

      {(reel?.videoUrl || reel?.poster) && (
        <button type="button" role="menuitem" className="reel-options-item" onClick={handleDownloadReel}>
          <Download size={16} />
          <span>Télécharger</span>
        </button>
      )}

      {!isOwnReel && (
        <button type="button" role="menuitem" className="reel-options-item" onClick={handleToggleFollowFromMenu}>
          {following ? <UserMinus size={16} /> : <Plus size={16} />}
          <span>{following ? `Ne plus suivre ${authorName}` : `Suivre ${authorName}`}</span>
        </button>
      )}

      {!isOwnReel && (
        <button type="button" role="menuitem" className="reel-options-item reel-options-item--danger" onClick={handleReportReel}>
          <Flag size={16} />
          <span>{reportSent ? "Signalé ✓" : "Signaler ce reel"}</span>
        </button>
      )}

      {isOwnReel && (
        <button type="button" role="menuitem" className="reel-options-item reel-options-item--danger" onClick={handleDeleteReel}>
          <Trash2 size={16} />
          <span>Supprimer le reel</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="reel-slide" style={{ background: slideBackground }}>
      {/* Blurred backdrop fill — keeps the frame full without ever cropping the media itself.
          No poster? We just keep the tone gradient already set on .reel-slide instead of
          decoding a second copy of the video just for a blurred background. */}
      {reel.poster && (
        <div
          className="reel-media-backdrop"
          style={{ backgroundImage: `url(${reel.poster})` }}
          aria-hidden="true"
        />
      )}

      {playbackSrc && !mediaFailed && nearby ? (
        <video
          key={playbackSrc}
          ref={videoRef}
          src={playbackSrc}
          poster={reel.poster || undefined}
          className="reel-video"
          muted={muted}
          loop
          playsInline
          autoPlay={active}
          // Only the active slide needs to be fully buffered; the immediate
          // neighbour just needs enough to start instantly once it becomes
          // active, like Facebook's own reels player. Slides further away
          // never mount a <video> element at all (see `nearby` below).
          preload={active ? "auto" : "metadata"}
          onLoadedData={() => setMediaLoading(false)}
          onCanPlay={() => setMediaLoading(false)}
          onPlaying={() => setMediaLoading(false)}
          onWaiting={() => setMediaLoading(true)}
          onStalled={() => setMediaLoading(true)}
          onError={() => { setMediaLoading(false); setMediaFailed(true); }}
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
        />
      ) : (
        <img
          src={reel.poster || videoSrc}
          alt={reel.caption || "Image du reel"}
          className="reel-video"
          loading={active ? "eager" : "lazy"}
        />
      )}

      {videoSrc && !mediaFailed && nearby && mediaLoading && (
        <div className="reel-media-loading" role="status" aria-label="Chargement de la vidéo">
          <span className="reel-media-spinner" />
        </div>
      )}

      {/* Tap zones for like (double tap) */}
      <div className="reel-tap-layer" onDoubleClick={handleDoubleTap} onClick={togglePlay} />

      {/* Top-right controls */}
      <div className="reel-top-controls">
        <button
          type="button"
          onClick={togglePlay}
          className="reel-icon-chip"
          aria-label={playing ? "Mettre en pause" : "Reprendre la lecture"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} fill="#fff" style={{ marginLeft: 1 }} />}
        </button>
        <button type="button" onClick={onToggleMute} className="reel-icon-chip" aria-label={muted ? "Activer le son" : "Couper le son"}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <div className="reel-more-wrap reel-more-wrap--top" ref={topMenuRef}>
          <button
            type="button"
            onClick={() => setShowOptionsMenu((v) => !v)}
            className="reel-icon-chip"
            aria-haspopup="menu"
            aria-expanded={showOptionsMenu}
            aria-label="Plus d'options"
          >
            <MoreHorizontal size={16} />
          </button>
          {showOptionsMenu && optionsMenuContent}
        </div>
      </div>

      {/* Center play/pause indicator */}
      {!playing && (
        <button type="button" onClick={togglePlay} className="reel-center-play" aria-label="Lecture">
          <Play size={30} fill="#fff" style={{ marginLeft: 3 }} />
        </button>
      )}

      {/* Floating double-tap heart */}
      {showHeart && (
        <Heart size={92} className="reel-burst-heart" fill={C.red} style={{ color: C.red }} />
      )}

      {/* Bottom gradient + info */}
      <div className="reel-bottom-scrim" />

      <div className="reel-bottom-content">
        <div className="reel-info">
          <div className="reel-author-row">
            <button
              type="button"
              onClick={handleOpenAuthor}
              className="reel-author-avatar-btn"
              aria-label={`${isPageAuthor ? "Voir la page" : "Voir le profil"} de ${reel.author.name || "l'auteur"}`}
            >
              <Avatar name={reel.author.name} src={reel.author.avatar} size={36} ring={false} />
            </button>
            <button
              type="button"
              onClick={handleOpenAuthor}
              aria-label={`${isPageAuthor ? "Voir la page" : "Voir le profil"} de ${reel.author.name || "l'auteur"}`}
              title={`${isPageAuthor ? "Voir la page" : "Voir le profil"} de ${reel.author.name || "l'auteur"}`}
              className="reel-author-btn"
            >
              <span className="reel-author-name">
                {reel.author.name}
                {reel.author.verified && (
                  <span className="reel-verified-badge">
                    <Check size={9} style={{ color: C.gold, strokeWidth: 3 }} />
                  </span>
                )}
              </span>
            </button>
            {isPageAuthor && (!following ? (
              <button type="button" onClick={() => setFollowing(true)} className="reel-follow-btn">
                <Plus size={13} /> Suivre
              </button>
            ) : (
              <span className="reel-following-pill"><Check size={12} /> Suivi</span>
            ))}
          </div>
          <p className={`reel-caption${captionExpanded ? " reel-caption--expanded" : ""}`}>
            {captionExpanded ? captionText : captionPreview}
            {captionIsLong && (
              <button
                type="button"
                onClick={handleToggleCaption}
                className="reel-caption-toggle"
                aria-expanded={captionExpanded}
              >
                {captionExpanded ? "...voir moins" : "...voir plus"}
              </button>
            )}
          </p>
          <div className="reel-sound-row">
            <Music2 size={13} />
            <span className="reel-sound-marquee">{reel.sound}</span>
          </div>
        </div>

        <div className="reel-actions-rail">
          <div
            className="reel-reaction-wrap"
            ref={reactionWrapRef}
            onTouchStart={() => setShowReactionPicker((v) => !v)}
            onTouchEnd={() => setTimeout(() => setShowReactionPicker(false), 220)}
          >
            <ActionButton
              icon={Heart}
              label={formatCount(totalReactionCount)}
              active={liked}
              filled
              reactionImage={selectedReaction ? getReactionImagePath(selectedReaction) : null}
              onClick={handleLikeToggle}
              onMouseEnter={openReactionPicker}
              onMouseLeave={closeReactionPicker}
              onFocus={openReactionPicker}
              onBlur={closeReactionPicker}
            />
            {showReactionPicker && (
              typeof document !== "undefined" && window.innerWidth >= 768 && reactionPickerPosition
                ? createPortal(
                    <div
                      className="reel-reaction-picker reel-reaction-picker--portal"
                      onMouseEnter={() => clearReactionHoverTimer() || setShowReactionPicker(true)}
                      onMouseLeave={closeReactionPicker}
                      onClick={(event) => event.stopPropagation()}
                      style={{ left: reactionPickerPosition.left, top: reactionPickerPosition.top }}
                    >
                      <ReactionPicker selectedKey={selectedReaction} onSelect={handleReactionSelect} size={42} imgSize={28} />
                    </div>,
                    document.body
                  )
                : <div
                    className="reel-reaction-picker"
                    onMouseEnter={() => clearReactionHoverTimer() || setShowReactionPicker(true)}
                    onMouseLeave={closeReactionPicker}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ReactionPicker selectedKey={selectedReaction} onSelect={handleReactionSelect} size={42} imgSize={28} />
                  </div>
            )}
          </div>
          <ActionButton icon={MessageCircle} label={formatCount(localComments)} onClick={handleCommentOpen} />
          <ActionButton icon={Share2} label={formatCount(reel.shares || 0)} onClick={() => onShare?.(reel)} />
          <ActionButton icon={Bookmark} active={saved} activeColor={C.gold} filled onClick={handleSaveToggle} />
          <div className="reel-more-wrap reel-more-wrap--rail" ref={railMenuRef}>
            <ActionButton
              icon={MoreHorizontal}
              onClick={() => setShowOptionsMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showOptionsMenu}
              aria-label="Plus d'options"
            />
            {showOptionsMenu && optionsMenuContent}
          </div>

        </div>
      </div>

      {/* Progress bar at BOTTOM (Facebook style) */}
      <div className="reel-progress-track reel-progress-track--bottom">
        <div className="reel-progress-fill" style={{ width: `${progress}%`, background: C.goldGrad }} />
      </div>
    </div>
  );
});

/* ---------------------------------------------------------------
   Main Reel feed component
----------------------------------------------------------------*/
export default function Reel({ reels: reelsProp, onClose, onOpenComments, onOpenProfile, onOpenCompanyPage, fetchUrl = "/api/reels" }) {
  const { data: session } = useSession();
  const [reels, setReels] = useState(Array.isArray(reelsProp) ? reelsProp : FALLBACK_REELS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(!Array.isArray(reelsProp));
  const [error, setError] = useState(null);
  const [commentSheet, setCommentSheet] = useState(null);
  const [shareReel, setShareReel] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentThreads, setCommentThreads] = useState({});
  const [hiddenCommentIds, setHiddenCommentIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const containerRef = useRef(null);
  const slideRefs = useRef([]);
  const swipeStartRef = useRef(null);
  const fileInputRef = useRef(null);
  const commentInputRef = useRef(null);
  const commentFetchesRef = useRef(new Map());
  const replySubmittingRef = useRef(new Set());
  useEffect(() => {
    if (Array.isArray(reelsProp)) {
      setReels(reelsProp.map((reel, index) => normalizeReelPayload(reel, index)));
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const loadReels = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchBackendApi(fetchUrl, { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !Array.isArray(json.reels)) {
          throw new Error(json?.error || "Impossible de charger les reels");
        }
        const nextReels = json.reels.map((reel, index) => normalizeReelPayload(reel, index));
        if (!cancelled) {
          setReels(nextReels.length ? nextReels : FALLBACK_REELS);
        }
      } catch (err) {
        console.error("Failed to fetch reels:", err);
        if (!cancelled) {
          setReels(FALLBACK_REELS);
          setError("Impossible de charger les reels. Affichage des contenus de secours.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReels();
    return () => { cancelled = true; };
  }, [fetchUrl, reelsProp]);

  const scrollToIndex = useCallback((index) => {
    const clamped = Math.max(0, Math.min(reels.length - 1, index));
    slideRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reels.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number(entry.target.dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: [0.6] }
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [reels.length]);

  const handleWheel = useCallback((e) => {
    // Desktop stage: translate wheel gestures into next/prev slide
    if (Math.abs(e.deltaY) < 24) return;
    if (e.deltaY > 0) scrollToIndex(activeIndex + 1);
    else scrollToIndex(activeIndex - 1);
  }, [activeIndex, scrollToIndex]);

  const handleSwipeStart = useCallback((event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest?.("button, a, input, textarea, select, [role='menu']")) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleSwipeEnd = useCallback((event) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaY) < 50 || Math.abs(deltaY) < Math.abs(deltaX) * 1.15) return;
    scrollToIndex(activeIndex + (deltaY < 0 ? 1 : -1));
  }, [activeIndex, scrollToIndex]);

  const handleToggleLike = useCallback((reelId, nextLiked, nextCount) => {
    setReels((current) => current.map((reel) => {
      if (String(reel.id) !== String(reelId)) return reel;
      return {
        ...reel,
        liked: nextLiked,
        likes: Math.max(0, Number(nextCount) || 0),
      };
    }));
  }, []);

  const handleToggleSave = useCallback((reelId, nextSaved) => {
    setReels((current) => current.map((reel) => String(reel.id) === String(reelId) ? { ...reel, saved: nextSaved } : reel));
  }, []);

  // Stable callback identities so React.memo on ReelSlide actually skips
  // re-rendering off-screen slides — inline arrow functions created fresh
  // per slide on every render would defeat memoization entirely.
  const toggleMuted = useCallback(() => setMuted((v) => !v), []);

  const handleReelDeleted = useCallback((reelId) => {
    setReels((current) => current.filter((item) => String(item.id) !== String(reelId)));
  }, []);

  const handleOpenAuthor = useCallback((author) => {
    if (!author) return;
    const authorType = author.type || (author.pageId || author.companyPageId ? "page" : "user");
    const pageId = author.pageId || author.companyPageId || author.companyId || null;
    const userId = author.userId || author.profileId || author.id || null;
    const isPage = authorType === "page" || authorType === "company" || Boolean(pageId);
    if (isPage && pageId) {
      onOpenCompanyPage?.(pageId);
      return;
    }
    if (userId) {
      onOpenProfile?.(userId);
    }
  }, [onOpenCompanyPage, onOpenProfile]);

  const loadCommentsForReel = useCallback((reelId) => {
    if (!reelId || commentThreads[reelId]) return Promise.resolve(commentThreads[reelId]);
    const existingRequest = commentFetchesRef.current.get(String(reelId));
    if (existingRequest) return existingRequest;

    const request = fetch(backendApiUrl(`/api/reels/${reelId}/comments`), { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger les commentaires");
        const data = await response.json();
        const comments = data.comments || [];
        setCommentThreads((current) => ({ ...current, [reelId]: comments }));
        setReels((current) => current.map((item) => String(item.id) === String(reelId)
          ? { ...item, comments: Number(data.total || comments.length) }
          : item));
        return comments;
      })
      .finally(() => commentFetchesRef.current.delete(String(reelId)));

    commentFetchesRef.current.set(String(reelId), request);
    return request;
  }, [commentThreads]);

  // Les commentaires sont precharges pendant que le reel est visible.
  useEffect(() => {
    [reels[activeIndex], reels[activeIndex + 1]].forEach((reel) => {
      if (reel?.id) loadCommentsForReel(reel.id).catch(() => {});
    });
  }, [activeIndex, reels, loadCommentsForReel]);

  const handleShare = useCallback((reel) => {
    setShareReel(reel);
  }, []);

  const handleReelRepost = useCallback(async (reelId) => {
    if (!reelId || typeof reelId === "string" && reelId.startsWith("fallback-")) return;
    try {
      const response = await fetch(backendApiUrl(`/api/reels/${reelId}/share`), { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Impossible de partager le reel");
      const data = await response.json();
      setReels((current) => current.map((entry) => String(entry.id) === String(reelId)
        ? { ...entry, shares: Number(data.shares ?? entry.shares ?? 0) }
        : entry));
    } catch (error) {
      console.error("Erreur lors du partage du reel:", error);
    }
  }, []);

  const openCommentsForReel = useCallback(async (reel) => {
    setCommentSheet(reel);
    setCommentText("");
    setReplyingTo(null);
    setSortBy("recent");
    setSortOpen(false);
    setShowAllComments(false);
    setHiddenCommentIds([]);
    setAttachedMedia([]);
    setShowEmoji(false);
    setCommentsLoading(true);

    // Utilise le prechargement si disponible, sinon affiche le skeleton.
    try {
      await loadCommentsForReel(reel.id);
    } catch (error) {
      console.error("Erreur lors du chargement des commentaires:", error);
    } finally {
      setCommentsLoading(false);
    }

    onOpenComments?.(reel);
  }, [loadCommentsForReel, onOpenComments]);

  const toggleCommentReaction = useCallback(async (reelId, commentId, reaction) => {
    const response = await fetch(backendApiUrl(`/api/reels/${reelId}/comments/${commentId}/reaction`), {
      credentials: "include",
      method: reaction ? "POST" : "DELETE",
      headers: reaction ? { "Content-Type": "application/json" } : undefined,
      body: reaction ? JSON.stringify({ reaction }) : undefined,
    });
    if (!response.ok) throw new Error("Impossible de réagir au commentaire");
    const result = await response.json();
    setCommentThreads((current) => {
      const comments = [...(current[reelId] || [])];
      updateCommentById(comments, commentId, {
        likes: result.totalCount,
        totalReactions: result.totalCount,
        reaction: result.userReaction,
        liked: Boolean(result.userReaction),
        reactionKeys: Object.keys(result.reactionCounts || {}),
      });
      return { ...current, [reelId]: comments };
    });
    return result;
  }, []);

  const handleDeleteComment = useCallback(async (commentId) => {
    const reelId = commentSheet?.id;
    if (!reelId) return;
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    const target = findCommentById(commentThreads[reelId] || [], commentId);
    const removedCount = target ? 1 + countComments(target.replies || []) : 1;
    try {
      const response = await fetch(backendApiUrl(`/api/reels/${reelId}/comments/${commentId}`), { method: "DELETE", credentials: "include" });
      if (!response.ok) return;
      setCommentThreads((current) => {
        const comments = [...(current[reelId] || [])];
        removeCommentById(comments, commentId);
        return { ...current, [reelId]: comments };
      });
      setReels((current) => current.map((reel) => String(reel.id) === String(reelId)
        ? { ...reel, comments: Math.max(0, Number(reel.comments || 0) - removedCount) }
        : reel));
    } catch (error) {
      console.error("Erreur lors de la suppression du commentaire:", error);
    }
  }, [commentSheet?.id, commentThreads]);

  const handleEditComment = useCallback(async (commentId, text) => {
    const reelId = commentSheet?.id;
    if (!reelId) return;
    const response = await fetch(backendApiUrl(`/api/reels/${reelId}/comments/${commentId}`), {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("Impossible de modifier le commentaire");
    setCommentThreads((current) => {
      const comments = [...(current[reelId] || [])];
      updateCommentById(comments, commentId, { text });
      return { ...current, [reelId]: comments };
    });
  }, [commentSheet?.id]);

  const handleReportComment = useCallback(async (commentId) => {
    const reason = window.prompt("Pourquoi signalez-vous ce commentaire ?", "Contenu inapproprié");
    if (!reason) return;

    try {
      const response = await fetchBackendApi("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "comment",
          targetId: String(commentId),
          targetLabel: `Commentaire ${commentId}`,
          reason,
          details: "Signalement depuis le viewer de reel",
        }),
      });
      if (!response.ok) throw new Error("Le signalement a échoué");
    } catch (error) {
      console.error("Erreur lors du signalement du commentaire:", error);
    }
  }, []);

  const handleHideComment = useCallback((commentId) => {
    setHiddenCommentIds((current) => [...new Set([...current, String(commentId)])]);
  }, []);

  // Utilitaires pour manipuler les commentaires imbriqués
  const removeCommentById = (comments, commentId) => {
    for (let i = 0; i < comments.length; i++) {
      if (String(comments[i].id) === String(commentId)) {
        comments.splice(i, 1);
        return true;
      }
      if (comments[i].replies) {
        if (removeCommentById(comments[i].replies, commentId)) return true;
      }
    }
    return false;
  };

  const updateCommentById = (comments, commentId, newData) => {
    for (const comment of comments) {
      if (String(comment.id) === String(commentId)) {
        Object.assign(comment, newData);
        return true;
      }
      if (comment.replies) {
        if (updateCommentById(comment.replies, commentId, newData)) return true;
      }
    }
    return false;
  };

  const uploadCommentMediaFile = (file) => new Promise((resolve) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = file.type.startsWith("video") ? process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_PRESET : process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const resourceType = file.type.startsWith("video") ? "video" : "image";
    if (!cloudName || !preset) { resolve(null); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);
    formData.append("resource_type", resourceType);
    formData.append("folder", "lynoralink");
    fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: "POST", body: formData })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.secure_url ? { url: data.secure_url, type: resourceType, label: file.name } : null;
      })
      .then(resolve)
      .catch(() => resolve(null));
  });

  const handleCommentMediaSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadingMedia(true);
    try {
      const uploaded = (await Promise.all(files.map(uploadCommentMediaFile))).filter(Boolean);
      setAttachedMedia((current) => [...current, ...uploaded]);
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  };

  const addComment = async (text, media = []) => {
    const reelId = commentSheet?.id;
    if (!reelId) return;
    try {
      const response = await fetch(backendApiUrl(`/api/reels/${reelId}/comments`), {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, media: media.length ? media : undefined, parentId: null }),
      });
      if (!response.ok) {
        console.error("Erreur lors de l'ajout du commentaire");
        return;
      }
      const newComment = await response.json();
      setCommentThreads((current) => {
        const comments = [...(current[reelId] || [])];
        comments.push(newComment);
        return { ...current, [reelId]: comments };
      });
      setReels((current) => current.map((reel) => String(reel.id) === String(reelId)
        ? { ...reel, comments: Number(reel.comments || 0) + 1 }
        : reel));
      setCommentText("");
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error);
    }
  };

  const handleCommentReply = async (reelId, parentCommentId, text, media = []) => {
    if (!reelId) return;
    const submissionKey = `${reelId}:${parentCommentId}`;
    if (replySubmittingRef.current.has(submissionKey)) return;
    replySubmittingRef.current.add(submissionKey);
    try {
      const response = await fetch(backendApiUrl(`/api/reels/${reelId}/comments`), {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, media: media.length ? media : undefined, parentId: parentCommentId }),
      });
      if (!response.ok) {
        console.error("Erreur lors de l'ajout de la réponse");
        return;
      }
      const newReply = await response.json();
      setCommentThreads((current) => {
        const comments = [...(current[reelId] || [])];
        if (!findCommentById(comments, newReply.id)) {
          appendReplyById(comments, parentCommentId, newReply);
        }
        return { ...current, [reelId]: comments };
      });
      setReels((current) => current.map((reel) => String(reel.id) === String(reelId)
        ? { ...reel, comments: Number(reel.comments || 0) + 1 }
        : reel));
    } catch (error) {
      console.error("Erreur lors de la réponse au commentaire:", error);
    } finally {
      replySubmittingRef.current.delete(submissionKey);
    }
  };

  const handleCommentSubmit = async () => {
    if ((!commentText.trim() && !attachedMedia.length) || uploadingMedia || !commentSheet) return;
    if (replyingTo) {
      await handleCommentReply(commentSheet.id, replyingTo.id, commentText.trim(), attachedMedia);
    } else {
      await addComment(commentText.trim(), attachedMedia);
    }
    setCommentText("");
    setAttachedMedia([]);
    setReplyingTo(null);
    setShowEmoji(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowDown") scrollToIndex(activeIndex + 1);
      if (e.key === "ArrowUp") scrollToIndex(activeIndex - 1);
      if (e.key === "Escape") {
        if (commentSheet) setCommentSheet(null);
        else onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, scrollToIndex, onClose, commentSheet]);

  const activeReelComments = commentSheet ? (commentThreads[commentSheet.id] || []) : [];
  const visibleCommentSource = filterHiddenComments(activeReelComments, hiddenCommentIds);
  const commentsCount = countComments(visibleCommentSource);
  const sortedComments = [...visibleCommentSource].sort((first, second) => {
    if (sortBy === "relevant") return (second.likes || 0) - (first.likes || 0);
    return new Date(second.time || second.createdAt || 0).getTime() - new Date(first.time || first.createdAt || 0).getTime();
  });
  const visibleComments = showAllComments ? sortedComments : sortedComments.slice(0, 3);
  const visibleCommentsCount = visibleComments.reduce((total, comment) => total + 1 + countComments(comment.replies || []), 0);
  const hiddenCount = Math.max(0, commentsCount - visibleCommentsCount);
  const reelAuthorId = commentSheet?.author?.id || commentSheet?.author?.userId || commentSheet?.author?.profileId || null;
  const sessionInitials = (session?.user?.name || "V").trim().split(/\s+/).map((word) => word[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "V";

  // Réinitialise la pagination "Voir plus" quand on change de reel (aligné PostViewer)
  useEffect(() => {
    setShowAllComments(false);
  }, [commentSheet?.id]);

  return (
    <div className={`reel-root${commentSheet ? " reel-root--comments-open" : ""}${loading ? " reel-root--loading" : ""}`}>
      {error && !loading && (
        <div className="reel-alert" role="status">{error}</div>
      )}

      {/* Header (mobile) */}
      <div className="reel-mobile-header">
        <h1 className="reel-mobile-title">Reels</h1>
        {onClose && (
          <button type="button" onClick={onClose} className="reel-icon-chip" aria-label="Fermer">
            <X size={18} />
          </button>
        )}
      </div>

      {commentSheet && (
        <>
          <div className="reel-comment-backdrop" onClick={() => setCommentSheet(null)} />
          <div className="reel-comment-sheet" role="dialog" aria-modal="true" aria-label="Commentaires">
            <div className="reel-comment-handle" />

            {/* --- Comments Header --- */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${LI_BORDER}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: LI_TEXT, whiteSpace: "nowrap" }}>Commentaires ({commentsCount})</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: sortOpen ? LC.navy50 : LC.white,
                      border: `1px solid ${sortOpen ? LC.navy700 : LI_INPUT_BORDER}`,
                      borderRadius: 20,
                      cursor: "pointer",
                      fontSize: 12.5,
                      color: LI_TEXT,
                      padding: "6px 10px 6px 12px",
                      transition: "background 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => { if (!sortOpen) e.currentTarget.style.background = LI_HOVER; }}
                    onMouseLeave={(e) => { if (!sortOpen) e.currentTarget.style.background = LC.white; }}
                  >
                    <ListFilter size={13} color={LC.navy700} style={{ flexShrink: 0 }} />
                    <span style={{ color: LI_SECONDARY, whiteSpace: "nowrap" }}>Trier :</span>
                    <span style={{ fontWeight: 600, color: LI_TEXT, whiteSpace: "nowrap" }}>{sortBy === "recent" ? "Récents" : "Pertinents"}</span>
                    <ChevronDown size={13} color={LI_SECONDARY} style={{ transform: sortOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", flexShrink: 0 }} />
                  </button>
                  {sortOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 200, background: LC.white, borderRadius: 12, border: `1px solid ${LI_BORDER}`, boxShadow: "0 12px 28px rgba(15,51,82,0.18)", zIndex: 20, padding: 6 }}>
                      {[{ key: "recent", label: "Les plus récents" }, { key: "relevant", label: "Les plus pertinents" }].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                            padding: "9px 10px", background: sortBy === opt.key ? LC.navy50 : "transparent",
                            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13,
                            fontWeight: sortBy === opt.key ? 600 : 400, color: sortBy === opt.key ? LC.navy900 : LI_TEXT,
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => { if (sortBy !== opt.key) e.currentTarget.style.background = LI_HOVER; }}
                          onMouseLeave={(e) => { if (sortBy !== opt.key) e.currentTarget.style.background = "transparent"; }}
                        >
                          <span>{opt.label}</span>
                          {sortBy === opt.key && <Check size={14} color={LC.navy700} style={{ flexShrink: 0 }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCommentSheet(null)}
                  aria-label="Fermer les commentaires"
                  style={{ width: 36, height: 36, border: "none", borderRadius: "50%", background: "transparent", color: LI_SECONDARY, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = LI_HOVER)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* --- Comments List (scrollable) --- */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
              {commentsLoading && activeReelComments.length === 0 ? (
                <div style={{ width: "100%", minHeight: 260, padding: "16px 0 8px" }} role="status" aria-label="Chargement des commentaires">
                  <CommentSkeleton count={4} />
                </div>
              ) : visibleComments.map((comment) => (
                <div key={comment.id} style={{ borderBottom: `1px solid ${LI_BORDER}` }}>
                  <ReelCommentItem
                    comment={comment}
                    currentUser={session?.user || null}
                    onToggleLike={() => {}}
                    onToggleCommentReaction={toggleCommentReaction}
                    onReportComment={handleReportComment}
                    onHideComment={handleHideComment}
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                    onReply={(commentId, text) => handleCommentReply(commentSheet.id, commentId, text)}
                    onStartReply={(targetComment) => { setReplyingTo(targetComment); commentInputRef.current?.focus(); }}
                    reelId={commentSheet.id}
                    postAuthorId={reelAuthorId}
                  />
                </div>
              ))}
              {!commentsLoading && (hiddenCount > 0 || showAllComments) && (
                <button onClick={() => setShowAllComments((visible) => !visible)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: LINKEDIN_BLUE, padding: "14px 0", width: "100%", textAlign: "left" }}>
                  {showAllComments ? "Réduire les commentaires" : `Voir les ${hiddenCount} autres commentaires`}
                  <ChevronDown size={16} style={{ transform: showAllComments ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} />
                </button>
              )}
              {!commentsLoading && hiddenCommentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHiddenCommentIds([])}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: LINKEDIN_BLUE, padding: "8px 0 14px", width: "100%", textAlign: "left" }}
                >
                  Réafficher les commentaires masqués
                </button>
              )}
              {activeReelComments.length === 0 && !commentsLoading && (
                <div style={{ padding: "40px 0", textAlign: "center", color: LI_SECONDARY, fontSize: 14 }}>
                  Soyez le premier à commenter cette publication.
                </div>
              )}
            </div>

            {/* --- Comment Composer (sticky bottom) --- */}
            <div className="reel-comment-composer" style={{ padding: "12px 16px", borderTop: `1px solid ${LI_BORDER}`, background: LC.white, boxSizing: "border-box", flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 10, width: "100%", maxWidth: "100%", minHeight: 72, overflow: "visible" }}>
              <div style={{ flexShrink: 0, marginTop: 4 }}>
                <CommentAvatar initials={sessionInitials} imgUrl={session?.user?.image || session?.user?.avatarUrl || null} size={36} />
              </div>
              <div style={{ flex: "1 1 auto", minWidth: 0, position: "relative", width: "auto", maxWidth: "100%" }}>
                {replyingTo && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, fontSize: 12, color: LI_SECONDARY }}>
                    <span>Réponse à <strong>{replyingTo.author}</strong></span>
                    <button type="button" onClick={() => setReplyingTo(null)} style={{ border: "none", background: "none", color: LI_SECONDARY, cursor: "pointer", padding: 0 }} aria-label="Annuler la réponse"><X size={14} /></button>
                  </div>
                )}
                {attachedMedia.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, padding: "2px 2px 0" }}>
                    {attachedMedia.map((item, index) => (
                      <div key={`${item.url}-${index}`} style={{ position: "relative", padding: 3, background: LI_HOVER, border: `1px solid ${LI_BORDER}`, borderRadius: 9 }}>
                        {item.type === "video" ? <video src={item.url} style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6 }} /> : <img src={item.url} alt={item.label || "Média joint"} style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6 }} />}
                        <button type="button" onClick={() => setAttachedMedia((current) => current.filter((_, mediaIndex) => mediaIndex !== index))} style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, border: `2px solid ${LC.white}`, borderRadius: "50%", background: LC.danger, color: LC.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} aria-label="Retirer le média"><X size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="reel-comment-input-row" style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 44, background: LI_HOVER, border: `1px solid ${LI_BORDER}`, borderRadius: 24, boxSizing: "border-box" }}>
                  <input
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
                    placeholder="Ajouter un commentaire..."
                    className="reel-comment-input"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 116px 10px 14px",
                      borderRadius: 24,
                      border: "none",
                      outline: "none",
                      fontSize: 14,
                      color: LI_TEXT,
                      background: "transparent",
                    }}
                  />
                  <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 2 }}>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia} aria-label="Ajouter une photo ou une vidéo" style={{ background: "none", border: "none", cursor: uploadingMedia ? "default" : "pointer", color: LI_SECONDARY, padding: 5, display: "flex", borderRadius: "50%", opacity: uploadingMedia ? 0.5 : 1 }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <ImageIcon size={17} />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm" multiple onChange={handleCommentMediaSelect} style={{ display: "none" }} />
                    <button type="button" onClick={() => setShowEmoji((current) => !current)} aria-label="Ajouter un emoji" style={{ background: "none", border: "none", cursor: "pointer", color: LI_SECONDARY, padding: 5, display: "flex", borderRadius: "50%" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <Smile size={17} />
                    </button>
                    <button type="button" onClick={handleCommentSubmit} disabled={(!commentText.trim() && !attachedMedia.length) || uploadingMedia} aria-label="Envoyer le commentaire" style={{ width: 28, height: 28, border: "none", borderRadius: "50%", background: (commentText.trim() || attachedMedia.length) && !uploadingMedia ? LC.navy800 : LC.line, color: LC.white, cursor: (commentText.trim() || attachedMedia.length) && !uploadingMedia ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Send size={13} />
                    </button>
                  </div>
                  {showEmoji && <div className="emoji-picker-popover" style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 44, zIndex: 20 }}><Emojipicker emojis={["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥", "👏", "💡"]} onSelect={(emoji) => { setCommentText((current) => `${current}${emoji}`); setShowEmoji(false); }} size={30} /></div>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {shareReel && (
        <ShareModal
          post={{
            ...shareReel,
            text: shareReel.caption,
            media: shareReel.videoUrl ? [{ type: "video", url: shareReel.videoUrl, name: "Reel LynoraLink" }] : [],
          }}
          shareUrl={typeof window === "undefined" ? "" : `${window.location.origin}/feed?reel=${encodeURIComponent(shareReel.id)}`}
          onClose={() => setShareReel(null)}
          onRepost={() => handleReelRepost(shareReel.id)}
        />
      )}

      <div className="reel-stage-wrap">
        {loading && reels.length === 0 ? (
          <div className="reel-loading-card" aria-hidden="true">
            <div className="reel-skeleton-top" />
            <div className="reel-skeleton-bottom">
              <div className="reel-skeleton-avatar" />
              <div className="reel-skeleton-lines">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="reel-skeleton-actions">
              <span /><span /><span /><span />
            </div>
          </div>
        ) : (
          <>
            {/* Desktop side nav arrows */}
            <div className="reel-nav-col reel-nav-col-desktop">
              <button
                type="button"
                className="reel-nav-arrow"
                disabled={activeIndex === 0}
                onClick={() => scrollToIndex(activeIndex - 1)}
                aria-label="Reel précédent"
              >
                <ChevronUp size={20} />
              </button>
              <button
                type="button"
                className="reel-nav-arrow"
                disabled={activeIndex === reels.length - 1}
                onClick={() => scrollToIndex(activeIndex + 1)}
                aria-label="Reel suivant"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            <div
              ref={containerRef}
              className="reel-feed"
              onWheel={handleWheel}
              onPointerDown={handleSwipeStart}
              onPointerUp={handleSwipeEnd}
              onPointerCancel={() => { swipeStartRef.current = null; }}
            >
              {reels.map((reel, i) => (
                <div
                  key={reel.id}
                  ref={(el) => { slideRefs.current[i] = el; }}
                  data-index={i}
                  className="reel-slide-wrap"
                >
                  <ReelSlide
                    reel={reel}
                    active={i === activeIndex}
                    // Render/decode video for the active slide and its immediate
                    // neighbours only — mirrors Facebook's windowed reel player
                    // and avoids mounting dozens of simultaneous <video> tags.
                    nearby={Math.abs(i - activeIndex) <= 1}
                    muted={muted}
                    commentsOpen={Boolean(commentSheet) && String(commentSheet.id) === String(reel.id)}
                    session={session}
                    onToggleMute={toggleMuted}
                    onOpenComments={openCommentsForReel}
                    onToggleLike={handleToggleLike}
                    onToggleSave={handleToggleSave}
                    onShare={handleShare}
                    onReelDeleted={handleReelDeleted}
                    onOpenAuthor={handleOpenAuthor}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {onClose && (
          <button type="button" onClick={onClose} className="reel-close-desktop" aria-label="Fermer">
            <X size={18} />
          </button>
        )}
      </div>

      <style>{REEL_STYLES}</style>
    </div>
  );
}

/* ---------------------------------------------------------------
   Styles — hoisted to module scope so the (large) template string
   isn't rebuilt on every render (e.g. on each keystroke while
   typing a comment, or every scroll-driven activeIndex change).
----------------------------------------------------------------*/
const REEL_STYLES = `
        .reel-root {
          --reel-w: 380px;
          --reel-h: min(84vh, 780px);
          width: 100%;
          height: 100dvh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 50% 42%, rgba(42,66,120,.28), transparent 34%),
            linear-gradient(135deg, #071126 0%, ${C.navyDeep} 52%, #050b1c 100%);
          font-family: ${FONT};
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .reel-loading,
        .reel-alert {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 12;
          border-radius: 999px;
          background: rgba(10,21,48,.74);
          border: 1px solid rgba(255,255,255,.1);
          color: #fff;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 10px 24px rgba(0,0,0,.22);
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .reel-loading-spinner {
          width: 12px; height: 12px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,.25);
          border-top-color: ${C.gold};
          animation: reel-spin .7s linear infinite;
        }
        @keyframes reel-spin { to { transform: rotate(360deg); } }

        .reel-mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          flex-shrink: 0;
          position: relative;
          z-index: 5;
        }
        .reel-mobile-title { color: #fff; font-size: 19px; font-weight: 800; margin: 0; letter-spacing: .2px; text-shadow: 0 1px 4px rgba(0,0,0,.5); }

        .reel-stage-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 0;
          padding: 24px 0;
        }

        .reel-nav-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: absolute;
          top: 50%;
          left: calc(50% - (var(--reel-w) / 2) - 18px);
          opacity: 0;
          transform: translate(-100%, -50%) translateX(-8px);
          pointer-events: none;
          transition: opacity .18s ease, transform .18s ease;
        }
        .reel-nav-arrow {
          width: 42px; height: 42px; border-radius: 50%;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.14);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background .15s ease, transform .15s ease, opacity .15s ease;
          box-shadow: 0 8px 18px rgba(0,0,0,.18);
        }
        .reel-nav-arrow:hover:not(:disabled) { background: ${C.gold}; color: ${C.navyDeep}; transform: translateY(-1px); }
        .reel-nav-arrow:disabled { opacity: .25; cursor: default; }
        .reel-stage-wrap:hover .reel-nav-col,
        .reel-stage-wrap:focus-within .reel-nav-col,
        .reel-feed:hover ~ .reel-nav-col {
          opacity: 1;
          transform: translate(-100%, -50%);
          pointer-events: auto;
        }

        .reel-feed {
          width: var(--reel-w);
          height: var(--reel-h);
          max-width: 100%;
          margin: 0 auto;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 24px;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          touch-action: pan-y;
          overscroll-behavior-y: contain;
          scrollbar-width: none;
          box-shadow: 0 28px 70px rgba(0,0,0,.48), 0 0 0 6px rgba(255,255,255,.025);
          position: relative;
          cursor: grab;
        }
        .reel-feed:active { cursor: grabbing; }
        .reel-feed::-webkit-scrollbar { display: none; }

        .reel-loading-card {
          position: relative;
          width: var(--reel-w);
          height: var(--reel-h);
          max-width: 100%;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 24px;
          background: linear-gradient(145deg, #1b2941 0%, #101a2d 58%, #0b1222 100%);
          box-shadow: 0 28px 70px rgba(0,0,0,.48), 0 0 0 6px rgba(255,255,255,.025);
        }
        .reel-loading-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,.09) 50%, transparent 70%);
          transform: translateX(-100%);
          animation: reel-skeleton-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes reel-skeleton-shimmer { to { transform: translateX(100%); } }
        .reel-skeleton-top {
          position: absolute;
          top: 18px;
          right: 14px;
          width: 74px;
          height: 34px;
          border-radius: 999px;
          background: rgba(255,255,255,.1);
        }
        .reel-skeleton-bottom {
          position: absolute;
          left: 16px;
          right: 72px;
          bottom: 22px;
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .reel-skeleton-avatar {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(255,255,255,.15);
        }
        .reel-skeleton-lines { display: grid; gap: 7px; width: 100%; }
        .reel-skeleton-lines span {
          display: block;
          height: 9px;
          width: 72%;
          border-radius: 999px;
          background: rgba(255,255,255,.14);
        }
        .reel-skeleton-lines span:nth-child(2) { width: 92%; }
        .reel-skeleton-lines span:nth-child(3) { width: 58%; }
        .reel-skeleton-actions {
          position: absolute;
          right: 16px;
          bottom: 26px;
          display: grid;
          gap: 12px;
        }
        .reel-skeleton-actions span {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,.12);
        }

        .reel-slide-wrap {
          width: 100%;
          height: 100%;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .reel-slide {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .reel-media-backdrop {
          position: absolute;
          inset: -24px;
          background-size: cover;
          background-position: center;
          filter: blur(42px) saturate(1.3) brightness(.55);
          transform: scale(1.15);
          z-index: 0;
          pointer-events: none;
        }
        .reel-video {
          position: relative;
          z-index: 1;
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center;
          cursor: pointer;
          background: transparent;
        }

        .reel-media-loading {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .reel-media-spinner {
          width: 42px;
          height: 42px;
          border: 3px solid rgba(255,255,255,.28);
          border-top-color: ${C.goldBright};
          border-radius: 50%;
          animation: reel-media-spin .75s linear infinite;
          filter: drop-shadow(0 3px 10px rgba(0,0,0,.35));
        }
        @keyframes reel-media-spin { to { transform: rotate(360deg); } }

        .reel-tap-layer {
          position: absolute; inset: 0;
          z-index: 2;
        }

        .reel-progress-track {
          position: absolute; top: 0; left: 0; right: 0; height: 2.5px;
          background: rgba(255,255,255,.22);
          z-index: 6;
        }
        .reel-progress-track--bottom {
          top: auto; bottom: 0; height: 3px; z-index: 7;
          border-radius: 0;
        }
        .reel-progress-fill { height: 100%; transition: width .1s linear; border-radius: 0; }

        .reel-top-controls {
          position: absolute; top: 16px; right: 14px; z-index: 6;
          display: flex; gap: 7px;
          padding: 5px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 999px;
          background: rgba(7,17,38,.38);
          backdrop-filter: blur(14px);
          box-shadow: 0 8px 24px rgba(0,0,0,.2);
        }
        .reel-icon-chip {
          width: 35px; height: 35px; border-radius: 50%;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.11);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background .18s ease, transform .18s ease, border-color .18s ease;
        }
        .reel-icon-chip:hover { background: rgba(255,255,255,.17); border-color: rgba(255,255,255,.28); transform: translateY(-1px); }
        .reel-icon-chip:focus-visible,
        .reel-action-btn:focus-visible,
        .reel-close-desktop:focus-visible,
        .reel-nav-arrow:focus-visible { outline: 2px solid ${C.goldBright}; outline-offset: 3px; }

        .reel-center-play {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(10,21,48,.5);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,.2);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          z-index: 5;
        }

        .reel-burst-heart {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 5;
          pointer-events: none;
          animation: reel-heart-pop .7s cubic-bezier(.2,.8,.2,1);
          filter: drop-shadow(0 6px 18px rgba(0,0,0,.4));
        }
        @keyframes reel-heart-pop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.4); }
          35% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); }
          55% { transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }

        .reel-bottom-scrim {
          position: absolute; left: 0; right: 0; bottom: 0; height: 55%;
          background: linear-gradient(180deg, transparent 0%, rgba(10,21,48,.55) 45%, rgba(10,21,48,.92) 100%);
          z-index: 3;
          pointer-events: none;
        }

        .reel-bottom-content {
          position: absolute; left: 0; right: 0; bottom: 0; z-index: 4;
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 16px;
          padding: 20px 16px 18px;
        }

        .reel-info { flex: 1; min-width: 0; }

        .reel-author-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; min-width: 0; }
        .reel-author-avatar-btn {
          width: 38px; height: 38px; padding: 0; flex: 0 0 38px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 2px solid ${C.gold}; border-radius: 50%;
          background: transparent; overflow: hidden; cursor: pointer;
          box-shadow: 0 3px 10px rgba(0,0,0,.35);
        }
        .reel-author-avatar-btn > div { width: 100% !important; height: 100% !important; border: none !important; box-shadow: none !important; }
        .reel-author-btn {
          flex: 1 1 auto; min-width: 0; max-width: 100%; overflow: hidden;
          display: flex; align-items: center; gap: 4px;
          background: transparent; border: none; padding: 0; cursor: pointer;
          color: inherit; text-align: left;
        }
        .reel-author-name {
          color: #fff; font-weight: 800; font-size: 14.5px;
          display: flex; align-items: center; gap: 4px;
          flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          text-shadow: 0 1px 3px rgba(0,0,0,.4);
        }
        .reel-verified-badge {
          width: 14px; height: 14px; border-radius: 50%;
          background: ${C.navy};
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .reel-follow-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 11px; border-radius: 999px;
          background: ${C.goldGrad}; color: ${C.navyDeep};
          border: 1px solid rgba(255,255,255,.55); font-family: inherit; font-size: 12px; font-weight: 800;
          cursor: pointer; flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(0,0,0,.35);
        }
        .reel-following-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 11px; border-radius: 999px;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.3);
          color: #fff; font-size: 12px; font-weight: 700; flex-shrink: 0;
        }

        .reel-caption {
          color: #fff; font-size: 13.5px; line-height: 1.4; margin: 0 0 8px;
          text-shadow: 0 1px 3px rgba(0,0,0,.4);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }
        .reel-caption--expanded {
          -webkit-line-clamp: unset; -webkit-box-orient: unset;
          display: block; overflow: visible;
        }
        .reel-caption-toggle {
          display: inline; background: none; border: none; padding: 0 0 0 2px;
          cursor: pointer; color: rgba(255,255,255,.85); font-weight: 700;
          font-size: 13.5px; font-family: inherit;
          text-shadow: 0 1px 3px rgba(0,0,0,.4);
        }
        .reel-caption-toggle:hover { color: ${C.goldBright}; }

        .reel-sound-row {
          display: flex; align-items: center; gap: 6px;
          color: #fff; font-size: 12px; font-weight: 600;
          opacity: .9; overflow: hidden;
        }
        .reel-sound-marquee { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .reel-actions-rail {
          display: flex; flex-direction: column; align-items: center; gap: 16px;
          min-width: 64px;
          padding: 0;
          flex-shrink: 0;
        }
        .reel-rail-avatar {
          position: relative; width: 44px; height: 44px; border-radius: 50%;
          border: 2px solid ${C.gold}; padding: 0; cursor: pointer;
          background: transparent; overflow: visible;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,.35);
          transition: transform .15s ease;
        }
        .reel-rail-avatar:hover { transform: scale(1.06); }
        .reel-rail-avatar img, .reel-rail-avatar > div { border-radius: 50%; }
        .reel-rail-avatar > div { width: 100% !important; height: 100% !important; border: none !important; box-shadow: none !important; }
        .reel-rail-avatar-plus {
          position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
          width: 20px; height: 20px; border-radius: 50%;
          background: ${C.goldGrad}; color: ${C.navyDeep};
          display: flex; align-items: center; justify-content: center;
          border: 2px solid ${C.navyDeep}; font-weight: 800;
          box-shadow: 0 2px 6px rgba(0,0,0,.3);
        }
        .reel-rail-share-thumb {
          width: 36px; height: 36px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,.3); padding: 0; cursor: pointer;
          background: rgba(255,255,255,.1); overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,.3);
          transition: transform .15s ease, background .15s ease;
        }
        .reel-rail-share-thumb:hover { transform: scale(1.06); background: rgba(255,255,255,.18); }
        .reel-rail-share-thumb > div { width: 100% !important; height: 100% !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
        .reel-action-count { flex: 0 0 auto; }
        .reel-reaction-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .reel-reaction-picker {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          transform: translateX(-50%);
          z-index: 40;
          pointer-events: auto;
          display: block;
          overflow: visible;
        }
        .reel-reaction-picker--portal {
          position: fixed;
          left: 0;
          bottom: auto;
          transform: translate(-50%, -100%);
          z-index: 10000;
        }
        .reel-action-btn > span:first-child {
          background: rgba(5,14,32,.6) !important;
          border-color: rgba(255,255,255,.18) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
        }
        .reel-action-btn:hover span:first-child { transform: scale(1.08); background: rgba(15,38,76,.85) !important; }
        .reel-action-btn:active span:first-child { transform: scale(0.95); }

        .reel-more-wrap { position: relative; display: inline-flex; }
        .reel-more-wrap--rail { display: none; }

        .reel-options-menu {
          position: absolute;
          min-width: 216px;
          background: ${C.card};
          border-radius: 14px;
          padding: 6px;
          box-shadow: 0 14px 36px rgba(0,0,0,.3);
          border: 1px solid ${C.border};
          z-index: 60;
          animation: reel-menu-pop .16s cubic-bezier(.2,.8,.2,1);
        }
        @keyframes reel-menu-pop {
          from { opacity: 0; transform: translateY(-4px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .reel-more-wrap--top .reel-options-menu { top: calc(100% + 8px); right: 0; }
        .reel-more-wrap--rail .reel-options-menu { bottom: calc(100% + 10px); right: -6px; }

        .reel-options-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 10px 12px; border-radius: 10px;
          background: none; border: none; cursor: pointer;
          font-family: inherit; font-size: 13.5px; font-weight: 600;
          color: ${C.ink}; text-align: left; white-space: nowrap;
        }
        .reel-options-item:hover { background: ${C.surface}; }
        .reel-options-item--danger { color: ${C.red}; }
        .reel-options-item--danger:hover { background: rgba(229,72,77,.08); }

        .reel-close-desktop {
          position: absolute; top: 18px; right: 18px;
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.18);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background .18s ease, transform .18s ease;
        }
        .reel-close-desktop:hover { background: rgba(255,255,255,.15); transform: rotate(4deg); }

        .reel-comment-backdrop {
          position: absolute; inset: 0; z-index: 29;
          background: transparent;
          pointer-events: none;
        }

        .reel-comment-sheet {
          position: absolute; top: 0; right: 0; bottom: 0; z-index: 30;
          width: 392px; max-width: 92vw;
          background: var(--app-surface); color: var(--app-text);
          box-shadow: -16px 0 48px rgba(0,0,0,.35);
          display: flex; flex-direction: column;
          animation: reel-panel-in-right .22s cubic-bezier(.2,.8,.2,1);
        }
        .reel-comment-composer {
          position: sticky;
          bottom: 0;
          z-index: 5;
          margin-top: auto;
          flex: 0 0 auto;
        }
        @keyframes reel-panel-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes reel-panel-in-bottom {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .reel-comment-handle { display: none; }

        /* Menu d'options d'un commentaire — aligné sur .post-viewer-comment-menu */
        .reel-comment-menu {
          position: absolute;
          right: calc(100% + 8px);
          bottom: auto;
          top: 0;
          z-index: 30;
          min-width: 180px;
          overflow: hidden;
          background: ${LC.white};
          border: 1px solid ${LI_BORDER};
          border-radius: 12px;
          box-shadow: 0 10px 28px rgba(15,51,82,0.14);
        }
        .reel-comment-menu button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: ${LI_TEXT};
          text-align: left;
          font: inherit;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .reel-comment-menu button:hover { background: ${LC.navy50}; }
        .reel-comment-menu button.reel-comment-menu-danger { background: #FBEDED; color: ${LC.danger}; }
        .reel-comment-menu button.reel-comment-menu-danger:hover { background: #F6E2E2; }

        .reaction-picker {
          border-radius: 999px !important;
        }

        .reel-nav-col-desktop { display: flex; }

        @media (min-width: 1024px) {
          .reel-root--comments-open {
            --reel-comments-w: 392px;
            --reel-comments-gap: 18px;
            --reel-w: min(340px, 30vw);
            --reel-h: min(76vh, 680px);
          }
          .reel-root--comments-open .reel-stage-wrap {
            transform: translateX(calc(-1 * ((var(--reel-comments-w) + var(--reel-comments-gap)) / 2)));
          }
          .reel-root--comments-open .reel-feed {
            width: var(--reel-w);
            height: var(--reel-h);
          }
          .reel-root--comments-open .reel-comment-sheet {
            left: auto;
            right: 0;
            top: 0;
            bottom: 0;
            width: var(--reel-comments-w);
            max-width: min(392px, 38vw);
          }
        }

        @media (max-width: 767px) {
          .reel-root {
            --reel-w: min(360px, calc(100vw - 32px));
            --reel-h: min(640px, calc(100svh - 112px));
            height: 100svh;
            min-height: 100svh;
          }
          .reel-mobile-header {
            display: flex;
            position: absolute;
            top: 0; left: 0; right: 0;
            z-index: 10;
            padding: calc(10px + env(safe-area-inset-top)) 14px 28px;
            background: linear-gradient(180deg, rgba(10,21,48,.7) 0%, rgba(10,21,48,0) 100%);
            pointer-events: none;
          }
          .reel-mobile-header > * { pointer-events: auto; }
          .reel-stage-wrap { padding: 52px 0 24px; gap: 0; }
          .reel-nav-col-desktop { display: none; }
          .reel-feed {
            width: var(--reel-w);
            height: var(--reel-h);
            max-width: 100%;
            max-height: 100%;
            border-radius: 18px;
            box-shadow: 0 16px 40px rgba(0,0,0,.42), 0 0 0 1px rgba(255,255,255,.08);
            margin: 0 auto;
          }
          .reel-loading-card {
            max-height: 100%;
            border-radius: 18px;
            box-shadow: 0 16px 40px rgba(0,0,0,.42), 0 0 0 1px rgba(255,255,255,.08);
          }
          .reel-close-desktop { display: none; }
          .reel-top-controls {
            top: calc(48px + env(safe-area-inset-top));
            right: 10px;
            padding: 4px;
          }
          .reel-top-controls .reel-icon-chip { width: 33px; height: 33px; }
          .reel-bottom-content { padding: 16px 10px calc(18px + env(safe-area-inset-bottom)); gap: 10px; }
          .reel-actions-rail { gap: 10px; padding: 6px 4px; border-radius: 20px; }
          .reel-actions-rail .reel-action-btn > span:first-child { width: 40px; height: 40px; }
          .reel-reaction-picker {
            left: auto;
            right: -8px;
            transform: none;
            max-width: calc(100vw - 24px);
          }

          /* Le bouton "trois points" bascule du header vers le rail d'actions
             pour rester accessible au pouce et éviter tout menu tronqué. */
          .reel-more-wrap--top { display: none; }
          .reel-more-wrap--rail { display: inline-flex; }
          .reel-more-wrap--rail .reel-options-menu {
            right: -8px;
            min-width: 200px;
            max-width: calc(100vw - 24px);
          }

          .reel-comment-backdrop { background: rgba(10,21,48,.55); pointer-events: auto; }
          .reel-comment-sheet {
            top: auto; left: 0; right: 0; bottom: 0; width: 100%; max-width: 100%;
            height: 78vh; max-height: 82vh;
            border-radius: 18px 18px 0 0;
            box-shadow: 0 -14px 40px rgba(0,0,0,.4);
            animation: reel-panel-in-bottom .25s cubic-bezier(.2,.8,.2,1);
          }
          .reel-comment-handle {
            display: block; width: 38px; height: 4px; border-radius: 999px;
            background: var(--app-border); margin: 10px auto 0; flex-shrink: 0;
          }
          .reel-comment-composer {
            padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
          }
        }

        @media (max-width: 420px) {
          .reel-comment-input {
            font-size: 14px !important;
            padding-right: 110px !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .reel-root { --reel-w: 340px; }
        }
`;
