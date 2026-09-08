import type { ReactNode } from "react";
import { BookOpenText, GithubLogo, InstagramLogo, LinkedinLogo } from "@phosphor-icons/react";
import { Link } from "../../lib/router";

const internalLinks = [
  { label: "Entity directory", to: "/entities/directory" },
  { label: "Forecast subjects", to: "/entities" },
  { label: "Forecast collections", to: "/collections" },
  { label: "Forecast targets", to: "/targets" },
  { label: "Publishers", to: "/publishers" },
  { label: "Forecasters", to: "/forecasters" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Integrity test", to: "/integrity-test" },
] as const;

const legalLinks = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Trust center", href: "/trust" },
] as const;

const socialLinks = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/future-edge-group", Icon: LinkedinLogo },
  { label: "GitHub", href: "https://github.com/TheFutureEdge", Icon: GithubLogo },
  { label: "Instagram", href: "https://www.instagram.com/ipulseai/", Icon: InstagramLogo },
  { label: "Medium", href: "https://medium.com/@russlan", Icon: BookOpenText },
] as const;

const linkClass = "rounded-md py-1 text-xs font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

export function Footer() {
  return (
    <div className="mt-12">
      <div className="h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500" />
      <footer className="bg-slate-950 text-slate-200">
        <div className="mx-auto max-w-[1500px] px-5 py-9 sm:px-7 lg:px-8">
          <div className="grid gap-9 border-b border-slate-800 pb-8 md:grid-cols-[minmax(16rem,1.2fr)_minmax(10rem,0.7fr)_minmax(10rem,0.8fr)_minmax(10rem,0.7fr)]">
            <section>
              <div className="flex items-center gap-3">
                <img src="/open-forecast-receipt.svg" alt="Open Forecast Receipt" className="size-10 rounded-xl bg-white p-1.5" />
                <div>
                  <div className="text-base font-bold text-white">Forecast Library</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-300">Built on Open Forecast Receipt</div>
                </div>
              </div>
              <p className="mt-4 max-w-md text-xs leading-5 text-slate-400">
                A governed public library of entities, forecasts, receipts, integrity checks, and optional blockchain proofs. Built by Future Edge Group and first used by iPulse AI.
              </p>
              <div className="mt-4 space-y-1 text-[11px] leading-5 text-slate-500">
                <p>Future Edge Group FZE · License 4414073.01 · Formation 4414073</p>
                <p>Operational headquarters: Abu Dhabi, United Arab Emirates</p>
                <p>Legal address: Business Centre, Sharjah Publishing City Free Zone, Sharjah, United Arab Emirates</p>
                <p>Contact: <a href="mailto:support@ipulseai.com" className="font-semibold text-slate-300 hover:text-white">support@ipulseai.com</a></p>
              </div>
            </section>

            <FooterSection title="Library">
              {internalLinks.map((item) => <Link key={item.to} to={item.to} className={linkClass}>{item.label}</Link>)}
            </FooterSection>

            <FooterSection title="Legal & trust">
              {legalLinks.map((item) => <a key={item.href} href={item.href} className={linkClass}>{item.label}</a>)}
            </FooterSection>

            <FooterSection title="Future Edge Group">
              <a
                href="https://ftredge.com"
                target="_blank"
                rel="noreferrer"
                className="mb-3 inline-flex w-fit rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="Visit the Future Edge Group website"
              >
                <img
                  src="/future-edge-group.svg"
                  alt="Future Edge Group"
                  className="h-auto w-44 max-w-full"
                  loading="lazy"
                />
              </a>
              {socialLinks.map(({ label, href, Icon }) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex items-center gap-2`}>
                  <Icon size={15} aria-hidden="true" /> {label}
                </a>
              ))}
              <a href="https://ipulseai.com" target="_blank" rel="noreferrer" className={linkClass}>iPulse AI</a>
            </FooterSection>
          </div>

          <p className="mt-6 text-xs text-slate-400">© 2024-{new Date().getFullYear()} Future Edge Group. All rights reserved.</p>
          <p className="mt-4 border-t border-slate-800 pt-4 text-[11px] leading-5 text-slate-500">
            Forecasts are public research records, not personalized investment advice or instructions to buy or sell. Blockchain proof can establish the integrity and timing of a sealed receipt; it does not prove that a forecast is accurate, truthful, or based on sound reasoning. Users should inspect the underlying receipt, evidence, assumptions, and evaluation status independently.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FooterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white">{title}</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-blue-500/70 to-transparent" aria-hidden="true" />
      </div>
      <nav className="flex flex-col gap-1.5">{children}</nav>
    </section>
  );
}
