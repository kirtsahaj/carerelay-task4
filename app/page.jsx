'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const samples = [
  {
    label: 'Doctor visit',
    text: "Dad's physio went fine today. Doctor said continue the same exercises. His medicines finish Thursday. I cannot go to the pharmacy tomorrow. Rohan said he would check the insurance paperwork. Dad also said he misses Mom.",
  },
  {
    label: 'Hinglish update',
    text: 'Mum ka check-up ho gaya. Doctor ne bola same routine continue karo. Reports kal collect karni hain. Main office mein rahunga, can someone pick them up? Mum ne bola Meera weekend pe call kare.',
  },
  {
    label: 'No action needed',
    text: 'Dad had breakfast, took the medicines already prescribed by his doctor, and watched cricket with his friend. Nothing is pending today.',
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon small">
      <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon small">
      <path d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8.5c.2 2 2.1 4.1 4.2 4.7.5.1 1.1-.3 1.4-.8l.4-.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return <span className="spark" aria-hidden="true">✦</span>;
}

function OutputList({ items }) {
  if (!items?.length) return <p className="emptyState">Nothing to add here.</p>;
  return (
    <div className="outputList">
      {items.map((item, index) => (
        <div className="outputLine" key={`${item}-${index}`}>
          <CheckIcon />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ActionList({ items, carried = false }) {
  if (!items?.length) return <p className="emptyState">No open actions identified.</p>;
  return (
    <div className="actionList">
      {items.map((item, index) => (
        <div className="actionLine" key={`${item.task}-${index}`}>
          <div>
            <strong>{item.task}</strong>
            <span>{carried ? item.source : item.deadline || 'No deadline stated'}</span>
          </div>
          <span className={carried ? 'carryTag' : 'openTag'}>{carried ? 'Carried forward' : 'Open'}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState(samples[0].text);
  const [handoff, setHandoff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [visitorId, setVisitorId] = useState('');
  const [stats, setStats] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const existing = window.localStorage.getItem('carerelayVisitorId');
    const next = existing || (window.crypto?.randomUUID?.() ?? `visitor-${Date.now()}`);
    window.localStorage.setItem('carerelayVisitorId', next);
    setVisitorId(next);

    fetch('/api/stats', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setStats({ handoffs: Number(data.handoffsOrganised) || 0, actions: Number(data.actionsSurfaced) || 0 }))
      .catch(() => setStats({ handoffs: 0, actions: 0 }));
  }, []);

  const charCount = input.length;
  const whatsappText = handoff?.whatsapp_message || '';

  const shareLabel = useMemo(() => (copied ? 'Copied' : 'Copy for WhatsApp'), [copied]);

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  async function organise() {
    setError('');
    setCopied(false);
    setLoading(true);
    try {
      const response = await fetch('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, visitorId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not organise this update.');
      setHandoff(data.handoff);
      if (!data.handoff?.refused) {
        const actionCount = data.handoff?.needs_someone?.length || 0;
        setStats((value) => value ? { handoffs: value.handoffs + 1, actions: value.actions + actionCount } : value);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function copyWhatsApp() {
    if (!whatsappText) return;
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareUpdate() {
    if (!whatsappText) return;
    if (navigator.share) {
      await navigator.share({ text: whatsappText });
      return;
    }
    await copyWhatsApp();
  }

  function toggleVoice() {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. You can type the update instead.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) setInput((current) => `${current ? `${current} ` : ''}${transcript}`.slice(0, 1800));
    };
    recognition.onerror = () => setError('Voice input could not start. Please type the update instead.');
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setError('');
    setListening(true);
  }

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="CareRelay home">
          <span className="brandMark">C</span>
          <span>CareRelay</span>
        </a>
        <div className="navLinks">
          <a href="#how">How it works</a>
          <a href="#why">Why CareRelay</a>
          <button className="button compact" onClick={scrollToDemo}>Try CareRelay</button>
        </div>
      </nav>

      <section id="top" className="hero shell">
        <div className="heroCopy">
          <div className="eyebrow">For the person who keeps everyone in the loop</div>
          <h1>Get the update out of your head. <span>Get the family on the same page.</span></h1>
          <p className="heroText">
            CareRelay turns a messy caregiver brain-dump into a clear family update with actions everyone can understand, then gives you something ready to share.
          </p>
          <div className="heroActions">
            <button className="button" onClick={scrollToDemo}>Try CareRelay <ArrowIcon /></button>
            <span className="microcopy"><WhatsAppIcon /> Built around the WhatsApp group you already use.</span>
          </div>
          <div className="metricRow">
            <div className="liveMetric"><strong>{stats === null ? '…' : stats.handoffs.toLocaleString()}</strong><span>family handoffs organised</span></div>
            <div className="liveMetric"><strong>{stats === null ? '…' : stats.actions.toLocaleString()}</strong><span>coordination actions surfaced</span></div>
          </div>
        </div>

        <div className="heroVisual" aria-label="CareRelay example handoff">
          <div className="phoneCard">
            <div className="phoneTop">
              <span className="dot"></span>
              <span>Dad&apos;s update</span>
              <span className="statusPill">Ready to share</span>
            </div>
            <div className="updateBlock">
              <p className="miniLabel">WHAT HAPPENED</p>
              <div className="lineItem"><CheckIcon /><span>Physio completed</span></div>
              <div className="lineItem"><CheckIcon /><span>Continue the same exercises</span></div>
            </div>
            <div className="updateBlock lavender">
              <p className="miniLabel">WORTH KNOWING</p>
              <p>Dad said he misses Mom today.</p>
            </div>
            <div className="updateBlock orange">
              <p className="miniLabel">NEEDS SOMEONE</p>
              <div className="taskRow"><span>Pick up medicines</span><span className="claim">Open</span></div>
              <div className="taskRow"><span>Insurance follow-up</span><span className="claim">Open</span></div>
            </div>
            <button className="shareMock"><WhatsAppIcon /> Copy for WhatsApp</button>
          </div>
          <div className="floatingNote noteOne">WhatsApp-ready output</div>
          <div className="floatingNote noteTwo">Report, don&apos;t diagnose</div>
        </div>
      </section>

      <section className="problemBand">
        <div className="shell problemGrid">
          <div>
            <div className="eyebrow dark">THE REAL PROBLEM</div>
            <h2>Every family seems to have a default caregiver.</h2>
            <p>
              The person who knows when the medicines finish, remembers the next appointment, updates everyone after the doctor visit and quietly keeps track of what still has not been done.
            </p>
          </div>
          <div className="whatsappScene">
            <div className="chatBubble">Dad&apos;s medicines finish Thursday. Can someone please pick them up?</div>
            <div className="reactions"><span>👍</span><span>👍</span><span>👍</span></div>
            <div className="thursday">Thursday arrives.</div>
            <div className="nobody">Nobody bought them.</div>
            <p>The problem is not that your family does not care. Sometimes, acknowledgement looks like accountability until the task is missed.</p>
          </div>
        </div>
      </section>

      <section id="how" className="section shell">
        <div className="sectionHeader">
          <div className="eyebrow">HOW IT WORKS</div>
          <h2>One simple flow from messy update to shared clarity.</h2>
          <p>CareRelay organises what you say. It does not interpret medical information or tell you what treatment to take.</p>
        </div>
        <div className="steps">
          <article className="stepCard">
            <span className="stepNo">01</span>
            <h3>Brain-dump</h3>
            <p>Type naturally, or use browser voice input when available. English and mixed Hinglish both work.</p>
          </article>
          <article className="stepCard featuredStep">
            <span className="stepNo">02</span>
            <h3>CareRelay organises it</h3>
            <p>Gemini separates updates, family context and open coordination actions into one clear family-ready message.</p>
          </article>
          <article className="stepCard">
            <span className="stepNo">03</span>
            <h3>Share with family</h3>
            <p>Review the handoff and copy or share a concise WhatsApp-ready message.</p>
          </article>
        </div>
      </section>

      <section id="demo" className="demoSection">
        <div className="shell">
          <div className="sectionHeader narrow">
            <div className="eyebrow">TRY THE LIVE AI FEATURE</div>
            <h2>Brain-dump. CareRelay handles the handoff.</h2>
            <p>Use a sample or enter your own non-emergency family update. Please avoid sharing highly sensitive personal information.</p>
          </div>

          <div className="sampleSwitcher" role="group" aria-label="Choose sample update">
            {samples.map((sample) => (
              <button
                key={sample.label}
                className="sample"
                onClick={() => {
                  setInput(sample.text);
                  setHandoff(null);
                  setError('');
                }}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div className="demoGrid functionalGrid">
            <div className="inputPanel">
              <div className="panelTop">
                <span>Your brain-dump</span>
                <button className={listening ? 'voiceButton listening' : 'voiceButton'} onClick={toggleVoice} type="button">
                  {listening ? '● Listening…' : '● Voice input'}
                </button>
              </div>
              <textarea
                className="liveTextarea"
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 1800))}
                placeholder="Tell CareRelay what happened today…"
                maxLength={1800}
              />
              <div className="inputMeta">
                <span>{charCount}/1800</span>
                <span>Maximum 3 demo requests per visitor</span>
              </div>
              {error ? <div className="errorBox">{error}</div> : null}
              <button className="button full" onClick={organise} disabled={loading || input.trim().length < 8}>
                {loading ? <><SparkIcon /> Organising…</> : <>Organise this update <ArrowIcon /></>}
              </button>
            </div>

            <div className="outputPanel liveOutput">
              <div className="panelTop">
                <span>CareRelay handoff</span>
                <span className="statusPill">{handoff ? (handoff.refused ? 'Safety response' : 'Generated') : 'Waiting'}</span>
              </div>

              {!handoff ? (
                <div className="waitingState">
                  <SparkIcon />
                  <h3>Your structured handoff will appear here.</h3>
                  <p>CareRelay will only use facts you provide and will not diagnose or recommend treatment.</p>
                </div>
              ) : handoff.refused ? (
                <div className="refusalBox">
                  <p className="miniLabel">MEDICAL-ADVICE GUARDRAIL</p>
                  <h3>{handoff.title}</h3>
                  <p>{handoff.refusal_message}</p>
                </div>
              ) : (
                <>
                  <h3 className="handoffTitle">{handoff.title}</h3>
                  <div className="resultGroup">
                    <p className="miniLabel">WHAT HAPPENED</p>
                    <OutputList items={handoff.what_happened} />
                  </div>
                  <div className="resultGroup softPurple">
                    <p className="miniLabel">WORTH KNOWING</p>
                    <OutputList items={handoff.worth_knowing} />
                  </div>
                  <div className="resultGroup softOrange">
                    <p className="miniLabel">NEEDS SOMEONE</p>
                    <ActionList items={handoff.needs_someone} />
                  </div>
                  <div className="whatsappPreview">
                    <p className="miniLabel">WHATSAPP-READY</p>
                    <p>{handoff.whatsapp_message}</p>
                  </div>
                  <div className="outputActions">
                    <button className="secondary" onClick={copyWhatsApp}><WhatsAppIcon /> {shareLabel}</button>
                    <button className="outlineButton" onClick={shareUpdate}>Share</button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="safetyStrip">
            <strong>CareRelay organises. It does not diagnose.</strong>
            <span>For diagnosis, treatment, medication or urgent medical concerns, contact an appropriate healthcare professional or local emergency service.</span>
          </div>
        </div>
      </section>

      <section id="why" className="section shell">
        <div className="sectionHeader">
          <div className="eyebrow">BUILT FOR REAL FAMILIES</div>
          <h2>Less coordination overhead. More shared context.</h2>
        </div>
        <div className="benefits">
          <article><div className="benefitIcon">↗</div><h3>WhatsApp-ready</h3><p>CareRelay produces something you can take back to the family group instead of replacing where your family already talks.</p></article>
          <article><div className="benefitIcon">✓</div><h3>Makes actions visible</h3><p>CareRelay separates what the family should know from what somebody actually needs to do.</p></article>
          <article><div className="benefitIcon">○</div><h3>No sibling onboarding</h3><p>The core AI experience works for the caregiver without requiring everyone else to create an account.</p></article>
          <article><div className="benefitIcon">+</div><h3>Report, don&apos;t diagnose</h3><p>CareRelay is deliberately constrained to family coordination and refuses diagnosis, treatment and medication advice.</p></article>
        </div>
      </section>

      <section className="closing shell">
        <div className="closingCard">
          <div>
            <div className="eyebrow dark">CARE IS SHARED</div>
            <h2>The coordination should be too.</h2>
            <p>Spend less energy rewriting the update and more energy where it matters.</p>
          </div>
          <button className="button darkButton" onClick={scrollToDemo}>Try CareRelay <ArrowIcon /></button>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand" href="#top"><span className="brandMark">C</span><span>CareRelay</span></a>
        <p>CareRelay does not provide medical advice. Do not use it for diagnosis, treatment decisions or emergencies.</p>
        <span>Family coordination, made lighter.</span>
      </footer>
    </main>
  );
}
