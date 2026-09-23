You are working in VS Code with Codex on a scripting project for Affinity Publisher 3.

PROJECT:
"Book Cover Master Builder for Affinity Publisher 3"

GOAL:
Create a production-oriented JavaScript script for Affinity Publisher 3 that builds or updates a book-cover Master Spread using native, non-printing guides.

IMPORTANT:
Do NOT assume Affinity Publisher 3 APIs from older Affinity versions, InDesign, or generic JavaScript.
Before writing the final implementation, inspect the actual Affinity Publisher 3 scripting API/types available in this environment and use the documented/current APIs.
If an API is uncertain, search the available Affinity scripting type definitions/documentation and verify it before using it.

The script must be a real Affinity Publisher 3 script, not pseudocode.

==================================================
1. COVER GEOMETRY
==================================================

The cover is ONE assembled horizontal cover:

    BACK COVER | SPINE | FRONT COVER

Reading visually from left to right:

    BACK → SPINE → FRONT

The front and back are equal dimensions.

DEFAULTS:

Front trim:
    width = 5.5 inches
    height = 8 inches

Back trim:
    width = 5.5 inches
    height = 8 inches

Spine:
    default manual value = 10 mm

Therefore:

    assembled trim width = 5.5" + spine + 5.5"
    assembled trim height = 8"

CRITICAL PRINT REQUIREMENT:

The spine MUST be centered on the exact center of the assembled trim page.

Do NOT calculate the spine by simply starting from the left edge and accumulating widths.

Always calculate:

    pageCenterX = totalTrimWidth / 2

Then:

    spineLeft  = pageCenterX - spineWidth / 2
    spineRight = pageCenterX + spineWidth / 2

And:

    spineCenter = pageCenterX

This is print-critical.

The spine-center guide must therefore be located at EXACTLY:

    totalTrimWidth / 2

The script must never allow rounding or accumulated unit conversion to shift the spine center.

The front and back panel boundaries must be derived from this same center-based geometry.

==================================================
2. BLEED
==================================================

Default bleed:

    3 mm

Bleed applies to ALL FOUR OUTSIDE EDGES:

    top
    bottom
    left
    right

There is NO bleed between:

    Back / Spine
    Spine / Front

The 3 mm bleed is a document bleed setting where Affinity Publisher supports it.

Do NOT incorrectly make the page itself 3 mm larger.

The requested trim remains:

    assembled trim = 11 inches + spine width
    height = 8 inches

The bleed is outside the trim.

The script must clearly communicate that the Affinity document's bleed setting should match the selected bleed value.

==================================================
3. SAFE AREA
==================================================

Safe-area guides are measured from the BLEED EDGE, not the trim edge.

Default safe distance:

    0.5 inch

This must be editable.

There are NO safe-zone guides inside the spine.

Safe guides are required for:

    Back Cover
    Front Cover

Safe guides should be generated from the same parametric geometry.

==================================================
4. GUIDES
==================================================

Use ONLY native Affinity non-printing guides.

Do NOT create vector lines.

Do NOT create text labels.

Do NOT create printable objects.

The dialog must have checkboxes for:

    [x] Bleed boundary
    [x] Trim / outer boundary
    [x] Back cover boundary
    [x] Spine left boundary
    [x] Spine right boundary
    [x] Front cover boundary
    [x] Spine centre
    [x] Back cover safe area
    [x] Front cover safe area

All should be ON by default.

The spine-centre guide is critical.

Ideally make the spine-centre guide impossible to accidentally omit, or at minimum warn strongly if the user attempts to disable it.

==================================================
5. GUIDE PREVIEW
==================================================

The dialog must contain a small visual preview.

The preview should show:

    BACK | SPINE | FRONT

with different visual colours for:

    BLEED
    TRIM
    PANEL BOUNDARIES
    SPINE
    SAFE AREA
    SPINE CENTRE

The preview is UI only.

Do NOT create those coloured lines as document artwork.

The preview should update when dimensions/settings change.

==================================================
6. UNITS
==================================================

At the FIRST step/dialog, the user must select units.

Support at minimum:

    mm
    cm
    inches
    points

All numerical fields in the dialog should use the selected unit.

Internally normalize dimensions safely so unit conversion cannot move the spine center.

==================================================
7. FIRST ACTION
==================================================

The FIRST dialog must require the user to choose:

    Create / prepare new cover master

OR:

    Update existing cover master

Do not automatically decide.

==================================================
8. NEW MODE
==================================================

In NEW mode:

Use the supplied dimensions to prepare the active Master Spread.

Default:

    front = 5.5" × 8"
    back  = 5.5" × 8"
    spine = 10 mm

The assembled trim page becomes:

    5.5" + spine + 5.5"
    ×
    8"

The spine remains exactly centered.

Do not create printable content.

Preserve any existing objects unless the user explicitly requested replacement.

==================================================
9. UPDATE MODE
==================================================

UPDATE must preserve existing Master Spread elements:

    text
    pictures
    frames
    shapes
    artwork
    layers
    other objects

The script must modify/recalculate only the guides created/managed by this tool.

Do not destroy unrelated Master Spread content.

The user must be able to recalculate the guides based on the current document/Master Spread dimensions.

If the document dimensions have changed, the script must calculate the new geometry again.

CRITICAL:

    spineCenter = current assembled trim width / 2

Then derive spine edges from that.

==================================================
10. IDENTIFYING SCRIPT-OWNED GUIDES
==================================================

Do NOT blindly delete unrelated user guides.

The script should have a reliable way to distinguish guides created by this tool from guides manually created by the user.

If Affinity Publisher 3's native guide API does not provide metadata/IDs for this, investigate the safest available implementation.

Possible acceptable approaches:

    - stored script configuration
    - document metadata
    - master-specific configuration
    - another supported Affinity mechanism

Do NOT invent an unsupported API.

If there is genuinely no safe way to identify individual native guides, explain that limitation in comments and implement the safest possible fallback.

==================================================
11. SPINE CALCULATION
==================================================

There are TWO modes:

    Manual spine width
    Calculate from page count

Manual:

    user enters spine width

Calculated:

    spine = (pageCount / 2) × pageThickness

The user specifically wants this as a STARTING POINT, not a guaranteed printer specification.

Default calculated starting values:

    page count = 200
    paper = 80 GSM
    editable page thickness/caliper = 0.10 mm

Therefore:

    200 / 2 × 0.10 mm
    = 10 mm

The script should clearly say that this is an approximate starting point and the user should manually refine it after a printed dummy.

DO NOT pretend the calculation is an accurate printer specification.

There should be NO paper preset system required.

The user wants the thickness/caliper editable.

==================================================
12. PAGE COUNT
==================================================

Page count should be editable.

Prefer an even page count.

If the user enters an odd page count, either:

    warn the user

or:

    offer to round it to the nearest valid even value.

Do not silently make a potentially important change.

==================================================
13. CENTER-OF-PAGE SAFETY
==================================================

This is the most important requirement.

Every guide related to the cover geometry must ultimately derive from the same geometry model.

Do NOT have separate calculations for:

    spine
    spine centre
    front panel
    back panel
    safe areas

Instead calculate one geometry object, for example:

    totalWidth
    totalHeight
    pageCenterX
    spineWidth
    spineLeft
    spineRight
    backLeft
    backRight
    frontLeft
    frontRight
    bleed
    safeInset

Then generate every guide from those values.

The exact spine-center formula must be:

    pageCenterX = totalWidth / 2

and:

    spineLeft = pageCenterX - spineWidth / 2
    spineRight = pageCenterX + spineWidth / 2

The spine-center guide must use:

    pageCenterX

directly.

==================================================
14. DIALOG DESIGN
==================================================

Create a professional dialog.

Suggested sections:

    START
    COVER GEOMETRY
    SPINE
    BLEED / SAFE AREA
    GUIDES
    PREVIEW
    UPDATE BEHAVIOUR

The dialog should show calculated values.

For example:

    Front / Back:
        5.5 × 8 in

    Spine:
        10 mm

    Assembled trim:
        11.394 × 8 in
        (depending on unit)

    Page centre:
        5.697 in

    Bleed:
        3 mm

    Safe distance:
        0.5 in

Also show the spine formula when calculated:

    200 ÷ 2 × 0.10 mm = 10 mm

==================================================
15. AFFINITY 3 API RESEARCH
==================================================

Before coding:

1. Inspect the Affinity Publisher 3 scripting API available in the project.
2. Inspect current type definitions.
3. Verify:
       - document access
       - Master Spread access
       - spread/page dimensions
       - native guide creation
       - native guide removal/update
       - document bleed settings
       - dialogs
       - units/conversions
       - document/master metadata if available
4. Use only APIs verified in the current environment.

Do not copy an old InDesign script.

Do not use fictional methods.

If the exact API for one requested feature is unavailable, isolate that limitation and implement the closest safe solution rather than fabricating an API.

==================================================
16. CODE QUALITY
==================================================

Use clear modular functions such as:

    getSelectedUnit()
    getPageDimensions()
    calculateSpine()
    calculateCoverGeometry()
    calculateGuides()
    renderPreview()
    createGuides()
    updateGuides()
    removeManagedGuides()
    setDocumentBleed()
    validateInputs()

The central function should be something like:

    calculateCoverGeometry()

It must return the complete center-anchored geometry.

==================================================
17. VALIDATION
==================================================

Before applying:

Validate:

    front width > 0
    back width > 0
    height > 0
    spine > 0
    bleed >= 0
    safe distance >= 0
    page count >= 2
    page count is even or explicitly confirmed

Also validate that the safe area can fit inside each panel.

If not, show a clear error.

==================================================
18. TESTING
==================================================

Create a test plan and, where possible, automated/unit tests for the pure geometry functions.

At minimum test:

CASE 1:
    front = 5.5"
    back = 5.5"
    spine = 10 mm

Verify:

    spineCenter == totalWidth / 2

CASE 2:
    change spine to 20 mm

Verify:

    spineCenter remains totalWidth / 2

CASE 3:
    change front/back dimensions

Verify:

    spineCenter moves to the new total width / 2

CASE 4:
    change units from inches to mm

Verify:

    physical spine center does not move

CASE 5:
    calculated spine:

    200 pages
    0.10 mm caliper

Verify:

    10 mm

CASE 6:
    update mode after changing document dimensions

Verify:

    guides are recalculated

CASE 7:
    unrelated Master Spread objects exist

Verify:

    they are preserved

CASE 8:
    safe area changes

Verify:

    front/back safe guides move correctly

CASE 9:
    bleed changes

Verify:

    bleed guides and calculated safe positions update correctly

==================================================
19. IMPORTANT DISTINCTION: TRIM VS BLEED
==================================================

Do not confuse:

    page/trim dimensions

with:

    bleed dimensions.

For the default:

    front = 5.5 × 8
    back  = 5.5 × 8
    spine = 10 mm

the trim is:

    11 inches + 10 mm wide
    ×
    8 inches high

The 3 mm bleed is outside that.

==================================================
20. FINAL DELIVERABLE
==================================================

Create:

    Book_Cover_Master_Builder_Affinity3.js

Also create:

    README.md

The README must contain:

    - installation/use instructions
    - Affinity Publisher 3 requirements
    - explanation of New vs Update
    - explanation of spine calculation
    - explanation of center-anchored spine
    - explanation of bleed
    - explanation of safe areas
    - known API limitations
    - testing instructions

If possible also create:

    tests/

with geometry tests.

==================================================
21. FINAL REVIEW BEFORE DELIVERY
==================================================

Before saying the script is complete:

Search the code for:

    11
    5.5
    spineCenter
    spineLeft
    spineRight
    bleed
    guide

Make sure no old assumption remains that the individual front/back page width is 11 inches.

The correct individual page width is:

    5.5 inches

The assembled width is approximately:

    11 inches + spine

Also inspect for any geometry calculation that could make the spine centre depend on the left edge.

The spine centre MUST ALWAYS be:

    totalWidth / 2

==================================================
22. DO NOT TAKE SHORTCUTS
==================================================

Do not respond with only a code snippet.

Work in the VS Code project.

Inspect the available Affinity 3 APIs.

Implement the script.

Run whatever static checks/tests are possible.

Fix errors.

Create the final JS file and README.

Then report:

    files created
    tests performed
    known limitations
    exact Affinity 3 installation/run procedure

The final implementation should be production-oriented and conservative because this tool will be used to prepare book covers for physical printing.