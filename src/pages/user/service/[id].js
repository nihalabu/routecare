// src/pages/user/service/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function UserServiceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Rating
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequest();
      // Auto-refresh every 10 seconds to get updates
      const interval = setInterval(fetchRequest, 10000);
      return () => clearInterval(interval);
    }
  }, [id]);

  const fetchRequest = async () => {
    try {
      const docRef = doc(db, 'serviceRequests', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setRequest(data);
        setRating(data.rating || 0);
        setReview(data.review || '');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      const requestRef = doc(db, 'serviceRequests', id);
      
      await updateDoc(requestRef, {
        messages: arrayUnion({
          senderId: user.uid,
          senderName: request.userName,
          message: message,
          timestamp: new Date().toISOString()
        }),
        updatedAt: new Date().toISOString()
      });

      setMessage('');
      await fetchRequest();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmittingReview(true);
    try {
      const requestRef = doc(db, 'serviceRequests', id);
      
      await updateDoc(requestRef, {
        rating,
        review,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      alert('Thank you for your feedback!');
      await fetchRequest();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusStep = (status) => {
    const steps = {
      pending: 1,
      in_progress: 2,
      completed: 3,
      cancelled: 0
    };
    return steps[status] || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Request not found</p>
          <button onClick={() => router.push('/user')} className="px-4 py-2 bg-indigo-600 text-white rounded">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentStep = getStatusStep(request.status);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => router.push('/user')}
          className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm mb-4"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{request.serviceName}</h1>
              <p className="text-sm text-gray-500">Request ID: {request.requestId}</p>
            </div>
            <span className={`px-4 py-2 text-sm font-semibold rounded-full border-2 ${getStatusColor(request.status)}`}>
              {request.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Caretaker Details</h3>
              <p className="text-sm text-gray-600"><strong>Name:</strong> {request.caretakerName}</p>
              <p className="text-sm text-gray-600"><strong>Caretaker ID:</strong> {request.caretakerId}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Service Details</h3>
              <p className="text-sm text-gray-600"><strong>Date:</strong> {new Date(request.scheduledDate).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600"><strong>Time:</strong> {request.scheduledTime}</p>
              <p className="text-sm text-gray-600"><strong>Price:</strong> ₹{request.servicePrice}</p>
              <p className="text-sm text-gray-600"><strong>Payment:</strong> {request.payment?.status || 'Pending'}</p>
            </div>
          </div>
        </div>

        {/* Status Progress */}
        {request.status !== 'cancelled' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-6">Service Progress</h2>
            
            <div className="flex items-center justify-between mb-8">
              {/* Step 1: Pending */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <p className="text-sm font-medium mt-2">Pending</p>
                <p className="text-xs text-gray-500">Waiting for start</p>
              </div>

              <div className={`flex-1 h-1 ${currentStep >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>

              {/* Step 2: In Progress */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > 2 ? '✓' : '2'}
                </div>
                <p className="text-sm font-medium mt-2">In Progress</p>
                <p className="text-xs text-gray-500">Service ongoing</p>
              </div>

              <div className={`flex-1 h-1 ${currentStep >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>

              {/* Step 3: Completed */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep >= 3 ? '✓' : '3'}
                </div>
                <p className="text-sm font-medium mt-2">Completed</p>
                <p className="text-xs text-gray-500">Service done</p>
              </div>
            </div>

            {/* Status History */}
            <div>
              <h3 className="font-semibold mb-3">Status Updates</h3>
              <div className="space-y-2">
                {request.statusHistory && request.statusHistory.map((history, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm p-2 bg-gray-50 rounded">
                    <span className="text-gray-500">{new Date(history.timestamp).toLocaleString()}</span>
                    <span className="font-medium text-indigo-600">{history.status.replace('_', ' ').toUpperCase()}</span>
                    <span className="text-gray-600">- {history.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Work Description */}
        {request.workDescription && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Work Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{request.workDescription}</p>
          </div>
        )}

        {/* Proof of Work */}
        {request.proofOfWork && request.proofOfWork.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Proof of Work</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {request.proofOfWork.map((proof, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <img 
                    src={proof.data} 
                    alt={`Proof ${index + 1}`} 
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90"
                    onClick={() => window.open(proof.data, '_blank')}
                  />
                  {proof.caption && (
                    <p className="p-2 text-sm text-gray-600">{proof.caption}</p>
                  )}
                  <p className="px-2 pb-2 text-xs text-gray-400">{new Date(proof.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating & Review */}
        {request.status === 'completed' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Rate This Service</h2>
            
            {request.rating > 0 ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="font-semibold text-green-900 mb-2">You rated this service</p>
                <div className="flex items-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-2xl">
                      {star <= request.rating ? '⭐' : '☆'}
                    </span>
                  ))}
                </div>
                {request.review && (
                  <p className="text-sm text-gray-700 italic">"{request.review}"</p>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Rating *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-3xl hover:scale-110 transition"
                      >
                        {star <= rating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Review (Optional)</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    placeholder="Share your experience..."
                  />
                </div>

                <button
                  onClick={submitRating}
                  disabled={submittingReview || rating === 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Messages</h2>
          
          <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
            {request.messages && request.messages.length > 0 ? (
              request.messages.map((msg, index) => (
                <div key={index} className={`mb-3 ${msg.senderId === user.uid ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-md px-4 py-2 rounded-lg ${
                    msg.senderId === user.uid ? 'bg-indigo-100' : 'bg-gray-100'
                  }`}>
                    <p className="text-xs font-semibold mb-1">{msg.senderName}</p>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center text-sm">No messages yet</p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message to the caretaker..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !message.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserServiceDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['user']}>
      <UserServiceDetail />
    </ProtectedRoute>
  );
}