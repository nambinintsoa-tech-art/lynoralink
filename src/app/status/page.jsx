"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Database, Gauge, RefreshCw, ShieldCheck, Sparkles, Wifi } from "lucide-react";
import { fetchBackendApi } from "@/lib/backend-api";

const SERVICE_ICONS = { web: Activity, assistant: Sparkles, database: Database };
const STATUS_LABELS = { operational: "Opérationnel", major_outage: "Interruption" };

function StatusIcon({ status, size = 18 }) {
  return status === "operational"
    ? <CheckCircle2 size={size} color="#2E8B57" />
    : <AlertTriangle size={size} color="#C24444" />;
}

export default function StatusPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetchBackendApi("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Le statut est momentanément indisponible.");
      setStatus(await response.json());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    const interval = window.setInterval(loadStatus, 60000);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const isOperational = status?.status === "operational";
  const checkedAt = status?.checkedAt ? new Date(status.checkedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "Vérification en cours";
  const latency = status?.latencyMs == null ? "--" : `${status.latencyMs} ms`;
  const history = status?.history || [];

  return (
    <main className="status-root" style={{ minHeight: "100dvh", width: "100%", background: "var(--app-bg)", color: "var(--app-text)", fontFamily: "Inter, sans-serif" }}>
      <div className="status-content" style={{ maxWidth: 920, width: "100%", minHeight: "100dvh", margin: "0 auto", padding: "28px 20px 64px" }}>
        <a href="/legal-support" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--navy800)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          <ArrowLeft size={15} /> Retour à l'aide
        </a>

        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginTop: 28, marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 11, background: "linear-gradient(145deg, var(--navy800), var(--navy900))", color: "#fff" }}><Activity size={21} /></div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy700)" }}>LynoraLink Status</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "Sora, sans-serif", fontSize: 30, lineHeight: 1.15, letterSpacing: "-0.02em" }}>État de la plateforme</h1>
            <p style={{ margin: "8px 0 0", color: "var(--app-muted)", fontSize: 13.5 }}>Suivez en temps réel la disponibilité des services LynoraLink.</p>
          </div>
          <button onClick={loadStatus} disabled={refreshing} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--app-border)", borderRadius: 9, padding: "10px 13px", background: "var(--app-surface)", color: "var(--app-text)", fontSize: 12.5, fontWeight: 700, cursor: refreshing ? "wait" : "pointer", opacity: refreshing ? 0.7 : 1 }}>
            <RefreshCw size={15} style={{ transform: refreshing ? "rotate(180deg)" : "none", transition: "transform .3s ease" }} /> Actualiser
          </button>
        </header>

        <section style={{ display: "flex", alignItems: "center", gap: 13, padding: "17px 19px", border: "1px solid var(--app-border)", borderRadius: 12, background: "var(--app-surface)", boxShadow: "0 8px 24px rgba(15,51,82,.05)", marginBottom: 18 }}>
          {status ? <StatusIcon status={status.status} size={23} /> : <RefreshCw size={23} color="var(--navy700)" />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{status ? (isOperational ? "Tous les systèmes sont opérationnels" : "Une interruption est en cours") : "Vérification des services..."}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, color: "var(--app-muted)", fontSize: 12 }}><Clock3 size={13} /> Dernière vérification : {checkedAt}</div>
          </div>
          <span style={{ padding: "5px 9px", borderRadius: 999, background: isOperational ? "#EAF6EF" : "#FBEDED", color: isOperational ? "#2E8B57" : "#C24444", fontSize: 11, fontWeight: 800 }}>{status ? STATUS_LABELS[status.status] : "En cours"}</span>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 18 }} className="status-metrics">
          {[
            { icon: Gauge, label: "Réponse du contrôle", value: latency },
            { icon: Wifi, label: "Disponibilité actuelle", value: status ? (isOperational ? "100 %" : "Dégradée") : "--" },
            { icon: ShieldCheck, label: "Surveillance", value: "Active" },
          ].map(({ icon: Icon, label, value }) => <div key={label} style={{ padding: "15px 16px", border: "1px solid var(--app-border)", borderRadius: 11, background: "var(--app-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--app-muted)", fontSize: 11.5, fontWeight: 700 }}><Icon size={15} color="var(--navy700)" /> {label}</div>
            <div style={{ marginTop: 10, fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 800 }}>{value}</div>
          </div>)}
        </section>

        {error && <div role="alert" style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 10, background: "#FBEDED", color: "#C24444", fontSize: 13 }}>{error}</div>}

        <section style={{ border: "1px solid var(--app-border)", borderRadius: 12, background: "var(--app-surface)", overflow: "hidden" }}>
          <div style={{ padding: "16px 19px", borderBottom: "1px solid var(--app-border)", fontSize: 14, fontWeight: 800 }}>Composants surveillés</div>
          {(status?.services || []).map((service) => {
            const Icon = SERVICE_ICONS[service.id] || Activity;
            return <div key={service.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 19px", borderBottom: "1px solid var(--app-border)" }}>
              <div style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: "var(--app-bg)", color: "var(--navy700)" }}><Icon size={17} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{service.name}</div><div style={{ marginTop: 3, color: "var(--app-muted)", fontSize: 12 }}>{service.description}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: service.status === "operational" ? "#2E8B57" : "#C24444", fontSize: 12, fontWeight: 800 }}><StatusIcon status={service.status} size={16} /> {STATUS_LABELS[service.status]}</div>
            </div>;
          })}
          {!status && <div style={{ padding: 25, color: "var(--app-muted)", fontSize: 13, textAlign: "center" }}>Chargement des composants...</div>}
        </section>
        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, .8fr)", gap: 18, marginTop: 18 }} className="status-lower-grid">
          <div style={{ border: "1px solid var(--app-border)", borderRadius: 12, background: "var(--app-surface)", padding: "17px 19px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div><div style={{ fontSize: 14, fontWeight: 800 }}>Historique de disponibilité</div><div style={{ marginTop: 4, color: "var(--app-muted)", fontSize: 12 }}>Contrôles des 30 derniers jours</div></div>
              <span style={{ color: "var(--app-muted)", fontSize: 12, fontWeight: 700 }}>{history.length} contrôle{history.length > 1 ? "s" : ""}</span>
            </div>
            {history.length ? <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(30, minmax(3px, 1fr))", gap: 3, marginTop: 20 }} aria-label="Historique des contrôles">
                {history.slice().reverse().map((check) => <span key={check.checkedAt} title={`${new Date(check.checkedAt).toLocaleString("fr-FR")} : ${STATUS_LABELS[check.status] || check.status}`} style={{ height: 30, borderRadius: 3, background: check.status === "operational" ? "#58B77D" : "#F3C4C1" }} />)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "var(--app-muted-light)", fontSize: 10.5 }}><span>Premier contrôle enregistré</span><span>Dernier contrôle</span></div>
            </> : <div style={{ marginTop: 20, color: "var(--app-muted)", fontSize: 12.5 }}>L'historique apparaîtra après les premiers contrôles réels.</div>}
          </div>
        </section>
        <p style={{ margin: "18px 0 0", color: "var(--app-muted)", fontSize: 12, lineHeight: 1.6 }}>Les contrôles sont effectués à chaque actualisation. En cas de problème persistant, contactez le support depuis votre espace LynoraLink.</p>
      </div>
      <style>{`@media (max-width: 680px) { .status-content { max-width: none !important; padding: 18px 12px 36px !important; } .status-metrics { grid-template-columns: 1fr !important; } .status-lower-grid { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}