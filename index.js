const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/check-vin', async (req, res) => {
  const plate = req.query.plate;
  if (!plate) {
    return res.status(400).json({ error: 'Please provide your vehicle registration number' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://pti.ge/ka-GE/learn_deadline', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('input[name="plate_num"]', { timeout: 10000 });
    await page.type('input[name="plate_num"]', plate);
    await page.evaluate(() => {
      const form = document.getElementById('learn_deadline_form');
      if (form) form.submit();
    });

    await page.waitForSelector('.deadlineAnswer .text-center', { timeout: 15000 });

    const resultText = await page.evaluate(() => {
      const el = document.querySelector('.deadlineAnswer .text-center');
      return el ? el.innerText.trim() : null;
    });

    let dateOnly = null;
    if (resultText) {
      const match = resultText.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
      if (match) {
        dateOnly = match[0];
      }
    }

    res.json({ plate, result: dateOnly || 'Date not found' });

  } catch (err) {
    console.error('❌ Error during technical inspection:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
