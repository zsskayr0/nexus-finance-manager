export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 rounded-2xl px-6 py-20 text-center">
      <h2 className="page-title">{title}</h2>
      <p className="max-w-sm text-[0.82rem] text-[var(--text-faint)]">{description}</p>
      <span className="solid mt-1 rounded-full px-3 py-1 text-[0.68rem] font-bold">Em breve</span>
    </div>
  );
}
