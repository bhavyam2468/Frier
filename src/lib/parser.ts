import { v4 as uuidv4 } from "uuid";

export type QuestionType = "SCQ" | "MCQ" | "NUMERICAL" | "SUBJECTIVE";

export interface Question {
  id: string;
  type: QuestionType;
  section: string;
  topic?: string;
  text: string;
  options: string[]; // empty for numerical
  answer: string;
  explanation: string;
}

export interface TestMetadata {
  title: string;
  time: number; // in minutes
  maxMarks: number;
  passMark: number;
  markingScheme: { correct: number; incorrect: number; unattempted: number };
  sections: string[];
  calculator: "Basic" | "Scientific" | "None";
  strictMode: boolean;
  instantFeedback: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface ParsedTest {
  id: string;
  metadata: TestMetadata;
  instructions: string;
  questions: Question[];
}

export class ParseError extends Error {
  constructor(message: string, public lineIndex?: number) {
    super(message);
    this.name = "ParseError";
  }
}

export function parseMockTest(content: string): ParsedTest {
  const lines = content.split(/\r?\n/);
  
  let metadataStr = "";
  let instructionsStr = "";
  let questionsData: string[] = [];
  
  let currentBlock = "";
  let currentQuestionsStr = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "[META]") {
      currentBlock = "META";
      continue;
    } else if (line.trim() === "[/META]") {
      currentBlock = "";
      continue;
    } else if (line.trim() === "[INSTRUCTIONS]") {
      currentBlock = "INSTRUCTIONS";
      continue;
    } else if (line.trim() === "[/INSTRUCTIONS]") {
      currentBlock = "";
      continue;
    }

    if (currentBlock === "META") {
      metadataStr += line + "\n";
    } else if (currentBlock === "INSTRUCTIONS") {
      instructionsStr += line + "\n";
    } else if (currentBlock === "") {
      currentQuestionsStr += line + "\n";
    }
  }

  const metadata = parseMetadata(metadataStr);
  const instructions = instructionsStr.trim();
  
  // Parse questions
  const rawQuestions = currentQuestionsStr.split(/^------\s*$/m).filter(q => q.trim().length > 0);
  const questions: Question[] = rawQuestions.map((qStr, qIndex) => {
    try {
      return parseQuestion(qStr, qIndex);
    } catch (e: any) {
      throw new ParseError(`Failed to parse Question ${qIndex + 1}: ${e.message}`);
    }
  });

  return {
    id: uuidv4(),
    metadata,
    instructions,
    questions,
  };
}

function parseMetadata(metaStr: string): TestMetadata {
  const meta: any = {};
  metaStr.split("\n").forEach(line => {
    if (!line.trim()) return;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const key = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();
    meta[key] = value;
  });

  const parsed: TestMetadata = {
    title: meta.title || "Untitled Mock Test",
    time: parseInt(meta.time) || 180,
    maxMarks: parseInt(meta.maxmarks) || 300,
    passMark: parseInt(meta.passmark) || 0,
    markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
    sections: meta.sections ? meta.sections.split(",").map((s: string) => s.trim()) : [],
    calculator: "None",
    strictMode: meta.strictmode?.toLowerCase() === "true",
    instantFeedback: meta.instantfeedback?.toLowerCase() === "true",
    shuffleQuestions: meta.shufflequestions?.toLowerCase() === "true",
    shuffleOptions: meta.shuffleoptions?.toLowerCase() === "true",
  };

  if (meta.maxmarks) parsed.maxMarks = parseInt(meta.maxmarks);
  
  if (meta.markingscheme) {
    const parts = meta.markingscheme.split(",").map((s: string) => parseFloat(s.trim()));
    parsed.markingScheme = {
      correct: parts[0] || 0,
      incorrect: parts[1] || 0,
      unattempted: parts[2] || 0,
    };
  }

  if (meta.calculator && ["Basic", "Scientific", "None"].includes(meta.calculator)) {
    parsed.calculator = meta.calculator as "Basic" | "Scientific" | "None";
  }

  return parsed;
}

function parseQuestion(qStr: string, index: number): Question {
  const parts = qStr.split(/^---\s*$/m).map(p => p.trim());
  
  if (parts.length < 5) {
    throw new Error(`Invalid format. Expected 5 parts separated by "---", found ${parts.length}`);
  }

  // Part 0: Meta (Type, Section, Tags, etc)
  const metaLines = parts[0].split("\n");
  let type: QuestionType = "SCQ";
  let section = "";
  let topic = "";

  metaLines.forEach(line => {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const key = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();
    if (key === "type") type = value.toUpperCase() as QuestionType;
    if (key === "section") section = value;
    if (key === "topic" || key === "tags") topic = value;
  });

  const text = parts[1];
  
  // Part 2: Options
  let options: string[] = [];
  if (parts[2] !== "[NO_OPTIONS]") {
    options = parts[2].split("\n").filter(o => o.trim().length > 0);
  }

  const answer = parts[3];
  
  let explanation = parts[4];
  if (explanation.startsWith("[EXPLANATION]")) {
    explanation = explanation.replace("[EXPLANATION]", "");
  }
  if (explanation.endsWith("[/EXPLANATION]")) {
    explanation = explanation.replace("[/EXPLANATION]", "");
  }
  explanation = explanation.trim();

  return {
    id: uuidv4(),
    type,
    section,
    topic,
    text,
    options,
    answer,
    explanation
  };
}
