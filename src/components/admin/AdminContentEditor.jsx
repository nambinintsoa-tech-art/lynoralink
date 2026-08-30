"use client";

import React from "react";
import { Check, FileText, LifeBuoy, Plus, Trash2 } from "lucide-react";

const FAQ_CATEGORIES = ["Compte & profil", "Publications", "Réseau & messagerie", "Confidentialité", "Facturation"];
const fieldStyle = { width: "100%", padding: "9px 10px", border: "1px solid var(--app-border)", borderRadius: 8, background: "var(--app-input)", color: "var(--app-text)", fontFamily: "inherit", fontSize: 12.5 };
const buttonStyle = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 11px", border: 0, borderRadius: 8, background: "var(--navy800)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" };

export default function AdminContentEditor({ content, setContent, saveContent, saving }) {
  const update = (key, index, field, value) => setContent((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  const remove = (key, index) => setContent((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }));
  const add = (key) => setContent((current) => ({ ...current, [key]: [...current[key], key === "supportFaq" ? { id: `faq-${Date.now()}`, category: FAQ_CATEGORIES[0], q: "", a: "" } : { id: `cgu-${Date.now()}`, title: "", body: "" }] }));

  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--admin-info-bg)", color: "var(--app-muted)", fontSize: 12.5 }}>Modifiez chaque élément séparément. Les éléments supprimés disparaîtront de l’aperçu utilisateur après enregistrement.</div>
    {[{ key: "supportFaq", title: "Aide & FAQ", icon: LifeBuoy }, { key: "supportCgu", title: "CGU", icon: FileText }].map(({ key, title, icon: Icon }) => <section key={key} style={{ border: "1px solid var(--app-border)", borderRadius: 12, background: "var(--app-surface)", padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800 }}><Icon size={16} color="var(--navy700)" /> {title}</div><button onClick={() => add(key)} style={buttonStyle}><Plus size={14} /> Ajouter</button></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>{content[key].map((item, index) => <div key={item.id || index} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 13, border: "1px solid var(--app-border)", borderRadius: 9, background: "var(--app-bg)" }}>
        {key === "supportFaq" && <select value={item.category || FAQ_CATEGORIES[0]} onChange={(e) => update(key, index, "category", e.target.value)} style={fieldStyle}>{FAQ_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>}
        <input value={key === "supportFaq" ? item.q || "" : item.title || ""} onChange={(e) => update(key, index, key === "supportFaq" ? "q" : "title", e.target.value)} placeholder={key === "supportFaq" ? "Question" : "Titre de section"} style={fieldStyle} />
        <textarea value={key === "supportFaq" ? item.a || "" : item.body || ""} onChange={(e) => update(key, index, key === "supportFaq" ? "a" : "body", e.target.value)} placeholder={key === "supportFaq" ? "Réponse" : "Contenu de la section"} rows={4} style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }} />
        <button onClick={() => remove(key, index)} style={{ ...buttonStyle, alignSelf: "flex-end", background: "#fff5f5", color: "#c24444", border: "1px solid #efcaca" }}><Trash2 size={14} /> Supprimer</button>
      </div>)}</div>
      <button onClick={() => saveContent(key)} disabled={saving} style={{ ...buttonStyle, marginTop: 14 }}><Check size={14} /> Enregistrer {title}</button>
    </section>)}
  </div>;
}
