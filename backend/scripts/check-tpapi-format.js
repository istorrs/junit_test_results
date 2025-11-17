const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/junit-results');

const TestCase = mongoose.model('TestCase', new mongoose.Schema({
  name: String,
  system_err: String
}, { collection: 'testcases' }));

TestCase.findById('691a6a752ad1573fb4202aa7').then(testCase => {
  if (!testCase || !testCase.system_err) {
    console.log('No system_err found');
    process.exit(0);
  }

  const lines = testCase.system_err.split('\n');
  console.log('Total lines:', lines.length);

  // Find lines that contain 'TPAPI' or 'TEST_POINT'
  const tpapiLines = lines.filter(line =>
    line.toUpperCase().includes('TPAPI') ||
    line.toUpperCase().includes('TEST_POINT')
  );

  console.log('\nLines containing TPAPI or TEST_POINT:', tpapiLines.length);
  console.log('\nFirst 10 matching lines:');
  tpapiLines.slice(0, 10).forEach((line, i) => {
    console.log(`\nLine ${i + 1}:`);
    console.log('Raw:', JSON.stringify(line.substring(0, 200)));
    console.log('Display:', line.substring(0, 200));
  });

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
