import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ ok: false, error: "Missing YouTube URL" });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = 'youtube86.p.rapidapi.com';

    try {
        console.log('📡 Making YouTube API request for URL:', url);

        // Step 1: Submit YouTube URL
        const response = await fetch(`https://${RAPIDAPI_HOST}/api/links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            },
            body: JSON.stringify({ url: url })
        });

        console.log('📡 YouTube API response status:', response.status);

        const data = await response.json();
        console.log('📡 Full YouTube API response:', JSON.stringify(data, null, 2));

        // Handle different response structures
        let videoData;

        if (Array.isArray(data) && data.length > 0) {
            // Structure from your test
            videoData = data[0];
        } else if (data.urls) {
            // Direct structure
            videoData = data;
        } else {
            console.log('❌ Unexpected API response structure');
            return res.status(500).json({
                ok: false,
                error: "Unexpected API response",
                debug: data
            });
        }

        // Check if we have URLs
        if (!videoData.urls || videoData.urls.length === 0) {
            console.log('❌ No URLs found in response');
            return res.status(500).json({
                ok: false,
                error: "No download links found",
                debug: videoData
            });
        }

        console.log('✅ Found', videoData.urls.length, 'download URLs');

        // Find the best quality MP4 download link
        const bestQualityUrl = videoData.urls.find(item =>
            item.extension === 'mp4' && item.quality === '1080'
        ) || videoData.urls.find(item =>
            item.extension === 'mp4' && item.quality === '720'
        ) || videoData.urls.find(item =>
            item.extension === 'mp4' && item.quality === '480'
        ) || videoData.urls.find(item =>
            item.extension === 'mp4'
        ) || videoData.urls[0]; // Fallback to first URL

        if (!bestQualityUrl || !bestQualityUrl.url) {
            console.log('❌ No valid download URL found');
            return res.status(500).json({
                ok: false,
                error: "No valid download URL found",
                debug: videoData.urls
            });
        }

        // Format response to match your existing app structure
        const result = {
            ok: true,
            source: 'youtube',
            type: 'video',
            title: videoData.meta?.title || videoData.title || 'YouTube Video',
            thumbnail: videoData.pictureUrl || videoData.thumbnail,
            download_url: bestQualityUrl.url,
            caption: videoData.meta?.title || videoData.title,
            author: 'YouTube',
            duration: videoData.meta?.duration,
            qualities: videoData.urls.map(item => ({
                quality: item.quality,
                extension: item.extension,
                url: item.url
            }))
        };

        console.log('✅ Successfully formatted response');
        res.json(result);

    } catch (err) {
        console.error('❌ YouTube API error:', err);
        res.status(500).json({
            ok: false,
            error: err.message,
            stack: err.stack
        });
    }
}