const fs = require('fs');

const path = 'views/ChatView.tsx';
let content = fs.readFileSync(path, 'utf8');

const exportMdComponent = `
const ExportMarkdownContent = ({ text }: { text: string }) => {
    const plotMatch = text.match(/\`\`\`json\\s*(\\{[\\s\\S]*?"type":\\s*"plot"[\\s\\S]*?\\})\\s*\`\`\`/);
    if (plotMatch) {
        try {
            const plotData = JSON.parse(plotMatch[1]);
            const markdownText = text.replace(plotMatch[0], '');
            return (
                <>
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            table: ({node, ...props}: React.ComponentPropsWithoutRef<'table'> & {node?: unknown}) => { void node; return <div className="overflow-x-auto my-3 rounded-lg border border-gray-200 shadow-sm"><table className="min-w-full divide-y divide-gray-200 bg-white" {...props} /></div> },
                            th: ({node, ...props}: React.ComponentPropsWithoutRef<'th'> & {node?: unknown}) => { void node; return <th className="px-3 py-2 bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200" {...props} /> },
                            td: ({node, ...props}: React.ComponentPropsWithoutRef<'td'> & {node?: unknown}) => { void node; return <td className="px-3 py-2 text-sm border-b border-gray-100 last:border-0 text-gray-700" {...props} /> },
                            code: ({node, className, children, ...props}: React.ComponentPropsWithoutRef<'code'> & {node?: unknown}) => {
                                void node;
                                const match = /language-(\\w+)/.exec(className || '')
                                return match ? (
                                    <div className="rounded-lg bg-gray-900 text-gray-100 overflow-hidden my-3 shadow-sm border border-gray-800 text-xs">
                                        <div className="px-3 py-1.5 bg-gray-800 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{match[1]}</span>
                                        </div>
                                        <pre className="p-3 overflow-x-auto"><code>{children}</code></pre>
                                    </div>
                                ) : (
                                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800" {...props}>{children}</code>
                                );
                            }
                        }}
                    >{markdownText}</ReactMarkdown>
                    <PlotComponent data={plotData.data} title={plotData.title} xAxisLabel={plotData.xAxisLabel} yAxisLabel={plotData.yAxisLabel} />
                </>
            );
        } catch (e) {
            console.error("Failed to parse plot data", e);
        }
    }
    
    return (
        <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                table: ({node, ...props}: React.ComponentPropsWithoutRef<'table'> & {node?: unknown}) => { void node; return <div className="overflow-x-auto my-3 rounded-lg border border-gray-200 shadow-sm"><table className="min-w-full divide-y divide-gray-200 bg-white" {...props} /></div> },
                th: ({node, ...props}: React.ComponentPropsWithoutRef<'th'> & {node?: unknown}) => { void node; return <th className="px-3 py-2 bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200" {...props} /> },
                td: ({node, ...props}: React.ComponentPropsWithoutRef<'td'> & {node?: unknown}) => { void node; return <td className="px-3 py-2 text-sm border-b border-gray-100 last:border-0 text-gray-700" {...props} /> },
                code: ({node, className, children, ...props}: React.ComponentPropsWithoutRef<'code'> & {node?: unknown}) => {
                    void node;
                    const match = /language-(\\w+)/.exec(className || '')
                    return match ? (
                        <div className="rounded-lg bg-gray-900 text-gray-100 overflow-hidden my-3 shadow-sm border border-gray-800 text-xs">
                            <div className="px-3 py-1.5 bg-gray-800 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{match[1]}</span>
                            </div>
                            <pre className="p-3 overflow-x-auto"><code>{children}</code></pre>
                        </div>
                    ) : (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800" {...props}>{children}</code>
                    );
                }
            }}
        >
            {text}
        </ReactMarkdown>
    );
};
`;

const markdownContentRegex = /const MarkdownContent = \(\{\s*text\s*\}\s*:\s*\{\s*text\s*:\s*string\s*\}\)\s*=>\s*\{[\s\S]*?(?=\ninterface ChatInputAreaProps)/;

content = content.replace(markdownContentRegex, (match) => {
    return match + '\n' + exportMdComponent;
});

fs.writeFileSync(path, content);
