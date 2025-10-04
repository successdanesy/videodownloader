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

        // Step 1: First get the video info
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

        console.log('📡 Info data keys:', Object.keys(infoData));

        // Step 2: Try download with different bot_usernames
        const possibleBots = [
            "@the_saverbot", // From the documentation example
            "@fastsaverbot",
            "@saverbot",
            "the_saverbot", // Without @
            "fastsaverbot"
        ];

        for (const botUsername of possibleBots) {
            console.log(`🔧 Trying bot_username: ${botUsername}`);

            try {
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
                        bot_username: botUsername
                    })
                });

                console.log(`📡 Download response status for ${botUsername}:`, downloadResponse.status);

                const responseText = await downloadResponse.text();
                console.log(`📡 Download Response for ${botUsername}:`, responseText);

                // If we get a successful response (not 422)
                if (downloadResponse.status !== 422) {
                    // Handle direct URL
                    if (responseText.startsWith('http')) {
                        console.log('✅ Got direct download URL with bot:', botUsername);
                        return res.json({
                            ok: true,
                            source: 'youtube',
                            type: 'video',
                            title: infoData.title || 'YouTube Video',
                            thumbnail: infoData.thumbnails?.max || infoData.thumbnails?.low || `https://img.youtube.com/vi/${extractVideoId(url)}/hqdefault.jpg`,
                            download_url: responseText,
                            caption: infoData.title,
                            author: infoData.channel || 'YouTube'
                        });
                    }

                    // Try to parse as JSON
                    try {
                        const data = JSON.parse(responseText);
                        console.log('📡 Parsed download data:', JSON.stringify(data, null, 2));

                        if (data.download_url || data.url) {
                            console.log('✅ Got download URL from JSON with bot:', botUsername);
                            return res.json({
                                ok: true,
                                source: 'youtube',
                                type: 'video',
                                title: infoData.title || data.title || 'YouTube Video',
                                thumbnail: infoData.thumbnails?.max || infoData.thumbnails?.low || data.thumbnail || `https://img.youtube.com/vi/${extractVideoId(url)}/hqdefault.jpg`,
                                download_url: data.download_url || data.url,
                                caption: infoData.title || data.caption,
                                author: infoData.channel || data.author || 'YouTube'
                            });
                        }
                    } catch (parseError) {
                        console.log('❌ Response is not JSON for bot:', botUsername);
                    }
                } else {
                    console.log(`❌ Bot ${botUsername} returned 422`);
                }
            } catch (botError) {
                console.log(`❌ Error with bot ${botUsername}:`, botError.message);
            }
        }

        // If all bots failed
        console.log('❌ All bot_usernames failed');
        throw new Error('No working bot_username found');

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