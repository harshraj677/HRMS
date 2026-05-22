export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-100 rounded-xl" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <div className="h-10 w-10 bg-slate-100 rounded-xl" />
            <div className="h-7 w-16 bg-slate-100 rounded-lg" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="h-5 w-40 bg-slate-100 rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 w-full bg-slate-50 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
