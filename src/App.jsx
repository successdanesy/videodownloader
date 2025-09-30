import { useState } from "react";

function App() {
    const [url, setUrl] = useState("");
    const [media, setMedia] = useState(null);
    const [loading, setLoading] = useState(false);

    const API_BASE = import.meta.env.DEV
        ? 'http://localhost:5000/api'
        : '/api';

    const fetchMediaInfo = async () => {
        if (!url) return;
        setLoading(true);
        setMedia(null);

        try {
            const res = await fetch(`${API_BASE}/media-info?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            console.log("🎬 Media Info:", data);
            setMedia(data);
        } catch (err) {
            console.error("❌ Frontend error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
            <h1 className="text-3xl font-bold mb-6">📥 All-in-One Downloader</h1>

            {/* Input */}
            <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Instagram, TikTok, Facebook, etc. link..."
                className="w-full max-w-md px-4 py-2 border rounded-lg shadow-sm focus:ring focus:ring-blue-400"
            />

            {/* Button */}
            <button
                onClick={fetchMediaInfo}
                disabled={!url || loading}
                className="mt-4 px-6 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700"
            >
                {loading ? "Fetching..." : "Get Info"}
            </button>

            {/* Results */}
            {media && (
                <div className="mt-6 p-4 bg-white rounded-xl shadow-lg w-full max-w-md text-center">
                    {media.ok === false ? (
                        <p className="text-red-600">❌ {media.error || "Error fetching media"}</p>
                    ) : (
                        <>
                            <p className="font-semibold">Source: {media.source}</p>
                            <p>Type: {media.type}</p>
                            {media.caption && <p className="italic mt-2">{media.caption}</p>}
                            {media.thumbnail && (
                                <img
                                    src={media.thumbnail}
                                    alt="Thumbnail"
                                    className="mx-auto mt-3 rounded-lg"
                                />
                            )}
                            {media.download_url && (
                                <a
                                    href={media.download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block mt-4 px-6 py-2 rounded-lg bg-green-600 text-white shadow hover:bg-green-700"
                                >
                                    Download
                                </a>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;