const { addonBuilder, serveHTTP, publishToCentral } = require("stremio-addon-sdk");
const fetch = require('node-fetch');
const http = require('http');
const url = require('url');

// Define manifest
const manifest = {
    id: "pt.rodrigomataslopes.m3u-loader",
    version: "0.1.0",
    name: "M3U Loader",
    description: "Carrega streams de ficheiros M3U externos com metadados",
    resources: ["catalog", "stream"],
    types: ["channel"],
    catalogs: [
        {
            id: "m3u-catalog",
            name: "M3U Streams",
            type: "channel",
            extra: [
                {
                    name: "url",
                    isRequired: true,
                    description: "URL do ficheiro M3U (ex: https://example.com/playlist.m3u)"
                }
            ]
        }
    ],
    idPrefixes: ["m3uloader-"]
};

// Create addon
const addon = new addonBuilder(manifest);

// Define catalog handler
addon.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log('Catalog request:', { type, id, extra });

    if (id === "m3u-catalog") {
        const m3uUrl = extra.url;

        if (!m3uUrl) {
            throw new Error("URL M3U não especificado!");
        }

        try {
            const m3uContent = await fetchM3u(m3uUrl);
            const metas = parseM3uToMetas(m3uContent);
            return { metas };
        } catch (error) {
            console.error("Erro ao carregar/processar M3U:", error);
            throw error;
        }
    } else {
        throw new Error("Catálogo não suportado: " + id);
    }
});

// Define stream handler
addon.defineStreamHandler(({ type, id }) => {
    console.log('Stream request:', { type, id });

    if (id.startsWith('m3uloader-')) {
        const streamUrl = id.split('m3uloader-')[1];
        return Promise.resolve({ streams: [{ url: streamUrl }] });
    } else {
        return Promise.resolve({ streams: [] });
    }
});

// Function to fetch M3U content from URL
async function fetchM3u(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        return response.text();
    } catch (error) {
        throw new Error(`Falha ao buscar M3U da URL: ${url} - ${error.message}`);
    }
}

// Function to parse M3U content and create Stremio metas
function parseM3uToMetas(m3uContent) {
    const metas = [];

    // Split M3U content by lines
    const lines = m3uContent.split('\n');

    // Check if this is a valid M3U file
    if (lines.length > 0 && !lines[0].startsWith('#EXTM3U')) {
        throw new Error('Formato M3U inválido');
    }

    // Parse entries
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look for EXTINF lines
        if (line.startsWith('#EXTINF:')) {
            const extinf = line;
            // Get the next line which should be the URL
            i++;
            if (i < lines.length) {
                const url = lines[i].trim();
                if (url && !url.startsWith('#')) {
                    // Extract metadata
                    const tvgName = extractAttribute(extinf, 'tvg-name');
                    const tvgLogo = extractAttribute(extinf, 'tvg-logo');
                    const groupTitle = extractAttribute(extinf, 'group-title');

                    // Extract title (after the comma)
                    let title = extinf.split(',')[1] || 'Unnamed Stream';

                    // If no tvg-name, use the title
                    const name = tvgName || title;

                    metas.push({
                        id: 'm3uloader-' + url,
                        type: 'channel',
                        name: name,
                        poster: tvgLogo || 'https://via.placeholder.com/300x450',
                        background: tvgLogo || 'https://via.placeholder.com/1280x720',
                        logo: tvgLogo || 'https://via.placeholder.com/300x300',
                        description: `Stream from M3U list${groupTitle ? ' - Group: ' + groupTitle : ''}`,
                        genres: groupTitle ? [groupTitle] : ['M3U Stream']
                    });
                }
            }
        }
    }

    return metas;
}

// Helper function to extract attributes from EXTINF line
function extractAttribute(line, attr) {
    const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
    const match = line.match(regex);
    return match ? match[1] : '';
}

// For local development
if (!process.env.VERCEL) {
    serveHTTP(addon.getInterface(), { port: 7000 });
    console.log('Addon running at http://127.0.0.1:7000');
}

// For Vercel (serverless)
module.exports = (req, res) => {
    const addonInterface = addon.getInterface();
    const urlParts = url.parse(req.url, true);

    // Convert the incoming request to what the addon SDK expects
    const newReq = {
        method: req.method,
        headers: req.headers,
        path: urlParts.pathname,
        url: urlParts.pathname,
        query: urlParts.query
    };

    // Create a response wrapper to adapt to the Vercel serverless environment
    const newRes = {
        setHeader: (key, value) => res.setHeader(key, value),
        statusCode: 200,
        end: (content) => {
            // Set appropriate content type if not already set
            if (!res.headersSent && typeof content === 'string') {
                if (content.startsWith('{') || content.startsWith('[')) {
                    res.setHeader('Content-Type', 'application/json');
                } else {
                    res.setHeader('Content-Type', 'text/plain');
                }
            }
            res.end(content);
        },
        writeHead: (statusCode, headers) => res.writeHead(statusCode, headers)
    };

    // Handle CORS for browser access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        return res.end();
    }

    // Forward the request to the addon interface
    const handlerName = getHandlerName(urlParts.pathname);
    if (addonInterface[handlerName]) {
        addonInterface[handlerName](newReq, newRes);
    } else {
        // Default to manifest if no specific handler
        addonInterface.manifest(newReq, newRes);
    }
};

// Helper function to determine which handler to use based on the path
function getHandlerName(path) {
    if (path.includes('/catalog/')) return 'catalog';
    if (path.includes('/stream/')) return 'stream';
    if (path.includes('/meta/')) return 'meta';
    if (path.includes('/subtitles/')) return 'subtitles';
    return 'manifest';
}