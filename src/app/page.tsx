"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import styles from "./page.module.css";

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const textToSend = input;
    setInput("");
    try {
      await sendMessage({ text: textToSend });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Column: AI Sandbox / Client Chat */}
      <div className={styles.leftColumn}>
        <div>
          <div className={styles.header}>
            <h1 className={styles.headerTitle}>Financer AI Agent</h1>
            <span className={styles.statusBadge}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></span>
              Sandbox Online
            </span>
          </div>

          <p className={styles.cardDescription} style={{ marginBottom: "1.5rem" }}>
            Test the Vercel AI SDK setup directly in your browser. Once your API keys are configured, this client sandbox will communicate with your local or deployed API routes.
          </p>
        </div>

        <div className={styles.chatArea}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>💬</div>
              <h3>Start a Conversation</h3>
              <p>Type a message below to test the AI SDK streaming engine.</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.message} ${
                  m.role === "user" ? styles.userMessage : styles.aiMessage
                }`}
              >
                <div className={styles.messageSender}>{m.role === "user" ? "You" : "Financer Bot"}</div>
                {m.parts.map((part, index) => {
                  if (part.type === "text") {
                    return <div key={index} className={styles.messageText}>{part.text}</div>;
                  }
                  if (part.type === "reasoning") {
                    return (
                      <div
                        key={index}
                        style={{
                          opacity: 0.6,
                          fontSize: "0.85rem",
                          fontStyle: "italic",
                          borderLeft: "2px solid rgba(255,255,255,0.2)",
                          paddingLeft: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {part.text}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))
          )}
          {isLoading && (
            <div className={`${styles.message} ${styles.aiMessage}`}>
              <div className={styles.messageSender}>Financer Bot</div>
              <div className={styles.messageText} style={{ opacity: 0.6 }}>Thinking...</div>
            </div>
          )}
          {error && (
            <div className={`${styles.message} ${styles.aiMessage}`} style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
              <div className={styles.messageSender} style={{ color: "#ef4444" }}>Error</div>
              <div className={styles.messageText}>{error.message || "Something went wrong. Please check your console & API keys."}</div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            className={styles.textInput}
            value={input}
            placeholder="Ask anything..."
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className={styles.sendButton} disabled={isLoading}>
            Send
          </button>
        </form>
      </div>

      {/* Right Column: Telegram Webhook Configuration Panel */}
      <div className={styles.rightColumn}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span>🤖</span> Telegram Bot Integration
          </h2>
          <p className={styles.cardDescription}>
            Follow these steps to connect this Vercel AI SDK backend to your live Telegram bot.
          </p>

          <ol className={styles.stepsList}>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <strong>Create your Bot:</strong> Find <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "#818cf8" }}>@BotFather</a> on Telegram, type <code>/newbot</code>, and save your API Token.
              </div>
            </li>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>2</span>
              <div>
                <strong>Set Environment Variables:</strong> Edit the <code>.env.local</code> file locally or set these in your hosting dashboard (e.g. Vercel):
                <pre className={styles.codeBlock}>
{`TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=some_random_secret_string
GEMINI_API_KEY=your_gemini_api_key`}
                </pre>
              </div>
            </li>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <strong>Push to Live:</strong> Deploy this app to Vercel (or any public hosting). Webhooks require an HTTPS URL.
              </div>
            </li>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>4</span>
              <div>
                <strong>Register Webhook:</strong> Once deployed, open this URL in your browser to activate the webhook:
                <pre className={styles.codeBlock}>
                  {`https://your-deployed-domain.vercel.app/api/telegram?setup=true`}
                </pre>
              </div>
            </li>
          </ol>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span>⚙️</span> Webhook API Endpoints
          </h2>
          <p className={styles.cardDescription}>
            The starter exposes two endpoint categories:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <code style={{ color: "#34d399", fontWeight: "bold" }}>POST /api/chat</code>
              <p style={{ fontSize: "0.85rem", color: "--text-secondary", marginTop: "0.25rem" }}>
                Handles streaming AI chat messages from the web interface.
              </p>
            </div>
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <code style={{ color: "#34d399", fontWeight: "bold" }}>POST /api/telegram</code>
              <p style={{ fontSize: "0.85rem", color: "--text-secondary", marginTop: "0.25rem" }}>
                Receives update webhooks from Telegram servers, parses the user query, generates an AI response, and pushes a reply back.
              </p>
            </div>
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <code style={{ color: "#34d399", fontWeight: "bold" }}>GET /api/telegram?setup=true</code>
              <p style={{ fontSize: "0.85rem", color: "--text-secondary", marginTop: "0.25rem" }}>
                Registers this deployment's URL as the active Telegram webhook handler.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
