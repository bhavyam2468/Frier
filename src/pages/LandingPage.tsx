import React, { useState } from "react";
import { parseMockTest, ParseError } from "../lib/parser";
import { useTestStore } from "../store/testStore";
import { useNavigate } from "react-router-dom";
import { Play, FileText, AlertCircle, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function LandingPage() {
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const setTest = useTestStore((s) => s.setTest);
  const navigate = useNavigate();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const test = parseMockTest(content);
        setTest(test);
        setError(null);
        navigate("/test");
      } catch (err: any) {
        setError(err.message || "Failed to parse the file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Brand */}
      <h1 className="text-4xl md:text-6xl font-sans tracking-tighter mb-2 text-center uppercase">
        Mock Test Engine
      </h1>
      <p className="opacity-60 mb-12 text-sm md:text-base text-center max-w-md">
        Upload a structured text file. Take a distraction-free test. Analyze the bleed.
      </p>

      {/* Dropzone */}
      <div className="w-full max-w-2xl border-2 border-dashed border-[var(--theme-primary)] rounded-2xl p-12 flex flex-col items-center justify-center transition-all hover:bg-[var(--theme-primary)]/5 relative">
        <input
          type="file"
          accept=".txt"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileUpload}
        />
        <FileText className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-xl font-medium mb-2">Select or drop a .txt file</p>
        <p className="opacity-50 text-sm">Must follow the MTE Markdown format.</p>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 p-4 border border-[#FF003C] text-[#FF003C] rounded-lg max-w-2xl w-full bg-[#FF003C]/5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm terminal-font">{error}</div>
        </div>
      )}

      {/* Button to read Instructions */}
      <button
        onClick={() => setShowInstructions(true)}
        className="mt-12 text-sm uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity border-b border-current pb-1"
      >
        How to format the test file?
      </button>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--theme-bg)] w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-[var(--theme-primary)]/20 shadow-2xl p-8 relative">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            >
              <Trash2 className="w-5 h-5" /> {/* Just using as a close icon to be brutalist if desired, let's use a simple X but I don't have X imported, let's just make it text */} 
            </button>
            <h2 className="text-2xl font-bold mb-2">Create a Mock Test with AI</h2>
            <p className="mb-6 opacity-70">If you want to create a mock test, go to any AI chatbot out there (Preferred Perplexity or ChatGPT), write the exam name, and under that paste the prompt below.</p>
            <div className="prose prose-sm dark:prose-invert terminal-font text-sm max-w-none opacity-80 leading-relaxed relative">
              <div className="p-6 bg-[var(--theme-primary)]/5 rounded-xl border border-[var(--theme-primary)]/10 font-sans">
                <p className="mb-4 text-sm leading-relaxed">Click the button below to copy the advanced generation prompt. It contains strict formatting instructions so the AI generates a file that works perfectly with this mock test engine.</p>
                <div className="relative">
                  <button 
                      onClick={() => {
                          const promptText = `I want to create a mock test for the exam named above. 
First, research this exam in depth: its syllabus, pattern, difficulty level, typical duration, maximum marks, and marking scheme (positive and negative marks).

Then, generate a full, realistic mock test for this exam.

You MUST format the entire mock test EXACTLY following the strict specification below, because it will be parsed by a custom testing engine.

FORMAT SPECIFICATION:
1. The file must start with a [META] block and an [INSTRUCTIONS] block.
2. Each question is separated by exactly '------' on a new line.
3. Inside each question, there are exactly 5 parts separated by '---' on a new line.
4. The 5 parts are, in strict order:
   - Part 1: Meta data for the question (Type, Section, Topic).
   - Part 2: The question text.
   - Part 3: The options (one per line). If the question is numerical/subjective, write [NO_OPTIONS].
   - Part 4: The correct answer (e.g., A, B, C, D, or the numerical value).
   - Part 5: The explanation, wrapped in [EXPLANATION] and [/EXPLANATION] tags.
5. Use LaTeX formatting for all mathematical equations, formulas, and symbols. Wrap inline math with \`$\` and block math with \`$$\`.

YOUR FINAL RESPONSE TO ME:
After generating the mock test in this format, you must:
1. Provide the output either as a downloadable .txt file, OR in a single plain text code block.
2. Instruct me (the user) to save this as a .txt file if you provided a code block.
3. Explicitly tell me to go to the website 'https://frier.vercel.app' and upload this .txt file to take the mock test and see my detailed analysis.
4. Keep your conversational text separate from the mock test format block so I can easily copy just the test data.

Here is the exact template/example to follow for the format:

[META]
Title: [Generated Exam Title]
Time: [Duration in minutes]
MaxMarks: [Maximum Marks]
PassMark: [Passing Marks]
MarkingScheme: [Correct Marks], [Incorrect Marks], 0
Sections: [Comma separated section names]
Calculator: [Basic / Scientific / None]
StrictMode: True
[/META]

[INSTRUCTIONS]
[Provide brief instructions based on the exam's real rules]
[/INSTRUCTIONS]

------
Type: SCQ
Section: Physics
Topic: Kinematics
---
A particle moves in a straight line with velocity v = 2t + 3. Find displacement at t=2s.
---
A. 8 m
B. 10 m
C. 12 m
D. 14 m
---
B
---
[EXPLANATION]
Integration of v = 2t + 3 yields t^2 + 3t. Substituting t=2 gives 4 + 6 = 10.
[/EXPLANATION]
------
Type: NUMERICAL
Section: Chemistry
Topic: Mole Concept
---
How many moles are in 18g of H2O?
---
[NO_OPTIONS]
---
1
---
[EXPLANATION]
Molar mass of water is 18g/mol. 18/18 = 1.
[/EXPLANATION]
------`;
                          navigator.clipboard.writeText(promptText);
                          alert("AI Prompt copied to clipboard! Try pasting it in Perplexity or ChatGPT.");
                      }}
                      className="w-full py-4 text-center bg-[var(--theme-primary)] text-[var(--theme-bg)] rounded-xl text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer shadow-xl shadow-[var(--theme-primary)]/20"
                  >
                      Copy Complete AI Prompt
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
               <button 
                onClick={() => setShowInstructions(false)}
                className="px-6 py-2 bg-[var(--theme-primary)] text-[var(--theme-bg)] uppercase tracking-widest text-xs rounded-full font-bold"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
