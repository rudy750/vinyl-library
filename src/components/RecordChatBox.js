'use client';

import { useState, useRef, useEffect } from 'react';

export default function RecordChatBox({ albumsOwned, closeDialog }) {
  const [inputText, setInputText] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [processingQuery, setProcessingQuery] = useState(false);
  const bottomMarker = useRef(null);

  const autoScrollDown = () => {
    bottomMarker.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    autoScrollDown();
  }, [chatLog]);

  const submitQuery = async () => {
    if (!inputText.trim() || processingQuery) return;

    const queryItem = { sender: 'person', text: inputText };
    setChatLog(existing => [...existing, queryItem]);
    setInputText('');
    setProcessingQuery(true);

    try {
      const serverResponse = await fetch('/api/record-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText: inputText,
          vinylsInCollection: albumsOwned,
          previousMessages: chatLog
        })
      });

      const responseData = await serverResponse.json();
      
      if (serverResponse.ok) {
        setChatLog(existing => [...existing, { 
          sender: 'bot', 
          text: responseData.answer 
        }]);
      } else {
        setChatLog(existing => [...existing, { 
          sender: 'bot', 
          text: 'Oops! Something went wrong. Mind trying that again?' 
        }]);
      }
    } catch (problem) {
      setChatLog(existing => [...existing, { 
        sender: 'bot', 
        text: 'Connection failed. Please check your internet.' 
      }]);
    } finally {
      setProcessingQuery(false);
    }
  };

  const pressedKey = (keyEvent) => {
    if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
      keyEvent.preventDefault();
      submitQuery();
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatLog.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-purple-300" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" className="opacity-20" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2 L12 5 M12 19 L12 22 M22 12 L19 12 M5 12 L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">Chat with your vinyl expert!</p>
            <p className="text-sm text-gray-500">Ask about albums, get suggestions, or discuss your records.</p>
          </div>
        ) : (
          chatLog.map((entry, position) => (
            <div key={position} className={`flex ${entry.sender === 'person' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                entry.sender === 'person' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {entry.text}
              </div>
            </div>
          ))
        )}
        
        {processingQuery && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-6 h-6 animate-spin">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600" />
                    <div className="absolute inset-1 rounded-full bg-gray-100" />
                    <div className="absolute inset-[10px] rounded-full bg-white" />
                  </div>
                </div>
              </div>
              <span className="text-gray-600">Processing...</span>
            </div>
          </div>
        )}
        
        <div ref={bottomMarker} />
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyPress={pressedKey}
            placeholder="Type your question here..."
            disabled={processingQuery}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={submitQuery}
            disabled={processingQuery || !inputText.trim()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
