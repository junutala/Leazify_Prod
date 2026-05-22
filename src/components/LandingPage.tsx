'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// ─── Book a Demo Modal (wired to Brevo via /api/expression-of-interest) ───────
function DemoModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePhone = (v: string) => v === '' || /^[\d\s\+\-\(\)]{7,}$/.test(v);

  const handleSubmit = async () => {
    const emailOk = validateEmail(email);
    const phoneOk = validatePhone(phone);
    setEmailError(!emailOk);
    setPhoneError(!phoneOk);
    if (!emailOk || !phoneOk) return;
    setLoading(true);
    try {
      const res = await fetch('/api/expression-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });
      if (!res.ok) throw new Error('Failed');
      setSuccess(true);
    } catch {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(7,15,28,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full mx-5 overflow-hidden"
        style={{ maxWidth: 440, background: '#fff', borderRadius: 20, boxShadow: '0 40px 100px rgba(0,0,0,0.45)', animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative" style={{ background: 'linear-gradient(135deg,#0d1c2e,#1f3d63)', padding: '32px 32px 28px' }}>
          <button
            onClick={onClose}
            className="absolute flex items-center justify-center"
            style={{ top: 18, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 16, cursor: 'pointer' }}
          >✕</button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#F5A623', marginBottom: 12 }}>
            Leaz<span style={{ color: '#29ABE2' }}>ify</span>
          </div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#fff', marginBottom: 8 }}>Book Your Free Demo</h3>
          <p style={{ fontSize: 13, color: '#7fb3d3', lineHeight: 1.55 }}>Share your details and we&apos;ll be in touch within one business day.</p>
        </div>
        <div style={{ padding: '30px 32px' }}>
          {!success ? (
            <>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#1a2e4a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Your Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Ahmed Al Mansoori" autoComplete="name"
                style={{ display: 'block', width: '100%', padding: '13px 16px', border: '1.5px solid #d0e4f0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#0d1c2e', outline: 'none', marginBottom: 20 }}
                onFocus={e => { e.currentTarget.style.borderColor = '#F5A623'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,166,35,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#d0e4f0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#1a2e4a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Email Address</label>
              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(false); }}
                placeholder="you@example.com" autoComplete="email"
                style={{ display: 'block', width: '100%', padding: '13px 16px', border: `1.5px solid ${emailError ? '#c0392b' : '#d0e4f0'}`, borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#0d1c2e', outline: 'none', marginBottom: emailError ? 6 : 20 }}
                onFocus={e => { e.currentTarget.style.borderColor = '#F5A623'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,166,35,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = emailError ? '#c0392b' : '#d0e4f0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {emailError && <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 14 }}>Please enter a valid email address.</p>}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#1a2e4a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Mobile Number</label>
              <input
                type="tel" value={phone} onChange={e => { setPhone(e.target.value); setPhoneError(false); }}
                placeholder="+971 50 123 4567" autoComplete="tel"
                style={{ display: 'block', width: '100%', padding: '13px 16px', border: `1.5px solid ${phoneError ? '#c0392b' : '#d0e4f0'}`, borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#0d1c2e', outline: 'none', marginBottom: phoneError ? 6 : 20 }}
                onFocus={e => { e.currentTarget.style.borderColor = '#F5A623'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,166,35,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = phoneError ? '#c0392b' : '#d0e4f0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {phoneError && <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 14 }}>Please enter a valid mobile number.</p>}
              <button
                onClick={handleSubmit} disabled={loading}
                style={{ width: '100%', background: loading ? '#b0b8c4' : '#F5A623', color: '#fff', border: 'none', borderRadius: 8, padding: 15, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Request My Free Demo →'}
              </button>
              <p style={{ fontSize: 11, color: '#7fb3d3', textAlign: 'center', marginTop: 12 }}>🔒 Your details are safe with us. No spam, ever.</p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#1a2e4a', marginBottom: 12 }}>You&apos;re all set!</h3>
              <p style={{ fontSize: 14, color: '#5a6a85', lineHeight: 1.65 }}>
                Thank you for your interest in Leazify.<br />Our team will reach out shortly to schedule your personalised demo.
              </p>
              <p style={{ marginTop: 14, fontSize: 13, color: '#5a6a85' }}>
                Explore{' '}
                <a href="https://www.leazify.me" target="_blank" rel="noopener noreferrer" style={{ color: '#F5A623' }}>www.leazify.me</a>{' '}
                in the meantime.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [showDemo, setShowDemo] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentYear, setCurrentYear] = useState(2025);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for card entrance animations
  useEffect(() => {
    const cards = document.querySelectorAll('.lp-animate-card');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = '1';
            (e.target as HTMLElement).style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.1 }
    );
    cards.forEach(c => obs.observe(c));
    return () => obs.disconnect();
  }, []);

  const challenges = [
    { icon: '📊', title: 'Scattered data in Excel & emails', desc: 'No single view of your portfolio. Information lives in five different places and no one version is current.' },
    { icon: '🏛️', title: 'Complex ownership structures', desc: 'Joint ownership, family trusts and ESOPs create visibility gaps you simply can\'t afford.' },
    { icon: '🧾', title: 'Manual rent revisions & invoices', desc: 'Hours lost every month recreating invoices and chasing escalation schedules that should run themselves.' },
    { icon: '🔧', title: 'Untracked maintenance requests', desc: 'Delayed repairs mean unhappy tenants — and vacancies that cost you far more than the repair ever would.' },
  ];

  const features = [
    { num: '01', title: 'Define Your Portfolio', desc: 'Organise properties hierarchically — Project → Buildings → Floors → Units. No spreadsheet gymnastics.' },
    { num: '02', title: 'Classify Use Types', desc: 'Tag units as Residential, Retail, Mall, or custom use types at any level of your hierarchy.' },
    { num: '03', title: 'Multi-Landlord Support', desc: 'Register single or multiple landlords at any level of your property hierarchy with ease.' },
    { num: '04', title: 'Automate Rent Increases', desc: 'Set escalation rules once and let Leazify apply them automatically — never miss an increase again.' },
    { num: '05', title: 'Auto Lease Renewal', desc: 'Generate renewals automatically based on rules you define. Fewer missed deadlines, happier tenants.' },
    { num: '06', title: 'Invoice Generation', desc: 'Create invoices for Rent, Service Charges and Security Deposits with a single click.' },
    { num: '07', title: 'Service & Maintenance', desc: 'Tenants raise requests, you raise work orders. Service providers receive them seamlessly.' },
    { num: '08', title: 'Mall Turnover Rent', desc: 'Record turnover and generate turnover rent invoices for retail and mall tenants effortlessly.' },
  ];

  const uspCards = [
    {
      icon: '👁️',
      title: 'Zero-Ownership View Access',
      items: [
        'Ideal for family trusts, joint ownership and mortgaged properties',
        'Beneficial owners see all milestones without edit rights',
        'Transparency without compromising data security',
      ],
    },
    {
      icon: '📝',
      title: 'Flexible Tenant Agreements',
      items: [
        'Create tenants and co-tenants easily',
        'Generate composite or individual tenancy agreements',
        'Perfect for shared spaces, franchises and multi-party leases',
      ],
    },
  ];

  const outcomes = [
    { icon: '📈', label: 'Better Cash Flow' },
    { icon: '🏠', label: 'Fewer Vacancies' },
    { icon: '😊', label: 'Happier Tenants' },
    { icon: '💰', label: 'Lower Operating Cost' },
    { icon: '📊', label: 'Data-Driven Decisions' },
  ];

  const trustItems = [
    { icon: '🔒', label: 'Bank-Grade Security' },
    { icon: '👤', label: 'Role-Based Access' },
    { icon: '☁️', label: 'Cloud · Accessible Anywhere' },
    { icon: '💾', label: 'Automatic Backups' },
    { icon: '⚡', label: 'Real-Time Dashboards' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root {
          --lp-navy:#1a2e4a; --lp-navy-mid:#1f3d63; --lp-navy-deep:#0d1c2e;
          --lp-orange:#F5A623; --lp-orange-dark:#e0911a;
          --lp-blue:#29ABE2; --lp-blue-dark:#1a90c8;
          --lp-cream:#f5f7fa; --lp-cream-warm:#fff9f2;
          --lp-slate:#7fb3d3; --lp-muted:#5a6a85;
          --lp-border:#d0e4f0;
        }
        .lp-root { font-family:'DM Sans',sans-serif; background:var(--lp-cream); color:var(--lp-navy-deep); overflow-x:hidden; }
        .lp-root ::-webkit-scrollbar{width:5px;}
        .lp-root ::-webkit-scrollbar-track{background:var(--lp-cream);}
        .lp-root ::-webkit-scrollbar-thumb{background:var(--lp-orange);border-radius:10px;}
        @keyframes lp-pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
        @keyframes lp-underline-in{to{transform:scaleX(1);}}
        @keyframes lp-fadeSlideUp{from{opacity:0;transform:translateY(32px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideUp{from{transform:translateY(40px);opacity:0;}to{transform:translateY(0);opacity:1;}}
        .lp-hero-content{animation:lp-fadeSlideUp 0.8s ease both;}
        .lp-hero-visual{animation:lp-fadeSlideUp 0.8s 0.2s ease both;}
        .lp-badge-dot{animation:lp-pulse 1.8s ease-in-out infinite;}
        .lp-hero-em{position:relative;}
        .lp-hero-em::after{content:'';position:absolute;left:0;bottom:-4px;width:100%;height:3px;background:var(--lp-orange);border-radius:2px;transform:scaleX(0);transform-origin:left;animation:lp-underline-in 0.6s 0.8s ease forwards;}
        .lp-nav-link{font-size:14px;font-weight:500;color:var(--lp-slate);text-decoration:none;letter-spacing:0.3px;transition:color 0.2s;}
        .lp-nav-link:hover{color:#fff;}
        .lp-challenge-card{background:#fff;border-radius:12px;padding:28px 28px 28px 32px;border-left:4px solid var(--lp-orange);box-shadow:0 4px 24px rgba(15,34,64,0.07);transition:transform 0.25s,box-shadow 0.25s;}
        .lp-challenge-card:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(15,34,64,0.12);}
        .lp-feature-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px 22px;transition:background 0.25s,transform 0.25s,border-color 0.25s;}
        .lp-feature-card:hover{background:rgba(255,255,255,0.08);transform:translateY(-4px);border-color:rgba(244,130,31,0.3);}
        .lp-usp-card{background:#fff;border:1px solid #ecdfd4;border-radius:16px;padding:32px;display:flex;gap:22px;transition:box-shadow 0.25s,transform 0.25s;}
        .lp-usp-card:hover{box-shadow:0 16px 48px rgba(244,130,31,0.1);transform:translateY(-3px);}
        .lp-outcome-card{text-align:center;background:var(--lp-cream);border-radius:12px;padding:32px 16px;border:1px solid transparent;transition:border-color 0.25s,transform 0.25s,background 0.25s;}
        .lp-outcome-card:hover{border-color:var(--lp-orange);transform:translateY(-6px);background:var(--lp-cream-warm);}
        .lp-btn-primary{background:var(--lp-orange);color:#fff;font-size:15px;font-weight:600;padding:16px 32px;border-radius:6px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.2s,transform 0.15s,box-shadow 0.2s;box-shadow:0 6px 28px rgba(244,130,31,0.35);}
        .lp-btn-primary:hover{background:var(--lp-orange-dark);transform:translateY(-2px);box-shadow:0 10px 36px rgba(244,130,31,0.45);}
        .lp-btn-dark{background:var(--lp-navy-deep);color:#fff;font-size:16px;font-weight:600;padding:18px 40px;border-radius:6px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.2s,transform 0.15s;box-shadow:0 8px 32px rgba(7,15,28,0.4);}
        .lp-btn-dark:hover{background:var(--lp-navy-mid);transform:translateY(-2px);}
        .lp-btn-blue{background:var(--lp-blue);color:#fff;font-size:13px;font-weight:600;padding:10px 22px;border-radius:6px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.2s,transform 0.15s;letter-spacing:0.2px;}
        .lp-btn-blue:hover{background:var(--lp-blue-dark);transform:translateY(-1px);}
        .lp-btn-ghost{background:transparent;color:var(--lp-slate);font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;border:1px solid rgba(127,179,211,0.4);cursor:pointer;font-family:'DM Sans',sans-serif;transition:color 0.2s,border-color 0.2s;}
        .lp-btn-ghost:hover{color:#fff;border-color:rgba(255,255,255,0.5);}
        .lp-animate-card{opacity:0;transform:translateY(20px);transition:opacity 0.5s ease,transform 0.5s ease;}
        .lp-screenshot{width:100%;border-radius:20px;box-shadow:0 40px 100px rgba(0,0,0,0.55);border:2px solid rgba(255,255,255,0.1);display:block;}
        .lp-float-card{position:absolute;right:-28px;bottom:-28px;background:var(--lp-orange);border-radius:12px;padding:14px 20px;box-shadow:0 16px 40px rgba(244,130,31,0.4);display:flex;align-items:center;gap:12px;}
        @media(max-width:768px){
          .lp-nav-links{display:none!important;}
          .lp-nav-links.open{display:flex!important;flex-direction:column;position:fixed;top:72px;left:0;right:0;background:var(--lp-navy-deep);padding:24px 6vw 32px;gap:24px;border-bottom:1px solid rgba(255,255,255,0.08);z-index:899;}
          .lp-hamburger{display:flex!important;}
          .lp-hero-visual{display:none!important;}
          .lp-hero-grid{grid-template-columns:1fr!important;}
          .lp-challenges-grid{grid-template-columns:1fr!important;}
          .lp-features-grid{grid-template-columns:1fr 1fr!important;}
          .lp-usp-grid{grid-template-columns:1fr!important;}
          .lp-outcomes-grid{grid-template-columns:repeat(2,1fr)!important;}
          .lp-footer-top{flex-direction:column!important;}
          .lp-footer-links{gap:36px!important;}
          .lp-float-card{display:none!important;}
        }
        @media(max-width:480px){
          .lp-features-grid{grid-template-columns:1fr!important;}
          .lp-outcomes-grid{grid-template-columns:1fr 1fr!important;}
        }
        @media(min-width:1025px){
          .lp-features-grid{grid-template-columns:repeat(4,1fr)!important;}
          .lp-outcomes-grid{grid-template-columns:repeat(5,1fr)!important;}
        }
        @media(max-width:1024px) and (min-width:769px){
          .lp-features-grid{grid-template-columns:repeat(2,1fr)!important;}
          .lp-outcomes-grid{grid-template-columns:repeat(3,1fr)!important;}
        }
      `}</style>

      <div className="lp-root">

        {/* ── NAV ── */}
        <nav
          ref={navRef}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 6vw', height: 72,
            background: scrolled ? 'rgba(7,15,28,0.97)' : 'rgba(7,15,28,0.88)',
            backdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(244,130,31,0.12)',
            transition: 'background 0.3s',
          }}
        >
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: '#F5A623', letterSpacing: -1 }}>
            Leaz<span style={{ color: '#29ABE2' }}>ify</span>
          </div>

          <div className={`lp-nav-links${navOpen ? ' open' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <a href="#problems" className="lp-nav-link" onClick={() => setNavOpen(false)}>Challenges</a>
            <a href="#features" className="lp-nav-link" onClick={() => setNavOpen(false)}>Features</a>
            <a href="#usp" className="lp-nav-link" onClick={() => setNavOpen(false)}>Why Leazify</a>
            <a href="#outcomes" className="lp-nav-link" onClick={() => setNavOpen(false)}>Outcomes</a>
            <a href="#contact" className="lp-nav-link" onClick={() => setNavOpen(false)}>Contact</a>
            <button className="lp-btn-ghost" onClick={() => { router.push('/sign-up-login-screen'); setNavOpen(false); }}>Sign In</button>
            <button className="lp-btn-blue" onClick={() => { setShowDemo(true); setNavOpen(false); }}>Book a Demo</button>
          </div>

          {/* Hamburger */}
          <div
            className="lp-hamburger"
            style={{ display: 'none', flexDirection: 'column', gap: 5, cursor: 'pointer', padding: 4 }}
            onClick={() => setNavOpen(o => !o)}
          >
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{
          minHeight: '100vh',
          background: 'linear-gradient(140deg,#0d1c2e 0%,#1a2e4a 45%,#132d52 70%,#0d1c2e 100%)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          padding: '120px 6vw 80px',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -120, right: -120, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(244,130,31,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -200, left: -100, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(26,58,107,0.6) 0%,transparent 70%)', pointerEvents: 'none' }} />

          <div className="lp-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', maxWidth: 1280, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
            {/* Left */}
            <div className="lp-hero-content">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(41,171,226,0.12)', border: '1px solid rgba(41,171,226,0.35)', color: '#29ABE2', fontSize: 11, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 40, marginBottom: 28 }}>
                <span className="lp-badge-dot" style={{ fontSize: 8 }}>●</span> One Smart Platform
              </div>

              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,3.5vw,52px)', lineHeight: 1.15, color: '#fff', marginBottom: 24, letterSpacing: -1 }}>
                Leasing Management Software
              </h1>

              <p style={{ fontSize: 17, color: '#7fb3d3', lineHeight: 1.75, maxWidth: 440, marginBottom: 40, fontWeight: 300 }}>
                Every lease type. Every ownership structure. Every invoice — automated. Built for landlords who owns and manages mixed use properties
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <button className="lp-btn-primary" onClick={() => setShowDemo(true)}>Book a Free Demo</button>
                <a href="#features" style={{ color: '#fff', fontSize: 15, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, opacity: 0.75, transition: 'opacity 0.2s,gap 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.gap = '12px'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.gap = '8px'; }}
                >Explore Features →</a>
              </div>
            </div>

            {/* Right — screenshot */}
            <div className="lp-hero-visual" style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src="/assets/images/dashboard_screenshot-1779421613971.jpg"
                  alt="Leazify Rental Application Dashboard showing rental management overview"
                  className="lp-screenshot"
                />
                <div className="lp-float-card">
                  <span style={{ fontSize: 22 }}>📈</span>
                  <div style={{ color: '#fff' }}>
                    <strong style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>Rent Escalation Applied</strong>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>3 leases auto-renewed today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST STRIP ── */}
        <div style={{ background: '#0d1c2e', padding: '20px 6vw', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(20px,4vw,60px)', flexWrap: 'wrap' }}>
          {trustItems.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: '#7fb3d3', letterSpacing: '0.3px' }}>
              <span style={{ fontSize: 16, color: '#F5A623' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        {/* ── PROBLEMS ── */}
        <section id="problems" style={{ padding: '96px 6vw' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#F5A623', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>The Problem</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px,3.5vw,48px)', color: '#1a2e4a', lineHeight: 1.2, letterSpacing: -1, marginBottom: 16 }}>
              Sound Familiar?<br />You&apos;re Not Alone.
            </h2>
            <p style={{ fontSize: 16, color: '#5a6a85', lineHeight: 1.7, maxWidth: 520, marginBottom: 56, fontWeight: 300 }}>
              Managing a property portfolio without the right tools is exhausting. Here&apos;s what landlords deal with every day.
            </p>
            <div className="lp-challenges-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
              {challenges.map(c => (
                <div key={c.title} className="lp-challenge-card lp-animate-card">
                  <div style={{ fontSize: 26, marginBottom: 14 }}>{c.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a2e4a', marginBottom: 8 }}>{c.title}</h3>
                  <p style={{ fontSize: 14, color: '#5a6a85', lineHeight: 1.65 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ background: '#1a2e4a', padding: '96px 6vw', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 80% 50%,rgba(244,130,31,0.06) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#F5A623', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>Everything You Need</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px,3.5vw,48px)', color: '#fff', lineHeight: 1.2, letterSpacing: -1, marginBottom: 16 }}>
              All Your Leasing Milestones.<br />One Platform.
            </h2>
            <p style={{ fontSize: 16, color: '#7fb3d3', lineHeight: 1.7, maxWidth: 520, marginBottom: 56, fontWeight: 300 }}>
              From first key handover to final invoice — every workflow you need, built in from day one.
            </p>
            <div className="lp-features-grid" style={{ display: 'grid', gap: 16 }}>
              {features.map(f => (
                <div key={f.num} className="lp-feature-card lp-animate-card">
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#F5A623', letterSpacing: 2, marginBottom: 10 }}>{f.num}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 8, lineHeight: 1.4 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: '#7fb3d3', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── USP ── */}
        <section id="usp" style={{ background: '#fff9f2', padding: '96px 6vw', borderTop: '1px solid #f4e4d0' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#F5A623', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>Our Unique Advantage</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px,3.5vw,48px)', color: '#1a2e4a', lineHeight: 1.2, letterSpacing: -1, marginBottom: 16 }}>
              Built for the Way<br />Landlords Actually Work
            </h2>
            <div className="lp-usp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 16 }}>
              {uspCards.map(card => (
                <div key={card.title} className="lp-usp-card lp-animate-card">
                  <div style={{ flexShrink: 0, width: 48, height: 48, background: '#F5A623', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a2e4a', marginBottom: 14, lineHeight: 1.3 }}>{card.title}</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {card.items.map(item => (
                        <li key={item} style={{ fontSize: 14, color: '#5a6a85', paddingLeft: 18, position: 'relative', lineHeight: 1.55 }}>
                          <span style={{ position: 'absolute', left: 0, color: '#F5A623', fontWeight: 700, fontSize: 12, top: 1 }}>✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── OUTCOMES ── */}
        <section id="outcomes" style={{ background: '#fff', padding: '96px 6vw' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#F5A623', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>The Result</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px,3.5vw,48px)', color: '#1a2e4a', lineHeight: 1.2, letterSpacing: -1, marginBottom: 16 }}>
              What Leazify Delivers for You
            </h2>
            <div className="lp-outcomes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginTop: 48 }}>
              {outcomes.map(o => (
                <div key={o.label} className="lp-outcome-card lp-animate-card">
                  <span style={{ fontSize: 32, marginBottom: 14, display: 'block' }}>{o.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2e4a', lineHeight: 1.4 }}>{o.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{
          background: 'linear-gradient(135deg,#F5A623 0%,#e0911a 100%)',
          padding: '100px 6vw', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='28'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(34px,4vw,54px)', color: '#fff', letterSpacing: -1.5, marginBottom: 18, lineHeight: 1.1 }}>
              Take Control of Your Rentals Today
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: 36, fontWeight: 300 }}>
              Join landlords who&apos;ve moved from scattered spreadsheets to a single, transparent platform. Your portfolio — managed the way it deserves to be.
            </p>
            <button className="lp-btn-dark" onClick={() => setShowDemo(true)}>Book a Free Demo</button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background: '#0d1c2e', padding: '56px 6vw 28px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div className="lp-footer-top" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 40, marginBottom: 48, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, color: '#F5A623', letterSpacing: -1, marginBottom: 12 }}>
                  Leaz<span style={{ color: '#29ABE2' }}>ify</span>
                </div>
                <p style={{ fontSize: 13, color: '#7fb3d3', lineHeight: 1.7, maxWidth: 260 }}>
                  Complete leasing control for landlords — from first key to final invoice.
                </p>
              </div>
              <div className="lp-footer-links" style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 600, color: '#F5A623', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18 }}>Product</h4>
                  {[{ label: 'Features', href: '#features' }, { label: 'Why Leazify', href: '#usp' }, { label: 'Outcomes', href: '#outcomes' }].map(l => (
                    <a key={l.label} href={l.href} style={{ display: 'block', fontSize: 13, color: '#7fb3d3', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#7fb3d3')}
                    >{l.label}</a>
                  ))}
                </div>
                <div id="contact">
                  <h4 style={{ fontSize: 11, fontWeight: 600, color: '#F5A623', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18 }}>Contact</h4>
                  <a href="https://www.leazify.me" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 13, color: '#7fb3d3', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#7fb3d3')}
                  >www.leazify.me</a>
                  <a href="mailto:contact@sixera.in" style={{ display: 'block', fontSize: 13, color: '#7fb3d3', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#7fb3d3')}
                  >contact@sixera.in</a>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 12, color: '#3d5068' }}>© {currentYear} Leazify. All rights reserved.</p>
              <p style={{ fontSize: 12, color: '#3d5068' }}>
                <a href="#" style={{ color: '#3d5068', textDecoration: 'none' }}>Privacy Policy</a>
                {' · '}
                <a href="#" style={{ color: '#3d5068', textDecoration: 'none' }}>Terms of Service</a>
              </p>
            </div>
          </div>
        </footer>

      </div>

      {/* Modals */}
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </>
  );
}
