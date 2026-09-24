const path = require('node:path');
const yauzl = require('yauzl');

const DEFAULT_LIMITS = Object.freeze({
    maxEntries: 10000,
    maxExpandedBytes: 250 * 1024 * 1024,
    // MongoDB stores each attachment as its own document and enforces a 16 MiB BSON limit.
    maxEntryBytes: 15 * 1024 * 1024
});

const normalizeEntryName = filename => {
    const normalized = filename.replaceAll('\\', '/');
    if (
        normalized.includes('\0') ||
        normalized.startsWith('/') ||
        normalized.split('/').includes('..')
    ) {
        throw new Error(`Unsafe Allure archive entry: ${filename}`);
    }
    return path.posix.basename(normalized);
};

const openZip = buffer =>
    new Promise((resolve, reject) => {
        yauzl.fromBuffer(
            buffer,
            { lazyEntries: true, validateEntrySizes: true },
            (error, zipFile) => (error ? reject(error) : resolve(zipFile))
        );
    });

const readEntry = (zipFile, entry) =>
    new Promise((resolve, reject) => {
        zipFile.openReadStream(entry, (error, stream) => {
            if (error) return reject(error);
            const chunks = [];
            stream.on('data', chunk => chunks.push(chunk));
            stream.once('error', reject);
            stream.once('end', () => resolve(Buffer.concat(chunks)));
        });
    });

const readAllureArchive = async (archiveBuffer, configuredLimits = {}) => {
    const limits = { ...DEFAULT_LIMITS, ...configuredLimits };
    const zipFile = await openZip(archiveBuffer);
    const files = new Map();
    let entryCount = 0;
    let expandedBytes = 0;

    return new Promise((resolve, reject) => {
        const fail = error => {
            zipFile.close();
            reject(error);
        };

        zipFile.once('error', fail);
        zipFile.on('entry', async entry => {
            try {
                entryCount += 1;
                if (entryCount > limits.maxEntries) {
                    throw new Error(`Allure archive exceeds ${limits.maxEntries} entries`);
                }
                if (entry.fileName.endsWith('/')) {
                    zipFile.readEntry();
                    return;
                }

                const name = normalizeEntryName(entry.fileName);
                if (!name || files.has(name)) throw new Error(`Duplicate Allure archive entry: ${name}`);
                if (entry.uncompressedSize > limits.maxEntryBytes) {
                    throw new Error(`Allure archive entry is too large: ${name}`);
                }
                expandedBytes += entry.uncompressedSize;
                if (expandedBytes > limits.maxExpandedBytes) {
                    throw new Error('Allure archive expanded size exceeds the configured limit');
                }

                const content = await readEntry(zipFile, entry);
                files.set(name, content);
                zipFile.readEntry();
            } catch (error) {
                fail(error);
            }
        });
        zipFile.once('end', () => resolve(files));
        zipFile.readEntry();
    });
};

module.exports = { DEFAULT_LIMITS, normalizeEntryName, readAllureArchive };
