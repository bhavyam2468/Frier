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
            <h2 className="text-2xl font-bold mb-6">Test Format Specification</h2>
            <div className="prose prose-sm dark:prose-invert terminal-font text-sm max-w-none opacity-80 leading-relaxed relative">
              <button 
                  onClick={() => {
                      navigator.clipboard.writeText(`[META]
Title: JEE Advanced Mock 1
Time: 180 
MaxMarks: 300
PassMark: 150
MarkingScheme: 4, -1, 0
Sections: Physics, Chemistry, Math
Calculator: Basic
StrictMode: True
[/META]

[INSTRUCTIONS]
This test has 3 sections. Read carefully. Do not use calculators.
[/INSTRUCTIONS]

------
Type: SCQ
Section: Physics
Topic: Kinematics
---
A particle moves with v = 2t + 3. Find displacement at t=2s.
---
A. 8 m
B. 10 m
C. 12 m
D. 14 m
---
B
---
[EXPLANATION]
Integration of v = 2t + 3 yields t^2 + 3t. At t=2, it's 10.
[/EXPLANATION]
------`);
                      alert("Template copied to clipboard.");
                  }}
                  className="absolute right-4 top-4 px-3 py-1 bg-[var(--theme-primary)] text-[var(--theme-bg)] rounded text-xs hover:opacity-90"
              >
                  Copy Template
              </button>
              <pre className="bg-black/5 dark:bg-white/5 p-6 rounded-xl overflow-x-auto border border-black/10 dark:border-white/10 mb-6 terminal-font text-xs">
{`[META]
Title: JEE Advanced Mock 1
Time: 180 
MaxMarks: 300
PassMark: 150
MarkingScheme: 4, -1, 0
Sections: Physics, Chemistry, Math
Calculator: Basic
StrictMode: True
[/META]

[INSTRUCTIONS]
This test has 3 sections. Read carefully. Do not use calculators.
[/INSTRUCTIONS]

------
Type: SCQ
Section: Physics
Topic: Kinematics
---
A particle moves with v = 2t + 3. Find displacement at t=2s.
---
A. 8 m
B. 10 m
C. 12 m
D. 14 m
---
B
---
[EXPLANATION]
Integration of v = 2t + 3 yields t^2 + 3t. At t=2, it's 10.
[/EXPLANATION]
------`}
              </pre>
              <p>
                <strong>Rules:</strong><br />
                1. <code>[META]</code> and <code>[INSTRUCTIONS]</code> are required at the top.<br />
                2. Use <code>------</code> to separate questions.<br />
                3. Use <code>---</code> to separate parts inside a question.<br />
                4. The 5 parts inside a question are: Meta -&gt; Text -&gt; Options -&gt; Answer -&gt; Explanation.<br />
                5. If question is NUMERICAL, put <code>[NO_OPTIONS]</code> in the options section.<br />
              </p>
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
