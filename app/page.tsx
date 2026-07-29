"use client";

import { FormEvent, useState } from "react";

const marketBars = [36, 54, 42, 68, 58, 78, 64, 88, 72, 96, 82, 100];

export default function Home() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Demo mode: your authentication service can be connected here.");
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
            <p className="eyebrow">YOUR FINANCIAL JOURNEY CONTINUES</p>
            <h1 id="story-title">
              Don&apos;t just learn finance.
              <span>Live it.</span>
            </h1>
            <p className="story-description">
              Make the next move in your wealth story. Your portfolio, career,
              and financial freedom are waiting.
            </p>
          </div>

          <div className="market-card">
            <div className="market-card-header">
              <div>
                <p>SIMULATION SNAPSHOT</p>
                <span>Live market conditions</span>
              </div>
              <div className="live-badge">
                <span className="status-dot" />
                LIVE
              </div>
            </div>

            <div className="market-stats">
              <div>
                <span>Market volatility</span>
                <strong className="negative">+12.4%</strong>
              </div>
              <div>
                <span>Inflation rate</span>
                <strong className="warning">3.2%</strong>
              </div>
              <div>
                <span>Active players</span>
                <strong className="cyan">12,405</strong>
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
              <strong>12,000+ players</strong>
              building smarter money habits
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
                <p className="eyebrow">PLAYER ACCESS</p>
                <h2 id="login-title">Welcome back</h2>
              </div>
            </div>

            <p className="login-intro">
              Sign in to continue building your financial future.
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
                <span>Enter the simulation</span>
                <span aria-hidden="true">→</span>
              </button>

              <p className="form-message" aria-live="polite">
                {message}
              </p>
            </form>

            <div className="divider">
              <span>New to NaviWealth?</span>
            </div>

            <a className="secondary-button" href="#create-account">
              Create your player profile
            </a>

            <p className="legal-copy">
              By continuing, you agree to our <a href="#terms">Terms</a> and{" "}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>

          <div className="secure-note">
            <span className="lock" aria-hidden="true" />
            <span>256-bit encrypted player access</span>
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
