const crypto = require('crypto');

const generateHash = (content) => {
    return crypto.createHash('sha256').update(content).digest('hex');
};

module.exports = { generateHash };
