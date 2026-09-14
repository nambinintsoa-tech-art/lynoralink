import Link from "next/link";

export const metadata = {
  title: "Suppression de compte | LynoraLink",
  description: "Instructions pour demander la suppression de votre compte et de vos données LynoraLink.",
};

const sectionStyle = {
  borderTop: "1px solid #DCE7F1",
  paddingTop: 24,
  marginTop: 28,
};

export default function AccountDeletionPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#EFF4F9", color: "#102A43", fontFamily: "Arial, sans-serif", padding: "48px 20px" }}>
      <article style={{ maxWidth: 760, margin: "0 auto", background: "#FFFFFF", border: "1px solid #DCE7F1", borderRadius: 12, padding: "40px 32px", boxSizing: "border-box" }}>
        <header>
          <p style={{ margin: 0, color: "#1B5386", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>LynoraLink</p>
          <h1 style={{ margin: "10px 0 12px", fontSize: 32, lineHeight: 1.2 }}>Suppression de compte</h1>
          <p style={{ margin: 0, color: "#526B82", fontSize: 16, lineHeight: 1.6 }}>
            Vous pouvez supprimer définitivement votre compte LynoraLink et les données qui lui sont associées directement depuis l&apos;application.
          </p>
        </header>

        <section style={sectionStyle}>
          <h2 style={{ margin: "0 0 12px", fontSize: 21 }}>Depuis l&apos;application</h2>
          <ol style={{ margin: 0, paddingLeft: 24, color: "#526B82", fontSize: 15, lineHeight: 1.8 }}>
            <li>Connectez-vous à votre compte LynoraLink.</li>
            <li>Ouvrez <strong>Paramètres</strong>, puis la section <strong>Données</strong>.</li>
            <li>Sélectionnez <strong>Supprimer mon compte</strong>.</li>
            <li>Saisissez votre mot de passe pour confirmer la suppression définitive.</li>
          </ol>
          <p style={{ margin: "16px 0 0", color: "#526B82", fontSize: 14, lineHeight: 1.6 }}>
            La suppression est irréversible. Les publications, connexions, messages, profil et autres données associées au compte sont supprimés. Les abonnements actifs sont également annulés lorsque cela est applicable.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ margin: "0 0 12px", fontSize: 21 }}>Impossible d&apos;accéder à votre compte ?</h2>
          <p style={{ margin: 0, color: "#526B82", fontSize: 15, lineHeight: 1.7 }}>
            Contactez notre équipe à <a href="mailto:support@lynoralink.com" style={{ color: "#1B5386", fontWeight: 700 }}>support@lynoralink.com</a> depuis l&apos;adresse e-mail associée au compte. Indiquez votre nom et l&apos;adresse e-mail du compte afin que nous puissions vérifier la demande.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ margin: "0 0 12px", fontSize: 21 }}>Account deletion instructions</h2>
          <p style={{ margin: 0, color: "#526B82", fontSize: 15, lineHeight: 1.7 }}>
            To permanently delete your LynoraLink account, sign in, open <strong>Settings &gt; Data</strong>, select <strong>Delete my account</strong>, and confirm with your current password. This permanently removes your profile, posts, connections, messages, and associated account data. If you cannot sign in, email <a href="mailto:support@lynoralink.com" style={{ color: "#1B5386", fontWeight: 700 }}>support@lynoralink.com</a> from the email address linked to your account.
          </p>
        </section>

        <footer style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #DCE7F1", display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
          <Link href="/" style={{ color: "#1B5386", fontWeight: 700 }}>Retour à LynoraLink</Link>
          <Link href="/legal" style={{ color: "#526B82" }}>Politique et aide</Link>
        </footer>
      </article>
    </main>
  );
}
