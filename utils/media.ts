
import * as pdfjsLibProxy from 'pdfjs-dist';

// Initialize PDF.js worker
const pdfjsLib = (pdfjsLibProxy as any).default || pdfjsLibProxy;

// Resilient Worker Loader
// Handles AI Studio Preview (sub-paths), Vercel, and Localhost by attempting local resolution
// then falling back to a Blob URL created from the CDN (bypassing CORS/Origin issues).
let workerInitPromise: Promise<void> | null = null;
let activeWorkerBlobUrl: string | null = null;

const initPdfWorker = () => {
    if (workerInitPromise) return workerInitPromise;

    workerInitPromise = (async () => {
        if (!pdfjsLib || !pdfjsLib.GlobalWorkerOptions) return;

        // Cleanup previous blob if exists
        if (activeWorkerBlobUrl) {
            URL.revokeObjectURL(activeWorkerBlobUrl);
            activeWorkerBlobUrl = null;
        }

        // 1. Try Local UMD File (Same-Origin)
        // Prefer direct path for standard deployments to avoid Blob overhead/CSP issues.
        // This expects the worker file to be at /assets/pdf.worker.min.js in production.
        try {
            const localUrl = '/assets/pdf.worker.min.js';
            console.debug("[PDF] Checking local UMD worker...");
            const res = await fetch(localUrl, { cache: "no-store" });
            const contentType = res.headers.get('Content-Type') || '';
            
            if (res.ok && (contentType.includes('javascript') || contentType.includes('application/x-javascript'))) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = localUrl;
                console.debug("[PDF] workerSrc set to same-origin UMD");
                return;
            }
        } catch (e) {
            console.debug("[PDF] Local worker not found, trying CDN fallback.");
        }

        // 2. Fallback: Fetch UMD from CDN (unpkg) and create Blob
        // Unpkg provides the raw UMD file (Classic Worker), unlike esm.sh which bundles as Module.
        // This fixes "Cannot use import statement outside a module" errors.
        try {
            const cdnUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            console.debug("[PDF] Fetching UMD worker from CDN (fallback)...");
            
            const cdnRes = await fetch(cdnUrl);
            if (cdnRes.ok) {
                const blob = await cdnRes.blob();
                activeWorkerBlobUrl = URL.createObjectURL(blob);
                pdfjsLib.GlobalWorkerOptions.workerSrc = activeWorkerBlobUrl;
                console.debug("[PDF] workerSrc set to UMD blob (cdn)");
                return;
            } else {
                console.warn("[PDF] CDN fetch failed:", cdnRes.status);
            }
        } catch (e) {
            console.error("[PDF] Failed to load worker from CDN", e);
        }
        
        console.warn("[PDF] Worker initialization failed. PDF parsing might use fake worker (main thread).");
    })();

    return workerInitPromise;
};

export const getPdfDocument = async (file: File) => {
    await initPdfWorker();
    
    try {
        console.debug(`[PDF] loading ${file.name} (${file.size} bytes)`);
        const arrayBuffer = await file.arrayBuffer();
        
        // FIX: Wrap ArrayBuffer in Uint8Array. PDF.js requires TypedArray for 'data' property.
        const data = new Uint8Array(arrayBuffer);
        
        console.debug("[PDF] getDocument start");
        const loadingTask = pdfjsLib.getDocument({ data });
        
        loadingTask.onProgress = (p: { loaded: number; total: number }) => {
            // Optional: Log progress for large files
            if (p.total > 0 && p.loaded < p.total) {
                 // console.debug(`[PDF] progress: ${Math.round((p.loaded / p.total) * 100)}%`);
            }
        };

        const pdf = await loadingTask.promise;
        console.debug(`[PDF] loaded successfully: ${pdf.numPages} pages`);
        return pdf;
    } catch (e: any) {
        console.error("[PDF] Load Error:", e.name, e.message);
        // Rethrow with clear message so UI shows it
        throw new Error(`Failed to load PDF: ${e.message || "Invalid file structure"}`);
    }
}

export const renderPdfPage = async (pdf: any, pageNum: number): Promise<string> => {
    try {
        console.debug(`[PDF] rendering page ${pageNum}`);
        const page = await pdf.getPage(pageNum);
        // Reduced scale slightly to 2.0 for better memory usage on mobile while maintaining readability
        const viewport = page.getViewport({ scale: 2.0 }); 
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) throw new Error("Canvas context missing");
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        console.debug(`[PDF] render complete page ${pageNum}`);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Slightly lower quality for memory safety
        return dataUrl.split(',')[1];
    } catch (e) {
        console.error(`[PDF] Error rendering page ${pageNum}`, e);
        return "";
    }
};

export const compressImage = async (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Reduced max dimensions to 1280 to prevent mobile GPU artifacts/crashes
                const MAX_WIDTH = 1280;
                const MAX_HEIGHT = 1280;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }
                
                ctx.drawImage(img, 0, 0, width, height);
                // Optimized quality for mobile
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                const base64 = dataUrl.split(',')[1];
                resolve({ base64, mimeType: 'image/jpeg' });
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const cropImageFromBase64 = async (
    base64Image: string, 
    ymin: number, 
    xmin: number, 
    ymax: number, 
    xmax: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Image}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject("No canvas context");
                return;
            }

            // Convert 0-1000 coordinates to pixels
            const x = (xmin / 1000) * img.width;
            const y = (ymin / 1000) * img.height;
            const w = ((xmax - xmin) / 1000) * img.width;
            const h = ((ymax - ymin) / 1000) * img.height;

            // Add some padding to the crop (optional aesthetic)
            const padding = 10;
            const sx = Math.max(0, x - padding);
            const sy = Math.max(0, y - padding);
            const sw = Math.min(img.width - sx, w + padding * 2);
            const sh = Math.min(img.height - sy, h + padding * 2);

            canvas.width = sw;
            canvas.height = sh;

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            
            // Optimized crop output
            const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
            resolve(dataUrl.split(',')[1]);
        };
        img.onerror = (e) => reject(e);
    });
};
