"""Encode only fresh v2.3 captures; clock-align game audio, verify, and deliver.

Usage: python scripts/encode-v23.py D:/CodexData/ArcShiftV23/edit-plan.json
Plan: {"sources":{"menu":"menu-take"}, "clips":[
  {"source":"menu","start":"menu-zh","end":"end","label":"ARC//SHIFT · v2.3"}
]}. Event references may be {"event":"name", "offset":1.2}; seconds also work.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
import shutil
import subprocess
import wave

import numpy as np

REPO = Path(__file__).resolve().parent.parent
DEFAULT_FF = Path('D:/CodexData/PlanningPortfolio/arc-shift-20260918/tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
ASS_HEADER = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Label,Microsoft YaHei,26,&H00EAF2E4,&H00FFFFFF,&H00151D24,&HA5151D24,0,0,0,0,100,100,0,0,3,5,0,1,76,76,30,1
Style: Note,Microsoft YaHei,17,&H00C5D6D5,&H00FFFFFF,&H00151D24,&HA5151D24,0,0,0,0,100,100,0,0,3,4,0,9,76,76,30,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''


def stamp(seconds):
    return f'{int(seconds // 3600)}:{int(seconds // 60) % 60:02}:{seconds % 60:05.2f}'


def sha256(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def load_wave(file):
    with wave.open(str(file), 'rb') as audio:
        assert audio.getsampwidth() == 2 and audio.getnchannels() == 2
        return np.frombuffer(audio.readframes(audio.getnframes()), np.int16).reshape(-1, 2).astype(np.float32) / 32768


def write_wave(file, samples):
    with wave.open(str(file), 'wb') as audio:
        audio.setnchannels(2)
        audio.setsampwidth(2)
        audio.setframerate(48000)
        audio.writeframes((np.clip(samples, -.999, .999) * 32767).astype(np.int16).tobytes())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('plan', type=Path)
    parser.add_argument('--ffmpeg', type=Path, default=DEFAULT_FF)
    parser.add_argument('--crf', type=int, default=18)
    parser.add_argument('--gain-db', type=float, default=6)
    parser.add_argument('--deliver', action='store_true', help='Copy a fully decoded artifact to the two requested destinations')
    args = parser.parse_args()
    work = args.plan.resolve().parent
    assert args.ffmpeg.is_file(), f'FFmpeg missing: {args.ffmpeg}'
    plan = json.loads(args.plan.read_text('utf-8-sig'))
    encoded = work / 'encoded'
    encoded.mkdir(exist_ok=True)
    frames = work / 'review-frames'
    frames.mkdir(exist_ok=True)
    fonts = work / 'fonts'
    fonts.mkdir(exist_ok=True)
    font = Path('C:/Windows/Fonts/msyh.ttc')
    if font.is_file() and not (fonts / font.name).exists():
        shutil.copyfile(font, fonts / font.name)

    def ff(parameters, label, error_ok=False):
        process = subprocess.run([str(args.ffmpeg), '-y', '-hide_banner', '-nostdin'] + parameters, cwd=work, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        (work / f'{label}.log').write_bytes(process.stdout)
        if process.returncode and not error_ok:
            raise RuntimeError(process.stdout.decode('utf-8', errors='replace')[-5000:])
        return process.stdout.decode('utf-8', errors='replace'), process.returncode

    sources = {}
    for key, relative in plan['sources'].items():
        folder = (work / relative).resolve()
        assert folder.is_relative_to(work), 'Sources must be new takes under the v2.3 evidence directory'
        meta = json.loads((folder / 'capture.json').read_text('utf-8'))
        assert meta.get('version') == '2.3' and meta.get('recording'), f'Not a fresh v2.3 recording: {folder}'
        assert not meta.get('failed') and not meta.get('errors'), f'Capture failed or has page errors: {folder}'
        video = folder / meta['videoFile']
        assert video.is_file()
        tracks = []
        for index, track in enumerate(meta['audioTakes']):
            raw = folder / track['file']
            decoded = encoded / f'{key}-audio-{index}.wav'
            ff(['-i', str(raw), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', str(decoded)], f'decode-{key}-{index}')
            samples = load_wave(decoded)
            clocks = np.array([[point['wall'], point['clock']] for point in track['clock']], dtype=np.float64)
            assert len(clocks) >= 2 and np.all(np.diff(clocks[:, 0]) >= 0)
            tracks.append((samples, (clocks[:, 0] - meta['videoStart']) / 1000, clocks[:, 1] - clocks[0, 1]))
        sources[key] = {'folder': folder, 'meta': meta, 'video': video, 'tracks': tracks}

    def resolve(value, meta):
        if isinstance(value, (int, float)):
            return float(value)
        event, offset = (value, 0) if isinstance(value, str) else (value['event'], value.get('offset', 0))
        found = [item['seconds'] for item in meta['events'] if item['name'] == event]
        assert len(found) == 1, f'Event must be unique: {event}'
        return found[0] + offset

    reports = []
    cumulative = 0
    for index, clip in enumerate(plan['clips']):
        source = sources[clip['source']]
        begin, end = resolve(clip['start'], source['meta']), resolve(clip['end'], source['meta'])
        duration = end - begin
        assert begin >= 0 and duration > .1 and end <= source['meta']['duration'] + .25
        label = f'clip-{index:02}'
        timeline = np.arange(round(duration * 48000), dtype=np.float64) / 48000 + begin
        aligned = np.zeros((len(timeline), 2), dtype=np.float32)
        clock_reports = []
        for samples, wall, clock in source['tracks']:
            # Flat AudioContext clock regions preserve actual pauses as silence.
            sample_seconds = np.interp(timeline, wall, clock, left=-1, right=clock[-1] + 1)
            sample_time = np.arange(len(samples), dtype=np.float64) / 48000
            for channel in range(2):
                aligned[:, channel] += np.interp(sample_seconds, sample_time, samples[:, channel], left=0, right=0)
            # Detect suspended clock plateaus and silence them instead of repeating a sample.
            for j in range(len(wall) - 1):
                if abs(clock[j + 1] - clock[j]) < .00001:
                    mask = (timeline >= wall[j]) & (timeline < wall[j + 1])
                    aligned[mask] = 0
            clock_reports.append({'wallStart': float(wall[0]), 'wallEnd': float(wall[-1]), 'audioContextSpan': float(clock[-1]), 'decodedSeconds': len(samples) / 48000})
        raw_peak = float(np.max(np.abs(aligned))) if len(aligned) else 0
        gain = min(10 ** (args.gain_db / 20), .92 / max(raw_peak, .000001))
        aligned *= gain
        # Short edge fades prevent clicks at genuine gameplay edit boundaries.
        ramp = min(720, len(aligned) // 2)
        aligned[:ramp] *= np.linspace(0, 1, ramp)[:, None]
        aligned[-ramp:] *= np.linspace(1, 0, ramp)[:, None]
        audio = encoded / f'{label}.wav'
        write_wave(audio, aligned)
        ass = ASS_HEADER
        caption = clip.get('label', '').replace('\n', r'\N')
        if caption:
            ass += f'Dialogue: 0,0:00:00.15,{stamp(min(duration - .1, clip.get("labelSeconds", 4.5)))},Label,,0,0,0,,{caption}\n'
        note = clip.get('note', '')
        if note:
            ass += f'Dialogue: 1,0:00:00.00,{stamp(duration)},Note,,0,0,0,,{note}\n'
        subtitle = work / f'{label}.ass'
        subtitle.write_text(ass, encoding='utf-8-sig')
        output = encoded / f'{label}.mp4'
        ff(['-ss', str(begin), '-i', str(source['video']), '-i', str(audio), '-t', str(duration),
            '-filter_complex_threads', '2', '-vf', f'ass={subtitle.name}:fontsdir=fonts',
            '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-threads', '4', '-preset', 'medium', '-crf', str(args.crf),
            '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', str(output)], f'encode-{label}')
        reports.append({'index': index, 'source': clip['source'], 'sourceVideo': str(source['video']), 'sourceSha256': sha256(source['video']),
            'start': begin, 'end': end, 'duration': duration, 'outputStart': cumulative, 'label': caption, 'note': note,
            'gainDb': 20 * math.log10(gain), 'peakDbfs': 20 * math.log10(max(float(np.max(np.abs(aligned))), 1e-10)), 'clocks': clock_reports})
        cumulative += duration
        print(f'Encoded {index + 1}/{len(plan["clips"])}: {duration:.2f}s', flush=True)

    concat = work / 'concat-v23.txt'
    concat.write_text(''.join(f"file 'encoded/clip-{index:02}.mp4'\n" for index in range(len(reports))), encoding='utf-8')
    final = work / 'ARC-SHIFT_v2.3_Demo.mp4'
    ff(['-f', 'concat', '-safe', '0', '-i', str(concat), '-map', '0:v', '-map', '0:a', '-c', 'copy', '-movflags', '+faststart', str(final)], 'final-concat')
    # Decode every video/audio frame, failing on malformed packets.
    decode, code = ff(['-v', 'error', '-xerror', '-i', str(final), '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], 'final-full-decode')
    assert code == 0 and not decode.strip(), 'Full decode must be clean'
    inspection, _ = ff(['-i', str(final), '-af', 'volumedetect,silencedetect=noise=-50dB:d=1.5', '-vn', '-f', 'null', '-'], 'final-audio-inspection')
    peaks = re.findall(r'max_volume: ([\-\d.]+) dB', inspection)
    silent = re.findall(r'silence_(start|end|duration): ([\d.]+)', inspection)
    stream_lines = [line.strip() for line in inspection.splitlines() if 'Stream #' in line or 'Duration:' in line]
    frame_reports = []
    for report in reports:
        for fraction in [.2, .66]:
            seconds = report['outputStart'] + report['duration'] * fraction
            name = f'clip-{report["index"]:02}-{int(fraction * 100)}.png'
            ff(['-ss', str(seconds), '-i', str(final), '-frames:v', '1', str(frames / name)], f'frame-{report["index"]}-{fraction}')
            frame_reports.append({'file': str(frames / name), 'seconds': seconds, 'clip': report['index']})
    evidence = {'version': '2.3', 'output': str(final), 'bytes': final.stat().st_size, 'megabytes': final.stat().st_size / 1e6,
        'sha256': sha256(final), 'durationSeconds': cumulative, 'crf': args.crf, 'clips': reports,
        'fullDecode': 'passed', 'maxVolumeDbfs': float(peaks[-1]) if peaks else None, 'silenceEvents': silent,
        'streams': stream_lines, 'reviewFrames': frame_reports, 'visualReview': 'pending', 'audioVisualReview': 'pending',
        'disclosure': 'Only newly recorded v2.3 browser gameplay and its game audio. Ordinary scripted keyboard/pointer input. Built-in invulnerable practice is labeled when used. No human playtest claim.'}
    if args.deliver:
        destinations = [REPO / 'output/video/ARC-SHIFT_v2.3_Demo.mp4', Path('C:/Users/yzhu/Desktop/ARC-SHIFT_v2.3_Demo.mp4')]
        evidence['copies'] = []
        for destination in destinations:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(final, destination)
            digest = sha256(destination)
            assert digest == evidence['sha256']
            evidence['copies'].append({'path': str(destination), 'sha256': digest, 'bytes': destination.stat().st_size})
    (work / 'video-edit-report-v23.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({key: evidence[key] for key in ['output', 'megabytes', 'durationSeconds', 'sha256', 'maxVolumeDbfs']}, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
