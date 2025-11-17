const fs = require('fs');

const data = JSON.parse(fs.readFileSync(0, 'utf-8'));
const systemErr = data.data?.system_err || '';

if (!systemErr) {
  console.log('No system_err found');
  process.exit(0);
}

const lines = systemErr.split('\n');
console.log('Total lines:', lines.length);

// Find lines that contain 'TPAPI' or 'TEST_POINT' (case insensitive)
const tpapiLines = lines.filter(line =>
  line.toUpperCase().includes('TPAPI') ||
  line.toUpperCase().includes('TEST_POINT')
);

console.log('Lines containing TPAPI or TEST_POINT:', tpapiLines.length);
console.log('\nFirst 10 matching lines:\n');

tpapiLines.slice(0, 10).forEach((line, i) => {
  console.log(`Line ${i + 1}:`);
  console.log('Raw:', JSON.stringify(line.substring(0, 300)));
  console.log('');
});
