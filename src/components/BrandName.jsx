export default function BrandName({ className = "", style = {} }) {
  return (
    <span className={className} style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, ...style }}>
      <span style={{ color: "#D9A536" }}>Lynora</span>
      <span style={{ color: "#1B5386" }}>Link</span>
    </span>
  );
}
