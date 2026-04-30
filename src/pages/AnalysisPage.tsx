import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTestStore } from "../store/testStore";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";

export default function AnalysisPage() {
  const store = useTestStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!store.test) navigate("/");
  }, [store.test, navigate]);

  if (!store.test) return null;

  // Calculate stats
  const { test, answers, timeSpent, status } = store;
  const { markingScheme, maxMarks, passMark } = test.metadata;

  let totalScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const questionStats = test.questions.map((q) => {
    const userAnswer = answers[q.id];
    let isCorrect = false;
    let isAttempted = !!userAnswer;

    if (isAttempted) {
      if (userAnswer === q.answer) {
        isCorrect = true;
        totalScore += markingScheme.correct;
        correctCount++;
      } else {
        totalScore += markingScheme.incorrect;
        incorrectCount++;
      }
    } else {
      totalScore += markingScheme.unattempted;
      unattemptedCount++;
    }

    return {
      ...q,
      userAnswer,
      isCorrect,
      isAttempted,
      timeSpent: timeSpent[q.id] || 0,
      status: status[q.id] || "NOT_VISITED"
    };
  });

  const avgTime = questionStats.reduce((acc, curr) => acc + curr.timeSpent, 0) / (test.questions.length || 1);
  const accuracy = correctCount + incorrectCount > 0 ? (correctCount / (correctCount + incorrectCount)) * 100 : 0;
  const isPassed = totalScore >= passMark;

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] flex flex-col p-6 gap-6 relative">
      
      {/* Navbar + Hero */}
      <header className="flex justify-between items-end border-b border-[var(--theme-muted)] pb-4 relative z-10 w-full max-w-7xl mx-auto mt-6">
        <div className="flex flex-col">
          <span className="terminal-font text-xs opacity-50 uppercase tracking-widest">Analysis Mode // {test.metadata.title}</span>
          <h1 className="text-4xl font-semibold tracking-tighter uppercase mt-1">Post-Test Diagnostics</h1>
        </div>
        <div className="flex gap-8 text-right">
          <div className="flex flex-col">
            <span className="text-xs uppercase opacity-50 font-sans">Final Score</span>
            <span className={cn("text-3xl font-bold", totalScore >= passMark ? "glow-green" : "glow-red")}>
              {totalScore}<span className="text-lg opacity-50">/{maxMarks}</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase opacity-50 font-sans">Accuracy</span>
            <span className="text-3xl font-bold tracking-tighter">{accuracy.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase opacity-50 font-sans">Attempted</span>
            <span className="text-3xl font-bold tracking-tighter">{correctCount + incorrectCount}/{test.questions.length}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 w-full max-w-7xl mx-auto pb-24">
          
          <section className="md:col-span-7 flex flex-col gap-6">
              {/* Scatterplot */}
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6 border border-black/10 dark:border-white/10">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 font-sans">Time-Bleed Scatterplot</h2>
                      <span className={cn("text-[10px] uppercase", totalScore >= passMark ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
                        Avg Time: {Math.round(avgTime)}s
                      </span>
                  </div>
                  <div className="chart-container">
                     <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid stroke="var(--theme-muted)" strokeOpacity={0.2} vertical={false} />
                            <XAxis type="number" dataKey="timeSpent" name="Time (s)" stroke="var(--theme-muted)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={(t) => `${t}s`} axisLine={false} tickLine={false} />
                            <YAxis type="number" dataKey="isCorrect" name="Status" stroke="var(--theme-muted)" domain={[-0.5, 1.5]} ticks={[0, 1]} tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => v === 1 ? 'Correct' : 'Incorrect'} axisLine={false} tickLine={false} />
                            <RechartsTooltip 
                                cursor={{ strokeDasharray: '3 3', stroke: 'var(--theme-muted)' }} 
                                content={({ payload }) => {
                                    if (payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-[var(--theme-bg)] border border-[var(--theme-muted)] p-3 text-xs terminal-font shadow-2xl">
                                                <div className="font-bold mb-1">Q {test.questions.findIndex((q:any) => q.id === data.id) + 1}</div>
                                                <div>{data.timeSpent}s spent</div>
                                                <div className={data.isCorrect ? "glow-green" : "glow-red"}>
                                                    {data.isAttempted ? (data.isCorrect ? "Correct" : "Incorrect") : "Unattempted"}
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine x={avgTime} stroke="var(--theme-muted)" strokeDasharray="3 3" />
                            <Scatter data={questionStats} shape={(props: any) => {
                                const { cx, cy, payload } = props;
                                if (payload.isCorrect) return <circle cx={cx} cy={cy} r={4} fill="var(--color-success)" className="opacity-80 drop-shadow-[0_0_5px_var(--color-success)]" />
                                return <circle cx={cx} cy={cy} r={4} fill="var(--color-danger)" className="opacity-80 drop-shadow-[0_0_5px_var(--color-danger)]" />
                            }} />
                        </ScatterChart>
                     </ResponsiveContainer>
                  </div>
              </div>

              {/* Granular Review */}
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6 border border-black/10 dark:border-white/10 flex-1">
                 <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 font-sans mb-4">Terminal Review</h2>
                 <div className="space-y-6">
                     {questionStats.map((q, i) => (
                         <ReviewItem key={q.id} q={q} index={i} test={test} />
                     ))}
                 </div>
              </div>
          </section>

          <section className="md:col-span-5 flex flex-col gap-6">
              {/* Grid Matrix */}
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6 border border-black/10 dark:border-white/10">
                  <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4 font-sans">The Matrix // {test.questions.length} Questions</h2>
                  <div className="matrix-grid">
                      {questionStats.map((q, i) => (
                          <div 
                            key={i} 
                            className={cn(
                                "aspect-square rounded-sm flex items-center justify-center relative cursor-pointer group transition-transform hover:scale-110",
                                q.isAttempted 
                                    ? (q.isCorrect ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]")
                                    : "border border-[var(--theme-primary)]"
                            )}
                            onClick={() => {
                                document.getElementById(`q-review-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          >
                               {(q.status === "MARKED" || q.status === "ANSWERED_MARKED") && (
                                    <div className={cn(
                                        "absolute inset-0",
                                        q.isAttempted ? "dog-ear" : "dog-ear-filled"
                                    )} />
                                )}
                              <span className="opacity-0 group-hover:opacity-100 terminal-font text-[10px] text-[var(--theme-bg)] font-bold transition-opacity absolute inset-0 flex justify-center items-center">
                                {i + 1}
                              </span>
                          </div>
                      ))}
                  </div>
                  <div className="mt-4 flex justify-between text-[10px] terminal-font opacity-40 uppercase">
                      <span>Correct [{correctCount}]</span>
                      <span>Wrong [{incorrectCount}]</span>
                      <span>Skipped [{unattemptedCount}]</span>
                  </div>
              </div>
          </section>
      </main>
    </div>
  );
}

function ReviewItem({ q, index, test }: any) {
    const [aiExpanded, setAiExpanded] = useState(false);
    const [aiResponse, setAiResponse] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const aiContainerRef = useRef<HTMLDivElement>(null);

    const askAI = async () => {
        setAiExpanded(true);
        if (aiResponse) return; // already generated
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const prompt = `
The user is taking a mock test. 
Question Data:
${q.text}

Options:
${q.options.join('\n')}

Correct Answer: ${q.answer}
User's Choice: ${q.userAnswer || "None"}
Time spent on this question: ${q.timeSpent} seconds.

Please diagnose exactly what mathematical or logical trap they fell into to get their answer instead of the correct one. Explain the correct path clearly and concisely. Act as a helpful data-driven tutor.
`;

            const responseStream = await ai.models.generateContentStream({
                model: "gemini-3.1-flash-lite-preview",
                contents: prompt,
            });

            let full = "";
            for await (const chunk of responseStream) {
                if (chunk.text) {
                    full += chunk.text;
                    setAiResponse(full);
                    // attempt to scroll down softly so user sees generating text
                    if (aiContainerRef.current) {
                        aiContainerRef.current.scrollTop = aiContainerRef.current.scrollHeight;
                    }
                }
            }
        } catch (e: any) {
            setAiResponse(`> [ERR] System Failure: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <div id={`q-review-${q.id}`} className="border border-[var(--theme-primary)]/10 p-6 md:p-10 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-6">
                <div className="font-mono text-sm opacity-60">Q {index + 1}</div>
                <div className="flex gap-4">
                    <span className="font-mono text-xs opacity-50 uppercase tracking-widest">{q.timeSpent}s</span>
                    <span className={cn(
                        "font-mono text-xs uppercase tracking-widest px-2 py-1",
                        q.isAttempted 
                            ? (q.isCorrect ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]")
                            : "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
                    )}>
                        {q.isAttempted ? (q.isCorrect ? "Correct" : "Incorrect") : "Unattempted"}
                    </span>
                </div>
            </div>

            <div className="prose prose-sm dark:prose-invert font-sans max-w-none mb-8">
                {q.text.split("\\n").map((line: string, idx: number) => <p key={idx}>{line}</p>)}
            </div>

            <div className="space-y-3 mb-8">
                {q.options.map((opt: string, idx: number) => {
                    let answerKey = opt;
                    const match = opt.match(/^([A-Da-d][.\)]?)\s*(.*)/);
                    if (match) answerKey = match[1].replace(/[^a-zA-Z]/g, '').toUpperCase();
                    
                    const isUserChoice = q.userAnswer === answerKey;
                    const isCorrectChoice = q.answer === answerKey;
                    
                    let statusClasses = "border-[var(--theme-primary)]/10 opacity-60";
                    if (isCorrectChoice) {
                        statusClasses = "border-[var(--color-success)] shadow-[0_0_15px_rgba(0,255,102,0.2)]";
                    } else if (isUserChoice && !q.isCorrect) {
                        statusClasses = "border-[var(--color-danger)] shadow-[0_0_15px_rgba(255,0,60,0.2)] line-through opacity-70";
                    } else if (!q.isCorrect && !isUserChoice && isCorrectChoice) {
                        statusClasses = "border-[var(--color-success)] border-dashed opacity-80"
                    }

                    return (
                        <div key={idx} className={cn("px-4 py-3 border rounded-xl font-sans text-sm flex items-center justify-between", statusClasses)}>
                            <span>{opt}</span>
                            {isCorrectChoice && <span className="text-[var(--color-success)] font-mono text-xs ml-4">✓ CORRECT</span>}
                            {isUserChoice && !q.isCorrect && <span className="text-[var(--color-danger)] font-mono text-xs ml-4">✗ YOU</span>}
                        </div>
                    );
                })}
            </div>

            {q.explanation && (
                <div className="bg-[var(--theme-primary)]/5 p-6 rounded-xl mb-6 border border-[var(--theme-primary)]/10">
                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-40 mb-3">Official Explanation</div>
                    <div className="prose prose-sm dark:prose-invert max-w-none font-sans">
                        <ReactMarkdown>{q.explanation}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* AI Diagnose Trigger */}
            <button 
                onClick={() => aiExpanded ? setAiExpanded(false) : askAI()}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest bg-[var(--theme-primary)] text-[var(--theme-bg)] px-4 py-2 hover:opacity-90 transition-opacity"
            >
                <Sparkles className="w-3 h-3" /> {aiExpanded ? "Close Diagnostic" : "Run AI Diagnostic"}
            </button>

            {/* AI Terminal Output */}
            {aiExpanded && (
                <div className="mt-4 bg-black rounded-2xl p-6 border border-white/20 flex flex-col overflow-hidden shadow-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                        <h2 className="text-xs font-bold uppercase tracking-widest terminal-font text-[var(--theme-primary)]">Gemini-3.1-Flash-Lite // Diagnostics</h2>
                    </div>
                    <div 
                        ref={aiContainerRef}
                        className="max-h-[300px] overflow-y-auto pr-4 prose prose-invert prose-sm terminal-font text-xs space-y-4 opacity-80"
                    >
                        {aiResponse ? (
                             <ReactMarkdown>{aiResponse}</ReactMarkdown>
                        ) : (
                            <span className="opacity-50 animate-pulse text-[var(--theme-primary)]">Initializing connection to AI matrix...</span>
                        )}
                        {isGenerating && <span className="inline-block w-2 h-4 bg-white/50 animate-pulse ml-1 align-middle" />}
                    </div>
                </div>
            )}
        </div>
    )
}
