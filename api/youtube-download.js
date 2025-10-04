import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ ok: false, error: "Missing YouTube URL" });
    }

    const FASTSAVER_API = "https://beta.fastsaverapi.com";
    const API_KEY = process.env.FASTSAVER_API_KEY;

    try {
        console.log('📡 Getting YouTube info for URL:', url);

        // Step 1: Get video info using GET /youtube/info
        const infoResponse = await fetch(`${FASTSAVER_API}/youtube/info?url=${encodeURIComponent(url)}`, {
            method: "GET",
            headers: {
                "api-key": API_KEY,
                "accept": "application/json",
            },
        });

        const infoText = await infoResponse.text();
        console.log("📡 YouTube Info Response:", infoText);

        let infoData;
        try {
            infoData = JSON.parse(infoText);
        } catch {
            return res.status(500).json({ ok: false, error: "Invalid JSON from YouTube info endpoint" });
        }

        // If info endpoint returns error
        if (infoData.error === true || !infoData.shortcode) {
            return res.status(200).json({
                ok: true,
                source: 'youtube',
                type: 'info',
                title: 'YouTube Video',
                thumbnail: `https://img.youtube.com/vi/${extractVideoId(url)}/hqdefault.jpg`,
                download_url: null,
                caption: 'Video content',
                author: 'YouTube',
                unavailable: true,
                message: "Download not available for this video",
                reason: "Due to platform restrictions and permissions, we can't provide a download link for this video right now."
            });
        }

        console.log('✅ YouTube info received, shortcode:', infoData.shortcode);

        // Step 2: Request download using POST /youtube/download
        const downloadResponse = await fetch(`${FASTSAVER_API}/youtube/download`, {
            method: "POST",
            headers: {
                "api-key": API_KEY,
                "accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: url,
                format: "mp4", // You can make this configurable if needed
                bot_username: infoData.bot_username || "@the_saverbot"
            })
        });

        const downloadText = await downloadResponse.text();
        console.log("📡 YouTube Download Response:", downloadText);

        let downloadData;
        try {
            downloadData = JSON.parse(downloadText);
        } catch {
            // If it's not JSON, it might be a direct download URL
            if (downloadResponse.ok && downloadText.startsWith('http')) {
                // Success! We got a direct download URL
                return res.json({
                    ok: true,
                    source: 'youtube',
                    type: 'video',
                    title: 'YouTube Video',
                    thumbnail: `https://img.youtube.com/vi/${infoData.shortcode}/hqdefault.jpg`,
                    download_url: downloadText,
                    caption: 'YouTube video download',
                    author: 'YouTube',
                    shortcode: infoData.shortcode
                });
            }
            return res.status(500).json({ ok: false, error: "Invalid response from YouTube download endpoint" });
        }

        // If download endpoint returns a URL
        if (downloadData && typeof downloadData === 'string' && downloadData.startsWith('http')) {
            return res.json({
                ok: true,
                source: 'youtube',
                type: 'video',
                title: 'YouTube Video',
                thumbnail: `https://img.youtube.com/vi/${infoData.shortcode}/hqdefault.jpg`,
                download_url: downloadData,
                caption: 'YouTube video download',
                author: 'YouTube',
                shortcode: infoData.shortcode
            });
        }

        // If we get structured data with download info
        if (downloadData.download_url || downloadData.url) {
            return res.json({
                ok: true,
                source: 'youtube',
                type: 'video',
                title: 'YouTube Video',
                thumbnail: `https://img.youtube.com/vi/${infoData.shortcode}/hqdefault.jpg`,
                download_url: downloadData.download_url || downloadData.url,
                caption: 'YouTube video download',
                author: 'YouTube',
                shortcode: infoData.shortcode
            });
        }

        // If no download URL found
        throw new Error('No download URL received from YouTube API');

    } catch (err) {
        console.error('❌ YouTube API error:', err);

        // Return friendly error message
        res.status(200).json({
            ok: true,
            source: 'youtube',
            type: 'info',
            title: 'YouTube Video',
            thumbnail: `https://img.youtube.com/vi/${extractVideoId(url)}/hqdefault.jpg`,
            download_url: null,
            caption: 'Video content',
            author: 'YouTube',
            unavailable: true,
            message: "Download not available for this video",
            reason: "Due to platform restrictions and permissions, we can't provide a download link for this video right now."
        });
    }
}

function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : 'unknown';
}