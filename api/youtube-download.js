import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ ok: false, error: "Missing YouTube URL" });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = 'youtube86.p.rapidapi.com';

    try {
        // Submit YouTube URL
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

        // Get the first video data
        const videoData = data[0];

        // Find the best MP4 download link (prefer 1080p, then 720p, etc.)
        const bestQualityUrl = videoData.urls.find(item =>
            item.extension === 'mp4' && item.quality === '1080'
        ) || videoData.urls.find(item =>
            item.extension === 'mp4' && item.quality === '720'
        ) || videoData.urls.find(item =>
            item.extension === 'mp4'
        ) || videoData.urls[0];

        // Format response
        const result = {
            ok: true,
            source: 'youtube',
            type: 'video',
            title: videoData.meta.title,
            thumbnail: videoData.pictureUrl,
            download_url: bestQualityUrl.url,
            caption: videoData.meta.title,
            author: 'YouTube',
            duration: videoData.meta.duration,
            qualities: videoData.urls
        };

        res.json(result);

    } catch (err) {
        console.error('YouTube API error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
}