use reqwest::Client;
use serde::Deserialize;
use serde_json::json;

use crate::settings::AppSettings;

pub trait AsrProvider {
    async fn transcribe(
        &self,
        audio_base64: &str,
        mime_type: &str,
        settings: &AppSettings,
    ) -> Result<String, String>;
}

pub trait LlmPostProcessor {
    async fn cleanup(
        &self,
        transcript: &str,
        settings: &AppSettings,
        prompt_override: Option<&str>,
        ask_mode: bool,
        selected_context: Option<&str>,
    ) -> Result<String, String>;
}

pub struct GoogleSpeechProvider {
    client: Client,
}

impl GoogleSpeechProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    fn encoding_for_mime(&self, mime_type: &str) -> &'static str {
        if mime_type.contains("ogg") {
            "OGG_OPUS"
        } else {
            "WEBM_OPUS"
        }
    }
}

fn collect_phrase_hints(raw: &str) -> Vec<String> {
    let mut phrases: Vec<String> = Vec::new();

    for line in raw.lines() {
        let phrase = line.trim();
        if phrase.is_empty() {
            continue;
        }

        if phrases.iter().any(|existing| existing == phrase) {
            continue;
        }

        phrases.push(phrase.to_string());
    }

    phrases
}

pub async fn transcribe_audio(
    audio_base64: &str,
    mime_type: &str,
    settings: &AppSettings,
) -> Result<String, String> {
    match settings.speech_provider.trim() {
        "" | "google" => {
            GoogleSpeechProvider::new()
                .transcribe(audio_base64, mime_type, settings)
                .await
        }
        provider => Err(format!("Unsupported speech provider: {provider}")),
    }
}

impl AsrProvider for GoogleSpeechProvider {
    async fn transcribe(
        &self,
        audio_base64: &str,
        mime_type: &str,
        settings: &AppSettings,
    ) -> Result<String, String> {
        if settings.google_api_key.trim().is_empty() {
            return Err("Missing Google Speech API key.".to_string());
        }

        let phrase_hints = collect_phrase_hints(&settings.phrase_hints);
        let config = if phrase_hints.is_empty() {
            json!({
                "languageCode": settings.source_language,
                "enableAutomaticPunctuation": true,
                "encoding": self.encoding_for_mime(mime_type),
                "sampleRateHertz": 48000,
                "model": "latest_long"
            })
        } else {
            json!({
                "languageCode": settings.source_language,
                "enableAutomaticPunctuation": true,
                "encoding": self.encoding_for_mime(mime_type),
                "sampleRateHertz": 48000,
                "model": "latest_long",
                "speechContexts": [
                    {
                        "phrases": phrase_hints
                    }
                ]
            })
        };

        let response = self
            .client
            .post(format!(
                "https://speech.googleapis.com/v1/speech:recognize?key={}",
                settings.google_api_key
            ))
            .json(&json!({
                "config": config,
                "audio": {
                    "content": audio_base64
                }
            }))
            .send()
            .await
            .map_err(|error| format!("Google Speech request failed: {error}"))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unable to read Google error body.".to_string());
            return Err(format!("Google Speech API error ({status}): {body}"));
        }

        let body: GoogleRecognizeResponse = response
            .json()
            .await
            .map_err(|error| format!("Failed to decode Google Speech response: {error}"))?;

        let transcript = body
            .results
            .unwrap_or_default()
            .into_iter()
            .flat_map(|result| result.alternatives.unwrap_or_default().into_iter())
            .map(|alternative| alternative.transcript)
            .collect::<Vec<_>>()
            .join(" ")
            .trim()
            .to_string();

        if transcript.is_empty() {
            return Err("Google Speech returned an empty transcript.".to_string());
        }

        Ok(transcript)
    }
}

pub struct OpenRouterCleanupProvider {
    client: Client,
}

impl OpenRouterCleanupProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }
}

pub struct OllamaCleanupProvider {
    client: Client,
}

impl OllamaCleanupProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }
}

fn strip_tagged_blocks(mut text: String, tag: &str) -> String {
    let open_tag = format!("<{tag}>");
    let close_tag = format!("</{tag}>");

    while let Some(start) = text.find(&open_tag) {
        let Some(relative_end) = text[start + open_tag.len()..].find(&close_tag) else {
            text.replace_range(start.., "");
            break;
        };

        let end = start + open_tag.len() + relative_end + close_tag.len();
        text.replace_range(start..end, "");
    }

    text
}

fn strip_code_fence(text: &str) -> String {
    let trimmed = text.trim();

    if !trimmed.starts_with("```") || !trimmed.ends_with("```") {
        return trimmed.to_string();
    }

    let mut lines = trimmed.lines();
    let _ = lines.next();
    let collected = lines.collect::<Vec<_>>();

    if collected.is_empty() {
        return String::new();
    }

    let body = &collected[..collected.len().saturating_sub(1)];
    body.join("\n").trim().to_string()
}

fn strip_prefixed_reasoning_sections(text: &str) -> String {
    let reasoning_prefixes = [
        "thinking:",
        "reasoning:",
        "analysis:",
        "thought process:",
        "chain-of-thought:",
        "chain of thought:",
        "internal reasoning:",
    ];

    let mut skipping = true;
    let mut kept = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        let lower = trimmed.to_ascii_lowercase();

        if skipping {
            if trimmed.is_empty() {
                continue;
            }

            if reasoning_prefixes
                .iter()
                .any(|prefix| lower.starts_with(prefix))
            {
                continue;
            }

            skipping = false;
        }

        kept.push(line);
    }

    kept.join("\n").trim().to_string()
}

fn sanitize_cleanup_output(raw: &str, fallback: &str) -> String {
    let mut cleaned = raw.trim().to_string();
    cleaned = strip_tagged_blocks(cleaned, "think");
    cleaned = strip_tagged_blocks(cleaned, "thinking");
    cleaned = strip_code_fence(&cleaned);
    cleaned = strip_prefixed_reasoning_sections(&cleaned);

    if cleaned.is_empty() {
        fallback.trim().to_string()
    } else {
        cleaned
    }
}

pub async fn cleanup_transcript(
    transcript: &str,
    settings: &AppSettings,
    prompt_override: Option<&str>,
    force_cleanup: bool,
    ask_mode: bool,
    selected_context: Option<&str>,
) -> Result<String, String> {
    if !settings.cleanup_enabled && !force_cleanup {
        return Ok(transcript.to_string());
    }

    match settings.llm_provider.trim() {
        "ollama" => {
            OllamaCleanupProvider::new()
                .cleanup(
                    transcript,
                    settings,
                    prompt_override,
                    ask_mode,
                    selected_context,
                )
                .await
        }
        _ => {
            OpenRouterCleanupProvider::new()
                .cleanup(
                    transcript,
                    settings,
                    prompt_override,
                    ask_mode,
                    selected_context,
                )
                .await
        }
    }
}

impl LlmPostProcessor for OpenRouterCleanupProvider {
    async fn cleanup(
        &self,
        transcript: &str,
        settings: &AppSettings,
        prompt_override: Option<&str>,
        ask_mode: bool,
        selected_context: Option<&str>,
    ) -> Result<String, String> {
        if settings.openrouter_api_key.trim().is_empty() {
            return Err("Missing OpenRouter API key.".to_string());
        }

        if settings.openrouter_model.trim().is_empty() {
            return Err("Missing OpenRouter model.".to_string());
        }

        let prompt = if ask_mode {
            if let Some(selected_context) = selected_context {
                let command_template = prompt_override
                    .map(str::trim)
                    .filter(|prompt| !prompt.is_empty())
                    .unwrap_or("Apply the spoken instruction to the provided selected text context. Return only the final text.");
                format!(
                    "You are applying spoken editing instructions to selected text context. Do not think step by step. Do not include reasoning.\n\nTemplate:\n{}\n\nInstruction (spoken transcript):\n{}\n\nSelected text context:\n{}\n\nReturn only the final output text.",
                    command_template, transcript, selected_context
                )
            } else {
                format!(
                    "You are an assistant answering a spoken request. Treat the following transcript as the full user instruction or question. Do not think step by step. Do not include reasoning.\n\nSpoken request:\n{}\n\nRespond directly and concisely. Return only the final answer text.",
                    transcript
                )
            }
        } else if let Some(custom_prompt) =
            prompt_override.filter(|prompt| !prompt.trim().is_empty())
        {
            format!(
                "You are transforming a speech-to-text transcript according to the user's instruction. Follow the instruction exactly. Return only the final user-facing text. Do not include reasoning, analysis, chain-of-thought, hidden thinking, or any explanation.\n\nInstruction:\n{}\n\nTranscript:\n{}",
                custom_prompt.trim(),
                transcript
            )
        } else {
            format!(
                "You are cleaning a speech-to-text transcript. Keep the original language. Do not translate. Only lightly improve punctuation, spacing, filler words, and duplicate fragments. Preserve intent and wording as much as possible. Do not include reasoning, analysis, chain-of-thought, hidden thinking, or any explanation. Return only the final cleaned transcript text.\n\nTranscript:\n{}",
                transcript
            )
        };
        let system_prompt = if ask_mode || selected_context.is_some() || prompt_override.is_some() {
            "Return only the final text requested by the instruction. Keep it concise. Never include reasoning, analysis, or thinking traces."
        } else {
            "Return only the cleaned transcript text. Keep it concise. Never include reasoning, analysis, or thinking traces."
        };

        let response = self
            .client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header(
                "Authorization",
                format!("Bearer {}", settings.openrouter_api_key),
            )
            .header("HTTP-Referer", "https://www.typefree.local")
            .header("X-Title", "TypeFree")
            .json(&json!({
                "model": settings.openrouter_model,
                "temperature": 0.1,
                "reasoning": {
                    "effort": "none",
                    "enabled": false,
                    "exclude": true
                },
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }))
            .send()
            .await
            .map_err(|error| format!("OpenRouter request failed: {error}"))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unable to read OpenRouter error body.".to_string());
            return Err(format!("OpenRouter API error ({status}): {body}"));
        }

        let body: OpenRouterResponse = response
            .json()
            .await
            .map_err(|error| format!("Failed to decode OpenRouter response: {error}"))?;

        let cleaned = body
            .choices
            .into_iter()
            .find_map(|choice| choice.message.content)
            .map(|content| sanitize_cleanup_output(&content, transcript))
            .unwrap_or_else(|| transcript.to_string());

        Ok(cleaned)
    }
}

impl LlmPostProcessor for OllamaCleanupProvider {
    async fn cleanup(
        &self,
        transcript: &str,
        settings: &AppSettings,
        prompt_override: Option<&str>,
        ask_mode: bool,
        selected_context: Option<&str>,
    ) -> Result<String, String> {
        if settings.ollama_base_url.trim().is_empty() {
            return Err("Missing Ollama base URL.".to_string());
        }

        if settings.ollama_model.trim().is_empty() {
            return Err("Missing Ollama model.".to_string());
        }

        let prompt = if ask_mode {
            if let Some(selected_context) = selected_context {
                let command_template = prompt_override
                    .map(str::trim)
                    .filter(|prompt| !prompt.is_empty())
                    .unwrap_or("Apply the spoken instruction to the provided selected text context. Return only the final text.");
                format!(
                    "You are applying spoken editing instructions to selected text context. Do not think step by step. Do not include reasoning.\n\nTemplate:\n{}\n\nInstruction (spoken transcript):\n{}\n\nSelected text context:\n{}\n\nReturn only the final output text.",
                    command_template, transcript, selected_context
                )
            } else {
                format!(
                    "You are an assistant answering a spoken request. Treat the following transcript as the full user instruction or question. Do not think step by step. Do not include reasoning.\n\nSpoken request:\n{}\n\nRespond directly and concisely. Return only the final answer text.",
                    transcript
                )
            }
        } else if let Some(custom_prompt) =
            prompt_override.filter(|prompt| !prompt.trim().is_empty())
        {
            format!(
                "You are transforming a speech-to-text transcript according to the user's instruction. Follow the instruction exactly. Return only the final user-facing text. Do not include reasoning, analysis, chain-of-thought, hidden thinking, or any explanation.\n\nInstruction:\n{}\n\nTranscript:\n{}",
                custom_prompt.trim(),
                transcript
            )
        } else {
            format!(
                "You are cleaning a speech-to-text transcript. Keep the original language. Do not translate. Only lightly improve punctuation, spacing, filler words, and duplicate fragments. Preserve intent and wording as much as possible. Do not include reasoning, analysis, chain-of-thought, hidden thinking, or any explanation. Return only the final cleaned transcript text.\n\nTranscript:\n{}",
                transcript
            )
        };
        let system_prompt = if ask_mode || selected_context.is_some() || prompt_override.is_some() {
            "Return only the final text requested by the instruction. Keep it concise. Never include reasoning, analysis, or thinking traces."
        } else {
            "Return only the cleaned transcript text. Keep it concise. Never include reasoning, analysis, or thinking traces."
        };

        let base_url = settings.ollama_base_url.trim_end_matches('/');
        let response = self
            .client
            .post(format!("{base_url}/api/chat"))
            .json(&json!({
                "model": settings.ollama_model,
                "stream": false,
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }))
            .send()
            .await
            .map_err(|error| format!("Ollama request failed: {error}"))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unable to read Ollama error body.".to_string());
            return Err(format!("Ollama API error ({status}): {body}"));
        }

        let body: OllamaChatResponse = response
            .json()
            .await
            .map_err(|error| format!("Failed to decode Ollama response: {error}"))?;

        let cleaned = body
            .message
            .and_then(|message| message.content)
            .map(|content| sanitize_cleanup_output(&content, transcript))
            .unwrap_or_else(|| transcript.to_string());

        Ok(cleaned)
    }
}

#[derive(Debug, Deserialize)]
struct GoogleRecognizeResponse {
    results: Option<Vec<GoogleRecognizeResult>>,
}

#[derive(Debug, Deserialize)]
struct GoogleRecognizeResult {
    alternatives: Option<Vec<GoogleRecognizeAlternative>>,
}

#[derive(Debug, Deserialize)]
struct GoogleRecognizeAlternative {
    transcript: String,
}

#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    choices: Vec<OpenRouterChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterChoice {
    message: OpenRouterMessage,
}

#[derive(Debug, Deserialize)]
struct OpenRouterMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
    message: Option<OllamaMessage>,
}

#[derive(Debug, Deserialize)]
struct OllamaMessage {
    content: Option<String>,
}
