"use client";

/**
 * SuggestionRail.jsx — LynoraLink
 * ─────────────────────────────────────────────────────────────────
 * Rail horizontal de suggestions (profils, pages, groupes) pour mobile.
 * Affiche chaque suggestion indépendamment avec design adapté mobile.
 *
 * Props
 * ─────
 * @prop {Array} suggestions       Suggestions (profils)
 * @prop {Array} pageSuggestions   Suggestions pages
 * @prop {Array} suggestedGroups   Suggestions groupes
 * @prop {Function} onConnect      Callback connexion profil
 * @prop {Function} onFollowPage   Callback follow page
 * @prop {Function} onJoinGroup    Callback join groupe
 * @prop {Function} onOpenProfile  Callback ouvrir profil
 * @prop {Boolean} isPageMode      Mode page entreprise
 * @prop {Array} connectedIds      IDs connectés
 * @prop {Array} followedPageIds   IDs pages suivies
 * @prop {String} activeProfile    ID profil actif
 * @prop {String} currentUserId    ID utilisateur courant
 */

import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, UserPlus, Plus, Check } from "lucide-react";

const C = {
  navy900: "var(--navy900)",
  navy800: "var(--navy800)",
  navy700: "#2C6BA0",
  navy100: "#DCE7F1",
  navy50: "var(--app-bg)",
  gold400: "#F6D374",
  gold600: "#D9A536",
  ink: "var(--app-text)",
  muted: "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)",
  white: "var(--app-surface)",
};

function Avatar({ initials, size = 48, imgUrl = null }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: "50%",
        background: imgUrl ? C.navy50 : `linear-gradient(135deg, #1b5386 0%, #0f3352 100%)`,
        color: C.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
        fontFamily: "'Sora', sans-serif",
        overflow: "hidden",
        border: `2px solid ${C.white}`,
        boxShadow: "0 4px 12px rgba(15,51,82,0.15)",
      }}
    >
      {imgUrl ? (
        <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </div>
  );
}

export default function SuggestionRail({
  suggestions = [],
  pageSuggestions = [],
  suggestedGroups = [],
  onConnect = () => {},
  onFollowPage = () => {},
  onJoinGroup = () => {},
  onOpenProfile = () => {},
  isPageMode = false,
  connectedIds = [],
  followedPageIds = [],
  currentUserId = null,
}) {
  const scrollRefs = {
    profiles: useRef(null),
    pages: useRef(null),
    groups: useRef(null),
  };
  
  const [scrollPositions, setScrollPositions] = useState({
    profiles: 0,
    pages: 0,
    groups: 0,
  });

  const scroll = (type, direction) => {
    const ref = scrollRefs[type];
    if (!ref.current) return;
    const scrollAmount = 280; // Card width + gap
    const newPosition = scrollPositions[type] + direction * scrollAmount;
    ref.current.scrollTo({ left: newPosition, behavior: "smooth" });
    setScrollPositions((prev) => ({ ...prev, [type]: newPosition }));
  };

  const handleScroll = (type) => (e) => {
    setScrollPositions((prev) => ({ ...prev, [type]: e.currentTarget.scrollLeft }));
  };

  // ─── Profils suggérés ───
  const displayProfiles = suggestions
    .filter((s) => s.type !== "company" || isPageMode === false)
    .filter((s) => !connectedIds.includes(s.id))
    .slice(0, 8);

  // ─── Pages suggérées ───
  const displayPages = pageSuggestions.slice(0, 8);

  // ─── Groupes suggérés ───
  const displayGroups = suggestedGroups.slice(0, 8);

  if (!displayProfiles.length && !displayPages.length && !displayGroups.length) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "16px 0",
        borderTop: `1px solid ${C.line}`,
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      {/* ─── PROFILS À SUIVRE ─── */}
      {!isPageMode && displayProfiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingX: "16px" }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>
              Profils à suivre
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => scroll("profiles", -1)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `1px solid ${C.line}`,
                  background: C.white,
                  color: C.navy800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll("profiles", 1)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `1px solid ${C.line}`,
                  background: C.white,
                  color: C.navy800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={scrollRefs.profiles}
            onScroll={handleScroll("profiles")}
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              scrollBehavior: "smooth",
              padding: "0 16px",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {displayProfiles.map((profile) => {
              const isConnected = connectedIds.includes(profile.id);
              const avatarUrl = profile.avatarUrl || profile.image || null;

              return (
                <div
                  key={profile.id}
                  style={{
                    flex: "0 0 auto",
                    width: 260,
                    scrollSnapAlign: "start",
                    scrollSnapStop: "always",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                      padding: 16,
                      background: C.white,
                      border: `1px solid ${C.line}`,
                      borderRadius: 16,
                      textAlign: "center",
                      boxShadow: "0 2px 8px rgba(15,51,82,0.06)",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(15,51,82,0.12)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,51,82,0.06)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <button
                      onClick={() => onOpenProfile?.(profile.id)}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <Avatar
                        initials={profile.initials || (profile.name || "?").slice(0, 2).toUpperCase()}
                        size={64}
                        imgUrl={avatarUrl}
                      />
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button
                        onClick={() => onOpenProfile?.(profile.id)}
                        style={{
                          border: "none",
                          background: "none",
                          padding: 0,
                          cursor: "pointer",
                          display: "block",
                          width: "100%",
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.ink,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {profile.name}
                      </button>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {profile.title || "Professionnel"}
                      </div>
                    </div>

                    <button
                      onClick={() => onConnect(profile.id)}
                      disabled={isConnected}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: isConnected ? `1px solid ${C.line}` : "none",
                        background: isConnected ? C.navy50 : C.gold600,
                        color: isConnected ? C.muted : C.white,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isConnected ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isConnected ? (
                        <>
                          <Check size={14} /> Connecté
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> Se connecter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── PAGES À SUIVRE ─── */}
      {displayPages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingX: "16px" }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>
              Pages recommandées
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => scroll("pages", -1)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `1px solid ${C.line}`,
                  background: C.white,
                  color: C.navy800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll("pages", 1)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `1px solid ${C.line}`,
                  background: C.white,
                  color: C.navy800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={scrollRefs.pages}
            onScroll={handleScroll("pages")}
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              scrollBehavior: "smooth",
              padding: "0 16px",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {displayPages.map((page) => {
              const isFollowed = followedPageIds.some((pageId) => String(pageId) === String(page.id));
              const avatarUrl = page.image || page.logoUrl || null;

              return (
                <div
                  key={page.id}
                  style={{
                    flex: "0 0 auto",
                    width: 260,
                    scrollSnapAlign: "start",
                    scrollSnapStop: "always",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                      padding: 16,
                      background: C.white,
                      border: `1px solid ${C.line}`,
                      borderRadius: 16,
                      textAlign: "center",
                      boxShadow: "0 2px 8px rgba(15,51,82,0.06)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(15,51,82,0.12)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,51,82,0.06)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <Avatar
                      initials={page.initials || page.name.slice(0, 2).toUpperCase()}
                      size={64}
                      imgUrl={avatarUrl}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.ink,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {page.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {page.title || "Entreprise"}
                      </div>
                    </div>

                    <button
                      onClick={() => onFollowPage(page.id)}
                      disabled={isFollowed}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: isFollowed ? `1px solid ${C.line}` : "none",
                        background: isFollowed ? C.navy50 : C.gold600,
                        color: isFollowed ? C.muted : C.white,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isFollowed ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isFollowed ? (
                        <>
                          <Check size={14} /> Suivi
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> Suivre
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── GROUPES À REJOINDRE ─── */}
      {!isPageMode && displayGroups.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingX: "16px" }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>
              Groupes suggérés
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => scroll("groups", -1)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `1px solid ${C.line}`,
                  background: C.white,
                  color: C.navy800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll("groups", 1)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `1px solid ${C.line}`,
                  background: C.white,
                  color: C.navy800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={scrollRefs.groups}
            onScroll={handleScroll("groups")}
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              scrollBehavior: "smooth",
              padding: "0 16px",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {displayGroups.map((group) => {
              const groupName = group.name || "Groupe";
              const memberCount = group.memberCount ?? group.members?.length ?? 0;

              return (
                <div
                  key={group.id}
                  style={{
                    flex: "0 0 auto",
                    width: 260,
                    scrollSnapAlign: "start",
                    scrollSnapStop: "always",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      padding: 16,
                      background: C.white,
                      border: `1px solid ${C.line}`,
                      borderRadius: 16,
                      boxShadow: "0 2px 8px rgba(15,51,82,0.06)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(15,51,82,0.12)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,51,82,0.06)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: 12,
                        background: group.coverUrl
                          ? `linear-gradient(180deg, rgba(15,51,82,0.15), rgba(15,51,82,0.4)), url(${group.coverUrl})`
                          : `linear-gradient(135deg, #1b5386 0%, #0f3352 100%)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: C.white,
                        fontWeight: 700,
                        fontSize: 24,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {!group.coverUrl && (group.emoji || groupName.slice(0, 2).toUpperCase())}
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.ink,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {groupName}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          marginTop: 2,
                        }}
                      >
                        {memberCount} membre{memberCount > 1 ? "s" : ""}
                      </div>
                    </div>

                    <button
                      onClick={() => onJoinGroup(group)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "none",
                        background: C.gold600,
                        color: C.white,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Plus size={14} /> Rejoindre
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
