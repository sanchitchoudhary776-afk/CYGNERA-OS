import { createContext, useContext, useState, useRef, useEffect } from 'react';

const AudioCtx = createContext(null);

// ── SoundScape — High Fidelity Procedural Engine ───────────────────
function createNoiseBuffer(ctx, type) {
  const size = 4 * ctx.sampleRate;
  const buffer = ctx.createBuffer(2, size, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,lastOut=0;
    for (let i = 0; i < size; i++) {
      const w = Math.random()*2-1;
      if (type==='white') { data[i]=w; }
      else if (type==='brown') { lastOut=(lastOut+(0.02*w))/1.02; data[i]=lastOut*3.5; }
      else { // pink
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
      }
    }
  }
  return buffer;
}

function spawnDrop(ctx, dest, volumeMul) {
  const dur = 0.02 + Math.random() * 0.04;
  const freq = 2000 + Math.random() * 6000;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const dropGain = ctx.createGain();
  const peakVol = (0.01 + Math.random() * 0.025) * volumeMul;
  dropGain.gain.setValueAtTime(peakVol, ctx.currentTime);
  dropGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 5 + Math.random() * 10;
  osc.connect(bp);
  bp.connect(dropGain);
  dropGain.connect(dest);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur + 0.01);
}

function startRainEngine(ctx, masterGain, volRef) {
  let running = true;
  const scheduleDrops = () => {
    if (!running) return;
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      setTimeout(() => { if (running) spawnDrop(ctx, masterGain, volRef.current); }, Math.random() * 80);
    }
    setTimeout(scheduleDrops, 80 + Math.random() * 200);
  };
  scheduleDrops();
  return () => { running = false; };
}

export function AudioProvider({ children }) {
  const [active, setActive] = useState('none');
  const [vol, setVol] = useState(40);
  const [spotifyUrl, setSpotifyUrl] = useState(() => localStorage.getItem('los_spotify_url') || '');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const engineRef = useRef(null);
  const volRef = useRef(0.4);

  const BINAURAL_LINK = "https://open.spotify.com/track/7xIPsXmUBhtcv8Txt3X1r2";

  const getSpotifyEmbed = (url) => {
    if (!url) return null;
    const m = url.match(/open\.spotify\.com\/(track|playlist|album|episode)\/([a-zA-Z0-9?=_&]+)/);
    if (m) {
      const id = m[2].split('?')[0];
      return `https://open.spotify.com/embed/${m[1]}/${id}?utm_source=generator&theme=0`;
    }
    return null;
  };

  useEffect(() => {
    volRef.current = vol / 100;
    if (engineRef.current?.gain) {
      const base = active === 'brown' ? 0.12 : active === 'white' ? 0.04 : active === 'rain' ? 0.06 : 0.08;
      engineRef.current.gain.gain.setTargetAtTime(base * volRef.current, engineRef.current.ctx.currentTime, 0.1);
    }
    if (engineRef.current?.audio) {
      engineRef.current.audio.volume = volRef.current * 0.5;
    }
  }, [vol, active]);

  useEffect(() => {
    localStorage.setItem('los_spotify_url', spotifyUrl);
    if (!spotifyUrl) { setTracks([]); return; }
    const m = spotifyUrl.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if (!m) return;
    setLoading(true);
    fetch(`https://open.spotify.com/oembed?url=${spotifyUrl}`)
      .then(res => res.json())
      .then(data => { if (data.title) setTracks([{ name: data.title, author: data.author_name || 'Spotify User', type: m[1] }]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [spotifyUrl]);

  const stopCurrent = () => {
    if (engineRef.current) {
      const e = engineRef.current;
      if (e.gain) try { e.gain.gain.linearRampToValueAtTime(0, e.ctx.currentTime + 0.4); } catch {}
      if (e.stopRain) e.stopRain();
      if (e.audio) { e.audio.pause(); e.audio.src = ""; }
      setTimeout(() => {
        try { e.source?.stop(); } catch {}
        try { e.ctx?.close(); } catch {}
      }, 500);
      engineRef.current = null;
    }
  };

  const playSound = (id) => {
    if (id === active) return;
    stopCurrent();
    setActive(id);
    if (id === 'none' || id === 'spotify' || id === 'lofi' || id === 'binaural') return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();

      if (id === 'zen') {
        const url = 'https://www.orangefreesounds.com/wp-content/uploads/2021/04/Meditation-music-zen.mp3';
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = volRef.current * 0.5;
        audio.play().catch(() => {});
        engineRef.current = { audio };
      } else if (id === 'rain') {
        const buffer = createNoiseBuffer(ctx, 'pink');
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 400; filter.Q.value = 0.5;
        const gain = ctx.createGain(); gain.gain.value = 0;
        source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        source.start();
        gain.gain.linearRampToValueAtTime(0.06 * volRef.current, ctx.currentTime + 1.2);
        const stopRain = startRainEngine(ctx, ctx.destination, volRef);
        engineRef.current = { ctx, source, gain, filter, stopRain };
      } else {
        const buffer = createNoiseBuffer(ctx, id);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = id === 'brown' ? 300 : 1200;
        const gain = ctx.createGain(); gain.gain.value = 0;
        source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        source.start();
        const base = id === 'brown' ? 0.12 : 0.04;
        gain.gain.linearRampToValueAtTime(base * volRef.current, ctx.currentTime + 1.0);
        engineRef.current = { ctx, source, gain, filter };
      }
    } catch (e) { console.error("Audio init failed", e); }
  };

  return (
    <AudioCtx.Provider value={{ 
      active, setActive: playSound, 
      vol, setVol, 
      spotifyUrl, setSpotifyUrl,
      tracks, loading,
      isMinimized, setIsMinimized,
      BINAURAL_LINK, getSpotifyEmbed
    }}>
      {children}
    </AudioCtx.Provider>
  );
}

export const useAudio = () => useContext(AudioCtx);
