# Rig Jam: Gag Character Style Guide

Renamed from Rush Hour Rigs on Oct 9, 2026 (trademark).

The rules for every gag character. The approved example is the magpie: `magpie_puppet_reference.html` (RHR Art Inbox on the Desktop). When in doubt, match the magpie.

## 1. What a gag is made of

Every character is a **code puppet**: an inline SVG drawn in code, split into named parts, and moved by a `pose(t)` function. No raster images, no video, no sprite sheets, no AI-generated pictures. This is what keeps every frame on model and lets Claude Code port it straight into the game.

Every deliverable is ONE self-contained HTML file built like the magpie reference:
- the character as an SVG string with named part groups;
- a `pose(t)` function returning the transforms for time `t` in seconds;
- a BEATS list (time, one line each) shown as a beat sheet that highlights the current beat;
- a true-size panel on a real board screenshot and a 3x close-up panel, playing the same animation;
- Pause, Slow motion (0.35x) and Restart buttons;
- prefers-reduced-motion respected (show a still mid-gag pose).

## 2. Construction

- `viewBox="0 0 120 120"`. The character's feet (or base) sit at **(60, 108)** in every pose. That point is the anchor the game places on the board.
- Default facing: **right**. Facing left is a mirror of the whole puppet about x = 60 (a `flip` group).
- Group order, back to front: far limbs or tail, legs, body, near limb or wing, head, props in hand.
- Every movable part is its own `<g>` with a fixed pivot (shoulder, hip, neck, tail base). Rotate parts about their pivot. Never redraw a part per frame.
- Expressions change only small pieces: pupil position, an eyelid shape, a brow shape, the mouth or beak. The head shape never changes.

## 3. The look

- **Outline:** one colour, `#2b1e16`, stroke width 3 on main shapes, 2 to 2.6 on small details, round joins.
- **Fills:** flat. No gradients, no blur, no textures, no soft shadows, no glow.
- **Two tones per material:** a base fill plus at most one flat highlight stroke (top left) or one flat shadow shape (bottom). Example: the magpie's black head has one `#4a5063` highlight arc; the white belly has one `#d8dde8` shadow shape.
- **Light:** top left, always.
- **Proportions:** chunky toy figure. Head about 35 to 40 percent of total height, round body, short legs. Big readable eyes: white disc about 8 to 9 units radius, dark pupil about 4 units, one small white glint.
- **Comedy lives in the face:** a slanted eyelid for sly, a full lid for squeezed, a curved lid for blissful, a raised lid plus small pupil for startled, a half lid plus open beak or mouth for smug.
- **No text** anywhere on the character, clothes, vehicles or props. No logos, no brand grilles.
- **Accuracy:** Alberta wildlife true to the real animal; people follow ART_BIBLE.md PPE (hard hat, safety glasses, FR coveralls red or navy with reflective stripes, gloves, steel-toe boots, gas monitor at the chest). The spotter adds a hi-vis vest and two orange flags. The Company Man wears a white hard hat.

## 4. Size on screen (at 390 px wide)

| Character | On-screen size |
|---|---|
| Magpie, gopher, rabbit | about 40 px wide |
| Goose | about 36 px wide |
| Moose peek | about 45 px antler span |
| People (spotter, biffy worker, landowner on quad) | about 60 to 66 px tall |
| Bear | about 90 px tall, never more |
| Vehicles (hotshot) | the size of a 3-cell truck, about 150 px long |

## 5. Animation rules (no lazy animation)

1. Characters face the way they travel. To reverse, they turn first, with a hop-turn that snaps around at the top of the hop. Never scale a character through zero width (no paper-thin turns).
2. Anticipation before every big move: crouch before a jump, take-off or effort.
3. Squash and stretch on landings and launches, about 15 to 25 percent.
4. Moves follow arcs, never straight slides. Ease in and ease out.
5. Follow-through: tails, wings, flags, hats and loose clothing lag and settle.
6. Secondary acting: blinks, glances, small breathing, chuckles. A held pose still breathes.
7. Characters enter from fully off screen and leave until fully off screen, on a layer above the whole game screen. Never vanish or get clipped mid-screen.
8. Every gag ends on a small comic payoff (the magpie's floating feather).
9. Total length 8 to 14 seconds. Gag props the game must keep (splats, ruts) are separate elements so they can stay after the character leaves.

## 6. Speech

Speech bubbles are drawn by the game, not the character file. List the line and who says it in the beat sheet. Lines are short, universal and clean. No oilfield in-jokes the public would not get.

## 7. Acceptance checklist (the reviewer checks every item)

- [ ] One self-contained HTML, structured like the magpie reference.
- [ ] Same character in every moment: no part changes shape, only moves.
- [ ] Outline colour and weights, flat fills, two tones max, light top left.
- [ ] Anchor at (60, 108), faces right by default, mirrors cleanly.
- [ ] Every beat from the confirmed beat list, in order, with times.
- [ ] Rules 1 to 9 of section 5 all met.
- [ ] Correct size at true scale on the real board screenshot.
- [ ] No text, no logos, accurate gear and animals.
- [ ] Reduced motion handled.
