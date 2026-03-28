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
    async fn cleanup(&self, transcript: &str, settings: &AppSettings) -> Result<String, String>;
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

pub async fn cleanup_transcript(
    transcript: &str,
    settings: &AppSettings,
) -> Result<String, String> {
    if !settings.cleanup_enabled {
        return Ok(transcript.to_string());
    }

    match settings.llm_provider.trim() {
        "ollama" => {
            OllamaCleanupProvider::new()
                .cleanup(transcript, settings)
                .await
        }
        _ => {
            OpenRouterCleanupProvider::new()
                .cleanup(transcript, settings)
                .await
        }
    }
}

impl LlmPostProcessor for OpenRouterCleanupProvider {
    async fn cleanup(&self, transcript: &str, settings: &AppSettings) -> Result<String, String> {
        if settings.openrouter_api_key.trim().is_empty() {
            return Err("Missing OpenRouter API key.".to_string());
        }

        if settings.openrouter_model.trim().is_empty() {
            return Err("Missing OpenRouter model.".to_string());
        }

        let prompt = format!(
            "You are cleaning a speech-to-text transcript. Keep the original language. Do not translate. Only lightly improve punctuation, spacing, filler words, and duplicate fragments. Preserve intent and wording as much as possible.\n\nTranscript:\n{}",
            transcript
        );

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
                "messages": [
                    {
                        "role": "system",
                        "content": "Return only the cleaned transcript text."
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
            .unwrap_or_else(|| transcript.to_string())
            .trim()
            .to_string();

        if cleaned.is_empty() {
            return Ok(transcript.to_string());
        }

        Ok(cleaned)
    }
}

impl LlmPostProcessor for OllamaCleanupProvider {
    async fn cleanup(&self, transcript: &str, settings: &AppSettings) -> Result<String, String> {
        if settings.ollama_base_url.trim().is_empty() {
            return Err("Missing Ollama base URL.".to_string());
        }

        if settings.ollama_model.trim().is_empty() {
            return Err("Missing Ollama model.".to_string());
        }

        let prompt = format!(
            "You are cleaning a speech-to-text transcript. Keep the original language. Do not translate. Only lightly improve punctuation, spacing, filler words, and duplicate fragments. Preserve intent and wording as much as possible.\n\nTranscript:\n{}",
            transcript
        );

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
                        "content": "Return only the cleaned transcript text."
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
            .unwrap_or_else(|| transcript.to_string())
            .trim()
            .to_string();

        if cleaned.is_empty() {
            return Err("Ollama returned an empty cleanup result.".to_string());
        }

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
