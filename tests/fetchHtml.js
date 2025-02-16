require('whatwg-fetch')
const fs = require('fs');
const path = require('path');

async function getSampleHtml() {
  try {
    const res = await fetch('https://www.mobile.bg/obiavi/avtomobili-dzhipove/audi/a4-allroad');
    const data = await res.text();

    fs.writeFileSync(path.resolve(__dirname, "forTesting.html"), data)
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }
}
getSampleHtml();