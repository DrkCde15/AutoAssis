import { Suspense } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-primary">
            <img src="/logo.png" alt="AutoAssist" className="h-14 w-auto" />
          </Link>
        </div>
        <Suspense>
          {children}
        </Suspense>
      </div>
    </main>
  );
}
