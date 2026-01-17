// src/pages/user/setup-profile.js
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function UserProfileSetup() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.profile?.name || '',
    phone: '',
    currentLocation: '',
    hometown: '',
    propertyAddress: '',
    caretakerId: ''
  });
  const [error, setError] = useState('');
  const [caretakerVerified, setCaretakerVerified] = useState(false);
  const [caretakerInfo, setCaretakerInfo] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const verifyCaretakerId = async () => {
    if (!formData.caretakerId.trim()) {
      setError('Please enter a Caretaker ID');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const q = query(
        collection(db, 'caretakers'),
        where('caretakerId', '==', formData.caretakerId.toUpperCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Caretaker ID not found. Please check and try again.');
        setCaretakerVerified(false);
        setCaretakerInfo(null);
      } else {
        const caretakerData = snapshot.docs[0].data();
        setCaretakerInfo(caretakerData);
        setCaretakerVerified(true);
        setError('');
      }
    } catch (error) {
      console.error('Error verifying caretaker:', error);
      setError('Failed to verify Caretaker ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!caretakerVerified) {
      setError('Please verify the Caretaker ID before proceeding');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = {
        userId: user.uid,
        profile: {
          name: formData.name,
          email: user.email,
          phone: formData.phone,
          currentLocation: formData.currentLocation,
          hometown: formData.hometown,
          propertyAddress: formData.propertyAddress,
          photoURL: userProfile?.profile?.photoURL || ''
        },
        linkedCaretakers: [formData.caretakerId.toUpperCase()],
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'nriUsers'), userData);

      alert('Profile created successfully!');
      router.push('/user');
    } catch (error) {
      console.error('Error creating profile:', error);
      setError('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Your Profile</h1>
          <p className="text-gray-600 mb-8">Complete your profile to start requesting services</p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91-XXXXXXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Location (Country) *
                  </label>
                  <input
                    type="text"
                    name="currentLocation"
                    required
                    value={formData.currentLocation}
                    onChange={handleChange}
                    placeholder="e.g., USA, UK, UAE"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hometown (India) *
                  </label>
                  <input
                    type="text"
                    name="hometown"
                    required
                    value={formData.hometown}
                    onChange={handleChange}
                    placeholder="City, State"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Address in India *
                  </label>
                  <textarea
                    name="propertyAddress"
                    required
                    value={formData.propertyAddress}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Complete address where services are needed"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Caretaker ID Verification */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Link Your Caretaker</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter the Caretaker ID provided by your trusted caretaker. This ID links you to the person who will handle your service requests.
              </p>
              
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caretaker ID *
                  </label>
                  <input
                    type="text"
                    name="caretakerId"
                    value={formData.caretakerId}
                    onChange={handleChange}
                    placeholder="CT_ABC123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                    disabled={caretakerVerified}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={verifyCaretakerId}
                    disabled={loading || caretakerVerified}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {caretakerVerified ? '✓ Verified' : 'Verify'}
                  </button>
                </div>
              </div>

              {caretakerVerified && caretakerInfo && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-1">Caretaker Verified!</h3>
                      <div className="text-sm text-green-800">
                        <p><strong>Name:</strong> {caretakerInfo.profile.name}</p>
                        <p><strong>Service Area:</strong> {caretakerInfo.profile.serviceArea}</p>
                        <p><strong>Experience:</strong> {caretakerInfo.profile.experience}</p>
                        <p><strong>Services Offered:</strong> {caretakerInfo.servicesOffered.length} service(s)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !caretakerVerified}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}