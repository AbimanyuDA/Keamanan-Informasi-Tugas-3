const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

async function testVerifyAPI() {
  try {
    const pdfPath = path.join(__dirname, 'signed_Testingdemo (3).pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found:', pdfPath);
      process.exit(1);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const form = new FormData();
    form.append('pdf', pdfBuffer, 'test.pdf');

    const mockToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEifQ.test';

    console.log('Testing verify endpoint...');
    console.log('PDF file:', path.basename(pdfPath));
    console.log('PDF size:', pdfBuffer.length, 'bytes');
    console.log('');

    const response = await fetch('http://localhost:3001/api/pdf/verify', {
      method: 'POST',
      headers: {
        'Authorization': mockToken,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Data:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVerifyAPI();
