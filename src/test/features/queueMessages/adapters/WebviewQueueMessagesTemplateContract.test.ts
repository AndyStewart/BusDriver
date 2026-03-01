import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

describe('queue messages webview template contract', () => {
    it('contains required structure and avoids unsafe inline patterns', () => {
        const templatePath = path.resolve(__dirname, '../../../../../media/queueMessagesPanel.html');
        const html = fs.readFileSync(templatePath, 'utf8');

        assert.ok(html.includes('<link rel="stylesheet" href="__STYLESHEET_URI__">'));
        assert.ok(html.includes('<script src="__SCRIPT_URI__"></script>'));
        assert.ok(html.includes('id="queueMessagesInitialData"'));
        assert.ok(html.includes('data-view="queue-messages-panel"'));
        assert.ok(html.includes('<h1 id="queueTitle"></h1>'));

        assert.ok(!html.includes('<h1>Queue:'));
        assert.ok(!html.includes('onclick='));
        assert.ok(!html.includes('const vscode = acquireVsCodeApi();'));
    });
});
