import type { Question } from "@/types/question";
import js from "@/data/questions/js.json";
import python from "@/data/questions/python.json";
import node from "@/data/questions/node.json";
import restApi from "@/data/questions/rest-api.json";
import interviewFacts from "@/data/questions/interview-facts.json";
import backendGeneral from "@/data/questions/backend-general.json";

export const questionPool: Question[] = [
  ...js,
  ...python,
  ...node,
  ...restApi,
  ...interviewFacts,
  ...backendGeneral,
] as Question[];
