'use client';

import { useState, useRef, useEffect } from 'react';

function MarkdownText({ text }) {
  // Lightweight markdown: bold, italic, headers, lists
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2">{line.slice(4)}</h4>;
        if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-base mt-2">{line.slice(3)}</h3>;
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-2">{line.slice(2)}</h2>;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <p key={i} className="pl-4 before:content-['•'] before:mr-2 before:text-purple-400">{formatInline(line.slice(2))}</p>;
        }
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+\.)\s(.*)/);
          return <p key={i} className="pl-4"><span className="text-purple-400 mr-1">{match[1]}</span>{formatInline(match[2])}</p>;
        }
        if (line.trim() === '') return <br key={i} />;
        return <p key={i}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

function formatInline(text) {
  // Handle **bold** and *italic*
  const parts = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);
    const match = boldMatch && (!italicMatch || boldMatch.index <= italicMatch.index) ? boldMatch : italicMatch;
    if (!match) {
      parts.push(remaining);
      break;
    }
    if (match.index > 0) parts.push(remaining.slice(0, match.index));
    if (match[0].startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
    } else {
      parts.push(<em key={key++}>{match[1]}</em>);
    }
    remaining = remaining.slice(match.index + match[0].length);
  }
  return parts;
}

export default function AlbumAdvisor({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setImageData(base64);
      setImageMime(file.type);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageData(null);
    setImageMime(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed && !imageData) return;

    const userMessage = {
      role: 'user',
      content: trimmed || 'What can you tell me about this album?',
      image: imagePreview,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const body = { message: userMessage.content };
      if (imageData) {
        body.imageBase64 = imageData;
        body.imageMimeType = imageMime;
      }
      clearImage();

      const response = await fetch('/api/album-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.delta) {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, content: last.content + parsed.delta };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, I had trouble processing that. Please try again.' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg font-medium mb-1">Ask me about any album!</p>
            <p className="text-sm">Upload a photo of a record or ask by name. I&apos;ll tell you about it, how rare it is, and if it matches your taste.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="Uploaded album" className="w-32 h-32 object-cover rounded-lg mb-2" />
              )}
              {msg.role === 'assistant' ? (
                msg.content ? <MarkdownText text={msg.content} /> : (
                  <div className="flex items-center justify-center py-2">
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-6 h-6 animate-spin">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 shadow-sm" />
                          <div className="absolute inset-1 rounded-full bg-gray-900" />
                          <div className="absolute inset-[9px] rounded-full bg-gray-100" />
                          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70" />
                        </div>
                      </div>
                      <div className="absolute right-0 top-0 w-2 h-2 bg-gray-800 rounded-full shadow-sm" />
                      <div className="absolute right-1.5 top-1.5 w-4 h-1 bg-gray-600 rounded-full origin-left rotate-[32deg] shadow-sm" />
                      <div className="absolute right-3 top-2.5 w-2 h-1 bg-gray-500 rounded-sm rotate-[32deg] shadow-sm" />
                      <div className="absolute right-3.5 top-3 w-1 h-1 bg-gray-300 rounded-sm rotate-[32deg]" />
                    </div>
                  </div>
                )
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <img src={imagePreview} alt="Upload preview" className="w-16 h-16 object-cover rounded-lg border" />
          <button onClick={clearImage} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="p-2.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
          title="Upload album photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about an album..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !imageData)}
          className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
