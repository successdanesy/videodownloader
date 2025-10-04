import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ ok: false, error: "Missing YouTube URL" });
    }

    const FASTSAVER_API = "https://beta.fastsaverapi.com";
    const API_KEY = process.env.FASTSAVER_API_KEY;

    try {
        console.log('🔧 Getting YouTube info first...');

        // Step 1: First get the video info to get bot_username
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
            throw new Error('Invalid JSON from YouTube info endpoint');
        }

        // Check if info endpoint worked
        if (infoData.error === true || !infoData.bot_username) {
            console.log('❌ No bot_username from info endpoint');
            throw new Error('Could not get required bot information');
        }

        console.log('✅ Got bot_username:', infoData.bot_username);

        // Step 2: Now request download with bot_username
        const downloadResponse = await fetch(`${FASTSAVER_API}/youtube/download`, {
            method: "POST",
            headers: {
                "api-key": API_KEY,
                "accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: url,
                format: "mp4",
                bot_username: infoData.bot_username // Required field!
            })
        });

        console.log('📡 Download response status:', downloadResponse.status);

        const responseText = await downloadResponse.text();
        console.log("📡 Download Response:", responseText);

        // Handle different response types
        if (responseText.startsWith('http')) {
            // Direct download URL
            console.log('✅ Got direct download URL');
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
            console.log('📡 Parsed download data:', JSON.stringify(data, null, 2));

            if (data.download_url || data.url) {
                console.log('✅ Got download URL from JSON');
                return res.json({
                    ok: true,
                    source: 'youtube',
                    type: 'video',
                    title: data.title || 'YouTube Video',
                    thumbnail: data.thumbnail || `https://img.youtube.com/vi/${extractVideoId(url)}/hqdefault.jpg`,
                    download_url: data.download_url || data.url,
                    caption: data.caption || 'YouTube video download',
                    author: data.author || 'YouTube'
                });
            } else {
                console.log('❌ No download URL in response');
                throw new Error('No download URL received');
            }
        } catch (parseError) {
            console.log('❌ Download response is not JSON or URL');
            throw new Error('Invalid download response format');
        }

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