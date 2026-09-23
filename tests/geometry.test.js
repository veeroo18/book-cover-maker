'use strict';

// Pure geometry tests. Run with: node --test "tests/*.test.js"

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
    toPoints, fromPoints, DEFAULTS,
    calculateSpine, describeSpineFormula, pageWidthFromCover,
    calculateCoverGeometry, calculateGuides, validateInputs,
    nextEvenPageCount, allGuideSetsEnabled, GUIDE_SETS,
} = require(path.join(__dirname, '..', 'Book_Cover_Master_Builder_Affinity3.js'));

const EPS = 1e-9;
const near = (actual, expected, msg, eps = EPS) =>
    assert.ok(Math.abs(actual - expected) <= eps, `${msg}: expected ${expected}, got ${actual}`);

function coverFromPanels({ panel = toPoints(5.5, 'in'), height = toPoints(8, 'in'), spine = toPoints(10, 'mm'),
    bleed = toPoints(3, 'mm'), safe = toPoints(0.5, 'in'), safeFrom = 'bleed' } = {}) {
    return calculateCoverGeometry({
        totalWidth: pageWidthFromCover(panel, spine),
        totalHeight: height,
        spineWidth: spine,
        bleed,
        safeInset: safe,
        safeFrom,
    });
}

function assertCentred(g) {
    near(g.pageCenterX, g.totalWidth / 2, 'spine centre == totalWidth / 2');
    near(g.spineLeft, g.pageCenterX - g.spineWidth / 2, 'spineLeft');
    near(g.spineRight, g.pageCenterX + g.spineWidth / 2, 'spineRight');
    near(g.panelWidth, g.totalWidth - g.spineRight, 'back and front panels are equal', 1e-9);
}

test('CASE 1: 5.5" panels + 10 mm spine; spine centre is totalWidth / 2', () => {
    const g = coverFromPanels();
    assertCentred(g);
    // Trim = 11 in + 10 mm (NOT 11 in per panel)
    near(fromPoints(g.totalWidth, 'in'), 11 + 10 / 25.4, 'assembled trim width (in)');
    near(fromPoints(g.panelWidth, 'in'), 5.5, 'each panel is 5.5 in', 1e-9);
    near(fromPoints(g.totalHeight, 'in'), 8, 'height');
    near(fromPoints(g.pageCenterX, 'in'), 5.5 + 5 / 25.4, 'centre ≈ 5.697 in');
});

test('CASE 2: 20 mm spine keeps the centre at totalWidth / 2', () => {
    const g = coverFromPanels({ spine: toPoints(20, 'mm') });
    assertCentred(g);
    near(fromPoints(g.spineRight - g.spineLeft, 'mm'), 20, 'spine width', 1e-9);
});

test('CASE 3: new panel size moves the centre to the new totalWidth / 2', () => {
    const a = coverFromPanels();
    const b = coverFromPanels({ panel: toPoints(6, 'in'), height: toPoints(9, 'in') });
    assertCentred(b);
    assert.ok(b.pageCenterX > a.pageCenterX);
    near(fromPoints(b.pageCenterX, 'in'), 6 + 5 / 25.4, 'new centre');
});

test('CASE 4: switching units (in → mm) does not move the physical centre', () => {
    const fromInches = coverFromPanels({ panel: toPoints(5.5, 'in'), spine: toPoints(10, 'mm') });
    const fromMm = coverFromPanels({ panel: toPoints(139.7, 'mm'), spine: toPoints(1, 'cm') });
    near(fromMm.pageCenterX, fromInches.pageCenterX, 'centre in points', 1e-9);

    // Geometry in document pixels (what goes to Affinity) keeps the centre exact at any DPI.
    for (const dpi of [72, 96, 300, 600]) {
        const k = dpi / 72;
        const px = calculateCoverGeometry({
            totalWidth: fromInches.totalWidth * k, totalHeight: fromInches.totalHeight * k,
            spineWidth: fromInches.spineWidth * k, bleed: fromInches.bleed * k, safeInset: fromInches.safeInset * k,
        });
        assert.equal(px.pageCenterX, px.totalWidth / 2, `exact centre at ${dpi} dpi`);
        near(px.pageCenterX / k, fromInches.pageCenterX, `same physical centre at ${dpi} dpi`, 1e-9);
    }
});

test('CASE 5: calculated spine, 200 pages × 0.10 mm = 10 mm', () => {
    const spine = calculateSpine({ mode: 'calculated', pageCount: 200, caliper: toPoints(0.10, 'mm') });
    near(fromPoints(spine.width, 'mm'), 10, 'spine mm', 1e-9);
    assert.equal(spine.isEstimate, true);
    assert.equal(describeSpineFormula(200, DEFAULTS.caliper, 'mm'), '200 ÷ 2 × 0.1 mm = 10 mm');
    const manual = calculateSpine({ mode: 'manual', manualWidth: 42 });
    assert.deepEqual(manual, { width: 42, isEstimate: false });
});

test('CASE 6: Update after the document size changes recalculates from the new trim', () => {
    // Update mode uses the spread's current trim width, not the entered panels.
    const spine = toPoints(12, 'mm');
    for (const trimWidthIn of [11.5, 12.25, 13]) {
        const g = calculateCoverGeometry({
            totalWidth: toPoints(trimWidthIn, 'in'), totalHeight: toPoints(8, 'in'),
            spineWidth: spine, bleed: DEFAULTS.bleed, safeInset: DEFAULTS.safeInset,
        });
        assertCentred(g);
        const centre = calculateGuides(g, allGuideSetsEnabled()).find(x => x.set === 'spineCentre');
        near(centre.position, toPoints(trimWidthIn, 'in') / 2, 'centre guide follows new width');
    }
});

test('CASE 7: guides are merged, never duplicated, so re-running adds no stacked copies from one run', () => {
    // Keeping master-spread objects safe needs Affinity: see README manual test M7.
    // The script only ever ADDS guides (the API cannot list or safely remove them).
    const guides = calculateGuides(coverFromPanels(), allGuideSetsEnabled());
    const keys = guides.map(x => `${x.orientation}:${x.position.toFixed(9)}`);
    assert.equal(new Set(keys).size, keys.length);
});

test('CASE 8: changing the safe distance moves the front/back safe guides', () => {
    const a = coverFromPanels({ safe: toPoints(0.5, 'in') });
    const b = coverFromPanels({ safe: toPoints(0.75, 'in') });
    const d = toPoints(0.25, 'in');
    near(b.backSafeLeft - a.backSafeLeft, d, 'back safe left moves in');
    near(a.backSafeRight - b.backSafeRight, d, 'back safe right moves in');
    near(b.frontSafeLeft - a.frontSafeLeft, d, 'front safe left moves in');
    near(a.frontSafeRight - b.frontSafeRight, d, 'front safe right moves in');
    near(b.safeTop - a.safeTop, d, 'top moves down');
    // Safe measured from the BLEED edge: outer safe line sits at -bleed + safe
    near(a.backSafeLeft, -a.bleed + a.safeInset, 'measured from bleed edge');
    // No safe guides between the spine edges
    for (const guide of calculateGuides(a, allGuideSetsEnabled())) {
        if (guide.set === 'backSafe' || guide.set === 'frontSafe') {
            assert.ok(guide.position <= a.spineLeft || guide.position >= a.spineRight, `${guide.label} is outside the spine`);
        }
    }
});

test('CASE 9: changing the bleed moves the bleed guides and the bleed-relative safe lines', () => {
    const a = coverFromPanels({ bleed: toPoints(3, 'mm') });
    const b = coverFromPanels({ bleed: toPoints(5, 'mm') });
    near(b.bleedLeft, -toPoints(5, 'mm'), 'bleed left');
    near(b.bleedRight, b.totalWidth + toPoints(5, 'mm'), 'bleed right');
    near(a.backSafeLeft - b.backSafeLeft, toPoints(2, 'mm'), 'safe line tracks the bleed edge');
    // The trim does not change with the bleed
    assert.equal(a.totalWidth, b.totalWidth);
    assert.equal(a.pageCenterX, b.pageCenterX);
    // Safe measured from the trim does not depend on the bleed
    const t1 = coverFromPanels({ bleed: toPoints(3, 'mm'), safeFrom: 'trim' });
    const t2 = coverFromPanels({ bleed: toPoints(5, 'mm'), safeFrom: 'trim' });
    assert.equal(t1.backSafeLeft, t2.backSafeLeft);
});

test('guides: spine centre is always present, even with every guide set turned off', () => {
    const g = coverFromPanels();
    const none = Object.fromEntries(GUIDE_SETS.map(s => [s.key, false]));
    const guides = calculateGuides(g, none);
    assert.equal(guides.length, 1);
    assert.equal(guides[0].set, 'spineCentre');
    assert.equal(guides[0].position, g.pageCenterX);
});

test('guides: guides at the same position are merged', () => {
    const g = coverFromPanels();
    const guides = calculateGuides(g, allGuideSetsEnabled());
    const keys = guides.map(x => `${x.orientation}:${x.position.toFixed(9)}`);
    assert.equal(new Set(keys).size, keys.length, 'no duplicate positions');
    // v: bleedL, trimL, backSafeL, backSafeR, spineL, centre, spineR, frontSafeL, frontSafeR, trimR, bleedR = 11
    // h: bleedT, trimT, safeT, safeB, trimB, bleedB = 6
    assert.equal(guides.filter(x => x.orientation === 'vertical').length, 11);
    assert.equal(guides.filter(x => x.orientation === 'horizontal').length, 6);
});

test('guides: each switch controls its own lines, and no two switches draw the same line', () => {
    const g = coverFromPanels();
    const none = Object.fromEntries(GUIDE_SETS.map(s => [s.key, false]));
    const lineSets = GUIDE_SETS.filter(s => !s.locked).map(s =>
        calculateGuides(g, { ...none, [s.key]: true }).filter(x => x.set === s.key).map(x => `${x.orientation}:${x.position.toFixed(6)}`));
    const all = lineSets.flat();
    assert.equal(new Set(all).size, all.length, 'no line is shared between two switches');
    const counts = Object.fromEntries(GUIDE_SETS.filter(s => !s.locked).map((s, i) => [s.key, lineSets[i].length]));
    assert.deepEqual(counts, { bleed: 4, trim: 4, spineEdges: 2, backSafe: 2, frontSafe: 2, safeTopBottom: 2 });
});

test('guides: zero bleed adds no separate bleed guides', () => {
    const g = coverFromPanels({ bleed: 0 });
    assert.equal(calculateGuides(g, allGuideSetsEnabled()).filter(x => x.set === 'bleed').length, 0);
});

test('validation: good defaults pass (12.063 × 8.5 in page)', () => {
    // Starting values come from the open page: 12.063 in wide with a 10 mm spine.
    const cover = (toPoints(12.063, 'in') - DEFAULTS.spineWidth) / 2;
    const g = calculateCoverGeometry({ totalWidth: pageWidthFromCover(cover, DEFAULTS.spineWidth), totalHeight: toPoints(8.5, 'in'),
        spineWidth: DEFAULTS.spineWidth, bleed: DEFAULTS.bleed, safeInset: DEFAULTS.safeInset });
    near(fromPoints(g.totalWidth, 'in'), 12.063, 'page size unchanged');
    near(fromPoints(g.pageCenterX, 'in'), 12.063 / 2, 'default centre');
    const r = validateInputs({ mode: 'new', coverWidth: cover, coverHeight: toPoints(8.5, 'in'),
        spineMode: 'manual', spineWidth: DEFAULTS.spineWidth, bleed: DEFAULTS.bleed,
        safeInset: DEFAULTS.safeInset, safeFrom: 'bleed' }, g);
    assert.deepEqual(r.errors, []);
});

test('validation: rejects bad input', () => {
    const base = { mode: 'new', coverWidth: 396, coverHeight: 576, spineMode: 'manual', spineWidth: 28, bleed: 8.5, safeInset: 36, safeFrom: 'bleed' };
    const check = (overrides, geometryOverrides = {}) => {
        const input = { ...base, ...overrides };
        const g = calculateCoverGeometry({ totalWidth: pageWidthFromCover(input.coverWidth, input.spineWidth),
            totalHeight: input.coverHeight, spineWidth: input.spineWidth, bleed: input.bleed,
            safeInset: input.safeInset, safeFrom: input.safeFrom, ...geometryOverrides });
        return validateInputs(input, g).errors;
    };
    assert.ok(check({ coverWidth: 0 }).length > 0, 'width 0');
    assert.ok(check({ coverHeight: -1 }).length > 0, 'height < 0');
    assert.ok(check({ spineWidth: 0 }).length > 0, 'spine 0');
    assert.ok(check({ bleed: -1 }).length > 0, 'bleed < 0');
    assert.ok(check({ safeInset: -1 }).length > 0, 'safe < 0');
    assert.ok(check({ safeInset: 300 }).length > 0, 'safe area does not fit');
    assert.ok(check({ safeInset: 5, bleed: 8.5 }).length > 0, 'safe line outside the trim');
    assert.ok(check({ spineMode: 'calculated', pageCount: 1, caliper: 0.28 }).length > 0, 'page count < 2');
    assert.ok(check({ spineMode: 'calculated', pageCount: 201, caliper: 0.28 }).length > 0, 'unconfirmed odd page count');
    assert.deepEqual(check({ spineMode: 'calculated', pageCount: 201, caliper: 0.28, oddPageCountConfirmed: true }), [], 'confirmed odd page count');
    assert.ok(check({ spineMode: 'calculated', pageCount: 200, caliper: 0 }).length > 0, 'caliper 0');
    // Update mode: the spine is wider than the page
    assert.ok(validateInputs({ ...base, mode: 'update', spineWidth: 900 },
        calculateCoverGeometry({ totalWidth: 800, totalHeight: 576, spineWidth: 900, bleed: 8.5, safeInset: 36 })).errors.length > 0);
});

test('odd page count rounds up to the next even number', () => {
    assert.equal(nextEvenPageCount(201), 202);
    assert.equal(nextEvenPageCount(200), 200);
});

