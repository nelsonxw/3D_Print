import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/upload" className="text-lg font-bold text-slate-900">
          Photo<span className="text-sky-600">&rarr;</span>STL
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/upload" className="hover:text-sky-700">
            New model
          </Link>
          <Link href="/jobs" className="hover:text-sky-700">
            My models
          </Link>
        </div>
      </nav>
    </header>
  );
}
