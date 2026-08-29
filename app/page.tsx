'use client';

import { useMemo, useState } from 'react';

const sponsors = [
  { name: 'Railway', copy: 'Ship your next backend without babysitting infrastructure.', cta: 'Explore Railway' },
  { name: 'Neon', copy: 'Serverless Postgres built for modern developer workflows.', cta: 'Try Neon' },
  { name: 'Sentry', copy: 'Find and fix production issues before your users do.', cta: 'Open Sentry' },
];

export default function Home() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [earnings, setEarnings] = useState(0.0184);
  const [impressions, setImpressions] = useState(7);
  const sponsor = useMemo(() => sponsors[impressions % sponsors.length], [impressions]);

  function simulateTask() {
    if (running) return;
    setRunning(true);
    setCompleted(false);
    window.setTimeout(() => {
      setRunning(false);
      setCompleted(true);
      setImpressions((value) => value + 1);
      setEarnings((value) => Number((value + 0.0024).toFixed(4)));
    }, 5500);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">WAITADS / DEV PREVIEW</div>
          <h1>Get rewarded while your AI agent works.</h1>
          <p>Opt-in sponsor cards shown only during agent wait time. No source code or raw prompts are shared with advertisers.</p>
        </div>
        <div className="wallet">
          <span>Balance</span>
          <strong>${earnings.toFixed(4)}</strong>
          <small>{impressions} verified impressions</small>
        </div>
      </header>

      <section className="workspace">
        <div className="agentPanel">
          <div className="panelHeader">
            <div>
              <span className={`statusDot ${running ? 'active' : ''}`} />
              <span>{running ? 'Codex is working' : completed ? 'Task completed' : 'Ready for a task'}</span>
            </div>
            <span className="privacy">privacy-first</span>
          </div>

          <div className="promptMock">Refactor the authentication middleware and run the test suite.</div>

          <div className="activity">
            <div className={running ? 'pulseLine' : ''} />
            <div>
              <strong>{running ? 'Running agent workflow…' : completed ? 'Completed successfully' : 'Waiting to start'}</strong>
              <p>{running ? 'Sponsor inventory is eligible while this turn is active.' : 'Simulate a Codex turn to test the monetization flow.'}</p>
            </div>
          </div>

          <button type="button" onClick={simulateTask} disabled={running}>
            {running ? 'Agent running…' : 'Simulate Codex task'}
          </button>
        </div>

        <aside className={`sponsorCard ${running ? 'visible' : ''}`}>
          <div className="sponsored">SPONSORED</div>
          {running ? (
            <>
              <div className="sponsorLogo">{sponsor.name.slice(0, 1)}</div>
              <h2>{sponsor.name}</h2>
              <p>{sponsor.copy}</p>
              <div className="rewardRow"><span>Estimated reward</span><strong>+$0.0024</strong></div>
              <button type="button" className="secondary">{sponsor.cta}</button>
            </>
          ) : (
            <div className="emptyAd">
              <strong>No ad occupying your workspace.</strong>
              <p>A sponsor appears only while an eligible agent task is actively running.</p>
            </div>
          )}
        </aside>
      </section>

      <section className="metrics">
        <div><span>Mode</span><strong>Earn mode</strong></div>
        <div><span>Revenue split</span><strong>40% user</strong></div>
        <div><span>Current integration</span><strong>Simulated events</strong></div>
        <div><span>Next integration</span><strong>Codex event stream</strong></div>
      </section>
    </main>
  );
}
