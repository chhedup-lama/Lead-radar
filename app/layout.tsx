import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Opportunity Radar",
  description: "Lead intelligence for MJCA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 text-gray-900 font-[family-name:var(--font-geist)]">
        <div className="flex h-full min-h-screen">
          <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200">
              <span className="text-sm font-semibold tracking-wide text-gray-900">
                Opportunity Radar
              </span>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              <a
                href="/sources"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 font-medium"
              >
                Sources
              </a>
              <a
                href="/leads"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100"
              >
                Leads
              </a>
            </nav>
          </aside>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
