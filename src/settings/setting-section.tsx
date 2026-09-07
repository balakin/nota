export function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface setting-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
