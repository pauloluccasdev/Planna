"use client";

import { useEffect, useRef, useState } from "react";

const tracks = [
  ["Still Life", "X2xAunfMENT4KSm1XpnQC2qUUC4hcMVbDXBMw9GI"],
  ["Birds", "BmyGmEp4zz8Ylei2chsvoO4B4P80jWaF8K4bppSF"],
  ["Bubbles", "zh5usndkyEfVvKOz8dvsrCd1Ga0jfz4xIcLUendD"],
  ["One Night in France", "hgY8pG5KicULRbUJjUVavqs1h53lNSHdLptPoCwS"],
  ["Tranquil Mindscape", "uxGaqYrlWHy1w4jA6fJki0NlNx6xkkFG5BMwI8JN"],
  ["Calm Currents", "4rKapZUMNnNSPAOvpjlfSH6B5Ib8rgEWdvjnM7C6"],
  ["Canon Event", "GLpVlXSJolOAOZSAMyf5ONpjKXfnnKbugQhR7GxD"],
  ["When Time Called Me Darling", "3Jox99wj2ur7YR7O1ug3fdP8NdOOpmHfVPFBRhq5"],
  ["Waiting Around", "aVNvUkfJVw1NI9zHSC3I8d760YbwCt31a3Wi6Ydl"],
  ["Theta Frequency", "rSIDyunfJfiKNelwFuwbGKoLj5TO8eHFbdSa1zAb"],
  ["Peaceful Drift", "SQvtLguk6S1VSthv0oXWycoB6ipUS0pt8jzAxxPq"],
  ["Moon Unit", "CbNZO1QUuJq1f50RHzZ5kykNj1hdqT04UaWOYSNf"],
  ["Ghost Town", "cR9QozfFah1QF4bmIg150gJsibgGDA3EX4m7Iova"],
  ["Doodles", "rQGj86J7JXRwu3BRKtB6GIfnwCwI5slkTwfTWqvI"],
  ["Lucid", "je7RethXWuduCoRV6Gq3w25yDXvxYnnOWt5OGlgv"],
  ["Tokyo Sunset", "Xnd9Hr5AVzB68IlWcImKtXPlwCePD2G2m8ZFSVj4"],
  ["Down Time", "HXpGyFBObrT0P6D50O8gDWbuEmcOeFRZfcqKsc6C"],
  ["Going Home", "QdFLnSYEYDIThwBrSukcnPloklLuCyXGkkwYclJE"],
  ["Reminders", "r7Y9jjWggY2LIKonpPhkYrAQNJgm2daRHr5Kcc0I"],
  ["Shimmer", "JX8dB2Y2tCty4tibXtqqd04m1IVgPegvzOeLOSzP"],
].map(([title, id]) => ({
  title,
  src: `https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/${id}.mp3`,
}));

const volumeStorageKey = "planna-focus-music-volume";

export function FocusMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(30);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const track = tracks[trackIndex];

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(volumeStorageKey));
    if (!Number.isFinite(saved) || saved < 0 || saved > 100) return;
    const timer = window.setTimeout(() => setVolume(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
    audio.muted = muted;
    window.localStorage.setItem(volumeStorageKey, String(volume));
  }, [muted, volume]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: "HoliznaCC0",
      album: "Public Domain Lofi",
    });
  }, [track.title]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;
    void audio.play().catch(() => {
      setIsPlaying(false);
      setError("Não foi possível reproduzir esta faixa.");
    });
  }, [isPlaying, trackIndex]);

  function changeTrack(direction: number) {
    setError("");
    setTrackIndex(
      (current) => (current + direction + tracks.length) % tracks.length,
    );
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setError("");
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setError("Toque novamente para iniciar a música.");
    }
  }

  return (
    <section className="focus-music-player" aria-labelledby="focus-music-title">
      <audio
        ref={audioRef}
        src={track.src}
        preload="metadata"
        onEnded={() => changeTrack(1)}
        onError={() => {
          setIsPlaying(false);
          setError("Esta faixa está indisponível. Tente a próxima.");
        }}
      />
      <header>
        <span className="focus-music-icon" aria-hidden="true">
          ♫
        </span>
        <div>
          <span className="eyebrow">Som para foco</span>
          <h2 id="focus-music-title">Lo-fi durante o Pomodoro</h2>
        </div>
      </header>
      <div className="focus-track">
        <div>
          <strong>{track.title}</strong>
          <span>
            HoliznaCC0 · faixa {trackIndex + 1} de {tracks.length}
          </span>
        </div>
        <div className="focus-track-controls">
          <button
            type="button"
            aria-label="Faixa anterior"
            onClick={() => changeTrack(-1)}
          >
            ←
          </button>
          <button className="focus-play" type="button" onClick={togglePlayback}>
            {isPlaying ? "Pausar" : "Reproduzir"}
          </button>
          <button
            type="button"
            aria-label="Próxima faixa"
            onClick={() => changeTrack(1)}
          >
            →
          </button>
        </div>
      </div>
      <div className="focus-volume">
        <button
          type="button"
          aria-label={muted ? "Ativar som" : "Silenciar música"}
          aria-pressed={muted}
          onClick={() => setMuted((current) => !current)}
        >
          {muted || volume === 0 ? "Som desligado" : "Volume"}
        </button>
        <input
          aria-label="Volume da música"
          type="range"
          min="0"
          max="100"
          step="1"
          value={volume}
          onChange={(event) => {
            setVolume(Number(event.target.value));
            setMuted(false);
          }}
        />
        <output>{muted ? 0 : volume}%</output>
      </div>
      {error ? (
        <p className="focus-music-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="focus-music-credit">
        “Public Domain Lofi” · CC0 1.0 ·{" "}
        <a
          href="https://freemusicarchive.org/music/holiznacc0/public-domain-lofi"
          target="_blank"
          rel="noreferrer"
        >
          origem e licença
        </a>
      </p>
    </section>
  );
}
