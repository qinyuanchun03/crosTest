
import React, { useState, useCallback } from 'react';

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
    </div>
);

const LinkIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

const App: React.FC = () => {
    const [targetUrl, setTargetUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [data, setData] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFetch = useCallback(async () => {
        if (!targetUrl.trim()) {
            setError('Please enter a target URL.');
            return;
        }

        let fullUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(fullUrl)) {
            fullUrl = 'https://' + fullUrl;
        }

        try {
            new URL(fullUrl);
        } catch (_) {
            setError('Please enter a valid URL.');
            return;
        }

        setIsLoading(true);
        setData(null);
        setError(null);

        try {
            const proxyUrl = `/?target=${encodeURIComponent(fullUrl)}`;
            const response = await fetch(proxyUrl);

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${response.statusText}. Response: ${responseText}`);
            }

            try {
                const jsonObj = JSON.parse(responseText);
                setData(JSON.stringify(jsonObj, null, 2));
            } catch (e) {
                setData(responseText);
            }

        } catch (e) {
            if (e instanceof Error) {
                setError(`Fetch Error: ${e.message}. Note: The CORS proxy endpoint must be configured on this domain for this to work.`);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [targetUrl]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleFetch();
    };

    return (
        <div className="min-h-screen text-slate-200 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-3xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-sky-400 mb-2">CORS Proxy Service</h1>
                    <p className="text-slate-400 text-lg">
                        Fetch remote resources without CORS issues via a backend proxy.
                    </p>
                </header>
                
                <main className="bg-slate-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-2xl shadow-sky-900/20 border border-slate-700">
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-grow">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <LinkIcon />
                            </span>
                            <input
                                type="text"
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                placeholder="Enter target URL (e.g., api.example.com/data)"
                                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all duration-300 placeholder-slate-400"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300 shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Fetching...' : 'Fetch'}
                        </button>
                    </form>

                    <div className="bg-slate-900 rounded-lg min-h-[200px] max-h-[50vh] p-4 border border-slate-700 overflow-auto relative">
                        {isLoading && <LoadingSpinner />}
                        {error && (
                            <div className="text-red-400 p-4 bg-red-900/30 rounded-md">
                                <p className="font-bold">Error:</p>
                                <p className="whitespace-pre-wrap break-words">{error}</p>
                            </div>
                        )}
                        {data && (
                            <pre className="text-sm whitespace-pre-wrap break-words">
                                <code className="font-mono">{data}</code>
                            </pre>
                        )}
                        {!isLoading && !error && !data && (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                <p>Response will appear here...</p>
                            </div>
                        )}
                    </div>
                </main>
                
                <footer className="text-center mt-8 text-slate-500 text-sm">
                    <p>This frontend assumes a proxy is available at <code className="bg-slate-700 px-1 py-0.5 rounded">/?target=&lt;url&gt;</code></p>
                </footer>
            </div>
        </div>
    );
};

export default App;
