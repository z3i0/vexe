const { Client } = require('discord.js-selfbot-v13');

/**
 * Fetches the Discord profile information for a given token.
 * 
 * @param {string} token - The Discord user token.
 * @returns {Promise<{userId: string, tag: string, username: string}>}
 */
async function fetchAccountProfile(token) {
    if (!token) {
        throw new Error('Token is required to fetch account profile.');
    }

    const client = new Client({ checkUpdate: false });

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            client.removeAllListeners();
            client.destroy();
        };

        const handleReady = () => {
            const { id, username, discriminator, tag } = client.user;
            const displayTag = tag || (discriminator && discriminator !== '0' ? `${username}#${discriminator}` : username);
            const profile = {
                userId: id,
                tag: displayTag,
                username,
            };
            cleanup();
            resolve(profile);
        };

        const handleError = (error) => {
            cleanup();
            const reason = error?.message || error || 'unknown error';
            reject(new Error(`Failed to fetch account details: ${reason}`));
        };

        client.once('ready', handleReady);
        client.once('error', handleError);
        client.login(token).catch(handleError);
    });
}

/**
 * Common ANSI colors for CLI beautification.
 */
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

module.exports = {
    fetchAccountProfile,
    colors,
    log,
};
