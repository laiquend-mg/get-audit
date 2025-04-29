const express = require('express');
const bodyParser = require('body-parser');
const pa11y = require('pa11y');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  // Allow CORS for local frontend development
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.post('/check', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const browser = await puppeteer.launch({
      executablePath: puppeteer.executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const result = await pa11y(url, {
      browser,
    });

    await browser.close();

    // Optional: group results by types
    const grouped = {
      siteName: url,
      contrastIssues: result.issues.filter(i => i.code.includes('color-contrast')),
      altIssues: result.issues.filter(i => i.code.includes('alt')),
      elementIssues: result.issues.filter(i => i.code.includes('element')),
      navigationIssues: result.issues.filter(i => i.code.includes('navigation')),
      formIssues: result.issues.filter(i => i.code.includes('form')),
      otherIssues: result.issues.filter(i =>
        !i.code.includes('color-contrast') &&
        !i.code.includes('alt') &&
        !i.code.includes('element') &&
        !i.code.includes('navigation') &&
        !i.code.includes('form')
      )
    };

    res.json({ result: grouped });
  } catch (err) {
    console.error('Pa11y error:', err);
    res.status(500).json({ error: 'Audit failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
