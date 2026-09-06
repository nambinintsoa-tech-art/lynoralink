"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, Loader2, UserRound, X } from "lucide-react";
import { fetchBackendApi } from "@/lib/backend-api";

const INITIAL_FORM = {
  title: "",
  company: "",
  sector: "",
  location: "",
  bio: "",
  skills: "",
  image: "",
};

const STEPS = [
  { key: "identity", label: "Identité" },
  { key: "expertise", label: "Expertise" },
  { key: "photo", label: "Photo" },
];

const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", "image");

  const response = await fetchBackendApi("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Impossible de téléverser la photo.");
  return data.url || data?.secure_url || "";
};

export default function ProfileCompletionModal({ open, onClose, onComplete }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setStep(0);
      setForm(INITIAL_FORM);
    }
  }, [open]);

  const currentProgress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  if (!open) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingImage(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setForm((current) => ({ ...current, image: url }));
    } catch (requestError) {
      setError(requestError.message || "Impossible de téléverser la photo.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const canContinue = (() => {
    if (step === 0) return Boolean(form.title.trim() || form.company.trim() || form.location.trim());
    if (step === 1) return true;
    return true;
  })();

  const nextStep = () => {
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    submit();
  };

  const previousStep = () => {
    setStep((current) => Math.max(0, current - 1));
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    const skills = form.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)
      .slice(0, 20);

    try {
      const response = await fetchBackendApi("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skills, image: form.image || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible d'enregistrer votre profil.");
      onComplete?.({ ...form, skills, image: form.image || null });
    } catch (requestError) {
      setError(requestError.message || "Impossible d'enregistrer votre profil.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    border: "1px solid var(--app-border)",
    borderRadius: 10,
    background: "var(--app-surface)",
    color: "var(--app-text)",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div style={{ display: "grid", gap: 14 }}>
          {[{ name: "title", label: "Poste actuel", placeholder: "Ex. Responsable marketing" }, { name: "company", label: "Entreprise", placeholder: "Ex. Lynora" }, { name: "sector", label: "Secteur", placeholder: "Ex. Technologie" }, { name: "location", label: "Localisation", placeholder: "Ex. Antananarivo" }].map((field) => (
            <label key={field.name} style={{ display: "grid", gap: 6, color: "var(--app-text)", fontSize: 13, fontWeight: 700 }}>
              {field.label}
              <input name={field.name} value={form[field.name]} onChange={updateField} placeholder={field.placeholder} style={inputStyle} />
            </label>
          ))}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6, color: "var(--app-text)", fontSize: 13, fontWeight: 700 }}>
            À propos de vous
            <textarea name="bio" value={form.bio} onChange={updateField} rows={4} maxLength={500} placeholder="Présentez brièvement votre parcours..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
          </label>
          <label style={{ display: "grid", gap: 6, color: "var(--app-text)", fontSize: 13, fontWeight: 700 }}>
            Compétences
            <input name="skills" value={form.skills} onChange={updateField} placeholder="Ex. Communication, Gestion de projet" style={inputStyle} />
            <span style={{ color: "var(--app-muted)", fontSize: 11.5, fontWeight: 400 }}>Séparez les compétences par des virgules.</span>
          </label>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 16, justifyItems: "center" }}>
        <div style={{ position: "relative", width: 120, height: 120, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg, #edf3fb, #dfeaf7)", display: "grid", placeItems: "center", border: "3px solid #e7edf7" }}>
          {form.image ? (
            <img src={form.image} alt="Photo de profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <UserRound size={42} color="#48627e" />
          )}
          <label style={{ position: "absolute", right: 6, bottom: 6, width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #F6D374, #D9A536)", color: "#0F3352", cursor: "pointer", boxShadow: "0 8px 18px rgba(15,51,82,0.18)" }}>
            <Camera size={16} />
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Photo de profil</div>
          <div style={{ color: "var(--app-muted)", fontSize: 13, lineHeight: 1.5 }}>Ajoutez une photo pour donner plus de confiance à votre réseau et à vos contacts.</div>
        </div>
        {uploadingImage && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--app-muted)", fontSize: 13 }}>
            <Loader2 size={14} className="animate-spin" /> Téléversement en cours...
          </div>
        )}
      </div>
    );
  };

  return (
    <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()} style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 16, background: "rgba(15, 51, 82, 0.48)" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="profile-completion-title" style={{ width: "min(100%, 620px)", maxHeight: "min(760px, calc(100dvh - 32px))", overflowY: "auto", borderRadius: 20, background: "var(--app-surface)", color: "var(--app-text)", boxShadow: "0 24px 70px rgba(15, 51, 82, 0.24)" }}>
        <div style={{ padding: "22px 22px 12px", borderBottom: "1px solid var(--app-border)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h2 id="profile-completion-title" style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>Complétez votre profil</h2>
              <p style={{ margin: "7px 0 0", color: "var(--app-muted)", fontSize: 13.5, lineHeight: 1.5 }}>Quelques informations pour mieux vous présenter et rejoindre le fil plus rapidement.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" style={{ display: "grid", placeItems: "center", width: 34, height: 34, flexShrink: 0, border: 0, borderRadius: 9, background: "transparent", color: "var(--app-muted)", cursor: "pointer" }}><X size={18} /></button>
          </div>
          <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${STEPS.length}, minmax(0,1fr))`, gap: 8 }}>
              {STEPS.map((item, index) => (
                <div key={item.key} style={{ height: 7, borderRadius: 999, background: index <= step ? "linear-gradient(135deg, #F6D374, #D9A536)" : "var(--app-border)" }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: "var(--app-muted)", fontWeight: 700 }}>
              <span>{STEPS[step].label}</span>
              <span>{Math.round(currentProgress)}%</span>
            </div>
          </div>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); if (step < STEPS.length - 1) { nextStep(); return; } submit(); }} style={{ display: "grid", gap: 16, padding: 22 }}>
          {renderStep()}

          {error && <p role="alert" style={{ margin: 0, color: "#B42318", fontSize: 13 }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={previousStep} disabled={step === 0 || saving} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid var(--app-border)", borderRadius: 10, background: "transparent", color: "var(--app-text)", padding: "10px 16px", fontWeight: 700, cursor: step === 0 || saving ? "not-allowed" : "pointer", opacity: step === 0 || saving ? 0.55 : 1 }}>
              <ArrowLeft size={16} /> Retour
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} disabled={saving} style={{ border: "1px solid var(--app-border)", borderRadius: 10, background: "transparent", color: "var(--app-text)", padding: "10px 16px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>Plus tard</button>
              <button type="submit" disabled={!canContinue || saving || uploadingImage} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: 0, borderRadius: 10, background: "linear-gradient(135deg, #F6D374, #D9A536)", color: "#0F3352", padding: "10px 16px", fontWeight: 800, cursor: !canContinue || saving || uploadingImage ? "not-allowed" : "pointer", opacity: !canContinue || saving || uploadingImage ? 0.7 : 1 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : step === STEPS.length - 1 ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
                {saving ? "Enregistrement..." : step === STEPS.length - 1 ? "Terminer" : "Suivant"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
