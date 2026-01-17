// src/pages/auth/select-role.js
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function SelectRole() {
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, updateUserProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Ensure user document exists when they reach this page
    if (user) {
      ensureUserDocument();
    }
  }, [user]);

  const ensureUserDocument = async () => {
    try {
      // Create or update the user document to ensure it exists
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: '', // Will be set when role is selected
        profile: {
          name: user.displayName || '',
          phone: '',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString()
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error ensuring user document:', error);
    }
  };

  const handleRoleSelection = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      await updateUserProfile({ role: selectedRole });
      
      // Redirect to appropriate profile setup
      if (selectedRole === 'caretaker') {
        router.push('/caretaker/setup-profile');
      } else {
        router.push('/user/setup-profile');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Route Care!</h1>
          <p className="text-gray-600">Please select your role to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Caretaker Option */}
          <div
            onClick={() => setSelectedRole('caretaker')}
            className={`p-6 border-2 rounded-lg cursor-pointer transition ${
              selectedRole === 'caretaker'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Caretaker</h3>
              <p className="text-sm text-gray-600">
                I provide services like home maintenance, property inspection, and parent care
              </p>
              <ul className="mt-4 text-xs text-gray-500 space-y-1 text-left">
                <li>✓ Create service offerings</li>
                <li>✓ Receive service requests</li>
                <li>✓ Upload proof of work</li>
                <li>✓ Get paid for services</li>
              </ul>
            </div>
          </div>

          {/* User (NRI) Option */}
          <div
            onClick={() => setSelectedRole('user')}
            className={`p-6 border-2 rounded-lg cursor-pointer transition ${
              selectedRole === 'user'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">NRI User</h3>
              <p className="text-sm text-gray-600">
                I need services for my home/property and parents in India
              </p>
              <ul className="mt-4 text-xs text-gray-500 space-y-1 text-left">
                <li>✓ Request services from caretakers</li>
                <li>✓ Track service status</li>
                <li>✓ View proof of work</li>
                <li>✓ Rate and review services</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={handleRoleSelection}
          disabled={!selectedRole || loading}
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}