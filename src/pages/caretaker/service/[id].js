// src/pages/caretaker/service/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function ServiceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Status update
  const [workDescription, setWorkDescription] = useState('');
  
  // Message
  const [message, setMessage] = useState('');
  
  // Proof upload
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofImages, setProofImages] = useState([]);
  const [proofCaption, setProofCaption] = useState('');

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    try {
      const docRef = doc(db, 'serviceRequests', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setRequest({ id: docSnap.id, ...docSnap.data() });
        setWorkDescription(docSnap.data().workDescription || '');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height && width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          } else if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    const compressed = [];
    
    for (const file of files) {
      if (file.size > 1024 * 1024) {
        alert(`${file.name} is too large. Max size is 1MB`);
        continue;
      }
      
      const base64 = await compressImage(file);
      compressed.push(base64);
    }
    
    setProofImages([...proofImages, ...compressed]);
  };

  const removeProofImage = (index) => {
    setProofImages(proofImages.filter((_, i) => i !== index));
  };

  const updateStatus = async (newStatus) => {
    if (!confirm(`Are you sure you want to change status to "${newStatus}"?`)) {
      return;
    }

    setUpdating(true);
    try {
      const requestRef = doc(db, 'serviceRequests', id);
      
      const updates = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: `Status changed to ${newStatus}`
        })
      };

      if (newStatus === 'completed') {
        updates.completedAt = new Date().toISOString();
      }

      await updateDoc(requestRef, updates);
      await fetchRequest();
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const updateWorkDescription = async () => {
    setUpdating(true);
    try {
      const requestRef = doc(db, 'serviceRequests', id);
      await updateDoc(requestRef, {
        workDescription,
        updatedAt: new Date().toISOString()
      });
      
      alert('Work description updated!');
      await fetchRequest();
    } catch (error) {
      console.error('Error updating description:', error);
      alert('Failed to update description');
    } finally {
      setUpdating(false);
    }
  };

  const uploadProof = async () => {
    if (proofImages.length === 0) {
      alert('Please select at least one image');
      return;
    }

    setUploadingProof(true);
    try {
      const requestRef = doc(db, 'serviceRequests', id);
      
      const proofData = proofImages.map(image => ({
        type: 'image',
        data: image,
        caption: proofCaption,
        timestamp: new Date().toISOString()
      }));

      await updateDoc(requestRef, {
        proofOfWork: arrayUnion(...proofData),
        updatedAt: new Date().toISOString()
      });

      setProofImages([]);
      setProofCaption('');
      alert('Proof uploaded successfully!');
      await fetchRequest();
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('Failed to upload proof');
    } finally {
      setUploadingProof(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    setUpdating(true);
    try {
      const requestRef = doc(db, 'serviceRequests', id);
      
      await updateDoc(requestRef, {
        messages: arrayUnion({
          senderId: user.uid,
          senderName: request.caretakerName,
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
      setUpdating(false);
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
          <button onClick={() => router.push('/caretaker')} className="px-4 py-2 bg-indigo-600 text-white rounded">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => router.push('/caretaker')}
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
              <h3 className="font-semibold mb-2">Client Details</h3>
              <p className="text-sm text-gray-600"><strong>Name:</strong> {request.userName}</p>
              <p className="text-sm text-gray-600"><strong>Phone:</strong> {request.userPhone}</p>
              <p className="text-sm text-gray-600"><strong>Email:</strong> {request.userEmail}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Service Details</h3>
              <p className="text-sm text-gray-600"><strong>Date:</strong> {new Date(request.scheduledDate).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600"><strong>Time:</strong> {request.scheduledTime}</p>
              <p className="text-sm text-gray-600"><strong>Price:</strong> ₹{request.servicePrice}</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Service Address</h3>
            <p className="text-sm text-gray-600">{request.serviceAddress}</p>
          </div>

          {request.specialRequirements && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold mb-1 text-sm">Special Requirements</h3>
              <p className="text-sm text-gray-700">{request.specialRequirements}</p>
            </div>
          )}
        </div>

        {/* Status Update */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Update Status</h2>
          
          {/* Status Timeline */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Status History</h3>
            <div className="space-y-2">
              {request.statusHistory && request.statusHistory.map((history, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-400">{new Date(history.timestamp).toLocaleString()}</span>
                  <span className="font-medium">{history.status.replace('_', ' ').toUpperCase()}</span>
                  <span className="text-gray-600">- {history.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            {request.status === 'pending' && (
              <button
                onClick={() => updateStatus('in_progress')}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Start Service
              </button>
            )}
            
            {request.status === 'in_progress' && (
              <button
                onClick={() => updateStatus('completed')}
                disabled={updating}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Mark as Completed
              </button>
            )}
            
            {request.status !== 'cancelled' && request.status !== 'completed' && (
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Service
              </button>
            )}
          </div>
        </div>

        {/* Work Description */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Work Description</h2>
          <textarea
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 mb-3"
            placeholder="Describe the work done, any issues found, recommendations, etc."
          />
          <button
            onClick={updateWorkDescription}
            disabled={updating}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Save Description
          </button>
        </div>

        {/* Upload Proof */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Upload Proof of Work</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="w-full"
            />
          </div>

          {proofImages.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Selected Images ({proofImages.length})</p>
              <div className="grid grid-cols-3 gap-3">
                {proofImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img src={image} alt={`Proof ${index + 1}`} className="w-full h-32 object-cover rounded" />
                    <button
                      onClick={() => removeProofImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Caption (Optional)</label>
            <input
              type="text"
              value={proofCaption}
              onChange={(e) => setProofCaption(e.target.value)}
              placeholder="Add a description for the images"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={uploadProof}
            disabled={uploadingProof || proofImages.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {uploadingProof ? 'Uploading...' : 'Upload Proof'}
          </button>

          {/* Existing Proof */}
          {request.proofOfWork && request.proofOfWork.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Uploaded Proof</h3>
              <div className="grid grid-cols-3 gap-4">
                {request.proofOfWork.map((proof, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <img src={proof.data} alt={`Proof ${index + 1}`} className="w-full h-32 object-cover" />
                    {proof.caption && (
                      <p className="p-2 text-xs text-gray-600">{proof.caption}</p>
                    )}
                    <p className="p-2 text-xs text-gray-400">{new Date(proof.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Communication</h2>
          
          {/* Message History */}
          <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
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

          {/* Send Message */}
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message to the client..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendMessage}
              disabled={updating || !message.trim()}
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

export default function ServiceDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['caretaker']}>
      <ServiceDetail />
    </ProtectedRoute>
  );
}