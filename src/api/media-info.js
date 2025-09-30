const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

    const FASTSAVER_API = "https://beta.fastsaverapi.com/media/info";
    const API_KEY = process.env.FASTSAVER_API_KEY;

    try {
        const apiRes = await fetch(`${FASTSAVER_API}?url=${encodeURIComponent(url)}`, {
            headers: {
                "api-key": API_KEY,
                "accept": "application/json",
            },
        });

        const data = await apiRes.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};