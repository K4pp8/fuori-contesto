import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Copy,
  Crown,
  Github,
  HelpCircle,
  Layers,
  Monitor,
  Plus,
  QrCode,
  Radio,
  RotateCcw,
  Settings2,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type { Command, DeckInfo, Reply, Session, View } from '../shared/types';
import './style.css';
const socket = io({ autoConnect: false });
type Config = { decks: DeckInfo[]; publicUrl: string | null; lanUrls: string[] };
function send<T>(event: string, data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit(event, data, (err: Error | null, result: Reply<T>) => {
      if (err) reject(new Error('Il server non risponde. Controlla la connessione.'));
      else if (result.ok) resolve(result.data);
      else reject(new Error(result.error));
    });
  });
}
function saved(code: string): Session | null {
  try {
    return JSON.parse(localStorage.getItem(`fc:${code}`) ?? 'null');
  } catch {
    return null;
  }
}
const routeCode = () => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}
function App() {
  const [config, setConfig] = useState<Config | null>(null),
    [view, setView] = useState<View | null>(null),
    [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [connected, setConnected] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'create' | 'join' | 'rules' | 'rename' | 'manage' | null>(
    routeCode() ? 'join' : null,
  );
  const [name, setName] = useState(''),
    [code, setCode] = useState(routeCode()),
    [deckId, setDeckId] = useState('fuori-contesto-it'),
    [target, setTarget] = useState(7),
    [selected, setSelected] = useState<string[]>([]);
  const [qr, setQr] = useState(''),
    [baseUrl, setBaseUrl] = useState(location.origin),
    [confirmation, setConfirmation] = useState<Command | null>(null);
  const [recovery, setRecovery] = useState(false);
  const panelRef = useRef<HTMLDialogElement>(null);
  function remember(s: Session) {
    localStorage.setItem(`fc:${s.code}`, JSON.stringify(s));
    sessionRef.current = s;
    setSession(s);
    setCode(s.code);
    history.replaceState(null, '', `/?room=${s.code}`);
  }
  useEffect(() => {
    fetch('/api/config')
      .then((r) => {
        if (!r.ok) throw new Error('Configurazione non disponibile.');
        return r.json();
      })
      .then((c: Config) => {
        setConfig(c);
        setBaseUrl(
          c.publicUrl ??
            (['localhost', '127.0.0.1'].includes(location.hostname)
              ? (c.lanUrls[0] ?? location.origin)
              : location.origin),
        );
      })
      .catch((e) => setError(e.message));
    const initial = saved(routeCode());
    if (initial) {
      sessionRef.current = initial;
      setSession(initial);
      setModal(null);
    }
    async function connect() {
      setConnected(true);
      const s = sessionRef.current;
      if (s) {
        try {
          await send('resume', s);
          setRecovery(false);
        } catch (e) {
          setError((e as Error).message);
          setRecovery(true);
        }
      }
    }
    function state(v: View) {
      setView(v);
    }
    socket.on('connect', connect);
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', state);
    socket.connect();
    return () => {
      socket.off('connect', connect);
      socket.off('state', state);
      socket.off('disconnect');
      socket.disconnect();
    };
  }, []);
  useEffect(() => {
    setSelected([]);
  }, [view?.round, view?.phase]);
  useEffect(() => {
    if (modal || confirmation) {
      panelRef.current?.showModal();
    } else panelRef.current?.close();
  }, [modal, confirmation]);
  useEffect(() => {
    if (!view) return;
    QRCode.toDataURL(`${baseUrl}/?room=${view.code}`, {
      width: 256,
      margin: 2,
      color: { dark: '#22251f', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setError('Impossibile generare il QR. Usa il codice stanza.'));
  }, [view?.code, baseUrl]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function command(c: Command) {
    await run(async () => {
      if (!view) return;
      await send('command', { command: c, revision: view.revision });
      setConfirmation(null);
      if (c.type === 'rename') {
        setModal(null);
        setNotice('Nome aggiornato.');
      }
    });
  }
  const judge = view?.players.find((p) => p.id === view.judgeId),
    isJudge = view?.me?.id === view?.judgeId;
  const playing = view?.phase === 'playing',
    submitted = view?.me?.submitted;
  const joinUrl = view ? `${baseUrl}/?room=${view.code}` : '';
  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setNotice('Link copiato. Ci vediamo al tavolo.');
    } catch {
      setNotice('Seleziona e copia il link sotto il QR.');
    }
  }
  function close() {
    setModal(null);
    setConfirmation(null);
  }
  function rejoin() {
    localStorage.removeItem(`fc:${code}`);
    sessionRef.current = null;
    setSession(null);
    setView(null);
    setRecovery(false);
    setModal('join');
  }
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Fuori Contesto, home">
          <Mark />
          <span>
            fuori contesto<span className="brand-dot">.</span>
          </span>
        </a>
        <nav>
          <span className="connection">
            <span className={connected ? 'status-dot' : 'status-dot offline'} />
            {connected ? 'Il tavolo è aperto' : 'Connessione…'}
          </span>
          <button
            className="icon-button"
            onClick={() => setModal('rules')}
            aria-label="Come si gioca"
          >
            <HelpCircle size={20} />
          </button>
          <a
            className="icon-button github"
            href="https://github.com/K4pp8/fuori-contesto"
            aria-label="Repository GitHub"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={20} />
          </a>
        </nav>
      </header>
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Chiudi errore">
            <X size={17} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      {recovery && (
        <div className="recovery">
          <p>Non siamo riusciti a recuperare la sessione.</p>
          <button className="button secondary" onClick={rejoin}>
            Rientra nella stanza
          </button>
          <a href="/">Torna all'inizio</a>
        </div>
      )}
      {!view && !recovery && (
        <main className="landing">
          <section className="hero">
            <div className="eyebrow">
              <span className="tiny-star">✳</span> IL PARTY GAME CHE NON SA STARE AL SUO POSTO
            </div>
            <h1>
              Brutte risposte.
              <br />
              <span>Bellissima serata.</span>
            </h1>
            <p className="hero-copy">
              Una frase da completare. Le persone sbagliate.
              <br />
              Il gioco giusto per perdere ogni contegno.
            </p>
            <div className="hero-actions">
              <button
                className="button primary"
                disabled={!connected || !config}
                onClick={() => setModal('create')}
              >
                Crea un tavolo <ArrowUpRight size={20} />
              </button>
              <button
                className="button glass"
                disabled={!connected}
                onClick={() => setModal('join')}
              >
                Entra con un codice <ArrowRight size={18} />
              </button>
            </div>
            <div className="hero-meta">
              <span>
                <Users size={15} /> 3–12 persone
              </span>
              <span>
                <Smartphone size={15} /> Basta un telefono
              </span>
              <span>100% italiano</span>
            </div>
          </section>
          <section className="card-scene" aria-label="Esempio di una combinazione di carte">
            <div className="scene-orbit" />
            <div className="scene-caption">
              <span className="status-dot" /> ZERO FILTRI. TUTTO INSIEME.
            </div>
            <article className="sample-card sample-dark">
              <div className="card-top">
                <Mark />
                <span>LA FRASE</span>
              </div>
              <p>
                Questa call
                <br />
                poteva essere
                <br />
                <span className="blank">________.</span>
              </p>
              <div className="card-bottom">
                <span>fuori contesto.</span>
                <span>01</span>
              </div>
            </article>
            <article className="sample-card sample-light">
              <div className="card-top">
                <Sparkles size={18} />
                <span>LA TUA RISPOSTA</span>
              </div>
              <p>
                Un piccione
                <br />
                con partita IVA.
              </p>
              <div className="card-bottom">
                <span>fuori contesto.</span>
                <span>✳</span>
              </div>
            </article>
            <span className="scene-sticker">
              <span>Scarsa serietà.</span>
              <strong>Ottima compagnia.</strong>
            </span>
          </section>
          <section className="how-strip">
            <div className="how-title">
              <span className="small-label">DAL DIVANO AL DELIRIO</span>
              <h2>Tre mosse. Nessuna app.</h2>
            </div>
            <div className="how-step">
              <span className="step-number">01</span>
              <div>
                <h3>Apri il tavolo</h3>
                <p>Un computer, un tablet. Fate voi.</p>
              </div>
            </div>
            <div className="how-step">
              <span className="step-number">02</span>
              <div>
                <h3>Inquadra il QR</h3>
                <p>Il tuo nome. Le tue carte. Ci sei.</p>
              </div>
            </div>
            <div className="how-step">
              <span className="step-number">03</span>
              <div>
                <h3>Gioca la peggiore</h3>
                <p>La risposta migliore è quella sbagliata.</p>
              </div>
            </div>
          </section>
          <section className="under-note">
            <span>
              <Layers size={16} /> Carte italiane. Nuove idee sempre benvenute.
            </span>
            <button onClick={() => setModal('rules')}>
              Come si gioca <ArrowRight size={16} />
            </button>
          </section>
        </main>
      )}
      {view && (
        <main className={`game-page ${view.me ? 'player-view' : ''}`}>
          <div className="game-heading">
            <div>
              <div className="eyebrow">
                {view.isHost ? 'IL TUO TAVOLO' : view.me ? 'SEI AL TAVOLO' : 'IL TAVOLO'} ·{' '}
                {view.code}
              </div>
              <h1>
                {view.phase === 'lobby'
                  ? 'La serata inizia qui.'
                  : view.phase === 'finished'
                    ? 'Abbiamo un problema. E un vincitore.'
                    : `Round ${view.round}.`}
              </h1>
            </div>
            <div className="heading-actions">
              {view.me && (
                <button
                  className="button glass compact"
                  onClick={() => {
                    setName(view.players.find((p) => p.id === view.me?.id)?.name ?? '');
                    setModal('rename');
                  }}
                >
                  {view.players.find((p) => p.id === view.me?.id)?.name}
                  <Settings2 size={16} />
                </button>
              )}
              {view.isHost && (
                <button
                  className="icon-button glass"
                  onClick={() => setModal('manage')}
                  aria-label="Gestisci tavolo"
                >
                  <Settings2 size={20} />
                </button>
              )}
              <span className="round-goal">
                <Trophy size={17} />
                {view.target} punti per vincere
              </span>
            </div>
          </div>
          {!connected && (
            <p className="connection-banner" role="status">
              Connessione interrotta. Stiamo rientrando al tavolo con le tue carte…
            </p>
          )}
          {session?.role === 'player' && !view.me && (
            <div className="recovery">
              <p>Non fai più parte di questo tavolo.</p>
              <button className="button primary" onClick={rejoin}>
                Entra di nuovo
              </button>
            </div>
          )}
          <div className="game-layout">
            <section className="table-main">
              {view.phase === 'lobby' ? (
                <div className="lobby-panel glass-panel">
                  {view.isHost ? (
                    <>
                      <span className="pill">
                        <Radio size={15} /> IN ATTESA DELLA COMPAGNIA
                      </span>
                      <h2>
                        Stesso Wi-Fi.
                        <br />
                        Stesso pessimo umorismo.
                      </h2>
                      <p>
                        Inquadrate il QR, scegliete il nome
                        <br />e accomodatevi. Le carte arrivano sul telefono.
                      </p>
                      <div className="invite-block">
                        {qr && (
                          <img
                            className="qr"
                            src={qr}
                            alt={`QR per entrare nella stanza ${view.code}`}
                          />
                        )}
                        <div>
                          <span className="small-label">IL CODICE DEL TAVOLO</span>
                          <strong className="room-code">{view.code}</strong>
                          <button className="button secondary compact" onClick={copy}>
                            <Copy size={16} /> Copia invito
                          </button>
                        </div>
                      </div>
                      <input
                        className="share-url"
                        value={joinUrl}
                        readOnly
                        aria-label="Link di invito"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      {['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname) && (
                        <p className="inline-warning">
                          Questo QR punta a localhost. Scegli l'indirizzo LAN nelle impostazioni.
                        </p>
                      )}
                      <button
                        className="button primary start-button"
                        disabled={view.players.length < 3 || busy || !connected}
                        onClick={() => command({ type: 'start' })}
                      >
                        {view.players.length < 3
                          ? `Mancano ${3 - view.players.length} persone`
                          : 'Ci siamo. Si gioca.'}
                        <ArrowRight size={20} />
                      </button>
                      <span className="host-note">
                        Questo schermo mostra il tavolo. Per giocare, entra dal telefono.
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="lobby-check">
                        <Check size={32} />
                      </span>
                      <h2>
                        Sei dentro.
                        <br />
                        Il buon gusto è fuori.
                      </h2>
                      <p>Appena il tavolo parte, qui appariranno le tue carte.</p>
                      <span className="pill">
                        <Radio size={15} /> Aspettiamo chi gestisce il tavolo
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {view.winner && (view.phase === 'result' || view.phase === 'finished') && (
                    <section className="winner-panel">
                      <span className="pill">
                        <Trophy size={16} />
                        {view.phase === 'finished' ? 'VINCE LA PARTITA' : 'RISPOSTA VINCENTE'}
                      </span>
                      <h2>
                        {view.players.find((p) => p.id === view.winner?.playerId)?.name ??
                          'Giocatore'}
                      </h2>
                      <p>{view.winner.cards.map((c) => c.text).join(' + ')}</p>
                      {view.isHost && (
                        <button
                          className="button primary"
                          disabled={busy || !connected}
                          onClick={() =>
                            command({ type: view.phase === 'finished' ? 'restart' : 'next' })
                          }
                        >
                          {view.phase === 'finished' ? 'Un’altra partita' : 'Prossimo round'}
                          <ArrowRight size={18} />
                        </button>
                      )}
                    </section>
                  )}
                  <article className="prompt-card">
                    <div className="card-top">
                      <span className="pill dark-pill">LA FRASE</span>
                      <span>
                        {view.prompt?.pick === 1
                          ? 'GIOCA 1 CARTA'
                          : `GIOCA ${view.prompt?.pick} CARTE IN ORDINE`}
                      </span>
                    </div>
                    <h2>{view.prompt?.text}</h2>
                    <div className="prompt-footer">
                      <Mark />
                      <span>
                        <Crown size={17} />{' '}
                        {isJudge
                          ? 'Questo round scegli tu'
                          : `Giudica ${judge?.name ?? 'il tavolo'}`}
                      </span>
                    </div>
                  </article>
                  {playing && (
                    <div className="round-status" role="status">
                      <span className="status-dot" />
                      {isJudge
                        ? 'Aspetta le risposte. Poi scegli quella che ti fa ridere di più.'
                        : submitted
                          ? 'Risposta inviata. Ora faccia da poker.'
                          : view.me
                            ? `Scegli ${view.prompt?.pick === 1 ? 'la tua risposta' : `${view.prompt?.pick} risposte, nell’ordine`}.`
                            : 'Le idee peggiori stanno arrivando.'}
                      <span>
                        {view.players.filter((p) => p.submitted).length}/{view.players.length - 1}
                      </span>
                    </div>
                  )}
                  {view.me && playing && !isJudge && !submitted && (
                    <>
                      <div className="hand-heading">
                        <h2>La tua mano</h2>
                        <span>
                          {selected.length}/{view.prompt?.pick} selezionate
                        </span>
                      </div>
                      <div className="hand-grid">
                        {view.me.hand.map((c, i) => (
                          <button
                            key={c.id}
                            className={`hand-card ${selected.includes(c.id) ? 'selected' : ''}`}
                            aria-pressed={selected.includes(c.id)}
                            onClick={() =>
                              setSelected((s) =>
                                s.includes(c.id)
                                  ? s.filter((id) => id !== c.id)
                                  : s.length < (view.prompt?.pick ?? 1)
                                    ? [...s, c.id]
                                    : s,
                              )
                            }
                          >
                            <span className="hand-card-number">
                              {selected.includes(c.id)
                                ? `SCELTA ${selected.indexOf(c.id) + 1}`
                                : String(i + 1).padStart(2, '0')}
                            </span>
                            <strong>{c.text}</strong>
                            <span className="hand-card-footer">
                              fuori contesto. {selected.includes(c.id) && <Check size={18} />}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="play-dock glass">
                        <span>La tua miglior pessima idea.</span>
                        <button
                          className="button primary"
                          disabled={selected.length !== view.prompt?.pick || busy || !connected}
                          onClick={() => command({ type: 'play', cardIds: selected })}
                        >
                          Gioca {selected.length === 1 ? 'la carta' : 'le carte'}
                          <ArrowUpRight size={18} />
                        </button>
                      </div>
                    </>
                  )}
                  {view.phase === 'judging' && (
                    <div className="hand-heading">
                      <h2>{isJudge ? 'A te la sentenza.' : 'Tutte pessime. Una vincerà.'}</h2>
                      <span>Risposte anonime</span>
                    </div>
                  )}
                  {view.submissions.length > 0 && (
                    <div className="answers-grid">
                      {view.submissions.map((s, i) => (
                        <div className="answer-group" key={s.id}>
                          <span className="small-label">
                            RISPOSTA {String(i + 1).padStart(2, '0')}
                          </span>
                          {s.cards.map((c, j) => (
                            <p key={c.id}>
                              {s.cards.length > 1 && <small>{j + 1}. </small>}
                              {c.text}
                            </p>
                          ))}
                          {isJudge && view.phase === 'judging' && (
                            <button
                              className="button secondary"
                              disabled={busy || !connected}
                              onClick={() =>
                                setConfirmation({ type: 'choose', submissionId: s.id })
                              }
                            >
                              Questa vince <Crown size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
            <aside className="table-sidebar">
              <section className="players-panel">
                <div className="section-top">
                  <h2>Al tavolo</h2>
                  <span>{view.players.length}/12</span>
                </div>
                {view.players.length === 0 ? (
                  <div className="empty-players">
                    <Users size={30} />
                    <p>
                      Il primo nome
                      <br />
                      potrebbe essere il tuo.
                    </p>
                  </div>
                ) : (
                  <ol className="players">
                    {[...view.players]
                      .sort((a, b) => b.score - a.score)
                      .map((p, i) => (
                        <li key={p.id}>
                          <span className={`avatar avatar-${i % 4}`}>
                            {p.name.slice(0, 1).toUpperCase()}
                            <span className={p.online ? 'status-dot' : 'status-dot offline'} />
                          </span>
                          <div>
                            <strong>
                              {p.name}
                              {p.id === view.me?.id && ' (tu)'}
                            </strong>
                            <small>
                              {p.id === view.judgeId
                                ? 'Giudice del round'
                                : !p.online
                                  ? 'Non connesso'
                                  : p.submitted
                                    ? 'Ha giocato'
                                    : 'Al tavolo'}
                            </small>
                          </div>
                          {p.id === view.judgeId ? <Crown size={18} /> : null}
                          <span className="score">{p.score}</span>
                        </li>
                      ))}
                  </ol>
                )}
              </section>
              <section className="deck-panel">
                <div className="deck-icon">
                  <Layers size={22} />
                </div>
                <span className="small-label">IN GIOCO STASERA</span>
                <h3>{view.deck.name}</h3>
                <p>{view.deck.promptCount + view.deck.answerCount} carte · Italiano</p>
                <span className="pill subtle">
                  {view.deck.mature ? '18+ · Umorismo adulto' : 'Mazzo community'}
                </span>
              </section>
              {view.isHost && view.phase !== 'lobby' && (
                <section className="mini-invite">
                  {qr && <img src={qr} alt="QR del tavolo" />}
                  <strong>{view.code}</strong>
                  <small>Ingresso aperto nella lobby</small>
                </section>
              )}
            </aside>
          </div>
        </main>
      )}
      <footer className="footer">
        <span>Fatto per stare insieme. Anche fuori contesto.</span>
        <span>
          OPEN SOURCE <span>↗</span> UMORISMO ADULTO · 18+
        </span>
      </footer>
      <dialog
        ref={panelRef}
        onCancel={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="modal-content">
          <button className="modal-close icon-button" onClick={close} aria-label="Chiudi">
            <X size={20} />
          </button>
          {confirmation ? (
            <>
              <span className="small-label">
                {confirmation.type === 'choose' ? 'DECISIONE DEL GIUDICE' : 'GESTIONE TAVOLO'}
              </span>
              <h2>
                {confirmation.type === 'choose'
                  ? 'È la tua preferita?'
                  : confirmation.type === 'kick'
                    ? 'Rimuovere il giocatore?'
                    : 'Saltare questo round?'}
              </h2>
              <p>
                {confirmation.type === 'choose'
                  ? 'La risposta riceverà un punto.'
                  : confirmation.type === 'kick'
                    ? 'Il round in corso verrà annullato. Con meno di tre persone si torna alla lobby.'
                    : 'Nessun punto assegnato. Cambieranno frase e giudice.'}
              </p>
              <button
                className="button primary full"
                disabled={busy || !connected}
                onClick={() => command(confirmation)}
              >
                Conferma <Check size={18} />
              </button>
            </>
          ) : modal === 'rules' ? (
            <>
              <span className="small-label">LE REGOLE, SENZA RIUNIONE</span>
              <h2>
                Il buon gusto
                <br />
                può aspettare.
              </h2>
              <ol className="rules">
                <li>
                  <strong>Una frase per tutti.</strong>
                  <p>Il tavolo mostra una frase. Ognuno ha 10 risposte sul proprio telefono.</p>
                </li>
                <li>
                  <strong>Vince la peggiore. O la migliore.</strong>
                  <p>
                    Tutti tranne il giudice giocano una risposta. Se ci sono più spazi, seleziona le
                    carte nell'ordine.
                  </p>
                </li>
                <li>
                  <strong>Il giudice decide.</strong>
                  <p>
                    Le risposte sono anonime. Il giudice sceglie la sua preferita: un punto a chi
                    l'ha giocata.
                  </p>
                </li>
                <li>
                  <strong>Un altro giro.</strong>
                  <p>
                    Il ruolo di giudice passa alla persona successiva. Vince chi raggiunge il
                    punteggio scelto.
                  </p>
                </li>
              </ol>
              <p className="fine-print">
                3–12 giocatori sulla stessa rete. Chi apre il tavolo può giocare entrando dal
                telefono. Nessun account, nessuna app. I mazzi per adulti possono contenere
                linguaggio esplicito.
              </p>
            </>
          ) : modal === 'manage' ? (
            <>
              <span className="small-label">DIETRO LE QUINTE</span>
              <h2>Il tuo tavolo.</h2>
              <label>
                Indirizzo per il QR
                <select value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}>
                  {[
                    ...new Set([
                      baseUrl,
                      location.origin,
                      ...(config?.lanUrls ?? []),
                      ...(config?.publicUrl ? [config.publicUrl] : []),
                    ]),
                  ].map((url) => (
                    <option key={url}>{url}</option>
                  ))}
                </select>
              </label>
              <p className="fine-print">
                Scegli l'indirizzo raggiungibile dai telefoni sullo stesso Wi-Fi. Per reti
                particolari, imposta PUBLIC_URL nel server.
              </p>
              {view?.players.map((p) => (
                <div className="manage-player" key={p.id}>
                  <span>{p.name}</span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setModal(null);
                      setConfirmation({ type: 'kick', playerId: p.id });
                    }}
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
              {view && ['playing', 'judging'].includes(view.phase) && (
                <button
                  className="button secondary full"
                  onClick={() => {
                    setModal(null);
                    setConfirmation({ type: 'skip' });
                  }}
                >
                  Salta il round <RotateCcw size={17} />
                </button>
              )}
            </>
          ) : modal === 'rename' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                command({ type: 'rename', name });
              }}
            >
              <span className="small-label">PRESENTAZIONI, DI NUOVO</span>
              <h2>Come ti chiami?</h2>
              <label>
                Il tuo nome
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  required
                  autoComplete="nickname"
                />
              </label>
              <button className="button primary full" disabled={busy || !connected}>
                Salva nome <Check size={18} />
              </button>
            </form>
          ) : modal === 'create' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const s = await send<Session>('create', { deckId, target });
                  remember(s);
                  setModal(null);
                });
              }}
            >
              <span className="small-label">LA COMPAGNIA LA METTI TU</span>
              <h2>
                Mettiamoci
                <br />
                in cattiva luce.
              </h2>
              <label>
                Scegli il mazzo
                <select value={deckId} onChange={(e) => setDeckId(e.target.value)}>
                  {config?.decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.promptCount + d.answerCount} carte
                    </option>
                  ))}
                </select>
              </label>
              <p className="deck-description">
                {config?.decks.find((d) => d.id === deckId)?.description}
              </p>
              <label>
                Si vince a
                <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                  {[3, 5, 7, 10, 15].map((n) => (
                    <option key={n} value={n}>
                      {n} punti
                    </option>
                  ))}
                </select>
              </label>
              <p className="fine-print">
                Il computer fa da tavolo. Ogni persona entra dal telefono con il QR e sceglie il
                proprio nome.
              </p>
              <button className="button primary full" disabled={busy || !connected}>
                Apri il tavolo <ArrowUpRight size={20} />
              </button>
            </form>
          ) : modal === 'join' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const s = await send<Session>('join', { code: code.toUpperCase().trim(), name });
                  remember(s);
                  setModal(null);
                });
              }}
            >
              <span className="small-label">C'È POSTO PER TE</span>
              <h2>
                Un nome.
                <br />
                Pessime intenzioni.
              </h2>
              <label>
                Codice del tavolo
                <input
                  className="code-input"
                  autoFocus={!code}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC234"
                  minLength={6}
                  maxLength={6}
                  pattern="[A-Za-z2-9]{6}"
                  required
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </label>
              <label>
                Come ti chiami?
                <input
                  autoFocus={!!code}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Il tuo nome, non Player 1"
                  maxLength={24}
                  required
                  autoComplete="nickname"
                />
              </label>
              <p className="fine-print">
                Il nome si può cambiare anche dopo. La prima impressione, forse.
              </p>
              <button className="button primary full" disabled={busy || !connected}>
                Sono dei vostri <ArrowRight size={20} />
              </button>
            </form>
          ) : null}
          {(modal || confirmation) && error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
