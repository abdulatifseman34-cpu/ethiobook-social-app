/* global __app_id, __firebase_config, __initial_auth_token */
import React from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase Setup
// @ts-expect-error __app_id is provided globally
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// @ts-expect-error __firebase_config is provided globally
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
// @ts-expect-error __initial_auth_token is provided globally
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const POSTS_COLLECTION_PATH = `/artifacts/${appId}/public/data/posts`;
const FOLLOWS_COLLECTION_PATH = `/artifacts/${appId}/users`;
const DMS_COLLECTION_PATH = `/artifacts/${appId}/public/data/messages_thread`;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// SVG Icons
interface IconProps {
  className?: string;
  isLiked?: boolean;
  isFollowing?: boolean;
}

const HeartIcon = ({ isLiked, className = "" }: IconProps) => (
  <svg className={`w-6 h-6 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill={isLiked ? "rgb(239 68 68)" : "none"} xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" strokeWidth="2" stroke={isLiked ? "rgb(239 68 68)" : "currentColor"} />
  </svg>
);

const EditIcon = ({ className = "" }: IconProps) => (
  <svg className={`w-5 h-5 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.05 4.50005L3 12.5501V16.7001L7.15 20.8501H15.2L23.25 12.8001L19.1 8.65005L11.05 4.50005Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.15 11.55L19.1 8.6L15.2 4.7L12.25 7.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeleteIcon = ({ className = "" }: IconProps) => (
  <svg className={`w-5 h-5 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 7H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MessageIcon = ({ className = "" }: IconProps) => (
  <svg className={`w-6 h-6 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V8.5C21 7.11929 19.8807 6 18.5 6H7.5C6.11929 6 5 7.11929 5 8.5V15L3 17V19H21V17L19 15H21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 10.5H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 10.5H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 10.5H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UserPlusIcon = ({ isFollowing, className = "" }: IconProps) => (
  <svg className={`w-5 h-5 transition-colors duration-200 ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {isFollowing ? (
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <>
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 8h3m-1.5-1.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

// Helper Functions
// Helper Functions (for future use)
// const generateRandomUserId = () => {
//   return 'User_' + Math.random().toString(36).substring(2, 8);
// };

const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'አሁን';
  const date = new Date(timestamp);
  return date.toLocaleDateString('am-ET', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) as string;
};

// Mark used for future reference
void formatTimestamp;

// Main App Component with Vercel Analytics enabled
export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">EthioBook Social</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <p className="text-gray-700">Welcome to EthioBook Social App with Vercel Web Analytics enabled for tracking user behavior and performance metrics.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
