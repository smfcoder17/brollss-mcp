---
name: add-scenes
description: Draw animated scenes (B-rolls) for a Brollss project yourself, measure them on the real video and place them, or redraw, retime and re-layout the scenes already there.
---

# Add scenes

## When to use

- `check_edit` says the video lacks visuals, or names a long stretch without one.
- The user asks for a scene on a passage, or wants an existing scene changed.
- The speaker points at the screen and a moving mark (an arrow that draws itself, a blinking highlight) says it better than `add_marker`.

A scene is an HTML page the app plays and exports as it is. You write the page. No model of Brollss draws it, and measuring is free.

## Draw a new scene

1. Once per session, read the contract: `get_scene_contract` (the page rules, the recipes and when to use each, the grading grid). Pass `recipe` for the full skill of the recipe you pick. `get_scene_examples` with an `id` (E1 to E5) gives a graded example page and its strip.
2. Pick the moment: a whole idea, with `fromKey` and `toKey` from the transcript.
3. `list_layouts` for that moment: which layouts hold and why the others do not, the scene box and the content box in px. `P1` fills the frame, `P9` is transparent over the video, the others keep the speaker beside the scene.
4. `get_scene_brief` with `projectId`, `fromKey`, `toKey`, `layout`, and `recipe` and `idea` if you have them. It returns the beats in seconds, the content box (the page size you write), the face, and the rules the code measures. If `range` says the moment does not hold (the last beat lands after 85 % of the scene), use the `toKey` it proposes. Leave `face` out: the server uses what the project measured and says where it comes from in `faceFrom`. Pass `face` only when `faceFrom` says nothing was measured. For `P9`, `zone` keeps the elements off the face and off what the screen shows.
5. Write the whole page. No network, GSAP core only, every image inline as `data:`. No generated pictures: draw in CSS or SVG. A page is at most 3 MB with images and 600 KB without.
6. `measure_scene` with the same arguments and `html`. The code films the page over the real video and says what is broken (frozen, empty, cut text, placeholder frame, face covered, nothing new on a beat), with distances in px and where to move each element. Look at the strip yourself. Fix everything it lists at once and measure again. Two or three measures make a scene. The cap is 12 measures per scene per hour.
7. `insert_scene` with the same arguments, the same `html` and `expectedRevision`. Read `soundEffects`: the code already placed the effects the page plans (a whoosh on the entrance, clicks on its elements).
8. `look_at_montage` at that moment. Judge the final picture, then move on.

Pass the same `projectId`, `fromKey`, `toKey`, `layout`, `recipe`, `idea`, `face` and `zone` to `get_scene_brief`, `measure_scene` and `insert_scene`: the server rebuilds the brief from them.

## Change a scene already there

- `get_scene` with its `brollId`: its moment, its kind (an HTML page or a ready-made template), its text and whether that text's language matches the video's. `html: true` adds the stored page.
- Words of a template (title, versus, big number, quote, checklist): `set_scene_text`.
- Length: `set_duration`. The export plays a shortened HTML page faster and a lengthened one slower; read `pace`, and redraw the page for its new length when the pace is off. A template is laid out again and keeps its pace.
- Anchor: `move_broll` puts it on another word of the words it illustrates.
- Layout: `apply_layout` with a layout `list_layouts` says holds. Free, instant, nothing redrawn.
- Speaker window over it: `set_broll_pip`. Without `position` or `box`, the window goes on the box the scene keeps empty for the camera.
- Look: write a new page for its moment, then `measure_scene` and `insert_scene` with its `brollId` and the `fromKey`/`toKey` that `get_scene` gave.
- Remove: `remove_brolls`.

## Marks on the screen

- A circle, an underline or a box around a zone: `add_marker` with `fromKey`, `toKey` and the zone in fractions of the final frame (read it on `look_at_montage`). Composed by code, instant.
- Any other moving mark: a `P9` scene drawn as above, its elements on the zone you read. A ring around something the video shows is a mark; a ring around nothing is a placeholder frame and is refused.
- Keep zooms off the words of a mark: a zoom moves the picture under it.
