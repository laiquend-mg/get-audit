const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pa11y = require('pa11y');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (for index.html)
app.use(express.static(__dirname));

// Accessibility check endpoint
app.post('/check', async (req, res) => {
    const { url } = req.body;

    if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
        const browser = await puppeteer.launch({
          executablePath: '/usr/bin/google-chrome',
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true
        });

        const result = await pa11y(url, {
            browser: browser,
            standard: 'WCAG2AA',
            timeout: 30000
        });

        await browser.close();

        res.json({ result: { siteName: url, ...groupIssues(result.issues) } });
    } catch (error) {
        console.error('Pa11y error:', error.message);
        res.status(500).json({ error: 'Error checking the URL.' });
    }
});

// Group issues for frontend display
function groupIssues(issues) {
    const categorize = (filter) => issues.filter(filter);

    return {
        contrastIssues: categorize(i => i.code.includes('color-contrast')),
        altIssues: categorize(i => i.code.includes('image-alt') || i.message.includes('alt attribute')),
        elementIssues: categorize(i => i.message.includes('element') || i.code.includes('heading-order')),
        navigationIssues: categorize(i => i.message.includes('keyboard') || i.code.includes('focusable')),
        formIssues: categorize(i => i.message.includes('form') || i.code.includes('label')),
        otherIssues: categorize(i => true), // all for fallback
    };
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
