#!/usr/bin/env node

const fs = require('fs');

// Get HTML files to validate (from command line or default)
const filesToValidate = process.argv.slice(2);

if (filesToValidate.length === 0) {
    // Default: validate all HTML files in root
    const files = fs.readdirSync('.')
        .filter(file => {
            try {
                return file.endsWith('.html') && fs.statSync(file).isFile();
            } catch (e) {
                return false;
            }
        });
    filesToValidate.push(...files);
}

let hasErrors = false;

console.log('Validating HTML files (basic checks)...\n');

for (const file of filesToValidate) {
    if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
        hasErrors = true;
        continue;
    }

    const content = fs.readFileSync(file, 'utf-8');

    // Basic HTML validation checks
    const errors = [];

    // Check for basic structure
    if (!content.includes('<!DOCTYPE html>') && !content.includes('<!doctype html>')) {
        errors.push('Missing DOCTYPE declaration');
    }
    if (!content.includes('<html')) {
        errors.push('Missing <html> tag');
    }
    if (!content.includes('<head>')) {
        errors.push('Missing <head> tag');
    }
    if (!content.includes('<body>')) {
        errors.push('Missing <body> tag');
    }

    // Check for unclosed tags (basic check)
    const openTags = content.match(/<([a-z]+)(?:\s|>)/gi) || [];
    const closeTags = content.match(/<\/([a-z]+)>/gi) || [];

    // Check charset
    if (!content.includes('charset') && !content.includes('UTF-8')) {
        errors.push('Missing charset declaration');
    }

    if (errors.length > 0) {
        hasErrors = true;
        console.error(`\n❌ ${file}:`);
        errors.forEach(err => console.error(`  ERROR: ${err}`));
    } else {
        console.log(`✓ ${file}`);
    }
}

if (hasErrors) {
    console.error('\n❌ HTML validation failed\n');
    process.exit(1);
} else {
    console.log('\n✓ All HTML files are valid\n');
    process.exit(0);
}
