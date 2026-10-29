// Regression check for the actual Slint touch shell, without the media engine.
// Requires slint-ui@1.18.1 on NODE_PATH and a display (xvfb-run on CI).
// Run from any directory: node scripts/ci/check-foldable-ui.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const slint = require('slint-ui');
const repo = path.resolve(__dirname, '../..');
const editorFile = path.join(repo, 'src/crates/concat/ui/phone/editor.slint');

// First compile the shipping tree. For runtime checks, host the unchanged
// PhoneEditor body in a window and expose its existing properties for reads.
// No geometry expressions or event handlers are substituted in the test.
slint.loadFile(path.join(repo, 'src/crates/concat/ui/app.slint'));
let source = fs.readFileSync(editorFile, 'utf8')
    .replace('export component PhoneEditor inherits Rectangle',
        'export component PhoneEditor inherits Window')
    .replaceAll('    property <length>', '    out property <length>')
    .replaceAll('    property <bool>', '    out property <bool>')
    .replace('    property <string> sheet;', '    in-out property <string> sheet;');
source += '\nexport { Editor, I18n }\n';
const ui = slint.loadSource(source, editorFile);
const app = new ui.PhoneEditor({project_name: 'Foldable layout check', status: 'Saved'});
const words = JSON.parse(fs.readFileSync(path.join(repo, 'src/crates/concat/locales/en.json')));
app.I18n.lookup = (_, key) => words[key] ?? key;
app.I18n.lookup1 = (_, key, a) => (words[key] ?? key).replace('{0}', a);
app.Editor.frame_rate = 30;
const pause = () => new Promise(resolve => setTimeout(resolve, 100));
function click(x, y) {
    for (const type of ['pointer-pressed', 'pointer-released']) {
        app.window.dispatchEvent({type, position: {x, y}, button: 'left'});
    }
}
async function resize(width, height) {
    app.window.logicalSize = {width, height};
    await pause();
    assert.equal(app.monitor_w > 0, true);
    assert.equal(app.monitor_foot > app.top_h, true, 'preview must remain visible');
    assert.equal(app.lanes_h > 0, true);
    assert.ok(app.lanes_y + app.lanes_h <= app.content_bottom + 0.01);
    assert.ok(app.tool_y + app.tool_area_h <= height + 0.01);
    if (app.side_tools) {
        assert.ok(app.tool_w >= 280, 'inspector must remain wide enough');
        if (app.sheet) assert.ok(app.monitor_w <= app.tool_x + 0.01);
    }
}

app.window.logicalSize = {width: 412, height: 880};
app.show();
setTimeout(async () => {
    try {
        await pause();
        // Open Media through the real toolbar, then resize the same instance.
        click(34, 880 - app.bar_h / 2);
        assert.equal(app.sheet, 'media');
        app.Editor.media_selected_count = 2;
        app.Editor.playhead = 12.5;
        const cases = [
            [412, 880, false, false], // representative cover window
            [744, 820, true, false],  // representative inner window
            [820, 744, true, false],  // rotated inner window
            [880, 412, true, true],   // cover landscape
            [360, 740, false, false], // split screen
            [599, 820, false, false],
            [600, 820, true, false],  // expanded breakpoint
            [720, 519, true, true],
            [720, 520, true, false],  // landscape breakpoint
            [640, 360, false, false],
            [320, 320, false, false], // minimum touch window
            [412, 880, false, false],
        ];
        for (const [w, h, side, split] of cases) {
            await resize(w, h);
            assert.equal(app.side_tools, side, `${w}x${h}: side tools`);
            assert.equal(app.landscape_split, split, `${w}x${h}: split`);
            assert.equal(app.sheet, 'media', 'open tool survives resize');
            assert.equal(app.Editor.media_selected_count, 2, 'picks survive resize');
            assert.equal(app.Editor.playhead, 12.5, 'playhead survives resize');
        }
        await resize(744, 820);
        // A side panel must not intercept taps on the preview.
        click(20, app.top_h + 20);
        assert.equal(app.sheet, 'media');
        // The panel's Done button closes it, and the preview expands again.
        click(744 - 28, app.tool_y + 28);
        assert.equal(app.sheet, '');
        assert.equal(app.monitor_w, 744);
        // The compact sheet still dismisses when tapping above it.
        await resize(412, 880);
        click(34, 880 - app.bar_h / 2);
        assert.equal(app.sheet, 'media');
        click(20, app.top_h + 20);
        assert.equal(app.sheet, '');
        console.log(`PASS: app compilation, ${cases.length} sizes, fold continuity and panel interaction`);
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    } finally {
        slint.quitEventLoop();
    }
}, 200);
slint.runEventLoop();
