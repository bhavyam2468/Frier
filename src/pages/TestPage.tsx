import React, { useEffect, useState, useRef } from "react";
import { useTestStore } from "../store/testStore";
import { useNavigate } from "react-router-dom";
import { cn, processLatex } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function TestPage() {
  const store = useTestStore();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  useEffect(() => {
    if (!store.test) {
      navigate("/");
      return;
    }
  }, [store.test, navigate]);

  // Keyboard Shortcuts & Timer
  useEffect(() => {
    if (!store.isTestActive) return;

    const testTimer = setInterval(() => {
      const remaining = store.timeRemaining - 1;
      if (remaining <= 0) {
        clearInterval(testTimer);
        submitAct();
      } else {
        store.setTimeRemaining(remaining);
        const currentQ = store.test?.questions[store.currentQuestionIndex];
        if (currentQ) {
            store.incrementTime(currentQ.id);
        }
      }
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent default actions for specific keys to act as hotkeys without scrolling
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        const currentQ = store.test?.questions[store.currentQuestionIndex];
        if (!currentQ) return;

        switch (e.key) {
            case "ArrowRight":
            case "n":
            case "N":
                if (store.currentQuestionIndex < (store.test?.questions.length || 0) - 1) {
                    store.setCurrentQuestion(store.currentQuestionIndex + 1);
                }
                break;
            case "ArrowLeft":
            case "p":
            case "P":
                if (store.currentQuestionIndex > 0) {
                    store.setCurrentQuestion(store.currentQuestionIndex - 1);
                }
                break;
            case "m":
            case "M":
                const currStatus = store.status[currentQ.id];
                if (currStatus === "ANSWERED") store.setStatus(currentQ.id, "ANSWERED_MARKED");
                else if (currStatus === "ANSWERED_MARKED") store.setStatus(currentQ.id, "ANSWERED");
                else if (currStatus === "VISITED_UNANSWERED") store.setStatus(currentQ.id, "MARKED");
                else if (currStatus === "MARKED") store.setStatus(currentQ.id, "VISITED_UNANSWERED");
                break;
            case "Backspace":
                store.clearAnswer(currentQ.id);
                break;
            case "1": case "2": case "3": case "4":
            case "a": case "b": case "c": case "d":
            case "A": case "B": case "C": case "D":
                if (currentQ.options.length > 0) {
                    let optIndex = -1;
                    if (["1","a","A"].includes(e.key)) optIndex = 0;
                    if (["2","b","B"].includes(e.key)) optIndex = 1;
                    if (["3","c","C"].includes(e.key)) optIndex = 2;
                    if (["4","d","D"].includes(e.key)) optIndex = 3;
                    
                    if (optIndex >= 0 && optIndex < currentQ.options.length) {
                        const optText = currentQ.options[optIndex];
                        // Get prefix like "A." or just the option itself
                        let answerKey = optText;
                        const match = optText.match(/^([A-Da-d][.\)]?)\s*(.*)/);
                        if (match) answerKey = match[1].replace(/[^a-zA-Z]/g, '').toUpperCase();
                        store.setAnswer(currentQ.id, answerKey);
                    }
                }
                break;
        }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
        clearInterval(testTimer);
        window.removeEventListener("keydown", handleKeyDown);
    };
  }, [store]);

  const submitAct = () => {
    store.submitTest();
    navigate("/analysis");
  }

  if (!store.test) return null;

  if (!store.isTestActive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--theme-bg)] p-6">
        <div className="max-w-2xl w-full border border-[var(--theme-primary)]/20 p-8 md:p-12 rounded-2xl bg-black/5 dark:bg-white/5 font-sans relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--theme-primary)] opacity-5 blur-[100px] pointer-events-none" />
             
             <div className="terminal-font text-xs uppercase tracking-widest opacity-50 mb-2">Pre-Flight Check</div>
             <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">
               {store.test.metadata.title}
             </h1>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                <div className="flex flex-col gap-1 border-l-2 border-[var(--theme-primary)] pl-4">
                   <span className="text-[10px] uppercase font-bold opacity-50 terminal-font tracking-widest">Questions</span>
                   <span className="text-2xl font-bold">{store.test.questions.length}</span>
                </div>
                <div className="flex flex-col gap-1 border-l-2 border-[var(--theme-primary)] pl-4">
                   <span className="text-[10px] uppercase font-bold opacity-50 terminal-font tracking-widest">Time Alotted</span>
                   <span className="text-2xl font-bold">{store.test.metadata.time}m</span>
                </div>
                <div className="flex flex-col gap-1 border-l-2 border-[var(--theme-primary)] pl-4">
                   <span className="text-[10px] uppercase font-bold opacity-50 terminal-font tracking-widest">Max Marks</span>
                   <span className="text-2xl font-bold">{store.test.metadata.maxMarks}</span>
                </div>
             </div>

             <div className="prose prose-sm dark:prose-invert font-sans mb-12 opacity-80 max-w-none">
                 <p className="font-bold">Instructions:</p>
                 <div className="whitespace-pre-wrap">{store.test.instructions || "No specific instructions provided for this test."}</div>
             </div>

             <button 
                onClick={() => store.startTest()}
                className="w-full py-4 bg-[var(--theme-primary)] text-[var(--theme-bg)] font-bold uppercase tracking-widest text-sm rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98] shadow-xl shadow-[var(--theme-primary)]/20 cursor-pointer"
             >
                Start Test Sequence
             </button>
        </div>
      </div>
    );
  }

  const currentQ = store.test.questions[store.currentQuestionIndex];
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOptionClick = (optText: string) => {
    let answerKey = optText;
    const match = optText.match(/^([A-Da-d][.\)]?)\s*(.*)/);
    if (match) answerKey = match[1].replace(/[^a-zA-Z]/g, '').toUpperCase();
    store.setAnswer(currentQ.id, answerKey);
  };

  const handleClearAnswer = () => {
      store.clearAnswer(currentQ.id);
  }

  const toggleMark = () => {
      const currStatus = store.status[currentQ.id];
      if (currStatus === "ANSWERED") store.setStatus(currentQ.id, "ANSWERED_MARKED");
      else if (currStatus === "ANSWERED_MARKED") store.setStatus(currentQ.id, "ANSWERED");
      else if (currStatus === "VISITED_UNANSWERED") store.setStatus(currentQ.id, "MARKED");
      else if (currStatus === "MARKED") store.setStatus(currentQ.id, "VISITED_UNANSWERED");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--theme-primary)] flex items-center justify-between px-3 md:px-6 shrink-0 relative z-10 w-full overflow-hidden">
        <div className="font-mono text-[10px] md:text-sm tracking-widest uppercase flex items-center gap-2 md:gap-4 min-w-0 flex-1 pr-2">
            <span className="flex items-center min-w-0 overflow-hidden">
                <span className="truncate hidden sm:inline-block">{store.test.metadata.title}</span>
                <span className="opacity-40 mx-2 shrink-0 hidden sm:inline-block">|</span>
                <span className="truncate">{currentQ.section}</span>
            </span>
            <button 
               onClick={() => setShowInstructions(true)}
               className="hidden md:inline-block px-2 py-0.5 border border-current text-[10px] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-bg)] transition-colors opacity-70 shrink-0"
            >
               Instructions
            </button>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button 
               onClick={() => setShowInstructions(true)}
               className="md:hidden px-2 py-0.5 border border-current text-[10px] uppercase font-mono tracking-widest hover:bg-[var(--theme-primary)] hover:text-[var(--theme-bg)] transition-colors opacity-70 shrink-0"
            >
               Instr
            </button>
            <div className="font-mono text-base md:text-lg font-semibold tracking-widest opacity-80">
                {formatTime(store.timeRemaining)}
            </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Question */}
        <div className="flex-1 overflow-y-auto p-4 md:p-12 pb-32 flex flex-col">
            <div className="mb-6 md:mb-8 flex items-center justify-between">
                <h2 className="text-lg md:text-3xl font-mono font-bold">
                    Q {store.currentQuestionIndex + 1} <span className="opacity-30 text-xs md:text-sm ml-1 md:ml-2 font-sans">/ {store.test.questions.length}</span>
                </h2>
                <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs font-mono uppercase tracking-widest opacity-60">
                    <button onClick={toggleMark} className="hover:opacity-100 flex items-center gap-1.5 md:gap-2">
                        <span className="w-2 h-2 rounded-full border border-current flex items-center justify-center">
                            {(store.status[currentQ.id]?.includes("MARKED")) && <div className="w-1 h-1 bg-current rounded-full" />}
                        </span>
                        Mark
                    </button>
                    <button onClick={handleClearAnswer} className="hover:opacity-100 uppercase">Clear</button>
                </div>
            </div>

            <div className="prose prose-sm md:prose-lg dark:prose-invert max-w-4xl font-sans mb-6 md:mb-12">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                    {processLatex(currentQ.text)}
                </ReactMarkdown>
            </div>

            {/* Options */}
            <div className="space-y-3 md:space-y-4 max-w-2xl mb-8 md:mb-12 mt-auto">
                {currentQ.options.length > 0 ? (
                    currentQ.options.map((opt, i) => {
                        let answerKey = opt;
                        const match = opt.match(/^([A-Da-d][.\)]?)\s*(.*)/);
                        if (match) answerKey = match[1].replace(/[^a-zA-Z]/g, '').toUpperCase();
                        
                        const isSelected = store.answers[currentQ.id] === answerKey;
                        
                        return (
                            <button
                                key={i}
                                onClick={() => handleOptionClick(opt)}
                                className={cn(
                                    "w-full text-left p-3 md:p-4 rounded-xl border flex items-center gap-3 md:gap-4 transition-all duration-200 group text-sm md:text-base",
                                    isSelected 
                                        ? "border-[var(--theme-primary)] border-[3px] shadow-sm transform scale-[1.01]" 
                                        : "border-[var(--theme-primary)]/20 hover:border-[var(--theme-primary)]"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 md:w-6 md:h-6 rounded-full border border-[var(--theme-primary)] shrink-0 flex items-center justify-center transition-all",
                                    isSelected ? "bg-[var(--theme-primary)] opacity-100" : "opacity-30 group-hover:opacity-100"
                                )}>
                                    {isSelected && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--theme-bg)]" />}
                                </div>
                                <span className={cn("font-sans [&>p]:m-0", isSelected ? "font-semibold" : "")}>
                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                                        {processLatex(opt)}
                                    </ReactMarkdown>
                                </span>
                            </button>
                        )
                    })
                ) : (
                    <div className="w-full">
                        <p className="opacity-50 text-sm font-mono mb-2 uppercase tracking-tight">Numerical Answer</p>
                        <input 
                            type="text"
                            value={store.answers[currentQ.id] || ""}
                            onChange={(e) => store.setAnswer(currentQ.id, e.target.value)}
                            className="bg-transparent border-b-2 border-[var(--theme-primary)]/30 focus:border-[var(--theme-primary)] outline-none font-mono text-2xl py-2 w-full max-w-xs transition-colors"
                            placeholder="Type value..."
                        />
                    </div>
                )}
            </div>

        </div>

        {/* Right Side: Palette Desktop */}
        <div className="hidden md:flex flex-col w-[35%] lg:w-[30%] border-l border-[var(--theme-primary)]/20 p-6 shrink-0 bg-black/5 dark:bg-white/5">
            <h3 className="font-mono text-xs uppercase tracking-widest opacity-50 mb-6">Question Palette</h3>
            
            <div className="grid grid-cols-5 gap-3 mb-auto">
                {store.test.questions.map((q, i) => {
                    const st = store.status[q.id] || "NOT_VISITED";
                    const isCurrent = store.currentQuestionIndex === i;
                    
                    return (
                        <button
                            key={i}
                            onClick={() => store.setCurrentQuestion(i)}
                            className={cn(
                                "aspect-square rounded-sm relative w-full flex items-center justify-center terminal-font text-xs transition-all",
                                st === "NOT_VISITED" ? "border border-dashed border-[var(--theme-primary)]/40 opacity-70" : "",
                                st === "VISITED_UNANSWERED" ? "border border-[var(--theme-primary)]/50" : "",
                                st === "ANSWERED" ? "bg-[var(--theme-primary)] text-[var(--theme-bg)]" : "",
                                st === "MARKED" ? "border border-[var(--theme-primary)]" : "",
                                st === "ANSWERED_MARKED" ? "bg-[var(--theme-primary)] text-[var(--theme-bg)]" : "",
                                isCurrent ? "ring-2 ring-[var(--theme-primary)] ring-offset-2 ring-offset-[var(--theme-bg)]" : "hover:border-[var(--theme-primary)]"
                            )}
                        >
                            {(st === "MARKED" || st === "ANSWERED_MARKED") && (
                                <div className={cn(
                                    "absolute inset-0", 
                                    st === "ANSWERED_MARKED" ? "dog-ear" : "dog-ear-filled"
                                )} />
                            )}
                            {i + 1}
                        </button>
                    )
                })}
            </div>

            {/* Legend & Submit */}
            <div className="mt-8 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-xs terminal-font opacity-70">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 border border-dashed border-current opacity-50"/> Not Visited</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 border border-solid border-current"/> Unanswered</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-current"/> Answered</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 border border-solid border-[var(--theme-primary)] relative dog-ear-filled"/> Marked</div>
                </div>

                <div className="w-full h-[1px] bg-[var(--theme-primary)]/20" />

                <div className="flex gap-4">
                    <button 
                        onClick={() => store.setCurrentQuestion(Math.max(0, store.currentQuestionIndex - 1))}
                        className="flex-1 py-3 border border-[var(--theme-primary)]/20 uppercase tracking-widest text-xs hover:bg-[var(--theme-primary)] hover:text-[var(--theme-bg)] transition-colors"
                    >
                        Prev
                    </button>
                    <button 
                        onClick={() => store.setCurrentQuestion(Math.min(store.test!.questions.length - 1, store.currentQuestionIndex + 1))}
                        className="flex-1 py-3 border border-[var(--theme-primary)]/20 uppercase tracking-widest text-xs hover:bg-[var(--theme-primary)] hover:text-[var(--theme-bg)] transition-colors"
                    >
                        Next
                    </button>
                </div>

                <button 
                    onClick={submitAct}
                    className="w-full py-4 bg-[var(--theme-primary)] text-[var(--theme-bg)] uppercase tracking-widest font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center relative overflow-hidden group"
                >
                    <span className="relative z-10 block">Submit Test</span>
                </button>
            </div>
        </div>

      </div>

      {/* Bottom Shortcuts Bar */}
      <div className="h-10 border-t border-[var(--theme-primary)]/20 hidden md:flex items-center justify-center gap-6 font-mono text-[10px] uppercase tracking-widest opacity-50 shrink-0">
          <span>[1-4] Select Option</span>
          <span>[M] Toggle Mark</span>
          <span>[N] Next</span>
          <span>[P] Prev</span>
          <span>[Backspace] Clear</span>
      </div>

      {/* Mobile Bottom Bar & Palette Drawer Trigger */}
      <div className="md:hidden h-16 border-t border-[var(--theme-primary)]/20 flex items-center justify-between px-4 shrink-0 bg-[var(--theme-bg)] z-40 relative">
          <button 
              onClick={() => store.setCurrentQuestion(Math.max(0, store.currentQuestionIndex - 1))}
              className="p-2 uppercase font-mono text-xs tracking-widest opacity-70"
          >
              Prev
          </button>
          <button 
              onClick={() => {
                  const el = document.getElementById('mobile-palette');
                  if (el) el.classList.toggle('translate-y-full');
              }}
              className="flex flex-col gap-1 items-center justify-center w-12 h-8"
          >
              <div className="w-8 h-1 rounded-full bg-[var(--theme-primary)]/40" />
              <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Grid</span>
          </button>
          <button 
              onClick={() => store.setCurrentQuestion(Math.min(store.test!.questions.length - 1, store.currentQuestionIndex + 1))}
              className="p-2 uppercase font-mono text-xs tracking-widest opacity-70"
          >
              Next
          </button>
      </div>

      {/* Mobile Palette Drawer */}
      <div 
        id="mobile-palette" 
        className="md:hidden fixed inset-x-0 bottom-0 top-[10vh] bg-[var(--theme-bg)] z-50 transform translate-y-full transition-transform duration-300 ease-spring border-t-2 border-[var(--theme-primary)] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] flex flex-col"
      >
          <div className="w-full h-12 flex items-center justify-center border-b border-[var(--theme-primary)]/10 shrink-0">
             <button onClick={() => {
                  const el = document.getElementById('mobile-palette');
                  if (el) el.classList.add('translate-y-full');
              }} className="w-full h-full flex justify-center items-center">
                 <div className="w-12 h-1.5 rounded-full bg-[var(--theme-primary)]/30" />
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              <h3 className="font-mono text-xs uppercase tracking-widest opacity-50 mb-6">Question Palette</h3>
              
              <div className="grid grid-cols-6 gap-3 mb-8">
                  {store.test.questions.map((q, i) => {
                      const st = store.status[q.id] || "NOT_VISITED";
                      const isCurrent = store.currentQuestionIndex === i;
                      
                      return (
                          <button
                              key={i}
                              onClick={() => {
                                  store.setCurrentQuestion(i);
                                  document.getElementById('mobile-palette')?.classList.add('translate-y-full');
                              }}
                              className={cn(
                                  "aspect-square relative w-full flex items-center justify-center font-mono text-xs transition-all",
                                  st === "NOT_VISITED" ? "border border-dashed border-[var(--theme-primary)]/40 opacity-70" : "",
                                  st === "VISITED_UNANSWERED" ? "border border-[var(--theme-primary)]/50" : "",
                                  st === "ANSWERED" ? "bg-[var(--theme-primary)] text-[var(--theme-bg)]" : "",
                                  st === "MARKED" ? "border border-[var(--theme-primary)]" : "",
                                  st === "ANSWERED_MARKED" ? "bg-[var(--theme-primary)] text-[var(--theme-bg)]" : "",
                                  isCurrent ? "ring-2 ring-[var(--theme-primary)] ring-offset-2 ring-offset-[var(--theme-bg)]" : "hover:border-[var(--theme-primary)]"
                              )}
                          >
                              {(st === "MARKED" || st === "ANSWERED_MARKED") && (
                                  <div className={cn(
                                      "absolute top-0 right-0 w-3 h-3 border-b border-l border-[var(--theme-primary)] transition-all",
                                      st === "ANSWERED_MARKED" ? "bg-[var(--theme-bg)]" : "bg-[var(--theme-primary)]"
                                  )} />
                              )}
                              {i + 1}
                          </button>
                      )
                  })}
              </div>

              <div className="mt-auto space-y-4 pt-6 border-t border-[var(--theme-primary)]/10">
                   <div className="grid grid-cols-2 gap-4 text-xs font-mono opacity-70 mb-4">
                      <div className="flex items-center gap-2"><div className="w-4 h-4 border border-dashed border-current opacity-50"/> Not Visited</div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 border border-solid border-current"/> Unanswered</div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 bg-current"/> Answered</div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 border border-solid border-current relative"><div className="absolute top-0 right-0 w-2 h-2 bg-current"/></div> Marked</div>
                  </div>
                  <button 
                      onClick={submitAct}
                      className="w-full py-4 bg-[var(--theme-primary)] text-[var(--theme-bg)] uppercase tracking-widest font-bold text-sm"
                  >
                      Submit Test
                  </button>
              </div>
          </div>
      </div>
      
      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--theme-bg)] border border-[var(--theme-primary)]/20 shadow-2xl p-8 max-w-2xl w-full rounded-2xl relative max-h-[85vh] overflow-hidden flex flex-col">
                <button 
                    onClick={() => setShowInstructions(false)}
                    className="absolute top-6 right-6 opacity-50 hover:opacity-100 font-mono text-xl"
                >
                    &times;
                </button>
                <div className="terminal-font text-xs uppercase tracking-widest opacity-50 mb-2">Test Info</div>
                <h2 className="text-2xl font-bold tracking-tight mb-6">Instructions</h2>
                <div className="overflow-y-auto flex-1 font-sans prose prose-sm dark:prose-invert opacity-80 pr-4">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                        {processLatex(store.test.instructions) || "No specific instructions provided for this test."}
                    </ReactMarkdown>
                </div>
                <div className="mt-8 pt-4 border-t border-[var(--theme-primary)]/10 shrink-0 flex justify-end">
                    <button 
                        onClick={() => setShowInstructions(false)}
                        className="px-6 py-2 bg-[var(--theme-primary)] text-[var(--theme-bg)] uppercase tracking-widest text-xs font-bold rounded-full hover:opacity-90"
                    >
                        Resume Test
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
