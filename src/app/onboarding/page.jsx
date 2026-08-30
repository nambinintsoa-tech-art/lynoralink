"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Loader2, UserRound } from "lucide-react";
import BrandName from "@/components/BrandName";

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
  { key: "identity", label: "Votre identité" },
  { key: "expertise", label: "Votre expertise" },
  { key: "photo", label: "Votre photo" },
];

const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", "image");

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Impossible de téléverser la photo.");
  return data.url || data?.secure_url || "";
};

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

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

  const canContinue = step === 0 ? Boolean(form.title.trim() || form.company.trim() || form.location.trim()) : true;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    handleSubmit();
  };

  const handleBack = () => {
    setStep((current) => Math.max(0, current - 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const skills = form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
        .slice(0, 20);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skills, image: form.image || undefined }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Impossible d'enregistrer votre profil.");

      await update();
      router.replace("/feed");
    } catch (requestError) {
      setError(requestError.message || "Impossible d'enregistrer votre profil.");
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="grid gap-4">
          {[
            { name: "title", label: "Poste actuel", placeholder: "Ex. Product Designer @ Entreprise" },
            { name: "company", label: "Entreprise", placeholder: "Ex. Lynora" },
            { name: "sector", label: "Secteur", placeholder: "Ex. Technologie" },
            { name: "location", label: "Localisation", placeholder: "Ex. Antananarivo" },
          ].map((field) => (
            <label key={field.name} className="grid gap-2 text-sm font-semibold text-navy900">
              {field.label}
              <input
                name={field.name}
                value={form[field.name]}
                onChange={updateField}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-navy100 bg-white px-3.5 py-2.5 text-sm text-navy900 outline-none transition focus:border-navy700"
              />
            </label>
          ))}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-navy900">
            À propos de vous
            <textarea
              name="bio"
              value={form.bio}
              onChange={updateField}
              rows={4}
              maxLength={500}
              placeholder="Présentez brièvement votre parcours..."
              className="w-full resize-y rounded-xl border border-navy100 bg-white px-3.5 py-2.5 text-sm text-navy900 outline-none transition focus:border-navy700"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-navy900">
            Compétences
            <input
              name="skills"
              value={form.skills}
              onChange={updateField}
              placeholder="Ex. Communication, Gestion de projet"
              className="w-full rounded-xl border border-navy100 bg-white px-3.5 py-2.5 text-sm text-navy900 outline-none transition focus:border-navy700"
            />
            <span className="text-[11.5px] font-normal text-muted">Séparez les compétences par des virgules.</span>
          </label>
        </div>
      );
    }

    return (
      <div className="grid justify-items-center gap-5 py-2">
        <div className="relative h-28 w-28 overflow-hidden rounded-full border-[3px] border-navy100 bg-slate-100 shadow-sm">
          {form.image ? (
            <img src={form.image} alt="Photo de profil" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
              <UserRound size={42} />
            </div>
          )}
          <label className="absolute bottom-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#F6D374] to-[#D9A536] text-navy900 shadow-lg">
            <Camera size={16} />
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-navy900">Ajouter une photo de profil</p>
          <p className="mt-1 text-sm text-muted">Une photo claire aide votre réseau à vous reconnaître plus facilement.</p>
        </div>
        {uploadingImage && (
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" /> Téléversement en cours...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy50 px-4 py-10 font-inter">
      <div className="w-full max-w-2xl rounded-[28px] border border-navy100 bg-white p-5 shadow-[0_26px_70px_rgba(15,51,82,0.08)] sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold600">Bienvenue</div>
            <h1 className="mt-2 text-2xl font-black text-navy900">Complétez votre profil</h1>
          </div>
          <div className="rounded-full border border-navy100 bg-navy50 px-2.5 py-1 text-xs font-semibold text-navy800">
            <BrandName />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            {STEPS.map((item, index) => (
              <div key={item.key} className={`h-2 rounded-full ${index <= step ? "bg-gradient-to-r from-[#F6D374] to-[#D9A536]" : "bg-navy100"}`} />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            <span>{STEPS[step].label}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (step < STEPS.length - 1) { setStep((current) => current + 1); return; } handleSubmit(); }} className="mt-7">
          {renderStep()}

          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0 || loading}
              className="inline-flex items-center gap-2 rounded-full border border-navy100 bg-white px-4 py-2.5 text-sm font-semibold text-navy900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={16} /> Retour
            </button>

            <button
              type="submit"
              disabled={loading || uploadingImage || !canContinue}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy800 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : step === STEPS.length - 1 ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
              {loading ? "Enregistrement..." : step === STEPS.length - 1 ? "Terminer et aller au fil" : "Suivant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
