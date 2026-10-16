#!/usr/bin/env python3
"""Synthetisiert die Sounds ultimate und curse (Aufruf: python3 tools/sounds-synth.py <Zielordner>).
Ultimate: 5 s, Aufbau passend zur Pentagramm-Animation (Einschlag bei 3,4 s). Curse: 1,6 s dunkles Grollen."""
import sys, subprocess, numpy as np

SR = 44100
rng = np.random.default_rng(7)

def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a, d, p=2.0):  # Anstieg a s, danach exponentieller Abfall
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) / d) ** p if p else np.exp(-(t - a) / d))
    return e
def lowpass(x, fc):  # einfacher Ein-Pol-Tiefpass, mehrfach für steilere Flanke
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def lp(x, fc, n=2):
    for _ in range(n): x = lowpass(x, fc)
    return x
def hp(x, fc): return x - lp(x, fc, 1)
def reverb(x, sec=2.4, mix=.35):
    n = int(SR * sec); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 3.2); ir = lp(ir, 3500, 1)
    N = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:len(x)]
    wet *= np.max(np.abs(x)) / (np.max(np.abs(wet)) + 1e-9)
    return x * (1 - mix) + wet * mix
def sat(x, k): return np.tanh(x * k) / np.tanh(k)
def phase_of(f): return 2 * np.pi * np.cumsum(f) / SR

def ultimate():
    D, hit = 5.2, 3.4
    n = int(SR * D); t = np.arange(n) / SR
    # 1) steigender Drone: gestapelte Sägezähne, Tonhöhe steigt auf den Einschlag zu
    f0 = 55 * (1 + 0.5 * np.clip(t / hit, 0, 1) ** 2)
    drone = np.zeros(n)
    for det in (-0.012, 0, 0.011, 0.5 * 0 + 0.006):
        ph = phase_of(f0 * (1 + det))
        for h in range(1, 9): drone += np.sin(ph * h) / h
    drone = sat(drone / 4, 2.5)
    drone *= np.clip(t / hit, 0, 1) ** 1.5 * np.where(t < hit, 1, np.exp(-(t - hit) / 1.4))
    # 2) Rauschaufstieg (Wirbel der Elemente)
    nz = rng.standard_normal(n)
    sw = np.zeros(n)
    for lo, hi, g in ((300, 2500, 1.0), (1200, 7000, .5)):
        seg = lp(hp(nz, lo), hi, 2)
        sw += seg * g
    sw *= (np.clip(t / hit, 0, 1) ** 3) * np.where(t < hit, 1, np.exp(-(t - hit) / .35))
    # 3) chorartiger Klang: Stimmen in Moll (Grundton, Quinte, Oktave) mit Vibrato, formantartig
    choir = np.zeros(n)
    for f, g in ((110, 1), (164.8, .8), (220, .7), (329.6, .4)):
        vib = 1 + .006 * np.sin(2 * np.pi * 5.3 * t + f)
        ph = phase_of(f * vib)
        v = sum(np.sin(ph * h + h) / h ** 1.3 for h in range(1, 7))
        choir += g * v
    ce = np.clip((t - .6) / 2.6, 0, 1) ** 1.6 * np.where(t < hit, 1, np.exp(-(t - hit) / 1.8))
    choir = lp(choir, 1800, 1) * ce
    # 4) Einschlag: Sub-Boom mit fallender Tonhöhe + Rauschknall + Schlagwelle
    th = np.clip(t - hit, 0, None); on = (t >= hit)
    fb = 38 + 90 * np.exp(-th * 9)
    boom = np.sin(phase_of(fb)) * np.exp(-th / .9) * on * 1.6
    boom += np.sin(phase_of(fb * 2.01)) * np.exp(-th / .35) * on * .5
    crack = lp(hp(rng.standard_normal(n), 120), 4500, 1) * np.exp(-th / .22) * on * 1.4
    rumble = lp(rng.standard_normal(n), 220, 2) * np.exp(-th / 1.3) * on * 5
    # Mischen
    x = drone * .55 + sw * .35 + choir * .5 + boom + crack * .7 + rumble
    x = reverb(x, 2.6, .30)
    x = sat(x / np.max(np.abs(x)) * 1.6, 1.6)
    fade = np.clip((D - t) / .5, 0, 1); x *= fade
    return x

def curse():
    D = 1.7; n = int(SR * D); t = np.arange(n) / SR
    f = 150 * np.exp(-t * 1.6) + 38                           # fallende Tonhöhe
    grow = sum(np.sin(phase_of(f * k + 0.0) + k) / k for k in range(1, 12))
    grow += .9 * np.sin(phase_of(f * 1.5 * (1 + .01 * np.sin(2 * np.pi * 7 * t))))
    grow = sat(grow / 3, 3)
    ring = np.sin(phase_of(f * 2.97)) * np.sin(2 * np.pi * 31 * t)   # unheimliches Schnarren
    whisper = lp(hp(rng.standard_normal(n), 1800), 6500, 1) * (.5 + .5 * np.sin(2 * np.pi * 9 * t + 1)) * np.exp(-t / .7)
    e = np.where(t < .03, t / .03, np.exp(-(t - .03) / .6))
    x = (grow * .9 + ring * .35) * e + whisper * .35
    sub = np.sin(phase_of(30 + 70 * np.exp(-t * 7))) * np.exp(-t / .5) * 1.2
    x = reverb(x + sub, 1.6, .3)
    x = sat(x / np.max(np.abs(x)) * 1.5, 1.5)
    x *= np.clip((D - t) / .25, 0, 1)
    return x

def save(x, path):
    x = x / np.max(np.abs(x)) * 0.89            # Spitze ca. -1 dB; Aufbereitung gleicht den Mittelwert an
    pcm = (x * 32767).astype('<i2').tobytes()
    p = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-codec:a', 'libmp3lame', '-q:a', '2', path], input=pcm)
    p.check_returncode()

if __name__ == '__main__':
    out = sys.argv[1]
    save(ultimate(), out + '/ultimate.mp3'); save(curse(), out + '/curse.mp3')
