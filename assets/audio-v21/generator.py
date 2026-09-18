"""ARC-SHIFT v2.1: deterministic original procedural score, no external samples.

Requires Python 3 + NumPy and FFmpeg with libvorbis. All generated files are
written beside this script. Instruments, note sequences, harmony, and rhythms
are authored here. This is programmatic synthesis, not a recording of players.
"""
from __future__ import annotations

import hashlib
import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
FFMPEG = Path(r"D:/CodexData/PlanningPortfolio/arc-shift-20260918/tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe")
SR = 48000
BEATS = 32
SEED = 271828
RNG = np.random.default_rng(SEED)
TAU = 2 * np.pi


def midi(note: int | float) -> float:
    return 440.0 * 2.0 ** ((note - 69.0) / 12.0)


def filtered(x: np.ndarray, low: float = 0, high: float = 0) -> np.ndarray:
    """Zero-phase, periodic, gentle frequency shaping; maintains loop continuity."""
    f = np.fft.rfftfreq(len(x), 1 / SR)
    curve = np.ones_like(f)
    if low:
        curve *= 1 - np.exp(-(f / low) ** 4)
    if high:
        curve *= np.exp(-(f / high) ** 4)
    spec = np.fft.rfft(x, axis=0)
    return np.fft.irfft(spec * curve[:, None] if x.ndim == 2 else spec * curve,
                        n=len(x), axis=0)


def mono_to_stereo(x: np.ndarray, pan: float = 0) -> np.ndarray:
    angle = (pan + 1) * np.pi / 4
    return np.column_stack((x * np.cos(angle), x * np.sin(angle)))


def add_event(dst: np.ndarray, sound: np.ndarray, seconds: float, gain: float = 1,
              pan: float = 0) -> None:
    """Wrap every release/reverb tail around the destination loop, without fading it out."""
    if sound.ndim == 1:
        sound = mono_to_stereo(sound, pan)
    start = int(round(seconds * SR)) % len(dst)
    for offset in range(0, len(sound), len(dst)):
        segment = sound[offset:offset + len(dst)] * gain
        pos = (start + offset) % len(dst)
        first = min(len(segment), len(dst) - pos)
        dst[pos:pos + first] += segment[:first]
        if first < len(segment):
            dst[:len(segment) - first] += segment[first:]


def envelope(t: np.ndarray, hold: float, attack: float, release: float) -> np.ndarray:
    a = np.sin(np.minimum(t / attack, 1) * np.pi / 2) ** 2
    r = np.cos(np.clip((t - hold) / release, 0, 1) * np.pi / 2) ** 2
    return a * r


def pad(chord: list[int], duration: float, warmth: float) -> np.ndarray:
    release = 2.8
    t = np.arange(int((duration + release) * SR)) / SR
    env = envelope(t, duration, 0.85, release)
    out = np.zeros((len(t), 2))
    for voice, note in enumerate(chord):
        f = midi(note)
        for ch in range(2):
            detune = (-1 if ch == 0 else 1) * (0.0013 + 0.00025 * voice)
            vibrato = 0.005 * np.sin(TAU * (0.13 + voice * 0.025) * t + ch * 0.7)
            phase = TAU * f * (1 + detune) * t + vibrato
            tone = np.zeros_like(t)
            for harmonic, amplitude in ((1, 1), (2, .23), (3, .10), (4, .041), (5, .014)):
                tone += amplitude * np.sin(harmonic * phase + voice * .49 + ch * .17)
            breath = 1 + .035 * np.sin(TAU * .19 * t + voice + ch)
            out[:, ch] += tone * breath
    out *= env[:, None] * warmth / len(chord)
    return out


def pluck(note: int, duration: float, color: str = "glass") -> np.ndarray:
    release = 1.65 if color != "wood" else .95
    t = np.arange(int((duration + release) * SR)) / SR
    f = midi(note)
    attack = 1 - np.exp(-t / .013)
    tail = np.cos(np.clip((t - duration) / release, 0, 1) * np.pi / 2) ** 2
    if color == "wood":
        partials = [(1, 1, 1.15), (2, .18, .34), (3.01, .055, .19), (4, .022, .12)]
    elif color == "copper":
        partials = [(1, 1, 1.55), (2.002, .20, .70), (3.997, .085, .37), (5.006, .022, .19)]
    else:
        partials = [(1, 1, 1.65), (2.001, .18, .76), (3.002, .065, .40), (4.006, .035, .23)]
    signal = np.zeros_like(t)
    for ratio, amplitude, decay in partials:
        signal += amplitude * np.sin(TAU * f * ratio * t) * np.exp(-t / decay)
    # Warm transient rather than an 8-bit edge or aggressive metallic strike.
    return np.tanh(signal * .85) * attack * tail


def bass(note: int, duration: float) -> np.ndarray:
    t = np.arange(int((duration + .22) * SR)) / SR
    f = midi(note)
    env = envelope(t, duration, .020, .22) * (.85 + .15 * np.exp(-t / .12))
    signal = np.sin(TAU * f * t) + .19 * np.sin(TAU * f * 2 * t) + .045 * np.sin(TAU * f * 3 * t)
    return np.tanh(signal * .9) * env


def drum(kind: str, velocity: float = 1) -> np.ndarray:
    duration = {"kick": .62, "tom": .68, "rim": .23, "shaker": .095, "air": .65}[kind]
    t = np.arange(int(duration * SR)) / SR
    noise = RNG.standard_normal(len(t))
    if kind == "kick":
        phase = TAU * (52 * t + 31 * .032 * (1 - np.exp(-t / .032)))
        x = np.sin(phase) * np.exp(-t / .19)
        x += .045 * filtered(noise, 220, 1000) * np.exp(-t / .026)
        x *= 1 - np.exp(-t / .004)
    elif kind == "tom":
        phase = TAU * (112 * t + 40 * .042 * (1 - np.exp(-t / .042)))
        x = (.77 * np.sin(phase) + .18 * np.sin(phase * 1.57)) * np.exp(-t / .17)
        x += .19 * filtered(noise, 180, 1500) * np.exp(-t / .07)
        x *= 1 - np.exp(-t / .004)
    elif kind == "rim":
        x = (.55 * np.sin(TAU * 310 * t) + .16 * np.sin(TAU * 531 * t)) * np.exp(-t / .026)
        x += .3 * filtered(noise, 900, 3300) * np.exp(-t / .031)
        x *= 1 - np.exp(-t / .0025)
    elif kind == "shaker":
        x = filtered(noise, 2200, 6200) * (1 - np.exp(-t / .009)) * np.exp(-t / .020)
    else:
        x = filtered(noise, 1600, 5800) * envelope(t, .06, .025, .58) * np.exp(-t / .20)
    x *= np.cos(np.minimum(t / duration, 1) * np.pi / 2) ** 2
    return x * velocity


def space(x: np.ndarray, wet: float, scale: float = 1) -> np.ndarray:
    """Circular stereo diffusion: true wrapped tails, no artificial loop end fade."""
    smooth = filtered(x, 200, 3600)
    out = x.copy()
    for index, (seconds, amount) in enumerate(((.087, .26), (.139, .22), (.233, .17), (.347, .14),
                                               (.491, .11), (.677, .08), (.911, .060), (1.173, .04))):
        tap = np.roll(smooth[:, ::-1] if index % 2 else smooth,
                      int(seconds * SR * scale), axis=0)
        out += tap * wet * amount
    return out


def circular_mean(x: np.ndarray, samples: int) -> np.ndarray:
    samples = min(samples, len(x) - 1)
    left = samples // 2
    padded = np.concatenate((x[-left:], x, x[:samples - left - 1]))
    sums = np.concatenate(([0.0], np.cumsum(padded)))
    return (sums[samples:] - sums[:-samples]) / samples


def mellow(x: np.ndarray, high: float, low: float) -> tuple[np.ndarray, dict]:
    """Dynamic high-band attenuation followed by restrained circular band limiting."""
    base = filtered(x, 0, 2300)
    bright = x - base
    detector = np.sqrt(np.maximum(circular_mean(np.mean(bright ** 2, axis=1), 2400), 0))
    threshold = .011
    gain = np.minimum(1.0, (threshold / np.maximum(detector, 1e-9)) ** .55)
    gain = circular_mean(gain, 1200)
    result = base + bright * gain[:, None]
    result = filtered(result, low, high)
    return result, {"high_band_threshold_rms": threshold, "minimum_high_band_gain": float(gain.min()),
                    "mean_high_band_gain": float(gain.mean()), "low_cut_hz": low, "high_rolloff_hz": high}


SCORES = {
    "sanctum": {
        "title": "Orbit of Quiet Brass", "bpm": 96, "key": "D minor", "color": "glass",
        "progression": ["Dm(add9)", "Bbmaj7", "F(add9)", "C(add9)"],
        "roots": [38, 34, 41, 36],
        "chords": [[50, 57, 65, 76], [46, 53, 62, 69], [53, 60, 67, 69], [48, 55, 62, 64]],
        "melody": [
            [(0,69,.7),(1.25,74,.6),(2.25,77,.9),(3.5,76,.4)],
            [(.25,74,1.0),(1.75,72,.6),(2.75,69,.9)],
            [(0,70,.8),(1.5,74,.6),(2.5,77,1.0)],
            [(.5,76,.7),(1.75,74,.75),(3,69,.7)],
            [(0,72,.6),(1,77,.8),(2.5,79,.55),(3.25,77,.5)],
            [(.5,76,.75),(1.75,72,1.1),(3.25,69,.45)],
            [(0,67,.7),(1.25,72,.65),(2.5,74,.6),(3.25,76,.5)],
            [(.5,74,.7),(1.75,72,.7),(3,69,.85)],
        ],
        "bass_pattern": [(0,1.30,1),(1.75,.42,.65),(2.5,.65,.82),(3.5,.40,.63)],
    },
    "grove": {
        "title": "Moss Beneath the Stars", "bpm": 84, "key": "E minor", "color": "wood",
        "progression": ["Em(add9)", "Cmaj7", "G(add9)", "D(add9)"],
        "roots": [40, 36, 43, 38],
        "chords": [[52, 59, 67, 78], [48, 55, 64, 71], [55, 62, 69, 71], [50, 57, 64, 66]],
        "melody": [
            [(.25,71,.65),(1.5,76,.8),(3,79,.75)],
            [(0,78,.65),(1,76,.7),(2.5,71,1.1)],
            [(.25,72,.8),(1.5,76,.6),(2.5,79,.9)],
            [(.5,76,1),(2,74,.7),(3.25,71,.45)],
            [(0,74,.55),(1,79,1),(2.75,78,.5)],
            [(.25,76,.75),(1.5,74,1),(3,71,.7)],
            [(.5,69,.7),(1.75,74,.65),(3,78,.65)],
            [(.25,76,.85),(1.75,74,.7),(3,71,.8)],
        ],
        "bass_pattern": [(0,1.6,1),(2.25,.95,.85),(3.5,.36,.6)],
    },
    "foundry": {
        "title": "The Halo Engine", "bpm": 112, "key": "C minor", "color": "copper",
        "progression": ["Cm(add9)", "Abmaj7", "Eb(add9)", "Bb(add9)"],
        "roots": [36, 32, 39, 34],
        "chords": [[48, 55, 63, 74], [44, 51, 60, 67], [51, 58, 65, 67], [46, 53, 60, 62]],
        "melody": [
            [(0,67,.5),(.75,72,.5),(1.5,75,.65),(2.5,74,.45),(3.25,72,.5)],
            [(.25,67,.6),(1.25,70,.65),(2.5,72,.9)],
            [(0,68,.55),(1,72,.55),(1.75,75,.75),(3,79,.65)],
            [(.5,75,.55),(1.5,74,.55),(2.5,72,.9)],
            [(0,70,.5),(.75,75,.5),(1.5,77,.65),(2.5,79,.6),(3.5,77,.3)],
            [(.25,75,.75),(1.5,74,.55),(2.5,70,.8)],
            [(0,65,.55),(1,70,.55),(1.75,74,.65),(3,77,.65)],
            [(.25,74,.55),(1.25,72,.6),(2.5,70,.5),(3.25,67,.55)],
        ],
        "bass_pattern": [(0,.65,1),(.75,.50,.67),(1.5,.55,.82),(2.5,.57,.85),(3.25,.52,.72)],
    },
}


def render_region(name: str, score: dict) -> tuple[dict, dict]:
    beat = 60.0 / score["bpm"]
    n = round(BEATS * beat * SR)
    stems = {part: np.zeros((n, 2), dtype=np.float64) for part in ("bed", "pulse", "drive")}
    pads = np.zeros((n, 2))
    tune = np.zeros((n, 2))
    for chord_index, chord in enumerate(score["chords"]):
        add_event(pads, pad(chord, 8 * beat, .18), chord_index * 8 * beat)
    for bar, notes in enumerate(score["melody"]):
        for note_index, (offset, note, hold) in enumerate(notes):
            pan = .21 * np.sin(bar * .81 + note_index * .7)
            add_event(tune, pluck(note, hold * beat, score["color"]),
                      (bar * 4 + offset) * beat, .155 if name != "grove" else .17, pan)
    stems["bed"] = space(filtered(pads, 155, 3800), .80, 1.45) + space(tune, .64, 1.22)
    for bar in range(8):
        root = score["roots"][bar // 2]
        for index, (offset, hold, strength) in enumerate(score["bass_pattern"]):
            bass_note = root + (7 if index == len(score["bass_pattern"]) - 1 and bar % 2 else 0)
            add_event(stems["pulse"], bass(bass_note, hold * beat),
                      (bar * 4 + offset) * beat, .15 * strength)
        for offset in ([0, 2.75] if name == "sanctum" else [0, 2] if name == "grove" else [0, 1.5, 2.5]):
            add_event(stems["pulse"], drum("kick"), (bar * 4 + offset) * beat, .125)
        for tick in range(8):
            off = tick * .5 + (.025 if tick % 2 else 0)
            add_event(stems["pulse"], drum("shaker"), (bar * 4 + off) * beat,
                      .034 if tick % 2 else .023, -.3 if tick % 2 else .3)
        # Each drive layer shares its region's chord progression exactly.
        for offset, gain in [(0, .17), (1.5, .095), (2, .12), (3.25, .085)]:
            add_event(stems["drive"], drum("tom"), (bar * 4 + offset) * beat,
                      gain, -.23 if offset < 2 else .23)
        for offset in [1, 3]:
            add_event(stems["drive"], drum("rim"), (bar * 4 + offset) * beat, .13, .12)
        if bar % 2 == 0:
            add_event(stems["drive"], drum("air"), bar * 4 * beat, .028, -.15)
        counter = [root + 24, root + 31, root + 36, root + 31]
        for index, offset in enumerate([.5, 1.75, 2.5, 3.5]):
            add_event(stems["drive"], pluck(counter[index], .31 * beat, "wood"),
                      (bar * 4 + offset) * beat, .083 if name == "foundry" else .068,
                      -.30 if index % 2 else .30)
        if bar in (3, 7):
            for offset in (3.5, 3.75):
                add_event(stems["drive"], drum("tom"), (bar * 4 + offset) * beat, .065, .25)
    stems["pulse"] = space(stems["pulse"], .085, .65)
    stems["drive"] = space(stems["drive"], .36, .8)
    processing = {}
    for part in stems:
        stems[part], processing[part] = mellow(stems[part],
            high={"bed": 7400, "pulse": 7200, "drive": 6900}[part],
            low={"bed": 135, "pulse": 39, "drive": 78}[part])
    # Preserve stem balance. One shared gain for all stems, no independent normalization.
    combined = sum(stems.values())
    shared_gain = .76 / max(float(np.abs(combined).max()), 1e-9)
    for part in stems:
        stems[part] *= shared_gain
    return stems, {"sample_count": n, "seconds": n / SR, "shared_master_gain": shared_gain,
                    "processing": processing}


def encode_ogg(audio: np.ndarray, path: Path, score: dict, part: str) -> None:
    command = [str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-f", "f32le",
               "-ar", str(SR), "-ac", "2", "-i", "pipe:0", "-c:a", "libvorbis", "-q:a", "5",
               "-metadata", f"title={score['title']} - {part}", "-metadata", "artist=ARC-SHIFT original procedural score",
               "-metadata", f"BPM={score['bpm']}", "-metadata", f"INITIALKEY={score['key']}",
               "-metadata", "LOOPSTART=0", "-metadata", f"LOOPEND={len(audio)}",
               "-metadata", f"LOOPLENGTH={len(audio)}", str(path)]
    subprocess.run(command, input=audio.astype("<f4").tobytes(), check=True, capture_output=True)


def decode_ogg(path: Path) -> np.ndarray:
    command = [str(FFMPEG), "-hide_banner", "-loglevel", "error", "-i", str(path),
               "-f", "f32le", "-ar", str(SR), "-ac", "2", "pipe:1"]
    result = subprocess.run(command, check=True, capture_output=True)
    return np.frombuffer(result.stdout, dtype="<f4").reshape(-1, 2).astype(np.float64)


def db(value: float) -> float:
    return float(20 * np.log10(max(value, 1e-12)))


def metrics(x: np.ndarray) -> dict:
    rms = float(np.sqrt(np.mean(x ** 2)))
    diff = np.diff(x, axis=0)
    seam = float(np.max(np.abs(x[0] - x[-1])))
    derivative99 = float(np.quantile(np.abs(diff), .999))
    seam_delta = x[0] - x[-1]
    seam_curvature = float(max(np.abs(seam_delta - (x[-1] - x[-2])).max(),
                               np.abs((x[1] - x[0]) - seam_delta).max()))
    curvature99 = float(np.quantile(np.abs(np.diff(x, n=2, axis=0)), .999))
    # Four-times band-limited periodic oversampling estimates intersample peaks.
    spectrum = np.fft.rfft(x, axis=0)
    oversampled = np.fft.irfft(spectrum, n=len(x) * 4, axis=0) * 4
    true_peak = float(np.abs(oversampled).max())
    energy = np.sum(np.abs(spectrum) ** 2, axis=1)
    freq = np.fft.rfftfreq(len(x), 1 / SR)
    total_energy = float(energy.sum())
    window = round(.02 * SR)
    before = float(np.sqrt(np.mean(x[-window:] ** 2)))
    after = float(np.sqrt(np.mean(x[:window] ** 2)))
    correlation = float(np.corrcoef(x[:, 0], x[:, 1])[0, 1])
    return {
        "sample_count": len(x), "duration_seconds": len(x) / SR,
        "sample_peak": float(np.abs(x).max()), "estimated_true_peak_4x": true_peak,
        "rms_dbfs": db(rms), "crest_factor_db": db(true_peak / max(rms, 1e-12)),
        "seam_absolute_step": seam, "seam_step_dbfs": db(seam),
        "ordinary_derivative_p99_9": derivative99,
        "seam_to_derivative_p99_9_ratio": seam / max(derivative99, 1e-12),
        "boundary_second_difference": seam_curvature,
        "ordinary_second_difference_p99_9": curvature99,
        "boundary_to_ordinary_second_difference_ratio": seam_curvature / max(curvature99, 1e-12),
        "last_20ms_rms_dbfs": db(before), "first_20ms_rms_dbfs": db(after),
        "boundary_20ms_rms_difference_db": db(after) - db(before),
        "energy_below_45hz_fraction": float(energy[freq < 45].sum() / total_energy),
        "energy_above_8000hz_fraction": float(energy[freq > 8000].sum() / total_energy),
        "stereo_correlation": correlation,
    }


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = np.clip(np.round(audio * 32767), -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(pcm.tobytes())


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    receipt = {
        "project": "ARC-SHIFT v2.1", "sample_rate": SR, "channels": 2,
        "format": "Ogg Vorbis quality 5", "bars": 8, "beats_per_bar": 4,
        "originality": "All melodies, harmonies, rhythms and synthesized instruments authored in generator.py; no external music or samples.",
        "method": "NumPy additive/physical-inspired synthesis; circular event-tail wrapping, stereo diffusion, dynamic high-band attenuation; FFmpeg libvorbis encoding.",
        "validation": "Objective PCM and decoded-Ogg measurements only; no claim of human listening review.",
        "loop_playback": "Use sample-accurate Web Audio AudioBufferSourceNode.loop=true; start all region stems at the same audio-context time with loopStart=0 and loopEnd=sample_count/sample_rate. Do not use HTML audio ended callbacks to simulate gapless looping.",
        "mixing": "Stems have baked balancing and one shared region gain. All three unity-gain stems sum below 0.85 peak. Suggested runtime gains are 0.90 bed, 0.85 pulse, 0.80 drive; smoothly ramp added layers. Bosses may share the region theme with drive raised to 1.0. Avoid stacking different region themes at full level; use equal-gain scene crossfades.",
        "seed": SEED, "regions": {},
    }
    mixes = []
    for name, score in SCORES.items():
        print(f"Rendering {name}...", flush=True)
        stems, render_info = render_region(name, score)
        region = {"title": score["title"], "bpm": score["bpm"], "key": score["key"],
                  "chords": score["progression"], "chord_duration_beats": 8,
                  "bars": 8, "beats": BEATS, **render_info, "stems": {}}
        decoded = {}
        for part, pcm in stems.items():
            path = ROOT / f"{name}-{part}.ogg"
            encode_ogg(pcm, path, score, part)
            output_pcm = decode_ogg(path)
            assert len(output_pcm) == len(pcm), (path.name, len(output_pcm), len(pcm))
            check = metrics(output_pcm)
            assert check["seam_to_derivative_p99_9_ratio"] < 1.5, (path.name, check)
            assert check["energy_below_45hz_fraction"] < .02, (path.name, check)
            assert check["energy_above_8000hz_fraction"] < .005, (path.name, check)
            region["stems"][part] = {"file": path.name, "path": str(path),
                "sha256": sha(path), "bytes": path.stat().st_size,
                "suggested_gain": {"bed": .90, "pulse": .85, "drive": .80}[part],
                "source_pcm_metrics": metrics(pcm), "decoded_ogg_metrics": check}
            decoded[part] = output_pcm
            print(f"  {part}: {len(output_pcm)} frames; peak {check['sample_peak']:.4f}; seam {check['seam_absolute_step']:.6f}", flush=True)
        mix = sum(decoded.values())
        mix_check = metrics(mix)
        assert mix_check["estimated_true_peak_4x"] <= .85, (name, mix_check)
        # A seam no larger than a common musical waveform step is not a click.
        assert mix_check["seam_to_derivative_p99_9_ratio"] < 1.5, (name, mix_check)
        region["full_mix_decoded_metrics"] = mix_check
        receipt["regions"][name] = region
        mixes.append((name, decoded))

    # 30-second audition: ten seconds per region, introducing pulse then drive.
    preview = np.zeros((30 * SR, 2), dtype=np.float64)
    preview_segments = []
    for index, (name, parts) in enumerate(mixes):
        count = 10 * SR
        t = np.arange(count) / SR
        pulse_gain = np.clip((t - 1.0) / 1.0, 0, 1)
        drive_gain = np.clip((t - 3.0) / 1.1, 0, 1)
        segment = parts["bed"][:count] * .9 + parts["pulse"][:count] * pulse_gain[:, None] * .85
        segment += parts["drive"][:count] * drive_gain[:, None] * .8
        fade = np.minimum(np.clip(t / .22, 0, 1), np.clip((10 - t) / .28, 0, 1))
        segment *= fade[:, None]
        preview[index * count:(index + 1) * count] = segment
        preview_segments.append({"region": name, "start_seconds": index * 10,
                                 "end_seconds": (index + 1) * 10,
                                 "layers": "bed immediately; pulse fades in at +1s; drive fades in at +3s"})
    assert np.abs(preview).max() <= .85
    preview_path = ROOT / "arc-shift-v21-audition.wav"
    write_wav(preview_path, preview)
    with wave.open(str(preview_path), "rb") as audition_file:
        stored_preview = np.frombuffer(audition_file.readframes(audition_file.getnframes()),
                                       dtype="<i2").reshape(-1, 2).astype(np.float64) / 32768
    receipt["audition"] = {"file": preview_path.name, "sha256": sha(preview_path),
                           "format": "48 kHz stereo PCM16 WAV", "segments": preview_segments,
                           "metrics": metrics(stored_preview), "sample_count": len(stored_preview)}
    receipt["generator"] = {"file": "generator.py", "sha256": sha(Path(__file__)),
                            "python_dependency": "NumPy", "ffmpeg": str(FFMPEG)}
    (ROOT / "metadata.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Complete: 9 Ogg stems, 30-second WAV audition, metadata.json and generator.py.", flush=True)


if __name__ == "__main__":
    main()
