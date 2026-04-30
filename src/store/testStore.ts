import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ParsedTest } from "../lib/parser";

export type QuestionStateStr = "NOT_VISITED" | "VISITED_UNANSWERED" | "ANSWERED" | "MARKED" | "ANSWERED_MARKED";

export interface TestState {
  // Test Data
  test: ParsedTest | null;
  setTest: (test: ParsedTest) => void;
  
  // Real-time tracking
  currentQuestionIndex: number;
  setCurrentQuestion: (index: number) => void;
  
  answers: Record<string, string>;
  setAnswer: (questionId: string, answer: string) => void;
  clearAnswer: (questionId: string) => void;
  
  status: Record<string, QuestionStateStr>;
  setStatus: (questionId: string, state: QuestionStateStr) => void;
  
  timeSpent: Record<string, number>;
  incrementTime: (questionId: string) => void;
  
  timeRemaining: number;
  setTimeRemaining: (time: number) => void;

  isTestActive: boolean;
  startTest: () => void;
  submitTest: () => void;
  
  // Reset for a new test
  reset: () => void;
}

export const useTestStore = create<TestState>()(
  persist(
    (set, get) => ({
      test: null,
      setTest: (test) => set({ 
        test, 
        currentQuestionIndex: 0, 
        answers: {}, 
        status: {}, 
        timeSpent: {}, 
        timeRemaining: test.metadata.time * 60,
        isTestActive: false
      }),

      currentQuestionIndex: 0,
      setCurrentQuestion: (index) => {
        const { test, status, currentQuestionIndex } = get();
        if (!test) return;
        
        // update status of current question if not answered
        const currQ = test.questions[currentQuestionIndex];
        if (currQ) {
          const currStatus = status[currQ.id] || "NOT_VISITED";
          if (currStatus === "NOT_VISITED") {
            set((state) => ({
              status: { ...state.status, [currQ.id]: "VISITED_UNANSWERED" }
            }));
          }
        }

        // update new question status
        const targetQ = test.questions[index];
        if (targetQ) {
          const targetStatus = status[targetQ.id] || "NOT_VISITED";
          if (targetStatus === "NOT_VISITED") {
            set((state) => ({
              status: { ...state.status, [targetQ.id]: "VISITED_UNANSWERED" }
            }));
          }
        }
        
        set({ currentQuestionIndex: index });
      },

      answers: {},
      setAnswer: (questionId, answer) => set((state) => {
        const currentStatus = state.status[questionId];
        let nextStatus: QuestionStateStr = "ANSWERED";
        if (currentStatus === "MARKED" || currentStatus === "ANSWERED_MARKED") {
          nextStatus = "ANSWERED_MARKED";
        }
        return {
          answers: { ...state.answers, [questionId]: answer },
          status: { ...state.status, [questionId]: nextStatus }
        };
      }),
      clearAnswer: (questionId) => set((state) => {
        const newAnswers = { ...state.answers };
        delete newAnswers[questionId];
        
        const currentStatus = state.status[questionId];
        let nextStatus: QuestionStateStr = "VISITED_UNANSWERED";
        if (currentStatus === "ANSWERED_MARKED") {
          nextStatus = "MARKED";
        }

        return {
          answers: newAnswers,
          status: { ...state.status, [questionId]: nextStatus }
        };
      }),

      status: {},
      setStatus: (questionId, newStatus) => set((state) => ({
        status: { ...state.status, [questionId]: newStatus }
      })),

      timeSpent: {},
      incrementTime: (questionId) => set((state) => ({
        timeSpent: { ...state.timeSpent, [questionId]: (state.timeSpent[questionId] || 0) + 1 }
      })),

      timeRemaining: 0,
      setTimeRemaining: (time) => set({ timeRemaining: time }),

      isTestActive: false,
      startTest: () => set({ isTestActive: true }),
      submitTest: () => set({ isTestActive: false }),

      reset: () => set({ 
        test: null, 
        currentQuestionIndex: 0, 
        answers: {}, 
        status: {}, 
        timeSpent: {}, 
        timeRemaining: 0,
        isTestActive: false
      }),
    }),
    {
      name: "mock-test-storage",
      partialize: (state) => ({
        test: state.test,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        status: state.status,
        timeSpent: state.timeSpent,
        timeRemaining: state.timeRemaining,
        isTestActive: state.isTestActive
      }),
    }
  )
);
