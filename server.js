const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pa11y = require('pa11y');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
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
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const result = await pa11y(url, {
            browser: browser,
            standard: 'WCAG2AAA',  // WCAG level AAA
            timeout: 30000,  // Timeout after 30 seconds
            includeNotices: true,
            includeWarnings: true,  // Include warnings in the result (might show important info)
            debug: true,  // Enable debug mode to see detailed logs
            wait: 5000, // Wait 5s after page load
            waitFor: 'body', // Wait for 'body' to ensure page is rendered
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
        contrastIssues: categorize(i => i.code.toLowerCase().includes('1_4_3') || i.message.toLowerCase().includes('contrast')),
        altIssues: categorize(i => i.code.toLowerCase().includes('image-alt') || i.message.toLowerCase().includes('alt attribute')),
        elementIssues: categorize(i => i.message.toLowerCase().includes('element') || i.code.toLowerCase().includes('heading-order')),
        navigationIssues: categorize(i => i.message.toLowerCase().includes('keyboard') || i.code.toLowerCase().includes('focusable')),
        formIssues: categorize(i => i.message.toLowerCase().includes('form') || i.code.toLowerCase().includes('label')),
        otherIssues: categorize(i => true), // fallback
    };
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
