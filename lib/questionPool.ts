import type { Question } from "@/types/question";
import javascript from "@/data/questions/javascript.json";
import backendEngineering from "@/data/questions/backend-engineering.json";
import ccaf from "@/data/questions/ccaf.json";

export const questionPool: Question[] = [
  ...javascript,
  ...backendEngineering,
  ...ccaf,
] as Question[];
