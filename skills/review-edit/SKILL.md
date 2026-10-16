---
name: review-edit
description: Review a Brollss edit without changing it. Run check_edit and check_audio, look at the final picture where it matters, and report what to fix with montage times.
---

# Review edit

## When to use

- The user asks whether an edit is ready, or what is wrong with it.
- Before saying an edit you made is finished (the edit-video skill ends with this review).
- After someone else, or the Brollss copilot, edited the project.

This skill reads and looks. It writes nothing. To fix what it finds, follow the edit-video, add-scenes or captions-and-audio skill.

## Instructions

1. `get_project_state`: length, cuts, scenes and zooms with their moments, captions, music.
2. `check_edit`. Read its three parts:
   - `timeline`: what gets in each other's way (two scenes at once, a zoom under a full-frame scene, captions under a scene, a scene left outside the montage or on cut words, a zoom of 0 s, a captioned passage that was cut), each with its montage seconds and its fix.
   - `scenes`: each scene's pace. An HTML page played faster or slower than drawn needs a redraw for its length.
   - `rubric`: hook, too many visuals, visuals on each other, captions, retakes left, mid-sentence joins, zooms, music.
   - `notes`: information, not points to fix. A long stretch without a visual comes there with the calm bands of the picture where a `P9` scene can go; the visual density and pace are in the rubric's `notes`. No number of visuals per minute is required.
3. `check_audio`: the music against the voice in the pauses and under the voice, and the sound effects too loud or too close.
4. `look_at_montage` on the first 5 s, the last 5 s, every scene and zoom, and every moment `check_edit` names. Looks render one at a time, 5 to 60 s each. Say what each picture shows: the face covered or not, the text cut or not, a scene that does not match what is said.
5. `get_scene` on a scene that looks wrong: its text, its language against the video's, its status and the reasons the code gave.

## The report

One line per finding: the montage time, what is wrong, the tool that fixes it. Then the verdict. The edit is ready when `check_edit` lists no point and `check_audio` reports nothing out of range, or when each point kept has its reason in one line. Say which. Do not call an edit ready on what you expect: only on what the checks and the pictures showed.
