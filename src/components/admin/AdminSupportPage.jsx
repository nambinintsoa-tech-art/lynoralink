"use client";

import React, { useEffect, useState } from "react";
import { Check, FileText, LifeBuoy, MessageSquare, RefreshCw, Search, Send } from "lucide-react";
import LegalHelpSupport from "../LegalHelpSupport";
import { CGU_SECTIONS, FAQ_ITEMS } from "../LegalHelpSupport";
import AdminContentEditor from "./AdminContentEditor";

const ADMIN_API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4001").replace(/\/$/, "");
const adminApi = (path, options = {}) => fetch(`${ADMIN_API_BASE}${path}`, { credentials: "include", ...options });

const SUPPORT_CATEGORIES = ["Question générale", "Problème technique", "Compte & sécurité", "Facturation", "Signaler un contenu"];

function parseManagedContent(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export default function AdminSupportPage({ showToast }) {
  const [requests, setRequests] = useState([]);
  const [content, setContent] = useState({ supportFaq: FAQ_ITEMS, supportCgu: CGU_SECTIONS });
  const [autoReply, setAutoReply] = useState({ enabled: false, message: "Votre demande a bien été reçue. Notre équipe vous répondra dans les meilleurs délais.", byCategory: {} });
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("tickets");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiReplying, setAiReplying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await adminApi("/v1/admin/support", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chargement impossible");
      setRequests(data.requests || []);
      setContent({
        supportFaq: parseManagedContent(data.content?.supportFaq, FAQ_ITEMS),
        supportCgu: parseManagedContent(data.content?.supportCgu, CGU_SECTIONS),
      });
      if (data.autoReply) setAutoReply({ enabled: Boolean(data.autoReply.enabled), message: data.autoReply.message || "", byCategory: data.autoReply.byCategory || {} });
    } catch (error) { showToast(error.message, "error"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const selected = requests.find((item) => item.id === selectedId);
  const visible = requests.filter((item) => (filter === "all" || item.status === filter) && (!query || `${item.subject} ${item.user?.name} ${item.user?.email}`.toLowerCase().includes(query.toLowerCase())));

  const sendReply = async () => {
    if (!selected || reply.trim().length < 2) return;
    setSaving(true);
    try {
      const response = await adminApi("/v1/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply", id: selected.id, response: reply }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Réponse impossible");
      setRequests((items) => items.map((item) => item.id === selected.id ? data.request : item));
      setReply(""); showToast("Réponse envoyée à l'utilisateur.");
    } catch (error) { showToast(error.message, "error"); } finally { setSaving(false); }
  };

  const saveContent = async (key) => {
    setSaving(true);
    try {
      const response = await adminApi("/v1/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "content", key, value: JSON.stringify(content[key]) }) });
      if (!response.ok) throw new Error("Enregistrement impossible");
      showToast("Contenu enregistré.");
    } catch (error) { showToast(error.message, "error"); } finally { setSaving(false); }
  };

  const saveAutoReply = async () => {
    setSaving(true);
    try {
      const response = await adminApi("/v1/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "autoReply", ...autoReply }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible");
      setAutoReply({ ...data.autoReply, byCategory: data.autoReply.byCategory || {} });
      showToast("Répondeur automatique enregistré.");
    } catch (error) { showToast(error.message, "error"); } finally { setSaving(false); }
  };

  const sendAiReplies = async () => {
    setAiReplying(true);
    try {
      const response = await adminApi("/v1/admin/ai/support", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Réponses automatiques indisponibles");
      showToast(data.message || "Réponses automatiques envoyées.");
      await load();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setAiReplying(false);
    }
  };

  return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div><h1 style={{ margin: 0, fontFamily: "Sora, sans-serif", fontSize: 22 }}>Support & contenus</h1><p style={{ margin: "5px 0 0", color: "var(--app-muted)", fontSize: 13 }}>Gérez les demandes privées et les informations publiées dans l'aide LynoraLink.</p></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button onClick={sendAiReplies} disabled={aiReplying || loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", border: 0, borderRadius: 9, background: "var(--navy800)", color: "#fff", cursor: aiReplying ? "wait" : "pointer", fontWeight: 700, fontSize: 12, opacity: aiReplying ? 0.7 : 1 }}><Send size={14} /> {aiReplying ? "Réponses en cours..." : "Répondre automatiquement avec l’IA"}</button>
        <button onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", border: "1px solid var(--app-border)", borderRadius: 9, background: "var(--app-surface)", color: "var(--app-text)", cursor: "pointer", fontWeight: 700, fontSize: 12 }}><RefreshCw size={14} /> Actualiser</button>
      </div>
    </div>
    <div className="lm-admin-tabs" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--app-border)" }}>
      {[{ id: "tickets", label: "Demandes support", icon: MessageSquare }, { id: "content", label: "Contenus aide & CGU", icon: FileText }, { id: "preview", label: "Aperçu utilisateur", icon: LifeBuoy }].map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 13px", border: 0, borderBottom: `2px solid ${tab === id ? "var(--navy700)" : "transparent"}`, background: "transparent", color: tab === id ? "var(--navy800)" : "var(--app-muted)", fontWeight: 700, cursor: "pointer", fontSize: 12.5 }}><Icon size={15} /> {label}</button>)}
    </div>
    {tab === "preview" ? <div style={{ border: "1px solid var(--app-border)", borderRadius: 12, overflow: "hidden", background: "var(--app-bg)" }}><LegalHelpSupport standalone initialTab="aide" onOpenAssistant={() => {}} /></div> : tab === "content" ? <AdminContentEditor content={content} setContent={setContent} saveContent={saveContent} saving={saving} /> : <>
      <div style={{ display: "grid", gap: 10, padding: 14, border: "1px solid var(--app-border)", borderRadius: 12, background: "var(--app-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div><strong style={{ fontSize: 13 }}>Répondeur automatique</strong><div style={{ marginTop: 3, color: "var(--app-muted)", fontSize: 11.5 }}>Répondre immédiatement aux nouvelles demandes de support.</div></div>
          <label style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--app-text)", fontSize: 12, fontWeight: 700 }}><input type="checkbox" checked={autoReply.enabled} onChange={(event) => setAutoReply((current) => ({ ...current, enabled: event.target.checked }))} /> Activé</label>
        </div>
        <textarea value={autoReply.message} onChange={(event) => setAutoReply((current) => ({ ...current, message: event.target.value }))} rows={3} maxLength={1000} placeholder="Message envoyé automatiquement..." style={{ width: "100%", padding: 10, resize: "vertical", border: "1px solid var(--app-border)", borderRadius: 9, background: "var(--app-input)", color: "var(--app-text)", fontFamily: "inherit", fontSize: 12.5 }} />
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: 12.5 }}>Réponses personnalisées par catégorie</strong>
          <span style={{ color: "var(--app-muted)", fontSize: 11.5 }}>Une catégorie vide utilise le message général ci-dessus.</span>
          {SUPPORT_CATEGORIES.map((category) => <label key={category} style={{ display: "grid", gap: 5, color: "var(--app-text)", fontSize: 11.5, fontWeight: 700 }}>
            {category}
            <textarea value={autoReply.byCategory?.[category] || ""} onChange={(event) => setAutoReply((current) => ({ ...current, byCategory: { ...current.byCategory, [category]: event.target.value } }))} rows={2} maxLength={1000} placeholder={`Réponse automatique pour « ${category} » (facultatif)`} style={{ width: "100%", padding: 9, resize: "vertical", border: "1px solid var(--app-border)", borderRadius: 8, background: "var(--app-input)", color: "var(--app-text)", fontFamily: "inherit", fontSize: 12 }} />
          </label>)}
        </div>
        <button onClick={saveAutoReply} disabled={saving || autoReply.message.trim().length < 2} style={{ justifySelf: "start", padding: "8px 12px", border: 0, borderRadius: 9, background: "var(--navy800)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Enregistrer le répondeur</button>
      </div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><div style={{ display: "flex", alignItems: "center", gap: 7, flex: "1 1 220px", padding: "9px 11px", border: "1px solid var(--app-border)", borderRadius: 9, background: "var(--app-surface)" }}><Search size={15} color="var(--app-muted-light)" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une demande ou un utilisateur" style={{ border: 0, outline: 0, width: "100%", background: "transparent", color: "var(--app-text)", fontSize: 12.5 }} /></div>{["all", "open", "answered"].map((value) => <button key={value} onClick={() => setFilter(value)} style={{ border: `1px solid ${filter === value ? "var(--navy700)" : "var(--app-border)"}`, borderRadius: 9, background: filter === value ? "var(--app-bg)" : "var(--app-surface)", color: "var(--app-text)", padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{value === "all" ? "Toutes" : value === "open" ? "En attente" : "Répondues"}</button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .85fr) minmax(0, 1.5fr)", gap: 14 }} className="lm-support-admin-grid">
        <div style={{ border: "1px solid var(--app-border)", borderRadius: 12, background: "var(--app-surface)", overflow: "hidden" }}>{loading ? <div style={{ padding: 20, color: "var(--app-muted)", fontSize: 13 }}>Chargement...</div> : visible.length === 0 ? <div style={{ padding: 20, color: "var(--app-muted)", fontSize: 13 }}>Aucune demande.</div> : visible.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} style={{ width: "100%", padding: 14, textAlign: "left", border: 0, borderBottom: "1px solid var(--app-border)", background: selectedId === item.id ? "var(--app-bg)" : "transparent", color: "var(--app-text)", cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 12.5 }}>{item.subject}</strong><span style={{ color: item.status === "answered" ? "#2E8B57" : "#D9A536", fontSize: 10.5, fontWeight: 800 }}>{item.status === "answered" ? "Répondu" : "En attente"}</span></div><div style={{ marginTop: 5, color: "var(--app-muted)", fontSize: 11.5 }}>{item.user?.name || item.user?.email || "Utilisateur"}</div></button>)}</div>
        <div style={{ border: "1px solid var(--app-border)", borderRadius: 12, background: "var(--app-surface)", padding: 18, minHeight: 280 }}>{selected ? <><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 16 }}>{selected.subject}</h2><div style={{ marginTop: 5, color: "var(--app-muted)", fontSize: 12 }}>{selected.user?.name} · {selected.user?.email} · {selected.category}</div></div><span style={{ color: "var(--app-muted)", fontSize: 11 }}>#{selected.id.slice(-8).toUpperCase()}</span></div><div style={{ marginTop: 18, padding: 13, borderRadius: 9, background: "var(--app-bg)", color: "var(--app-text)", fontSize: 13, lineHeight: 1.6 }}>{selected.message}</div>{selected.response && <div style={{ marginTop: 12, padding: 13, borderLeft: "3px solid var(--navy700)", color: "var(--app-text)", fontSize: 13, lineHeight: 1.6 }}><strong>Réponse envoyée</strong><br />{selected.response}</div>}<textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Écrire une réponse privée..." rows={4} style={{ width: "100%", marginTop: 16, padding: 11, resize: "vertical", border: "1px solid var(--app-border)", borderRadius: 9, background: "var(--app-input)", color: "var(--app-text)", fontFamily: "inherit", fontSize: 13 }} /><button onClick={sendReply} disabled={saving || reply.trim().length < 2} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, padding: "9px 13px", border: 0, borderRadius: 9, background: "var(--navy800)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}><Send size={14} /> Répondre et notifier</button></> : <div style={{ display: "grid", placeItems: "center", minHeight: 240, color: "var(--app-muted)", fontSize: 13 }}>Sélectionnez une demande pour consulter l'échange.</div>}</div>
      </div>
    </>}
  </div>;
}
