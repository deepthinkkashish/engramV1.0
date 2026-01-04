
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { callGeminiApiWithRetry, getFeatureConfig } from '../services/gemini';
import { compressImage, getPdfDocument, renderPdfPage, cropImageFromBase64 } from '../utils/media';
import { saveImageToIDB, saveTopicBodyToIDB, getTopicBodyFromIDB } from '../services/storage';

interface ProcessingJob {
    id: string; // topicId
    status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
    progress: { current: number; total: number };
    message?: string;
    stats?: { pages: number; size: string };
    startTime: number;
}

interface ProcessingContextType {
    jobs: Record<string, ProcessingJob>;
    startProcessing: (userId: string, topicId: string, files: FileList) => Promise<void>;
    clearJob: (topicId: string) => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export const ProcessingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [jobs, setJobs] = useState<Record<string, ProcessingJob>>({});

    const updateJob = (topicId: string, updates: Partial<ProcessingJob>) => {
        setJobs(prev => ({
            ...prev,
            [topicId]: { ...prev[topicId], ...updates }
        }));
    };

    const processAttachment = async (attachment: { base64: string, mimeType: string }) => {
        // Read optional persona for OCR style
        const prefs = getFeatureConfig('ocr');
        const personaInstruction = prefs.persona ? `\n    4. **Style**: ${prefs.persona}` : "";

        const prompt = `You are a study notes OCR expert. 
        1. Extract all text from this image. Use Markdown headings.
        2. **IMPORTANT**: For ANY mathematical formula, equation, or variable, you MUST wrap it in dollar signs. 
           - Use \`$ ... $\` for inline math.
           - Use \`$$ ... $$\` for block/display math.
           - Example: "The transfer function is $G(s) = \\frac{1}{s+1}$."
           - Do NOT write raw LaTeX without dollar signs.
        3. IF you see a diagram, figure, chart, or graph:
           - Identify its bounding box coordinates [ymin, xmin, ymax, xmax] on a scale of 0-1000.
           - Provide a short caption/description.
           - Output the specific tag: [CROP:ymin,xmin,ymax,xmax|Description].
           - Do NOT simply describe it in text if you use the CROP tag. Use the CROP tag so the system can extract the visual.${personaInstruction}
        
        Output clean markdown notes.`;
        
        const systemInstruction = "You are a specialized OCR tool. Priority: Accurate text, proper LaTeX math formatting with delimiters, and identifying visual regions for cropping.";

        try {
            const data = await callGeminiApiWithRetry(
                prompt, 
                systemInstruction, 
                null, 
                [attachment], 
                null, 
                3, 
                'gemini-3-flash-preview',
                'ocr'
            );
            let text = data?.text?.trim() || '';

            const cropRegex = /\[CROP:(\d+),(\d+),(\d+),(\d+)\|(.*?)\]/g;
            const matches = [...text.matchAll(cropRegex)];

            for (const match of matches) {
                const fullTag = match[0];
                const [ymin, xmin, ymax, xmax] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4])];
                const desc = match[5];

                try {
                    const croppedBase64 = await cropImageFromBase64(attachment.base64, ymin, xmin, ymax, xmax);
                    const imageId = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    await saveImageToIDB(imageId, croppedBase64);
                    const newTag = `\n[FIG_CAPTURE: ${imageId} | ${desc}]\n`;
                    text = text.replace(fullTag, newTag);
                } catch (cropError) {
                    console.error("Failed to crop image", cropError);
                    text = text.replace(fullTag, `\n*[Figure: ${desc}]*\n`);
                }
            }
            return text;
        } catch (e: any) {
            // FIX: Rethrow API Key errors so they aren't swallowed as generic "Error processing page"
            // This ensures startProcessing catches it and sets the job status to error with the correct message.
            if (e.code === 'NO_API_KEY' || e.name === 'NoApiKeyError' || e.name === 'UsageLimitError') {
                throw e;
            }
            
            console.error("Error processing page:", e);
            return "\n\n[Error processing this page]\n\n";
        }
    };

    const startProcessing = useCallback(async (userId: string, topicId: string, files: FileList) => {
        if (!files || files.length === 0) return;

        console.debug("[UPLOAD] startProcessing", { userId, topicId, count: files.length });

        // Initialize Job
        const jobId = topicId;
        setJobs(prev => ({
            ...prev,
            [jobId]: {
                id: jobId,
                status: 'uploading',
                progress: { current: 0, total: 0 },
                startTime: Date.now(),
                message: 'Preparing files...'
            }
        }));

        try {
            let totalSizeBytes = 0;
            for (let i = 0; i < files.length; i++) totalSizeBytes += files[i].size;
            const sizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(2) + " MB";

            const attachments: { base64: string, mimeType: string }[] = [];
            const failedFiles: { name: string, reason: string }[] = [];
            
            const MAX_PDF_PAGES = 10;
            let processedPagesCount = 0;
            let isTruncatedPdf = false;

            // 1. Pre-process files (Robust Loop)
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.debug(`[UPLOAD] processing file ${i}: ${file.name}`, file.type, file.size);
                
                try {
                    const isImage = file.type.startsWith('image/');
                    const isPdf = file.type === 'application/pdf';

                    if (!isImage && !isPdf) {
                        console.warn(`[UPLOAD] Unsupported file type: ${file.type}`);
                        failedFiles.push({ name: file.name, reason: "Unsupported type" });
                        continue;
                    }

                    if (isImage) {
                        const result = await compressImage(file);
                        attachments.push(result);
                        processedPagesCount++;
                    } else if (isPdf) {
                        // PDF Pipeline
                        const pdf = await getPdfDocument(file);
                        
                        let pagesToProcess = pdf.numPages;
                        if (pagesToProcess > MAX_PDF_PAGES) {
                            pagesToProcess = MAX_PDF_PAGES;
                            isTruncatedPdf = true;
                            console.warn(`[UPLOAD] PDF ${file.name} truncated: ${pdf.numPages} -> ${MAX_PDF_PAGES} pages`);
                        }
                        
                        processedPagesCount += pagesToProcess;
                        
                        for (let j = 1; j <= pagesToProcess; j++) {
                            const base64 = await renderPdfPage(pdf, j);
                            if (base64) {
                                attachments.push({ base64, mimeType: 'image/jpeg' });
                            }
                        }
                    }
                    console.debug(`[UPLOAD] success: ${file.name}`);
                } catch (e: any) {
                    console.error(`[UPLOAD] fail: ${file.name}`, e);
                    failedFiles.push({ name: file.name, reason: e.message || "Parse error" });
                }
            }

            // CRITICAL: Check if we have ANY valid data to proceed
            if (attachments.length === 0) {
                const errorMsg = failedFiles.length > 0 
                    ? `Failed to load: ${failedFiles[0].name} (${failedFiles[0].reason})` 
                    : 'No valid images or PDFs found.';
                
                updateJob(jobId, { status: 'error', message: errorMsg });
                return;
            }

            // Update Job with Stats and Warnings
            let statusMsg = 'AI Agent analyzing content...';
            if (isTruncatedPdf) statusMsg = `Processing (PDF limited to ${MAX_PDF_PAGES} pages)...`;
            if (failedFiles.length > 0) statusMsg = `Processing valid files (${failedFiles.length} failed)...`;

            updateJob(jobId, { 
                status: 'processing', 
                progress: { current: 0, total: attachments.length },
                stats: { pages: processedPagesCount, size: sizeMb },
                message: statusMsg
            });

            // 2. Fetch existing content to append
            const existingBody = await getTopicBodyFromIDB(userId, topicId) || "";
            let newContentAccumulator = "";

            // 3. Process each page/image
            for (let i = 0; i < attachments.length; i++) {
                // Update progress
                updateJob(jobId, { 
                    progress: { current: i + 1, total: attachments.length },
                    message: `Processing page ${i + 1} of ${attachments.length}...`
                });

                console.debug(`[UPLOAD] OCR processing chunk ${i + 1}`);
                const pageText = await processAttachment(attachments[i]);
                newContentAccumulator += pageText + "\n\n";
            }

            // Append error log to content if partial failures occurred
            if (failedFiles.length > 0) {
                newContentAccumulator += `\n\n> **Upload Note**: The following files could not be processed: ${failedFiles.map(f => f.name).join(', ')}.\n\n`;
            }
            if (isTruncatedPdf) {
                newContentAccumulator += `\n\n> **Upload Note**: Large PDF detected. Processing was limited to the first ${MAX_PDF_PAGES} pages to ensure performance.\n\n`;
            }

            // 4. Save Final Result
            const finalContent = (existingBody + "\n\n" + newContentAccumulator).trim();
            await saveTopicBodyToIDB(userId, topicId, finalContent);

            // Final Status Message
            let finalMsg = 'Processing complete!';
            if (failedFiles.length > 0) {
                finalMsg = `Saved ${attachments.length} items. ${failedFiles.length} file(s) failed.`;
            } else if (isTruncatedPdf) {
                finalMsg = `Saved. Large PDF truncated to ${MAX_PDF_PAGES} pages.`;
            }

            console.debug("[UPLOAD] summary", { ok: attachments.length, fail: failedFiles.length, truncated: isTruncatedPdf });
            updateJob(jobId, { status: 'success', message: finalMsg });

        } catch (error: any) {
            console.error("[UPLOAD] Global processing failed:", error);
            updateJob(jobId, { status: 'error', message: error.message || 'Unknown error occurred.' });
        }
    }, []);

    const clearJob = useCallback((topicId: string) => {
        setJobs(prev => {
            const newJobs = { ...prev };
            delete newJobs[topicId];
            return newJobs;
        });
    }, []);

    return (
        <ProcessingContext.Provider value={{ jobs, startProcessing, clearJob }}>
            {children}
        </ProcessingContext.Provider>
    );
};

export const useProcessing = () => {
    const context = useContext(ProcessingContext);
    if (!context) throw new Error("useProcessing must be used within ProcessingProvider");
    return context;
};
