const fs = require('fs');
const path = 'context/ProcessingContext.tsx';
let code = fs.readFileSync(path, 'utf8');

const replacement = `            if (attachments.length === 0) {
                const errorMsg = failedFiles.length > 0 
                    ? \`Failed to load: \${failedFiles[0].name} (\${failedFiles[0].reason})\` 
                    : 'No valid images or PDFs found.';
                
                updateJob(jobId, { 
                    status: 'error', 
                    message: errorMsg 
                });
                return null;
            }

            // Calculate total size for analytics
            const sizeBytes = files.length > 0 ? Array.from(files).reduce((acc, f) => acc + f.size, 0) : 0;
            const sizeMb = sizeBytes / (1024 * 1024);
            
            // 2. Fetch Existing Notes
            let existingBody = topicId.startsWith('topic-') ? await getTopicBodyFromIDB(userId, topicId) || "" : "";

            // 3. Process Chunked Attachments (OCR)
            let newContentAccumulator = "";
            for (let i = 0; i < attachments.length; i++) {
                // Background tracking IDB logic
                try {
                    const imgObj = await loadImageFromBase64(attachments[i].base64);
                    const originalCount = await getSourceImageCount(topicId);
                    await saveImageToIDB(topicId, attachments[i].base64.replace(/^data:image\\/jpeg;base64,/, ''), originalCount);
                } catch (e) {
                    console.warn("[UPLOAD] background cache fail", e);
                }

                updateJob(jobId, { 
                    progress: { current: i + 1, total: attachments.length },
                    message: \`Processing page \${i + 1} of \${attachments.length}...\`
                });

                console.debug(\`[UPLOAD] OCR processing chunk \${i + 1}\`);
                const pageText = await processAttachment(attachments[i]);
                newContentAccumulator += pageText + "\\n\\n";
            }

            if (failedFiles.length > 0) {
                newContentAccumulator += \`\\n\\n> **Upload Note**: The following files could not be processed: \${failedFiles.map(f => f.name).join(', ')}.\\n\\n\`;
            }
            if (isTruncatedPdf) {
                newContentAccumulator += \`\\n\\n> **Upload Note**: Large PDF detected. Processing was limited to the first \${MAX_PDF_PAGES} pages to ensure performance.\\n\\n\`;
            }

            const finalContent = (existingBody + "\\n\\n" + newContentAccumulator).trim();
            // Just for backup, rely on return value
            await saveTopicBodyToIDB(userId, topicId, finalContent);

            const totalImages = await getSourceImageCount(topicId);

            let finalMsg = 'Processing complete!';
            if (failedFiles.length > 0) {
                finalMsg = \`Saved \${attachments.length} items. \${failedFiles.length} file(s) failed.\`;
            } else if (isTruncatedPdf) {
                finalMsg = \`Saved. Large PDF truncated to \${MAX_PDF_PAGES} pages.\`;
            }

            updateJob(jobId, { 
                status: 'success', 
                message: finalMsg,
                stats: { pages: processedPagesCount, size: sizeMb, totalImages } 
            });
            return finalContent;
        } catch (error: unknown) {`;

code = code.replace(/if \(attachments\.length === 0\) \{[\s\S]*?\} catch \(error: unknown\) \{/m, replacement);

fs.writeFileSync(path, code);
