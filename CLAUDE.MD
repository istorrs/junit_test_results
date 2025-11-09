# JUnit Test Results Dashboard

## 🚨 FUNDAMENTAL RULE: CODE QUALITY IS NON-NEGOTIABLE

**ALL CODE MUST PASS QUALITY CHECKS BEFORE BEING COMMITTED.**

### Enforced Quality Standards

1. **ESLint** - All JavaScript must pass ESLint with zero warnings
2. **Prettier** - All code must be properly formatted
3. **HTML Validation** - All HTML must pass basic structural validation

### Pre-Commit Hook

A pre-commit hook is installed that:
- Automatically runs ESLint on all JavaScript files
- Runs Prettier to format code
- Validates HTML files
- **CANNOT BE BYPASSED OR IGNORED**

### Commands

```bash
# Run all quality checks
npm run quality:check

# Fix auto-fixable issues
npm run lint:fix
npm run format

# Run checks individually
npm run lint
npm run format:check
npm run validate:html
```

### Consequences of Bad Code

- ❌ Commits with linting errors will be **REJECTED**
- ❌ Commits with formatting issues will be **REJECTED**
- ❌ Commits with HTML validation errors will be **REJECTED**
- ❌ **NO EXCEPTIONS** - Fix the code, don't bypass the hooks

**If you attempt to bypass the pre-commit hook (e.g., with `--no-verify`), you are violating project standards.**

---

## Project Overview

A comprehensive, client-side web application for viewing, analyzing, and managing JUnit test results. This self-contained dashboard requires **no backend server** and operates entirely within the browser using IndexedDB for local data storage.

## Architecture

**Type:** Single-Page Application (SPA)
**Deployment:** Static files (HTML/CSS/JavaScript)
**Database:** IndexedDB (browser-based, client-side NoSQL database)
**Backend:** None required

## Technology Stack

### Frontend
- **Languages:** HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Tailwind CSS (via CDN)
- **Fonts:** Inter (UI), JetBrains Mono (code/monospace)

### JavaScript Libraries (CDN)
- **Anime.js** - Animation and transitions
- **ECharts.js** - Interactive charts and data visualizations
- **Typed.js** - Dynamic typing effects
- **Splitting.js** - Text animation effects
- **Prism.js** - Syntax highlighting for stack traces

### Database
- **IndexedDB** - Browser-native NoSQL database
  - Database Name: `junit_test_results`
  - Version: 1
  - No installation required (built into modern browsers)

## Project Structure

```
.
├── index.html                   # Main dashboard page
├── details.html                 # Test details analysis page
├── reports.html                 # Reports and export page
├── main.js                      # Core application logic (687 lines)
├── database.js                  # IndexedDB management (556 lines)
├── api.js                       # CI/CD integration (248 lines)
├── debug.js                     # Error handling (290 lines)
├── test-details-modal.js        # Modal component (265 lines)
├── sample-test-results.xml      # Sample JUnit XML data
├── resources/
│   └── hero-image.png          # Hero section image
└── Documentation/
    ├── outline.md              # Project structure and features
    ├── design.md               # Design style guide
    ├── API_INTEGRATION.md      # CI/CD integration guide
    └── interaction.md          # Interaction design specifications
```

**Total Code:** ~3,700 lines of HTML/JavaScript

## Key Features

### File Processing
- Drag-and-drop JUnit XML file upload
- Batch processing of multiple test result files
- XML validation and parsing
- Duplicate detection via content hashing (SHA-256)
- Progress tracking with visual feedback

### Data Visualization
- Interactive charts showing test success rates over time
- Timeline views of test execution trends
- Performance metrics and execution time analysis
- Failure pattern clustering and detection
- ECharts-powered responsive visualizations

### Test Analysis
- Detailed test case breakdowns with full metadata
- Stack trace viewing with syntax highlighting
- Test suite summaries with pass/fail statistics
- Flaky test detection and tracking
- Historical test execution data

### Filtering & Search
- Filter by test status (passed, failed, error, skipped)
- Date range filtering
- Real-time search across test names and classes
- Sort by execution time, failure rate, or date
- Advanced query capabilities

### Reporting & Export
- Generate custom reports
- Multiple export formats
- Report templates
- Shareable test result data

### CI/CD Integration
- Support for Jenkins, GitHub Actions, GitLab CI
- Tracks build metadata (build ID, commit SHA, branch)
- Client-side API for automated uploads
- Browser postMessage API for inter-window communication

## Database Schema

### IndexedDB Configuration

**Database:** `junit_test_results` (version 1)

#### Object Stores (Tables)

**1. test_runs**
- Primary Key: `id` (auto-increment)
- Indexes: `timestamp`, `name`, `total_tests`, `content_hash` (unique), `ci_provider`, `build_id`, `commit_sha`, `branch`
- Purpose: Top-level test run metadata

**2. test_suites**
- Primary Key: `id` (auto-increment)
- Indexes: `run_id`, `name`, `classname`, `timestamp`
- Purpose: Test suites within runs

**3. test_cases**
- Primary Key: `id` (auto-increment)
- Indexes: `suite_id`, `run_id`, `name`, `classname`, `status`, `timestamp`, `is_flaky`, `[name, classname]` (compound)
- Purpose: Individual test cases

**4. test_results**
- Primary Key: `id` (auto-increment)
- Indexes: `case_id`, `suite_id`, `run_id`, `status`, `timestamp`
- Purpose: Detailed test execution results

**5. file_uploads**
- Primary Key: `id` (auto-increment)
- Indexes: `filename`, `upload_timestamp`, `run_id`, `content_hash` (unique)
- Purpose: Track uploaded JUnit XML files

## Installation & Setup

### Prerequisites
- **Modern web browser** (Chrome 80+, Firefox 75+, Edge 80+, Safari 13.1+)
- **No server required** for basic usage
- **Web server** (optional) for CI/CD integration and production deployment

### Database Installation

**No installation required!** IndexedDB is built into all modern browsers. The database is automatically created when you first open the application.

### Local Development Setup

1. **Clone or download the project files**
   ```bash
   cd /path/to/OKComputer_JUnit\ Test\ Results\ Dashboard/
   ```

2. **Open in browser**
   ```bash
   # Option 1: Direct file access
   open index.html  # macOS
   xdg-open index.html  # Linux
   start index.html  # Windows

   # Option 2: Local web server (recommended)
   python3 -m http.server 8000
   # Then navigate to http://localhost:8000
   ```

3. **Test with sample data**
   - Open `index.html` in your browser
   - Drag and drop `sample-test-results.xml` onto the upload area
   - View the test results in the dashboard

### Production Hosting

#### Option 1: Static File Hosting
Deploy to any static hosting service:
- **GitHub Pages**
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**
- **Azure Static Web Apps**
- **Google Cloud Storage**

Example (GitHub Pages):
```bash
# Push to gh-pages branch
git checkout -b gh-pages
git add .
git commit -m "Deploy dashboard"
git push origin gh-pages
```

#### Option 2: Web Server Hosting

**Apache:**
```apache
# .htaccess
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.html [L]
</IfModule>
```

**Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Node.js (Express):**
```javascript
const express = require('express');
const app = express();
app.use(express.static(__dirname));
app.listen(3000, () => console.log('Dashboard on http://localhost:3000'));
```

## Running the Application

### Basic Usage

1. **Open the dashboard**
   - Navigate to `index.html` in your browser
   - The IndexedDB database initializes automatically

2. **Upload JUnit XML files**
   - Drag and drop XML files onto the upload area
   - Or click to browse and select files
   - Files are parsed and stored in IndexedDB

3. **View test results**
   - Main dashboard shows overview statistics
   - Click on test runs to see detailed breakdowns
   - Use filters and search to find specific tests

4. **Navigate pages**
   - `index.html` - Main dashboard with overview
   - `details.html` - Detailed test analysis
   - `reports.html` - Generate and export reports

### CI/CD Integration

See `Documentation/API_INTEGRATION.md` for complete integration guides.

**Quick example (GitHub Actions):**
```yaml
- name: Upload Test Results
  run: |
    curl -X POST https://your-dashboard.com/api/upload \
      -H "Content-Type: application/xml" \
      --data-binary @test-results.xml
```

## Data Management

### Data Storage Location
- **Browser:** All data stored locally in IndexedDB
- **Location:** Browser profile directory (managed automatically)
- **Persistence:** Data persists across browser sessions
- **Privacy:** Data never leaves the user's browser

### Data Backup
To backup your test results:
1. Navigate to `reports.html`
2. Select "Export All Data"
3. Choose JSON or CSV format
4. Save the exported file

### Data Restoration
1. Open the exported JSON file
2. Use the "Import Data" feature in the dashboard
3. Or manually upload the original JUnit XML files

### Clearing Data
To reset the database:
```javascript
// Open browser console and run:
indexedDB.deleteDatabase('junit_test_results');
// Then refresh the page
```

## Browser Compatibility

| Browser | Minimum Version | IndexedDB Support |
|---------|----------------|-------------------|
| Chrome  | 80+            | ✓ Full            |
| Firefox | 75+            | ✓ Full            |
| Safari  | 13.1+          | ✓ Full            |
| Edge    | 80+            | ✓ Full            |
| Opera   | 67+            | ✓ Full            |

**Note:** Internet Explorer is not supported.

## Performance Considerations

- **Recommended:** Up to 10,000 test cases load smoothly
- **Scalable:** Can handle 50,000+ test cases with pagination
- **Storage:** IndexedDB typically allows 50MB-500MB+ per origin
- **Optimization:** Indexes on frequently queried fields for fast lookups

## Troubleshooting

### Database Issues
If the database fails to initialize:
1. Check browser console for errors
2. Ensure browser supports IndexedDB (check compatibility table)
3. Clear browser cache and reload
4. Try a different browser
5. Check if storage quota is exceeded

### Upload Issues
If XML files fail to upload:
1. Verify XML is valid JUnit format
2. Check file size (recommended < 10MB per file)
3. Ensure browser allows IndexedDB access
4. Check console for parsing errors

### Performance Issues
If dashboard is slow:
1. Check number of stored test results
2. Use date range filters to reduce data volume
3. Clear old test results from the database
4. Upgrade to a browser with better IndexedDB performance

## Security Considerations

- **Client-side only:** No server-side vulnerabilities
- **Local data:** All data stays in the user's browser
- **No authentication:** Add your own auth layer if needed
- **XSS protection:** All user input is sanitized
- **CORS:** Configure if integrating with external APIs

## Development

### Debug Mode
Enable debug mode by adding `?debug=true` to the URL:
```
http://localhost:8000/index.html?debug=true
```

This enables:
- Verbose console logging
- Error stack traces
- Performance timing
- Database operation logs

### File Descriptions

**main.js** (database.js:1-687)
- Application initialization
- UI event handlers
- Chart rendering
- Data processing

**database.js** (database.js:1-556)
- IndexedDB setup and schema
- CRUD operations
- Query builders
- Database migrations

**api.js** (api.js:1-248)
- CI/CD integration
- postMessage API
- Upload endpoints
- Metadata extraction

**debug.js** (debug.js:1-290)
- Error handling
- Logging utilities
- Performance monitoring
- Development tools

**test-details-modal.js** (test-details-modal.js:1-265)
- Modal component
- Test detail views
- Stack trace rendering

## Documentation

- **outline.md** - Project structure and feature overview
- **design.md** - Visual design guide and style specifications
- **API_INTEGRATION.md** - Complete CI/CD integration guide
- **interaction.md** - User interaction flows and UX patterns

## License

[Specify license if applicable]

## Support

For issues or questions:
1. Check the documentation in the `Documentation/` folder
2. Review browser console for error messages
3. Verify browser compatibility
4. Check that IndexedDB is enabled in browser settings

## Contributing

[Add contribution guidelines if applicable]

---

**Summary:** This is a zero-backend, browser-based JUnit test results dashboard using IndexedDB for storage. Simply open `index.html` in a modern browser to start using it. No database installation or server setup required.
