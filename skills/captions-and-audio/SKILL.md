---
name: captions-and-audio
description: Add or change the captions, the background music and the sound effects of a Brollss project, then measure the mix with check_audio.
---

# Captions and audio

## When to use

- The video is meant to be published and has no captions, music or sound effects yet.
- The user asks to change the captions' style, the music or its level, or the sound effects.
- `check_edit` or `check_audio` names a caption or audio problem.

## Captions

1. `get_captions`: whether the track is on, on the whole video or on chosen passages, its style, `styleBy` (whether the user chose it), and `catalogue`, the styles you can pick from.
2. Whole video, or chosen passages: `set_captions` with `enabled: true`, and `ranges` for passages. `style` takes a catalogue style by id or name. A style the user chose stays, unless the user asked to change the look: then pass `lookAsked: true`. The answer reads the track back. Check it.
3. A few key passages only: `add_caption` with `fromWordKey` and `toWordKey`, once per passage, under 8 s each, where the speaker insists.

## Music

1. `list_music` gives the track ids and the track playing today. A track id never comes from you.
2. `set_music` with `trackId`. Leave `volume` out: the level starts where the app's mixer starts, set from the track's loudness. `duck` sets how much the music drops under the voice: `subtle` (8 dB, the default), `normal` (12 dB) or `strong` (18 dB). `fadeInSec` and `fadeOutSec` default to 1 s and 3 s.
3. `level: "recommended"` resets the level from the track's loudness, even on the track already there. `level: "keep"` keeps the level, duck and fades in place. `trackId: null` removes the music.

## Sound effects

1. `list_sfx`: the library, the roles (whoosh, pop, click, impact, typing and others) and the effects already placed, each with its index. `insert_scene` places the effects a page plans on its own: read what is there before you add more.
2. `add_sfx` with `at` (a word key or montage seconds) and `sound` (a role or a library id). The effect rides on the visual on screen at that moment; `brollId` picks one. With no visual there, it is refused: draw a scene first.
3. Keep it discreet: one effect per scene entrance or key element, never a burst. `remove_sfx` with `brollId` and `index`, or `all: true`, takes effects out.

## Check the mix

`check_audio` measures the mix by code: the voice on spoken passages, each music track in the pauses and under the voice in dB against the voice, and the effects that jump over the voice or sit less than 0.5 s apart. Music sits well 15 to 25 dB under the voice. Fix what it reports with `set_music` (`duck`, `volume`, `level`) or `remove_sfx`, then run it again.

Every write takes `expectedRevision`, the `editRevision` of the last result. Writes go one at a time.
