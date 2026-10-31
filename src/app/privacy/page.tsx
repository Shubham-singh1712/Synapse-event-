import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, ArrowRight, ArrowUp, ListOrdered } from "lucide-react";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import PublicFooter from "@/components/navigation/PublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — SynapseEvent Atelier",
  description:
    "Review SynapseEvent's complete privacy policy: how we store event parameters, process AI calculations with Google Gemini, secure authentication, and safeguard your celebration data.",
};

export default function PrivacyPage() {
  const user = null;

  const sections = [
    { id: "overview", num: "01", title: "Overview & Commitment" },
    { id: "data-collected", num: "02", title: "Information We Collect" },
    { id: "oauth-data", num: "03", title: "Google Sign-In & OAuth Scopes" },
    { id: "ai-processing", num: "04", title: "AI Processing & Google Gemini" },
    { id: "cookies", num: "05", title: "Cookies & Session Storage" },
    { id: "storage-infra", num: "06", title: "Database Storage & Hosting" },
    { id: "sharing", num: "07", title: "Third-Party Sharing & Disclosure" },
    { id: "retention", num: "08", title: "Data Retention & Account Deletion" },
    { id: "security", num: "09", title: "Security Safeguards" },
    { id: "user-rights", num: "10", title: "User Rights & Data Control" },
    { id: "children", num: "11", title: "Children's Privacy" },
    { id: "owner-decisions", num: "12", title: "Contact & Owner Determinations" },
  ];

  return (
    <div id="top" className="min-h-screen bg-page text-primary flex flex-col transition-colors duration-200">
      <PublicNavbar user={user} />

      <main className="flex-1 pb-16 sm:pb-24">
        {/* Seamless Header Hero — One Continuous Background, No Harsh Boundary */}
        <header className="pt-10 sm:pt-14 pb-6 sm:pb-8 text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/15 border border-champagne/30 text-xs font-semibold text-secondary">
              <Shield className="w-3.5 h-3.5 text-coral" />
              <span>Data Protection &amp; Technical Disclosure</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-black text-primary tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto leading-relaxed">
              Last updated: October 25, 2026 • A transparent, technical explanation of how SynapseEvent collects, processes, and protects your celebration data.
            </p>
          </div>
        </header>

        {/* Centered Editorial Content Body */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
          {/* Highlight Callout — Distinct card surface with subtle border and soft shadow */}
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex items-start gap-4 shadow-subtle">
            <Lock className="w-5 h-5 text-coral shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs sm:text-sm">
              <h3 className="font-serif font-bold text-primary text-sm sm:text-base">
                Our Privacy Principles
              </h3>
              <p className="text-muted leading-relaxed">
                We collect only the data necessary to synthesize, calculate, and persist your celebration plans. 
                We do not sell personal data, monetize host information through third-party ad brokers, or track you across the web.
              </p>
            </div>
          </div>

          {/* Interactive In-Flow Table of Contents */}
          <nav className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-coral" />
                <h2 className="font-serif font-bold text-primary text-sm sm:text-base">
                  Document Contents
                </h2>
              </div>
              <span className="text-xs text-muted">12 sections</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-secondary hover:text-coral hover:bg-champagne/15 transition-colors group"
                >
                  <span className="text-[11px] font-mono text-muted group-hover:text-coral shrink-0 font-semibold">
                    {sec.num}.
                  </span>
                  <span className="truncate group-hover:underline underline-offset-4">{sec.title}</span>
                </a>
              ))}
            </div>
          </nav>

          {/* Document Sections */}
          <div className="space-y-10 text-xs sm:text-sm text-secondary leading-relaxed">
            {/* 1. Overview */}
            <section id="overview" className="scroll-mt-24 space-y-3 pt-6">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                1. Overview &amp; Commitment
              </h2>
              <p>
                SynapseEvent (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;) respects your privacy and is 
                committed to treating host information with dignity and technical transparency. This Privacy Policy outlines 
                our actual data collection, storage, and processing practices.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section id="data-collected" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                2. Information We Collect
              </h2>
              <p>We collect information directly provided by you during registration and event workspace setup:</p>
              <div className="space-y-2 pt-1">
                <div className="p-3.5 bg-surface border border-border rounded-xl">
                  <strong className="text-primary font-semibold block mb-1">A. User Account Information</strong>
                  <span className="text-xs text-muted">
                    Full name, email address, and a cryptographically salted password hash (via Node.js crypto.scrypt key derivation with a 16-byte cryptographic salt). We never store raw, plaintext passwords.
                  </span>
                </div>
                <div className="p-3.5 bg-surface border border-border rounded-xl">
                  <strong className="text-primary font-semibold block mb-1">B. Event Parameters &amp; Preferences</strong>
                  <span className="text-xs text-muted">
                    Event title, archetype (Wedding, Birthday, Community), target event date, celebration city or venue location, 
                    6-digit Indian PIN code, estimated guest count, total budget ceiling in integer paise/cents, currency (INR/USD), 
                    dietary requirements (e.g. Pure Vegetarian/Jain), and selected ceremonies (Sangeet, Mehendi, Haldi, Reception).
                  </span>
                </div>
                <div className="p-3.5 bg-surface border border-border rounded-xl">
                  <strong className="text-primary font-semibold block mb-1">C. Itemized Workspace Records</strong>
                  <span className="text-xs text-muted">
                    Line-item budget descriptions and amounts, timeline milestone checklists and due dates, 
                    vendor task notes and price quotations, and saved inspiration moodboard items.
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Google OAuth */}
            <section id="oauth-data" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                3. Google Sign-In &amp; OAuth Scopes
              </h2>
              <p>
                When you sign in using Google OAuth 2.0, our application requests the minimal standard identity scopes:
                <code className="bg-surface px-1.5 py-0.5 rounded border border-border mx-1 text-xs text-coral">openid email profile</code>.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li><strong>Data Received:</strong> Your unique Google User ID (<code className="text-primary">sub</code>), verified email address, full display name, and avatar picture URL.</li>
                <li><strong>What We Do NOT Access:</strong> We do not request or receive access to your Google Drive, Gmail, Google Contacts, Google Calendar, or any other personal Google data.</li>
                <li><strong>Account Linking:</strong> If an account with your Google email already exists, our authentication service links your Google profile without exposing your password hash.</li>
              </ul>
            </section>

            {/* 4. AI Processing */}
            <section id="ai-processing" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                4. AI Processing &amp; Google Gemini
              </h2>
              <p>
                SynapseEvent integrates Google Gemini API (<code className="text-primary">@google/genai</code>, model <code className="text-primary">gemini-2.5-flash</code>) 
                to generate structured event plans, suggest cultural celebration themes, and power the Celebration Copilot assistant.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li><strong>Data Transmitted for Synthesis:</strong> Your event archetype, target date, guest count, budget limit, city/location, theme, dietary traditions, and chat messages sent to the copilot.</li>
                <li><strong>No Account Password Sharing:</strong> Account credentials, passwords, and billing information are never transmitted to the AI provider.</li>
                <li><strong>Deterministic Validation:</strong> All AI-suggested budget items undergo server-side mathematical validation and integer recalculation before being presented or stored.</li>
              </ul>
            </section>

            {/* 5. Cookies */}
            <section id="cookies" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                5. Cookies &amp; Local Session Storage
              </h2>
              <p>We use strictly necessary technical cookies to operate our authentication and security mechanisms:</p>
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-xs text-left border border-border rounded-xl overflow-hidden">
                  <thead className="bg-surface text-primary border-b border-border">
                    <tr>
                      <th className="p-2.5 font-semibold">Cookie Name</th>
                      <th className="p-2.5 font-semibold">Purpose</th>
                      <th className="p-2.5 font-semibold">Duration</th>
                      <th className="p-2.5 font-semibold">Security Attributes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-2.5 font-mono text-coral">synapse_auth_session</td>
                      <td className="p-2.5">Authenticates your active user session</td>
                      <td className="p-2.5">30 days</td>
                      <td className="p-2.5">HttpOnly, SameSite=Lax, Secure (Prod)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono text-coral">synapse_oauth_state</td>
                      <td className="p-2.5">Prevents Cross-Site Request Forgery (CSRF) in Google OAuth</td>
                      <td className="p-2.5">10 minutes</td>
                      <td className="p-2.5">HttpOnly, SameSite=Lax, Secure (Prod)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono text-coral">synapse_theme</td>
                      <td className="p-2.5">Preserves your preferred theme (light/dark)</td>
                      <td className="p-2.5">Persistent</td>
                      <td className="p-2.5">Client-accessible (localStorage)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted pt-1">
                We do not use advertising cookies, marketing pixels, social tracker scripts, or third-party behavioral profiling.
              </p>
            </section>

            {/* 6. Database Storage */}
            <section id="storage-infra" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                6. Database Storage &amp; Hosting
              </h2>
              <p>
                Your account and event records are stored in managed PostgreSQL databases using Drizzle ORM. 
                When running in unprovisioned development mode, plans are held in active memory with graceful UI notices 
                until a durable database connection is configured via <code className="text-primary">DATABASE_URL</code>.
              </p>
            </section>

            {/* 7. Third-Party Sharing */}
            <section id="sharing" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                7. Third-Party Sharing &amp; Disclosure
              </h2>
              <p>We do not sell, rent, or trade your personal data. We disclose information only under the following conditions:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li><strong>Service Providers:</strong> Cloud database infrastructure and the Google Gemini API to the extent necessary to fulfill event planning requests.</li>
                <li><strong>Legal Compliance:</strong> When strictly required by valid legal process, court summons, or municipal law enforcement.</li>
                <li><strong>Protection of Rights:</strong> To prevent fraud, malicious system attacks, or security compromises of the platform.</li>
              </ul>
            </section>

            {/* 8. Retention & Deletion */}
            <section id="retention" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                8. Data Retention &amp; Account Deletion
              </h2>
              <p>
                We retain event and workspace data for as long as your account remains active. Our database schema enforces 
                strict <code className="text-primary">ON DELETE CASCADE</code> rules: when you delete an event or your user account, 
                all associated budget line items, timeline milestones, vendor task records, and saved inspiration items are 
                permanently expunged from the database.
              </p>
            </section>

            {/* 9. Security */}
            <section id="security" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                9. Security Safeguards
              </h2>
              <p>We implement industry-standard technical safeguards to protect your celebration details:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Node.js crypto.scrypt password key derivation with unique 16-byte cryptographic salts to prevent rainbow table attacks.</li>
                <li>Cryptographically secure random tokens for session tokens and OAuth CSRF state verification.</li>
                <li>Parameterized database queries to defend against SQL injection.</li>
                <li>HttpOnly cookie flags to prevent malicious scripts from accessing session tokens via XSS.</li>
                <li>Transport Layer Security (HTTPS) encryption for all browser-to-server traffic in production.</li>
              </ul>
            </section>

            {/* 10. User Rights */}
            <section id="user-rights" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                10. User Rights &amp; Data Control
              </h2>
              <p>Depending on your jurisdiction, you possess the right to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Access and export your itemized event plans, budgets, and milestone records.</li>
                <li>Rectify or update any inaccurate personal or event information.</li>
                <li>Request the complete deletion of your account and all associated workspace records.</li>
                <li>Revoke Google OAuth authorizations at any time via your Google Account Security Settings.</li>
              </ul>
            </section>

            {/* 11. Children */}
            <section id="children" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                11. Children&rsquo;s Privacy
              </h2>
              <p>
                SynapseEvent is an adult celebration atelier intended for hosts, event coordinators, and families capable of entering 
                legally binding agreements. We do not knowingly collect personal information directly from children under the age of 18.
              </p>
            </section>

            {/* 12. Owner Determinations */}
            <section id="owner-decisions" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                12. Contact &amp; Owner Determinations
              </h2>
              <p>
                For privacy queries, data access requests, or technical data handling questions, contact our administration 
                team at <code className="bg-surface px-1.5 py-0.5 rounded border border-border text-xs text-primary">curator@synapse-event.com</code>.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs space-y-2 text-secondary">
                <span className="font-bold text-amber-700 dark:text-amber-400 block">
                  Product Owner Deployment Notice:
                </span>
                <p>
                  Formal Data Protection Officer (DPO) designations, corporate registry details, and formal statutory 
                  grievance redressal mechanisms are subject to final determination by the product owner prior to commercial launch.
                </p>
              </div>
            </section>
          </div>

          {/* Navigation and Back to Top Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-xs font-semibold text-secondary hover:text-primary transition"
              >
                &larr; Return to Home
              </Link>
              <a
                href="#top"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-coral transition"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Back to top</span>
              </a>
            </div>

            <Link
              href={user ? "/dashboard" : "/sign-up"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-coral hover:bg-coral-hover text-white shadow-coral transition"
            >
              <span>{user ? "Open Dashboard" : "Start Planning"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
