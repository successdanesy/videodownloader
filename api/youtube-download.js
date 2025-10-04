import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ ok: false, error: "Missing YouTube URL" });
    }

    const FASTSAVER_API = "https://beta.fastsaverapi.com";
    const API_KEY = process.env.FASTSAVER_API_KEY;

    try {
        console.log('🔧 Testing YouTube download endpoint...');

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

        console.log('📡 Response status:', downloadResponse.status);
        console.log('📡 Response headers:', downloadResponse.headers);

        const responseText = await downloadResponse.text();
        console.log("📡 RAW YouTube API Response:", responseText);
        console.log("📡 Response length:", responseText.length);

        // Check if it's a direct URL
        if (responseText.startsWith('http')) {
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
            console.log('📡 Parsed JSON data:', JSON.stringify(data, null, 2));

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
                console.log('❌ No download URL in JSON response');
                console.log('❌ Response keys:', Object.keys(data));
            }
        } catch (parseError) {
            console.log('❌ Response is not JSON:', parseError.message);
        }

        // If we get here, no download URL was found
        console.log('❌ No valid download URL received from API');
        throw new Error('YouTube download not available');

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