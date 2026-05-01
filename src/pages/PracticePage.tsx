import React, { useState } from "react";
import { useTestStore } from "../store/testStore";
import { useNavigate } from "react-router-dom";
import { cn, processLatex } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function PracticePage() {
    const store = useTestStore();
    const navigate = useNavigate();
    const [revealAll, setRevealAll] = useState(false);

    if (!store.test) {
        return (
            <div className="min-h-screen bg-[var(--theme-bg)] flex items-center justify-center p-6 text-center">
                <div className="terminal-font text-xs opacity-50 uppercase tracking-widest">
                    No active PDF found. <a href="/" className="underline text-[var(--theme-primary)] hover:text-white transition-colors">Return to base</a>.
                </div>
            </div>
        );
    }

    const { test } = store;

    return (
        <div className="min-h-screen bg-[var(--theme-bg)] flex flex-col relative">
            <header className="sticky top-0 z-50 bg-[var(--theme-bg)] border-b border-[var(--theme-muted)] p-4 flex items-center justify-between shadow-xl">
                <button 
                    onClick={() => navigate("/test")}
                    className="flex items-center gap-2 text-[var(--theme-primary)] hover:text-white transition-colors terminal-font text-xs uppercase cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="font-mono text-xs uppercase tracking-widest opacity-50 hidden md:block">
                    {test.metadata.title} - Practice Mode
                </div>
                <button
                    onClick={() => setRevealAll(!revealAll)}
                    className="flex items-center gap-2 text-xs terminal-font uppercase px-3 py-1.5 border border-[var(--theme-primary)]/30 rounded hover:bg-[var(--theme-primary)] hover:text-[var(--theme-bg)] transition-colors cursor-pointer"
                >
                    {revealAll ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {revealAll ? "Hide All" : "Reveal All"}
                </button>
            </header>

            <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-8">
                {test.questions.map((q, index) => (
                    <PracticeQuestion key={q.id} q={q} index={index} revealAll={revealAll} />
                ))}
            </main>
        </div>
    );
}

function PracticeQuestion({ q, index, revealAll }: { q: any; index: number; revealAll: boolean }) {
    const [revealed, setRevealed] = useState(false);

    const isRevealed = revealAll || revealed;

    return (
        <div className="border border-[var(--theme-primary)]/10 p-4 md:p-8 rounded-xl md:rounded-2xl bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="font-mono text-xs md:text-sm opacity-60">Q {index + 1} • {q.section}</div>
            </div>

            <div className="prose prose-sm dark:prose-invert font-sans max-w-none mb-4 md:mb-8 text-[12px] md:text-base leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                    {processLatex(q.text)}
                </ReactMarkdown>
            </div>

            <div className="space-y-3 mb-6">
                {q.options.map((opt: string, idx: number) => {
                    let optChar = opt;
                    const match = opt.match(/^([A-Da-d][.\)]?)\s*(.*)/);
                    if (match) optChar = match[1].replace(/[^a-zA-Z]/g, '').toUpperCase();
                    
                    const isCorrect = isRevealed && optChar === q.answer;

                    return (
                        <div 
                            key={idx} 
                            className={cn(
                                "px-3 py-2 md:px-4 md:py-3 border rounded-xl font-sans text-[12px] md:text-sm flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-0 transition-colors",
                                isCorrect ? "bg-[var(--color-success)]/10 border-[var(--color-success)] text-[var(--color-success)]" : "border-[var(--theme-muted)] opacity-80"
                            )}
                        >
                            <div className="[&>p]:m-0">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                                    {processLatex(opt)}
                                </ReactMarkdown>
                            </div>
                            {isCorrect && (
                                <div className="shrink-0 flex items-center justify-end font-bold uppercase text-[10px] terminal-font">
                                    Correct Response
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!revealAll && (
                <div className="flex justify-end">
                    <button 
                        onClick={() => setRevealed(!revealed)}
                        className="text-xs terminal-font uppercase underline opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                        {revealed ? "Hide Answer" : "Reveal Answer"}
                    </button>
                </div>
            )}

            {isRevealed && q.explanation && (
                <div className="mt-6 bg-[var(--theme-primary)]/5 p-4 md:p-6 rounded-xl border border-[var(--theme-primary)]/10 animate-fade-in">
                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-40 mb-3">Official Explanation</div>
                    <div className="prose prose-sm dark:prose-invert max-w-none font-sans">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                            {processLatex(q.explanation)}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
}
