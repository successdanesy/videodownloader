import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ ok: false, error: "Missing YouTube URL" });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = 'youtube86.p.rapidapi.com';

    try {
        // Step 1: Submit YouTube URL - this returns ALL download links immediately
        const response = await fetch(`https://${RAPIDAPI_HOST}/api/links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            },
            body: JSON.stringify({ url: url })
        });

        const data = await response.json();

        // The API returns an array, get the first item
        const videoData = data[0];

        if (!videoData || !videoData.urls || videoData.urls.length === 0) {
            return res.status(500).json({ ok: false, error: "No download links found" });
        }

        // Find the best quality MP4 download link
        const bestQualityUrl = videoData.urls.find(item =>
            item.extension === 'mp4' && item.quality === '1080'
        ) || videoData.urls.find(item =>
            item.extension === 'mp4' && item.quality === '720'
        ) || videoData.urls.find(item =>
            item.extension === 'mp4'
        ) || videoData.urls[0]; // Fallback to first URL

        // Format response to match your existing app structure
        const result = {
            ok: true,
            source: 'youtube',
            type: 'video',
            title: videoData.meta?.title || 'YouTube Video',
            thumbnail: videoData.pictureUrl,
            download_url: bestQualityUrl.url,
            caption: videoData.meta?.title,
            author: 'YouTube',
            duration: videoData.meta?.duration,
            qualities: videoData.urls.map(item => ({
                quality: item.quality,
                extension: item.extension,
                url: item.url
            }))
        };

        res.json(result);

    } catch (err) {
        console.error('YouTube API error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
}