# Book Cover Master Builder for Affinity 3

A script for Affinity 3 (Publisher features in the unified Affinity app) that adds **native, non-printing guides** for a one-piece book cover:

```
BACK COVER | SPINE | FRONT COVER
```

It never creates lines, text, or any other printable object.

## Requirements

- Affinity 3 with JavaScript scripting. Built and checked against **Affinity 3.3.0** (`/Applications/Affinity.app`, bundled `JSLib`).
- Optional: **Script Manager for Affinity**, to install and run the script from a list.

## Install and run

1. Copy `Book_Cover_Master_Builder_Affinity3.js` into your scripts folder.
   - With Script Manager: add it to **My Scripts** (`~/Library/Application Support/affinity-script-manager/MyScripts/`), or import it in the Script Manager app.
   - Or open Affinity's scripting panel and load or paste the file.
2. Open your cover document.
3. In the **Pages** panel, double-click the **cover Master** so it's the spread on screen. The script works on the spread currently shown.
4. Run the script:
   1. **One dialog** with three columns that read like the cover, styled like Affinity's Document Setup:
      - **Cover Master / Back & Front Cover / Bleed & Safe Area**: choose the **Action** (*Create / prepare new* or *Update existing*). The script won't continue until you choose. The *Target* line shows the size of the spread on screen, so you can check it's the cover Master. In New mode you set the width of each cover (back = front), the height and *Resize page*. In Update mode the width is shown, read from the page.
      - **Spine**: Manual width, or estimated from page count × paper caliper; below that the *Summary*.
      - **Guides**: one switch per guide group, plus *Show on spread while editing*.
   2. Units follow the document's units (**File ▸ Document Setup ▸ Document units**).
   3. The script opens only one dialog per run. On Affinity 3.3.0, a second dialog in the same run crashed Affinity when it closed.
   4. **Apply.** The script shows a summary, asks you to confirm, then adds the guides. **Edit ▸ Undo** reverses it.

## New vs Update

| | **New** | **Update** |
|---|---|---|
| Page size | Worked out as `back + spine + front`. You enter one **cover width** (used for both back and front) and the height. Both start from the open page, so leaving them unchanged keeps the page size. With *Resize page* on (1-page spreads only), the page is resized around its centre. | Read from the spread as it is now. |
| Cover width (each) | Entered | Calculated: `(page width − spine) ÷ 2` |
| Objects, layers, text | Kept. The script never touches them. | Kept. The script never touches them. |
| Existing guides | Kept (see limitations) | Kept (see limitations) |

Example: on a 12.063 × 8.5 in page with a 10 mm spine, the dialog starts at **5.8346 in** per cover, and the spine centre is at **6.0315 in**. If you then change the spine, the covers stay the same width and the page grows or shrinks around the spine.

In NEW mode, the resize and the guides are one undo step. The script then reads back the page box Affinity actually made. If it differs from what you asked for (for example because Affinity rounded the size), the script undoes the change, resizes on its own, and builds the guides on the page Affinity actually created. That keeps the spine centre on the real page centre.

## Centre-anchored spine (print-critical)

All guides come from a single geometry object (`calculateCoverGeometry()`):

```
pageCenterX = totalWidth / 2
spineLeft   = pageCenterX − spineWidth / 2
spineRight  = pageCenterX + spineWidth / 2
```

- The spine-centre guide is placed at `pageCenterX` itself. That guide is always created, and its switch can't be turned off.
- The script works out guide positions in the spread's own pixel space, using the trim box Affinity reports. The page width is never converted between units, so rounding can't shift the centre.
- Nothing is measured by adding widths from the left edge. The back panel ends at `spineLeft` and the front panel starts at `spineRight`.

## Spine calculation

- **Manual** (default 10 mm): enter the width your printer gives you.
- **From page count**: `spine = (pageCount ÷ 2) × caliper`. The default is `200 ÷ 2 × 0.10 mm = 10 mm` (about 80 gsm uncoated).

**The page-count result is only a starting point, not a printer specification.** Paper bulk, coating, binding and glue all change the real spine. Check it against your printer's spine calculator, or a printed dummy, and then use a manual width.

An odd page count is never changed without asking. The script offers to round it up to the next even number, or to keep the odd number if you confirm it.

## Bleed

- Default: **3 mm** on all four outside edges (top, bottom, left, right). There is no bleed at the two spine folds.
- Bleed is outside the trim. The page is **not** enlarged by the bleed.
- The script **reads** the document bleed and warns you if it doesn't match. It **does not write** the bleed (see limitations). Set it in **File ▸ Document Setup ▸ Bleed**.

## Safe areas

- Default: **0.5 in**, measured **from the bleed edge** by default. With a 3 mm bleed, the safe line is 0.5 in − 3 mm ≈ 9.7 mm inside the trim.
- You can switch to **Measure safe from: Trim edge**. That's how most printers (KDP, IngramSpark and others) define it.
- At the spine folds there is no bleed, so the safe line is the safe distance from the spine edge.
- There are no safe guides inside the spine.
- The script rejects safe areas that don't fit a panel, or that would sit outside the trim.

## Guides

Each group has its own switch, and no two switches draw the same line:

| Switch | Lines |
|---|---|
| Bleed boundary | 4 (left, right, top, bottom) |
| Trim / outer boundary | 4 (left, right, top, bottom) |
| Spine left & right edges | 2 |
| **Spine centre (always on)** | 1 |
| Back cover safe margins (left & right) | 2 |
| Front cover safe margins (left & right) | 2 |
| Safe margins top & bottom | 2 (shared by back and front) |

The back and front cover edges are the trim edges plus the spine edges, so they don't need their own switches.

## Known API limitations (Affinity 3.3)

These were checked in the bundled `JSLib` and in the native scripting library.

1. **Guides can't be read or listed.** The API has `createAddGuide`, `createMoveGuide(index)`, `createRemoveGuide(index)` and `createSetGuidesColour`, but nothing that returns existing guides. The script can't find the index of a guide it created earlier, and it can't tell its own guides from yours. **So the script never removes or moves guides**, because deleting by a guessed index could delete your guides. Before running *Update*, remove the old cover guides in **View ▸ Guides Manager**.
2. **Bleed can't be written safely.** The only way to write bleed is `DocumentProperties.create()` + `setDocumentProperties()`. `create()` starts from defaults, and there's no way to read the document's current properties first. Writing it could reset the page size, DPI or other settings, so the script only reads the bleed (through `getSpreadExtents({ includeBleed })`) and warns you.
3. **Spreads don't say whether they are masters.** The script works on `doc.currentSpread` and shows its size in the dialog so you can check it's the cover master.
4. **Dialogs can't show images or drawings.** There's no picture preview in the dialog. The guides are shown live on the spread instead, as a temporary preview that's cleared on Cancel. Guide colour is one setting for the whole document, so each guide type can't have its own colour.
5. **Guide coordinates.** The API parameter is named `pixels96`, but Affinity's own `examples/addGuides.js` passes spread coordinates in document pixels. This script does the same. Check this with test M1 below.

## Testing

Run these checks in Affinity after changing the script:

| # | Steps | Expected |
|---|---|---|
| M1 | On a 12.063 × 8.5 in cover master, run **New** without changing anything. | The page stays 12.063 × 8.5 in. The spine-centre guide is at exactly 6.0315 in (Guides Manager), the page's horizontal centre. |
| M2 | Run New with a 20 mm spine. | The spine-centre guide stays at the page centre, and the spine edges are 10 mm either side. |
| M3 | Run New with cover width 6 in, height 9 in, spine 10 mm. | The page becomes 12.394 × 9 in, with the centre at 6.197 in. |
| M4 | Run M1 in mm, then in inches, and compare the guides in Guides Manager. | The positions are the same physical place. |
| M5 | Spine from 200 pages × 0.10 mm. | Formula shows `200 ÷ 2 × 0.1 mm = 10 mm`, with the estimate warning. |
| M6 | Change the page width in Document Setup, remove the old guides, run **Update**. | Guides are rebuilt around the new width ÷ 2. |
| M7 | Put text, images and shapes on the master, then run New or Update. | All objects and layers are unchanged. |
| M8 | Change the safe distance 0.5 → 0.75 in and run again. Also try each safe-margin switch on its own. | Safe guides move 0.25 in inward. Each switch adds only its own 2 lines. |
| M9 | Set the bleed to 5 mm in Document Setup and in the dialog. | Bleed guides at ±5 mm. With *from bleed edge*, safe guides move 2 mm outward. A bleed mismatch shows a warning. |
| M10 | Enter page count 201. | You're asked to round up to 202 or to keep 201. |
