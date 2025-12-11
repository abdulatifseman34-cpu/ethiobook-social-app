import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// -----------------------------------------------------------------------------
// የፋየርቤዝ ማዋቀር (Firebase Setup - MANDATORY GLOBAL VARS)
// -----------------------------------------------------------------------------
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// የ Firestore መንገድ (መረጃ የት እንደሚቀመጥ)
const POSTS_COLLECTION_PATH = `/artifacts/${appId}/public/data/posts`;
const FOLLOWS_COLLECTION_PATH = `/artifacts/${appId}/users`; // /users/{userId}/following
const DMS_COLLECTION_PATH = `/artifacts/${appId}/public/data/messages_thread`;

// -----------------------------------------------------------------------------
// የ Firebase አገልግሎቶች (Initialization)
// -----------------------------------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// አስፈላጊ የሆኑ SVG አዶዎች
// -----------------------------------------------------------------------------

// Like/Unlike አዶ
const HeartIcon = ({ isLiked, className = "" }) => (
  <svg className={`w-6 h-6 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill={isLiked ? "rgb(239 68 68)" : "none"} xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" strokeWidth="2" stroke={isLiked ? "rgb(239 68 68)" : "currentColor"} />
  </svg>
);

// Edit አዶ
const EditIcon = ({ className = "" }) => (
  <svg className={`w-5 h-5 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.05 4.50005L3 12.5501V16.7001L7.15 20.8501H15.2L23.25 12.8001L19.1 8.65005L11.05 4.50005Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.15 11.55L19.1 8.6L15.2 4.7L12.25 7.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Delete አዶ
const DeleteIcon = ({ className = "" }) => (
  <svg className={`w-5 h-5 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 7H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// የዲኤም አዶ
const MessageIcon = ({ className = "" }) => (
  <svg className={`w-6 h-6 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V8.5C21 7.11929 19.8807 6 18.5 6H7.5C6.11929 6 5 7.11929 5 8.5V15L3 17V19H21V17L19 15H21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 10.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 10.5H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 10.5H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// መከተል/አለመከተል አዶ
const UserPlusIcon = ({ isFollowing, className = "" }) => (
  <svg className={`w-5 h-5 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {isFollowing ? (
      // Checkmark (አሁን እየተከተለ ነው)
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      // Plus (መከተል)
      <>
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 8h3m-1.5-1.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

// -----------------------------------------------------------------------------
// የድጋፍ ተግባራት (Helper Functions)
// -----------------------------------------------------------------------------

const generateRandomUserId = () => {
  return 'User_' + Math.random().toString(36).substring(2, 8);
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'አሁን';
  const date = new Date(timestamp);
  return date.toLocaleDateString('am-ET', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// -----------------------------------------------------------------------------
// የንግግር መልእክት አካል (Message Component)
// -----------------------------------------------------------------------------

const MessageItem = ({ message, currentUserId }) => {
  const isCurrentUser = message.senderId === currentUserId;
  const positionClass = isCurrentUser ? 'justify-end' : 'justify-start';
  const bubbleClass = isCurrentUser
    ? 'bg-blue-600 text-white rounded-br-none'
    : 'bg-gray-200 text-gray-800 rounded-tl-none';

  // ኦዲዮ ዳታ ካለ ማጫወቻ ያሳያል
  const AudioPlayer = ({ base64Audio }) => {
    const [audioUrl, setAudioUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (base64Audio) {
        try {
          // WAV ሄደር ለመፍጠር የሚያስችሉ ተግባራት
          const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          };

          const writePcmHeader = (buffer, numChannels = 1, sampleRate = 24000) => {
            const bufferLength = buffer.byteLength;
            const view = new DataView(new ArrayBuffer(44 + bufferLength));
            let offset = 0;

            // RIFF chunk
            writeString(view, offset, 'RIFF'); offset += 4;
            view.setUint32(offset, 36 + bufferLength, true); offset += 4;
            writeString(view, offset, 'WAVE'); offset += 4;

            // FMT chunk
            writeString(view, offset, 'fmt '); offset += 4;
            view.setUint32(offset, 16, true); offset += 4; // Sub-chunk size
            view.setUint16(offset, 1, true); offset += 2; // Audio format (1 for PCM)
            view.setUint16(offset, numChannels, true); offset += 2; // Number of channels
            view.setUint32(offset, sampleRate, true); offset += 4; // Sample rate
            view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4; // Byte rate (SampleRate * NumChannels * 2 bytes/sample)
            view.setUint16(offset, numChannels * 2, true); offset += 2; // Block align
            view.setUint16(offset, 16, true); offset += 2; // Bits per sample (16 bit)

            // DATA chunk
            writeString(view, offset, 'data'); offset += 4;
            view.setUint32(offset, bufferLength, true); offset += 4; // Data size

            // Copy PCM data
            const pcmBytes = new Uint8Array(buffer);
            for (let i = 0; i < bufferLength; i++) {
              view.setUint8(offset + i, pcmBytes[i]);
            }

            return view.buffer;
          };

          const pcmArrayBuffer = base64ToArrayBuffer(base64Audio);
          const wavArrayBuffer = writePcmHeader(pcmArrayBuffer);
          const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
          setAudioUrl(URL.createObjectURL(wavBlob));
          setIsLoading(false);
        } catch (error) {
          console.error("Error creating audio URL:", error);
          setIsLoading(false);
        }
      }
    }, [base64Audio]);

    if (!base64Audio) return null;
    if (isLoading) return <p className="text-xs italic p-1">ኦዲዮ በመጫን ላይ...</p>;

    return (
      <div className="py-1">
        <audio controls src={audioUrl} className="w-full h-8">
          የእርስዎ አሳሽ ኦዲዮ ማጫወቻን አይደግፍም።
        </audio>
      </div>
    );
  };

  return (
    <div className={`flex ${positionClass} mb-4`}>
      <div className={`max-w-[80%] md:max-w-[60%] p-3 rounded-xl shadow-lg ${bubbleClass}`}>
        <p className="text-xs font-semibold mb-1 opacity-80">
          {isCurrentUser ? 'እርስዎ' : message.senderId}
        </p>
        {message.text && <p className="text-sm break-words">{message.text}</p>}
        {message.audioData && <AudioPlayer base64Audio={message.audioData} />}
        <p className="text-[10px] opacity-70 mt-1 text-right">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------------------
// የዲኤም ውይይት ገጽ (DM Conversation Page)
// -----------------------------------------------------------------------------

const DMConversation = ({ threadId, recipientId, currentUserId, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttsPrompt, setTtsPrompt] = useState('እንዴት ነህ?');
  const [ttsVoice, setTtsVoice] = useState('Kore'); // Default voice

  // ከLLM ኦዲዮ ለመፍጠር
  const generateTts = useCallback(async (prompt) => {
    setIsGenerating(true);
    const retryDelay = [1000, 2000, 4000];
    const maxRetries = 3;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: ttsVoice }
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
            const part = result?.candidates?.[0]?.content?.parts?.[0];
            const audioData = part?.inlineData?.data;

            if (audioData) {
                // ኦዲዮ ዳታ ሲገኝ መልእክቱን ወደ Firestore አስገባ
                await sendMessage(null, audioData);
                return;
            } else {
                console.error("No audio data found in response:", result);
            }
        } catch (error) {
            console.error(`TTS generation attempt ${attempt + 1} failed:`, error);
            if (attempt < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, retryDelay[attempt]));
            else console.error("Max retries reached. TTS generation failed.");
        }
    }
    setIsGenerating(false);
  }, [threadId, recipientId, currentUserId, ttsVoice]);


  // መልእክት ወደ Firestore ለመላክ
  const sendMessage = useCallback(async (text, audioData = null) => {
    const messageContent = text ? text.trim() : '';

    if (!messageContent && !audioData) return;

    const newMessage = {
      threadId,
      senderId: currentUserId,
      recipientId: recipientId,
      text: messageContent,
      audioData: audioData, // Base64 encoded PCM audio data
      timestamp: Date.now(),
    };

    try {
      // መልእክቱ የሚቀመጥበት ኮሌክሽን መንገድ
      const messagesCollection = collection(db, DMS_COLLECTION_PATH, threadId, 'messages');
      await addDoc(messagesCollection, newMessage);
      setInputText('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [threadId, recipientId, currentUserId]);

  // መልዕክቶችን ከ Firestore ለማምጣት
  useEffect(() => {
    if (!threadId) return;

    const messagesCollectionRef = collection(db, DMS_COLLECTION_PATH, threadId, 'messages');
    const q = query(messagesCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.timestamp - b.timestamp); // በጊዜ ቅደም ተከተል አስተካክል
      setMessages(msgs);
    }, (error) => {
      console.error("Error listening to DM messages:", error);
    });

    return () => unsubscribe();
  }, [threadId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-800 transition duration-150">
          &larr; ወደ መልእክቶች
        </button>
        <h2 className="text-xl font-bold text-gray-800">ውይይት ከ {recipientId} ጋር</h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">ውይይቱ ገና አልተጀመረም። መልእክት ይላኩ!</div>
        ) : (
          messages.map(msg => (
            <MessageItem key={msg.id} message={msg} currentUserId={currentUserId} />
          ))
        )}
        {/* የMessages መጨረሻ ላይ ማሸብለል (Scrolling to bottom) የሚቻልበት ቦታ */}
        <div id="messages-bottom" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center space-x-3 mb-4">
            {/* የTTS ድምጾች መምረጫ */}
            <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="p-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={isGenerating}
            >
                <option value="Kore">Kore (ጽኑ)</option>
                <option value="Zephyr">Zephyr (ደማቅ)</option>
                <option value="Puck">Puck (ደስተኛ)</option>
                <option value="Charon">Charon (አስተማሪ)</option>
            </select>
            {/* የTTS ጽሁፍ ማስገቢያ */}
            <input
                type="text"
                value={ttsPrompt}
                onChange={(e) => setTtsPrompt(e.target.value)}
                placeholder="ወደ ድምጽ የሚቀየር መልእክት..."
                className="flex-1 p-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={isGenerating}
            />
            {/* የTTS መላኪያ ቁልፍ */}
            <button
                onClick={() => generateTts(ttsPrompt)}
                className={`px-4 py-2 text-white font-semibold rounded-lg transition-colors duration-150 ${isGenerating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                disabled={isGenerating}
            >
                {isGenerating ? 'ድምጽ በመፍጠር ላይ...' : 'ድምጽ ላክ'}
            </button>
        </div>

        <div className="flex space-x-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="መልእክት ይጻፉ..."
            className="flex-1 p-3 border rounded-lg shadow-inner focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => sendMessage(inputText)}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150"
            disabled={!inputText.trim()}
          >
            ላክ
          </button>
        </div>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------------------
// የዲኤም ክሮች ገጽ (DM Threads Page)
// -----------------------------------------------------------------------------

const DMThreads = ({ currentUserId, onSelectThread }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  // የክሮች ዝርዝር ከ Firestore ለማምጣት
  useEffect(() => {
    const threadsCollectionRef = collection(db, DMS_COLLECTION_PATH);
    // የአሁን ተጠቃሚው በthreadId ውስጥ መኖሩን ያረጋግጡ
    const q = query(threadsCollectionRef, where('participants', 'array-contains', currentUserId));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const threadList = [];
      for (const docSnapshot of snapshot.docs) {
        const threadData = docSnapshot.data();
        const threadId = docSnapshot.id;
        
        // የመጨረሻውን መልእክት አምጣ
        const messagesCollectionRef = collection(db, DMS_COLLECTION_PATH, threadId, 'messages');
        const latestMessageQuery = query(messagesCollectionRef, orderBy('timestamp', 'desc'), limit(1));
        const messagesSnapshot = await getDocs(latestMessageQuery);
        
        const lastMessage = messagesSnapshot.docs.length > 0
          ? messagesSnapshot.docs[0].data()
          : { text: "ውይይት የለም", timestamp: threadData.timestamp || Date.now() };

        // የሌላኛውን ተሳታፊ መታወቂያ አግኝ
        const recipientId = threadData.participants.find(id => id !== currentUserId);

        threadList.push({
          id: threadId,
          recipientId: recipientId || 'ያልታወቀ',
          lastMessageText: lastMessage.text || (lastMessage.audioData ? "የድምጽ መልእክት" : "መልእክት የለም"),
          timestamp: lastMessage.timestamp,
        });
      }
      // በቅርብ ጊዜ በተላከ መልእክት አስተካክል
      threadList.sort((a, b) => b.timestamp - a.timestamp);
      setThreads(threadList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching DM threads:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-xl text-gray-600">መልእክቶችን በመጫን ላይ...</p>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">ቀጥተኛ መልእክቶች (DMs)</h1>
      
      {threads.length === 0 ? (
        <p className="text-gray-500">ገና ምንም ውይይት የለም።</p>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread.id, thread.recipientId)}
              className="flex items-center p-4 bg-white rounded-xl shadow-md hover:bg-gray-100 transition duration-150 cursor-pointer border border-gray-200"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-600">{thread.recipientId}</h3>
                <p className="text-sm text-gray-500 truncate">{thread.lastMessageText}</p>
              </div>
              <p className="text-xs text-gray-400">
                {formatTimestamp(thread.timestamp)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// -----------------------------------------------------------------------------
// የፖስት አካል (Post Component)
// -----------------------------------------------------------------------------

const Post = React.memo(({ post, currentUserId, onToggleLike, onDeletePost, onStartDM, onToggleFollow, isFollowing }) => {
  const isOwner = post.userId === currentUserId;
  const isLiked = post.likes.includes(currentUserId);
  const userProfileUrl = `https://placehold.co/40x40/f0f9ff/0e7490?text=${post.userId.slice(5)}`;

  return (
    <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
      {/* ፖስት ራስጌ */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img src={userProfileUrl} alt="የተጠቃሚ ምስል" className="w-10 h-10 rounded-full object-cover border-2 border-blue-400" onError={(e) => { e.target.onerror = null; e.target.src = userProfileUrl; }} />
          <div>
            <p className="font-bold text-gray-900">{post.userId}</p>
            <p className="text-xs text-gray-500">{formatTimestamp(post.timestamp)}</p>
          </div>
        </div>
        {/* የባለቤት መቆጣጠሪያዎች */}
        {isOwner && (
          <div className="flex space-x-2">
            <button onClick={() => console.log('Edit clicked')} className="p-1 text-blue-500 hover:text-blue-700 transition">
              <EditIcon />
            </button>
            <button onClick={() => onDeletePost(post.id)} className="p-1 text-red-500 hover:text-red-700 transition">
              <DeleteIcon />
            </button>
          </div>
        )}
      </div>

      {/* የፖስት ይዘት */}
      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

      {/* የድርጊት ቁልፎች */}
      <div className="flex justify-between items-center border-t pt-3">
        <div className="flex items-center space-x-4">
          {/* Like ቁልፍ */}
          <button onClick={() => onToggleLike(post.id, isLiked)} className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition">
            <HeartIcon isLiked={isLiked} className="w-5 h-5" />
            <span className={`text-sm font-medium ${isLiked ? 'text-red-500' : ''}`}>{post.likes.length}</span>
          </button>

          {/* DM እና Follow (ባለቤት ካልሆኑ) */}
          {!isOwner && (
            <>
              {/* DM ቁልፍ */}
              <button onClick={() => onStartDM(post.userId)} className="flex items-center space-x-1 text-gray-500 hover:text-purple-600 transition duration-150">
                <MessageIcon className="w-5 h-5" />
                <span className="text-sm font-medium">መልእክት</span>
              </button>

              {/* Follow ቁልፍ */}
              <button
                onClick={() => onToggleFollow(post.userId, isFollowing)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-white text-sm font-medium transition duration-200 ${isFollowing ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                <UserPlusIcon isFollowing={isFollowing} className="w-4 h-4" />
                <span>{isFollowing ? 'እየተከተሉ ነው' : 'ተከተል'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});


// -----------------------------------------------------------------------------
// የዋናው አፕሊኬሽን አካል (Main App Component)
// -----------------------------------------------------------------------------

const App = () => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [currentPage, setCurrentPage] = useState('feed');
  const [following, setFollowing] = useState([]);

  // ለዲኤም ግዛት (DM State)
  const [activeDMThread, setActiveDMThread] = useState(null);
  const [dmRecipientId, setDmRecipientId] = useState(null);

  // -------------------------
  // 1. የ AUTHENTICATION ሂደት
  // -------------------------
  useEffect(() => {
    // ሎግ እንዲታይ ያደርጋል
    // setLogLevel('Debug');
    
    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // የተረጋገጠ ተጠቃሚ
        setCurrentUserId(user.uid);
      } else {
        // ስም-የለሽ (Anonymous) ወይም በCustom Token መግባት
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
            // አዲስ ስም-የለሽ ተጠቃሚ ከሆነ የዘፈቀደ ID ይመድቡ
            setCurrentUserId(auth.currentUser?.uid || generateRandomUserId());
          }
        } catch (error) {
          console.error("Auth Error:", error);
          setCurrentUserId(generateRandomUserId()); // መጠባበቂያ ID
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);


  // -------------------------
  // 2. የ FOLLOWING ዝርዝር
  // -------------------------
  useEffect(() => {
    if (!isAuthReady || !currentUserId) return;

    const followingDocRef = doc(db, FOLLOWS_COLLECTION_PATH, currentUserId, 'following', 'users');

    const unsubscribe = onSnapshot(followingDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFollowing(data.uids || []);
      } else {
        setFollowing([]);
      }
    }, (error) => {
      console.error("Error fetching following list:", error);
    });

    return () => unsubscribe();
  }, [isAuthReady, currentUserId]);


  // -------------------------
  // 3. የPOSTS ዝርዝር
  // -------------------------
  useEffect(() => {
    if (!isAuthReady) return;

    const postsCollection = collection(db, POSTS_COLLECTION_PATH);
    const q = query(postsCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.timestamp - a.timestamp); // በአዲስ ቅደም ተከተል
      setPosts(postsList);
    }, (error) => {
      console.error("Error fetching posts:", error);
    });

    return () => unsubscribe();
  }, [isAuthReady]);


  // -------------------------
  // 4. የድርጊት ተግባራት (Action Handlers)
  // -------------------------

  // አዲስ ፖስት መፍጠር
  const handleCreatePost = useCallback(async () => {
    if (!newPostContent.trim() || !currentUserId) return;

    const newPost = {
      userId: currentUserId,
      content: newPostContent.trim(),
      timestamp: Date.now(),
      likes: [], // የተጠቃሚ መታወቂያዎችን የያዘ ድርድር
    };

    try {
      await addDoc(collection(db, POSTS_COLLECTION_PATH), newPost);
      setNewPostContent('');
    } catch (error) {
      console.error("Error creating post:", error);
    }
  }, [newPostContent, currentUserId]);


  // ፖስት መሰረዝ
  const handleDeletePost = useCallback(async (postId) => {
    if (!currentUserId) return;

    try {
      // ፖስቱ የአሁኑ ተጠቃሚ መሆኑን ያረጋግጡ (ይህ በ Firestore የደህንነት ሕጎችም መረጋገጥ አለበት)
      const postToDelete = posts.find(p => p.id === postId);
      if (postToDelete && postToDelete.userId === currentUserId) {
        await deleteDoc(doc(db, POSTS_COLLECTION_PATH, postId));
      } else {
        console.warn("Unauthorized delete attempt or post not found.");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  }, [currentUserId, posts]);


  // Like ማድረግ/ማንሳት
  const handleToggleLike = useCallback(async (postId, isLiked) => {
    if (!currentUserId) return;

    const postRef = doc(db, POSTS_COLLECTION_PATH, postId);
    let newLikes = [];

    if (isLiked) {
      // Like ማንሳት
      newLikes = posts.find(p => p.id === postId).likes.filter(uid => uid !== currentUserId);
    } else {
      // Like ማድረግ
      newLikes = [...(posts.find(p => p.id === postId).likes || []), currentUserId];
    }

    try {
      await updateDoc(postRef, { likes: newLikes });
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  }, [currentUserId, posts]);


  // ተጠቃሚን መከተል/አለመከተል
  const handleToggleFollow = useCallback(async (targetUserId, isFollowing) => {
    if (!currentUserId || currentUserId === targetUserId) return;

    const followingDocRef = doc(db, FOLLOWS_COLLECTION_PATH, currentUserId, 'following', 'users');

    try {
      let newFollowingUids = [];

      if (isFollowing) {
        // መከተል ማንሳት
        newFollowingUids = following.filter(uid => uid !== targetUserId);
      } else {
        // መከተል
        newFollowingUids = [...following, targetUserId];
      }

      // 'users' የሚባለውን ሰነድ ይፍጠሩ ወይም ያዘምኑ
      await setDoc(followingDocRef, { uids: newFollowingUids }, { merge: true });

    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  }, [currentUserId, following]);


  // ዲኤም መጀመር/መቀጠል
  const handleStartDM = useCallback(async (recipientId) => {
    if (!currentUserId || currentUserId === recipientId) {
      console.warn("Cannot DM self.");
      return;
    }

    const participants = [currentUserId, recipientId].sort(); // ወጥነት ያለው የክሩ መታወቂያ
    const threadId = participants.join('_');
    const threadRef = doc(db, DMS_COLLECTION_PATH, threadId);

    // ክሩ መኖሩን ያረጋግጡ
    const docSnap = await getDoc(threadRef);

    if (!docSnap.exists()) {
      // አዲስ ክር ፍጠር
      await setDoc(threadRef, {
        participants: participants,
        createdAt: Date.now(),
      });
    }

    setDmRecipientId(recipientId);
    setActiveDMThread(threadId);
    setCurrentPage('dm_threads'); // ወደ ዲኤም ገጽ ይቀይሩ
  }, [currentUserId]);

  // ከተከተልኳቸው ሰዎች ፖስት ብቻ ማጣራት
  const filteredPosts = useMemo(() => {
    if (currentPage === 'profile') {
      // የኔ ፖስቶች
      return posts.filter(p => p.userId === currentUserId);
    }
    // የ Feed ገጽ፡ የኔን ፖስቶች እና የተከተልኳቸውን ሰዎች ፖስቶች አሳይ
    const followedUids = new Set(following);
    return posts.filter(p => p.userId === currentUserId || followedUids.has(p.userId));
  }, [posts, currentUserId, following, currentPage]);


  // -------------------------
  // የUI አካላት (UI Components)
  // -------------------------

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-xl text-blue-600 font-semibold">በመጫን ላይ... የማንነት ማረጋገጫ በመካሄድ ላይ</p>
      </div>
    );
  }

  // የዲኤም ውይይት ገጽ ንቁ ከሆነ
  if (currentPage === 'dm_threads' && activeDMThread) {
    return (
      <DMConversation
        threadId={activeDMThread}
        recipientId={dmRecipientId}
        currentUserId={currentUserId}
        onBack={() => { setActiveDMThread(null); setDmRecipientId(null); }} // ወደ ክሮች ዝርዝር ይመለስ
      />
    );
  }


  // የገጽ ርዕስ
  const pageTitle = currentPage === 'feed'
    ? 'የዜና ገጽ (Feed)'
    : currentPage === 'dm_threads'
      ? 'ቀጥተኛ መልዕክቶች'
      : 'የእኔ መገለጫ';

  // ዋናው ይዘት
  let mainContent;

  switch (currentPage) {
    case 'feed':
    case 'profile':
      mainContent = (
        <>
          {/* የፖስት ማስገቢያ ቅጽ */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
            <h2 className="text-xl font-bold mb-3 text-gray-800">አዲስ ፖስት ይፍጠሩ</h2>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3 resize-none"
              rows="3"
              placeholder="አሁን ምን እያሰቡ ነው?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            <button
              onClick={handleCreatePost}
              className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150"
              disabled={!newPostContent.trim()}
            >
              ፖስት ያድርጉ
            </button>
          </div>

          {/* የፖስቶች ዝርዝር */}
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
            {currentPage === 'profile' ? 'የእኔ ፖስቶች' : 'ፖስቶች'} ({filteredPosts.length})
          </h2>
          <div className="space-y-6">
            {filteredPosts.length === 0 ? (
              <p className="text-gray-500">
                {currentPage === 'profile' ? 'ገና ምንም ፖስት አላደረጉም::' : 'በዚህ ገጽ ላይ የሚታይ ፖስት የለም::'}
              </p>
            ) : (
              filteredPosts.map(post => (
                <Post
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onToggleLike={handleToggleLike}
                  onDeletePost={handleDeletePost}
                  onStartDM={handleStartDM}
                  onToggleFollow={handleToggleFollow}
                  isFollowing={following.includes(post.userId)}
                />
              ))
            )}
          </div>
        </>
      );
      break;

    case 'dm_threads':
      mainContent = (
        <DMThreads
          currentUserId={currentUserId}
          onSelectThread={(threadId, recipientId) => {
            setActiveDMThread(threadId);
            setDmRecipientId(recipientId);
          }}
        />
      );
      break;

    default:
      mainContent = <p className="text-red-500">የጠፋ ገጽ።</p>;
  }


  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ራስጌ (Header) */}
      <header className="sticky top-0 bg-white shadow-md z-10 p-4 border-b">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-blue-600">Ethiobook</h1>
          <nav className="flex items-center space-x-4">
            {/* የገጽ አሰሳ ቁልፎች */}
            <button
              onClick={() => setCurrentPage('feed')}
              className={`p-2 rounded-lg font-medium transition duration-150 ${currentPage === 'feed' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Feed
            </button>
            <button
              onClick={() => setCurrentPage('dm_threads')}
              className={`p-2 rounded-lg font-medium transition duration-150 ${currentPage === 'dm_threads' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              DM
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className={`p-2 rounded-lg font-medium transition duration-150 ${currentPage === 'profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              መገለጫ
            </button>
          </nav>
          {/* የተጠቃሚ መታወቂያ ማሳያ */}
          <div className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full shadow-inner">
            ተጠቃሚ: {currentUserId || 'በመጫን ላይ...'}
          </div>
        </div>
      </header>

      {/* ዋናው የይዘት አካል */}
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {mainContent}
      </main>

      {/* የስህተት መልዕክት ማሳያ (ምንም ጥቅም ላይ አልዋለም፣ ግን ለስህተት ማረጋገጫ) */}
      <div className="fixed bottom-0 left-0 right-0 p-2 bg-yellow-100 text-yellow-800 text-center text-xs">
          **ማስታወሻ:** ይህ የ Firebase Firestore እና Authን የሚጠቀም ሙሉ የReact መተግበሪያ ነው።
      </div>
    </div>
  );
};

export default App;

