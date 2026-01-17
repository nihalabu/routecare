// src/pages/user/index.js
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';

function UserDashboard() {
  const { user, userProfile, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [caretakerData, setCaretakerData] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchServiceRequests();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const q = query(collection(db, 'nriUsers'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setUserData(data);
        
        // Fetch caretaker data
        if (data.linkedCaretakers && data.linkedCaretakers.length > 0) {
          await fetchCaretakerData(data.linkedCaretakers[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaretakerData = async (caretakerId) => {
    try {
      const q = query(collection(db, 'caretakers'), where('caretakerId', '==', caretakerId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setCaretakerData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    } catch (error) {
      console.error('Error fetching caretaker:', error);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const q = query(collection(db, 'serviceRequests'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setServiceRequests(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-indigo-600">Route Care - User Portal</h1>
              {userData && (
                <p className="text-xs text-gray-500">Welcome, {userData.profile.name}</p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-sm text-gray-700 hover:text-indigo-600">
                Home
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Info */}
        {userData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600"><strong>Name:</strong> {userData.profile.name}</p>
                <p className="text-sm text-gray-600"><strong>Email:</strong> {userData.profile.email}</p>
                <p className="text-sm text-gray-600"><strong>Phone:</strong> {userData.profile.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600"><strong>Current Location:</strong> {userData.profile.currentLocation}</p>
                <p className="text-sm text-gray-600"><strong>Hometown:</strong> {userData.profile.hometown}</p>
                <p className="text-sm text-gray-600"><strong>Property Address:</strong> {userData.profile.propertyAddress}</p>
              </div>
            </div>
          </div>
        )}

        {/* Linked Caretaker */}
        {caretakerData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Caretaker</h2>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{caretakerData.profile.name}</h3>
                <p className="text-sm text-gray-600 mb-2">ID: {caretakerData.caretakerId}</p>
                <p className="text-sm text-gray-600"><strong>Service Area:</strong> {caretakerData.profile.serviceArea}</p>
                <p className="text-sm text-gray-600"><strong>Experience:</strong> {caretakerData.profile.experience}</p>
                <p className="text-sm text-gray-600"><strong>Contact:</strong> {caretakerData.profile.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Rating:</strong> ⭐ {caretakerData.rating || 0}/5
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Completed:</strong> {caretakerData.completedServices || 0} services
                </p>
              </div>
            </div>

            {/* Services Offered */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Services Offered</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {caretakerData.servicesOffered && caretakerData.servicesOffered.map((service, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    {service.image && (
                      <img src={service.image} alt={service.serviceName} className="w-full h-32 object-cover rounded mb-2" />
                    )}
                    <h5 className="font-semibold">{service.serviceName}</h5>
                    <p className="text-xs text-gray-500 mb-2">{service.category.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-indigo-600">₹{service.price}</span>
                      <span className="text-xs text-gray-500">{service.duration}</span>
                    </div>
                    <Link
                      href={`/user/request-service?serviceId=${service.id}`}
                      className="block w-full mt-3 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 text-center"
                    >
                      Request Service
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Service Requests */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Your Service Requests</h2>
          
          {serviceRequests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500">No service requests yet</p>
              <p className="text-sm text-gray-400 mt-2">Request a service from your caretaker above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {serviceRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{request.serviceName}</h3>
                      <p className="text-sm text-gray-500">Request ID: {request.requestId}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-sm text-gray-600"><strong>Scheduled:</strong> {new Date(request.scheduledDate).toLocaleDateString()} at {request.scheduledTime}</p>
                      <p className="text-sm text-gray-600"><strong>Price:</strong> ₹{request.servicePrice}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600"><strong>Caretaker:</strong> {request.caretakerName}</p>
                      <p className="text-sm text-gray-600"><strong>Payment:</strong> {request.payment?.status || 'Pending'}</p>
                    </div>
                  </div>

                  <Link
                    href={`/user/service/${request.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserPage() {
  return (
    <ProtectedRoute allowedRoles={['user']}>
      <UserDashboard />
    </ProtectedRoute>
  );
}