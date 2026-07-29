"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const marketBars = [36, 54, 42, 68, 58, 78, 64, 88, 72, 96, 82, 100];

export default function Home() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Opening the dataset control center…");
    router.push("/admin");
  }

  return (
    <main className="login-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grid-overlay" />

      <header className="site-header">
        <a className="brand" href="#" aria-label="NaviWealth home">
          <span className="brand-mark" aria-hidden="true">
            <span>N</span>
          </span>
          <span>NaviWealth</span>
        </a>
        <div className="system-pill">
          <span className="status-dot" aria-hidden="true" />
          SYSTEM ONLINE
        </div>
      </header>

      <div className="login-shell">
        <section className="story-panel" aria-labelledby="story-title">
          <div className="season-pill">
            <span className="season-spark" aria-hidden="true">
              ✦
            </span>
            SEASON 1 IS NOW LIVE
          </div>

          <div className="story-copy">
            <p className="eyebrow">NAViWEALTH CONTROL CENTER</p>
            <h1 id="story-title">
              Shape the simulation.
              <span>Control every outcome.</span>
            </h1>
            <p className="story-description">
              Curate reusable stock and event datasets, validate every package,
              and keep each game running from one trusted source.
            </p>
          </div>

          <div className="market-card">
            <div className="market-card-header">
              <div>
                <p>DATASET SNAPSHOT</p>
                <span>Current content library</span>
              </div>
              <div className="live-badge">
                <span className="status-dot" />
                LIVE
              </div>
            </div>

            <div className="market-stats">
              <div>
                <span>Active events</span>
                <strong className="negative">91</strong>
              </div>
              <div>
                <span>Stock records</span>
                <strong className="warning">8</strong>
              </div>
              <div>
                <span>Reusable sets</span>
                <strong className="cyan">8 / 30</strong>
              </div>
            </div>

            <div className="chart" aria-label="Decorative live market chart">
              {marketBars.map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="trust-row">
            <div className="avatar-stack" aria-hidden="true">
              <span>AR</span>
              <span>MK</span>
              <span>JL</span>
            </div>
            <p>
              <strong>Reusable by design</strong>
              one dataset library across every game
            </p>
          </div>
        </section>

        <section className="form-column" aria-labelledby="login-title">
          <div className="login-card">
            <div className="card-accent" />
            <div className="login-heading">
              <span className="login-icon" aria-hidden="true">
                <i />
              </span>
              <div>
                <p className="eyebrow">ADMIN ACCESS</p>
                <h2 id="login-title">Welcome back</h2>
              </div>
            </div>

            <p className="login-intro">
              Sign in to manage reusable game datasets and validation.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="field">
                <span>Email address</span>
                <input
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <span className="password-input">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>

              <div className="form-options">
                <label className="remember">
                  <input type="checkbox" name="remember" />
                  <span>Remember me</span>
                </label>
                <a href="#forgot-password">Forgot password?</a>
              </div>

              <button className="submit-button" type="submit">
                <span>Open admin portal</span>
                <span aria-hidden="true">→</span>
              </button>

              <p className="form-message" aria-live="polite">
                {message}
              </p>
            </form>

            <div className="divider">
              <span>Need a new administrator?</span>
            </div>

            <a className="secondary-button" href="#create-account">
              Request workspace access
            </a>

            <p className="legal-copy">
              By continuing, you agree to our <a href="#terms">Terms</a> and{" "}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>

          <div className="secure-note">
            <span className="lock" aria-hidden="true" />
            <span>Protected administrator access</span>
          </div>
        </section>
      </div>

      <footer>
        <span>© 2026 NaviWealth</span>
        <span>MASTER MONEY. WIN FREEDOM.</span>
      </footer>
    </main>
  );
}
