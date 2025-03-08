const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const fetch = require('node-fetch');

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
if (process.env.NODE_ENV !== 'production') {
    serveHTTP(addon.getInterface(), { port: 7000 });
    console.log('Addon running at http://127.0.0.1:7000');
}

// For Vercel (serverless)
module.exports = async (req, res) => {
    const handle = addon.getInterface();
    await handle(req, res);
};