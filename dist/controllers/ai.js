import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import TryCatch from "../middleware/trycatch.js";
import User from "../models/User.model.js";
import { buildResumePrompt, generateInterviewPrompt, JobMatcherPrompt, ResumeAnalyserPrompt } from "../config/prompt.js";
dotenv.config();
const geminiApiKey = process.env.API_KEY_GEMINI;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const cleanJsonResponse = (text) => {
    const trimmed = text.trim();
    const fencedJson = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fencedJson?.[1]) {
        return fencedJson[1].trim();
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }
    return trimmed;
};
const normalizeInterviewResponse = (data, round) => {
    if (!data || typeof data !== "object" || !Array.isArray(data.questions)) {
        return null;
    }
    const questions = data.questions
        .map((question, index) => {
        if (!question || typeof question !== "object" || typeof question.question !== "string") {
            return null;
        }
        return {
            id: Number.isFinite(Number(question.id)) ? Number(question.id) : index + 1,
            question: question.question,
            hint: typeof question.hint === "string" ? question.hint : "",
            category: typeof question.category === "string" ? question.category : round,
        };
    })
        .filter(Boolean);
    if (!questions.length) {
        return null;
    }
    return {
        role: typeof data.role === "string" && data.role.trim() ? data.role : "Candidate",
        round,
        questions,
    };
};
export const analyseResume = TryCatch(async (req, res) => {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
        return res.status(400).json({
            message: "PDF data is required"
        });
    }
    if (!ai) {
        return res.status(500).json({
            message: "Gemini API key is missing on the server"
        });
    }
    const user = await User.findById(req.user?._id);
    if (!user || !user.canMakeRequest()) {
        return res.status(403).json({
            message: "Upgrade your plan to continue",
        });
    }
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
                role: "user",
                parts: [{
                        text: ResumeAnalyserPrompt
                    },
                    {
                        inlineData: {
                            mimeType: "application/pdf",
                            data: pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
                        }
                    }
                ]
            }],
        config: {
            responseMimeType: "application/json",
        },
    });
    const rawText = response.text ? cleanJsonResponse(response.text) : "";
    if (!rawText) {
        return res.status(500).json({
            message: "AI returned empty response"
        });
    }
    let jsonResponse;
    try {
        jsonResponse = JSON.parse(rawText);
    }
    catch (error) {
        return res.status(500).json({
            message: "Ai returned invalid Json",
            rawText: process.env.NODE_ENV === "development" ? rawText : undefined,
        });
    }
    if (!user.hasProAcess()) {
        user.freeRequestsUsed += 1;
        await user.save();
    }
    res.json(jsonResponse);
});
export const jobMatcher = TryCatch(async (req, res) => {
    const { mode, skills, experience, pdfBase64 } = req.body;
    if (!ai) {
        return res.status(500).json({
            message: "Gemini API key is missing on the server"
        });
    }
    if (!mode) {
        return res.status(400).json({
            message: "Mode is required"
        });
    }
    if (mode === "manual" &&
        (!skills?.length || !experience?.trim())) {
        return res.status(400).json({
            message: "Skills and experience are required"
        });
    }
    if (mode === "resume" && !pdfBase64) {
        return res.status(400).json({
            message: "PDF is required"
        });
    }
    const user = await User.findById(req.user?._id);
    if (!user || !user.canMakeRequest()) {
        return res.status(403).json({
            message: "Upgrade your plan to continue"
        });
    }
    const parts = [
        {
            text: JobMatcherPrompt(mode, skills, experience)
        }
    ];
    if (mode === "resume") {
        parts.push({
            inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
            }
        });
    }
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
            responseMimeType: "application/json",
        },
    });
    const rawText = response?.text ? cleanJsonResponse(response.text) : "";
    if (!rawText) {
        return res.status(500).json({
            message: "AI returned empty response"
        });
    }
    let jsonResponse;
    try {
        jsonResponse = JSON.parse(rawText);
    }
    catch (error) {
        return res.status(500).json({
            message: "Ai returned invalid Json",
            rawText: process.env.NODE_ENV === "development"
                ? rawText
                : undefined,
        });
    }
    if (!user.hasProAcess()) {
        user.freeRequestsUsed += 1;
        await user.save();
    }
    res.json(jsonResponse);
});
export const generateInterview = TryCatch(async (req, res) => {
    const { mode, round, skills, experience, pdfBase64 } = req.body;
    if (!ai) {
        return res.status(500).json({
            message: "Gemini API key is missing on the server"
        });
    }
    if (!mode || !round) {
        return res.status(400).json({
            message: "mode and round are required"
        });
    }
    if (!["manual", "resume"].includes(mode) || !["hr", "technical"].includes(round)) {
        return res.status(400).json({
            message: "Invalid mode or round"
        });
    }
    if (mode === "manual" &&
        (!skills?.trim() || !experience?.trim())) {
        return res.status(400).json({
            message: "Skills and experience are required"
        });
    }
    if (mode === "resume" && !pdfBase64) {
        return res.status(400).json({
            message: "PDF is required"
        });
    }
    const user = await User.findById(req.user?._id);
    if (!user || !user.canMakeRequest()) {
        return res.status(403).json({
            message: "Upgrade your plan to continue"
        });
    }
    const parts = [
        {
            text: generateInterviewPrompt(round, mode, skills, experience)
        }
    ];
    if (mode === "resume") {
        parts.push({
            inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
            }
        });
    }
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
            responseMimeType: "application/json",
        },
    });
    const rawText = response?.text ? cleanJsonResponse(response.text) : "";
    if (!rawText) {
        return res.status(500).json({
            message: "AI returned empty response"
        });
    }
    let jsonResponse;
    try {
        jsonResponse = JSON.parse(rawText);
    }
    catch (error) {
        return res.status(500).json({
            message: "Ai returned invalid Json",
            rawText: process.env.NODE_ENV === "development"
                ? rawText
                : undefined,
        });
    }
    const interviewResponse = normalizeInterviewResponse(jsonResponse, round);
    if (!interviewResponse) {
        return res.status(500).json({
            message: "AI returned invalid interview data",
            rawText: process.env.NODE_ENV === "development"
                ? rawText
                : undefined,
        });
    }
    if (!user.hasProAcess()) {
        user.freeRequestsUsed += 1;
        await user.save();
    }
    res.json(interviewResponse);
});
export const buildResume = TryCatch(async (req, res) => {
    const { mode, formData, pdfBase64 } = req.body;
    if (!ai) {
        return res.status(500).json({
            message: "Gemini API key is missing on the server"
        });
    }
    if (!mode) {
        return res.status(400).json({
            message: "Mode is required"
        });
    }
    if (mode === "manual" && !formData) {
        return res.status(400).json({
            message: "form data is required"
        });
    }
    if (mode === "improve" && !pdfBase64) {
        return res.status(400).json({
            message: "Pdf is required"
        });
    }
    const user = await User.findById(req.user?._id);
    if (!user || !user.canMakeRequest()) {
        return res.status(403).json({
            message: "Upgrade your plan to continue"
        });
    }
    const parts = [
        {
            text: buildResumePrompt(mode, formData)
        }
    ];
    if (mode === "improve") {
        parts.push({
            inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
            }
        });
    }
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
            responseMimeType: "application/json",
        },
    });
    const rawText = response?.text ? cleanJsonResponse(response.text) : "";
    if (!rawText) {
        return res.status(500).json({
            message: "AI returned empty response"
        });
    }
    let jsonResponse;
    try {
        jsonResponse = JSON.parse(rawText);
    }
    catch (error) {
        return res.status(500).json({
            message: "Ai returned invalid Json",
            rawText: process.env.NODE_ENV === "development"
                ? rawText
                : undefined,
        });
    }
    if (!user.hasProAcess()) {
        user.freeRequestsUsed += 1;
        await user.save();
    }
    res.json(jsonResponse);
});
