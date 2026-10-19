"use client";
import { useState } from "react";

export function NewsletterForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setMessage("");
    const data = new FormData(e.currentTarget);
    const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email") }) });
    const result = await response.json() as { message: string }; setMessage(result.message); setLoading(false);
    if (response.ok) e.currentTarget.reset();
  }
  return <div><form className="newsletter-form" onSubmit={submit}><input required name="email" type="email" placeholder="Your email address" aria-label="Email address"/><button disabled={loading}>{loading ? "Joining…" : "Join the list"}</button></form>{message && <p className="form-message" role="status">{message}</p>}</div>;
}
