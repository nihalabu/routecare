// src/pages/user/request-service.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function RequestService() {
  const router = useRouter();
  const { serviceId } = router.query;
  const { user } = useAuth();
  
  const [userData, setUserData] = useState(null);
  const [caretakerData, setCaretakerData] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '10:00',
    serviceAddress: '',
    specialRequirements: ''
  });

  useEffect(() => {
    if (user && serviceId) {
      fetchData();
    }
  }, [user, serviceId]);

  const fetchData = async () => {
    try {
      // Get user data
      const userQuery = query(collection(db, 'nriUsers'), where('userId', '==', user.uid));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userInfo = userSnapshot.docs[0].data();
        setUserData(userInfo);
        setFormData(prev => ({
          ...prev,
          serviceAddress: userInfo.profile.propertyAddress
        }));
        
        // Get caretaker data
        if (userInfo.linkedCaretakers && userInfo.linkedCaretakers.length > 0) {
          const caretakerQuery = query(
            collection(db, 'caretakers'),
            where('caretakerId', '==', userInfo.linkedCaretakers[0])
          );
          const caretakerSnapshot = await getDocs(caretakerQuery);
          
          if (!caretakerSnapshot.empty) {
            const caretakerInfo = caretakerSnapshot.docs[0].data();
            setCaretakerData(caretakerInfo);
            
            // Find the selected service
            const service = caretakerInfo.servicesOffered.find(s => s.id === serviceId);
            setSelectedService(service);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const generateRequestId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let id = 'REQ_';
    for (let i = 0; i < 3; i++) {
      id += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      id += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return id;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const requestData = {
        requestId: generateRequestId(),
        
        // User Info
        userId: user.uid,
        userName: userData.profile.name,
        userEmail: userData.profile.email,
        userPhone: userData.profile.phone,
        
        // Caretaker Info
        caretakerId: caretakerData.caretakerId,
        caretakerUserId: caretakerData.userId,
        caretakerName: caretakerData.profile.name,
        
        // Service Info
        serviceId: selectedService.id,
        serviceName: selectedService.serviceName,
        serviceCategory: selectedService.category,
        servicePrice: selectedService.price,
        
        // Request Details
        serviceAddress: formData.serviceAddress,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        specialRequirements: formData.specialRequirements,
        
        // Status
        status: 'pending',
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date().toISOString(),
            note: 'Service requested by user'
          }
        ],
        
        // Communication
        messages: [],
        
        // Proof and Completion
        proofOfWork: [],
        workDescription: '',
        completionNotes: '',
        completedAt: null,
        
        // Payment
        payment: {
          amount: selectedService.price,
          status: 'pending',
          method: '',
          paidAt: null
        },
        
        // Rating
        rating: 0,
        review: '',
        reviewedAt: null,
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'serviceRequests'), requestData);
      
      alert('Service request submitted successfully!');
      router.push('/user');
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!selectedService) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Service not found</p>
          <button onClick={() => router.push('/user')} className="px-4 py-2 bg-indigo-600 text-white rounded">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/user')}
              className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm mb-4"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Request Service</h1>
            <p className="text-gray-600 mt-2">Fill in the details to request this service</p>
          </div>

          {/* Service Details */}
          <div className="mb-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-start gap-4">
              {selectedService.image && (
                <img 
                  src={selectedService.image} 
                  alt={selectedService.serviceName}
                  className="w-24 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{selectedService.serviceName}</h2>
                <p className="text-sm text-gray-600 mb-2">{selectedService.description}</p>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-indigo-600">₹{selectedService.price}</span>
                  <span className="text-sm text-gray-500">{selectedService.duration}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Caretaker Info */}
          <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Caretaker Details</h3>
            <p className="text-sm text-gray-600"><strong>Name:</strong> {caretakerData.profile.name}</p>
            <p className="text-sm text-gray-600"><strong>Phone:</strong> {caretakerData.profile.phone}</p>
            <p className="text-sm text-gray-600"><strong>Service Area:</strong> {caretakerData.profile.serviceArea}</p>
          </div>

          {/* Request Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  required
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Time *
                </label>
                <select
                  name="scheduledTime"
                  required
                  value={formData.scheduledTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="08:00">08:00 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Address *
              </label>
              <textarea
                name="serviceAddress"
                required
                value={formData.serviceAddress}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter the address where service is needed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Requirements (Optional)
              </label>
              <textarea
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleChange}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Any specific instructions or requirements for the caretaker..."
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2">Request Summary</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Service:</strong> {selectedService.serviceName}</p>
                <p><strong>Price:</strong> ₹{selectedService.price}</p>
                <p><strong>Duration:</strong> {selectedService.duration}</p>
                {formData.scheduledDate && (
                  <p><strong>Date:</strong> {new Date(formData.scheduledDate).toLocaleDateString()} at {formData.scheduledTime}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/user')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}