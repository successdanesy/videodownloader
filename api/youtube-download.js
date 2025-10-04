import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ ok: false, error: "Missing YouTube URL" });
    }

    const FASTSAVER_API = "https://beta.fastsaverapi.com";
    const API_KEY = process.env.FASTSAVER_API_KEY;

    try {
        // Try the download endpoint directly first
        const downloadResponse = await fetch(`${FASTSAVER_API}/youtube/download`, {
            method: "POST",
            headers: {
                "api-key": API_KEY,
                "accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: url,
                format: "mp4"
            })
        });

        const responseText = await downloadResponse.text();
        console.log("📡 YouTube API Response:", responseText);

        // Handle different response types
        if (responseText.startsWith('http')) {
            // Direct download URL
            return res.json({
                ok: true,
                source: 'youtube',
                type: 'video',
                title: 'YouTube Video',
                thumbnail: `https://img.youtube.com/vi/${extractVideoId(url)}/hqdefault.jpg`,
                download_url: responseText,
                caption: 'YouTube video download',
                author: 'YouTube'
            });
        }

        // Try to parse as JSON
        try {
            const data = JSON.parse(responseText);
            if (data.download_url || data.url) {
                return res.json({
                    ok: true,
                    source: 'youtube',
                    type: 'video',
                    title: 'YouTube Video',
                    thumbnail: `https://img.youtube.com/vi/${extractVideoId(url)}/hqdefault.jpg`,
                    download_url: data.download_url || data.url,
                    caption: 'YouTube video download',
                    author: 'YouTube'
                });
            }
        } catch {
            // Not JSON, continue to error
        }

        throw new Error('No valid download URL received');

    } catch (err) {
        console.error('❌ YouTube API error:', err);

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