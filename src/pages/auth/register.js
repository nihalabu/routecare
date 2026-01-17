// src/pages/auth/register.js
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function Register() {
  const { user, updateUserProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Role Selection, 2: Details Form
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Common fields
  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  
  // Caretaker specific
  const [address, setAddress] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [experience, setExperience] = useState('');
  const [services, setServices] = useState([
    { serviceName: '', category: 'home_maintenance', description: '', price: '', duration: '', image: '' }
  ]);
  
  // User (NRI) specific
  const [currentLocation, setCurrentLocation] = useState('');
  const [hometown, setHometown] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [caretakerId, setCaretakerId] = useState('');
  const [caretakerVerified, setCaretakerVerified] = useState(false);
  const [caretakerInfo, setCaretakerInfo] = useState(null);

  // Generate unique caretaker ID
  const generateCaretakerId = async () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let isUnique = false;
    let id = '';
    
    while (!isUnique) {
      id = 'CT_';
      for (let i = 0; i < 3; i++) {
        id += letters.charAt(Math.floor(Math.random() * letters.length));
      }
      for (let i = 0; i < 3; i++) {
        id += numbers.charAt(Math.floor(Math.random() * numbers.length));
      }
      
      const q = query(collection(db, 'caretakers'), where('caretakerId', '==', id));
      const snapshot = await getDocs(q);
      isUnique = snapshot.empty;
    }
    
    return id;
  };

  // Image compression
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

  const handleImageUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024) {
      alert('Image size should be less than 1MB');
      return;
    }

    const base64 = await compressImage(file);
    const updatedServices = [...services];
    updatedServices[index].image = base64;
    setServices(updatedServices);
  };

  const addService = () => {
    setServices([...services, { serviceName: '', category: 'home_maintenance', description: '', price: '', duration: '', image: '' }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index, field, value) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };

  const verifyCaretaker = async () => {
    if (!caretakerId.trim()) {
      alert('Please enter a Caretaker ID');
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'caretakers'), where('caretakerId', '==', caretakerId.toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert('Caretaker ID not found. Please check and try again.');
        setCaretakerVerified(false);
        setCaretakerInfo(null);
      } else {
        setCaretakerInfo(snapshot.docs[0].data());
        setCaretakerVerified(true);
        alert('Caretaker verified successfully!');
      }
    } catch (error) {
      console.error('Error verifying caretaker:', error);
      alert('Failed to verify Caretaker ID');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update user role
      await updateUserProfile({ role });

      if (role === 'caretaker') {
        // Create caretaker profile
        const generatedId = await generateCaretakerId();
        const validServices = services.filter(s => s.serviceName.trim() !== '');

        await addDoc(collection(db, 'caretakers'), {
          userId: user.uid,
          caretakerId: generatedId,
          profile: {
            name,
            email: user.email,
            phone,
            address,
            serviceArea,
            experience,
            photoURL: user.photoURL || ''
          },
          servicesOffered: validServices.map((service, index) => ({
            id: `service_${index + 1}`,
            ...service,
            price: parseFloat(service.price) || 0
          })),
          availability: true,
          rating: 0,
          totalRatings: 0,
          completedServices: 0,
          verified: true,
          createdAt: new Date().toISOString()
        });

        alert(`Registration successful! Your Caretaker ID is: ${generatedId}`);
        router.push('/caretaker');
      } else {
        // Create NRI user profile
        if (!caretakerVerified) {
          alert('Please verify the Caretaker ID before submitting');
          setLoading(false);
          return;
        }

        await addDoc(collection(db, 'nriUsers'), {
          userId: user.uid,
          profile: {
            name,
            email: user.email,
            phone,
            currentLocation,
            hometown,
            propertyAddress,
            photoURL: user.photoURL || ''
          },
          linkedCaretakers: [caretakerId.toUpperCase()],
          createdAt: new Date().toISOString()
        });

        alert('Registration successful!');
        router.push('/user');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    // Role Selection
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Complete Your Registration</h1>
          <p className="text-gray-600 text-center mb-8">Select your role to continue</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div
              onClick={() => handleRoleSelection('caretaker')}
              className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-600 hover:bg-indigo-50 transition"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Caretaker</h3>
                <p className="text-sm text-gray-600">I provide services like home maintenance and parent care</p>
              </div>
            </div>

            <div
              onClick={() => handleRoleSelection('user')}
              className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-600 hover:bg-indigo-50 transition"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">NRI User</h3>
                <p className="text-sm text-gray-600">I need services for my home and parents in India</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Details Form
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">
            {role === 'caretaker' ? 'Caretaker' : 'NRI User'} Registration
          </h1>
          <p className="text-gray-600 mb-8">Complete your profile details</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Common Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-XXXXXXXXXX"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Caretaker Specific Fields */}
            {role === 'caretaker' && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Address *</label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Service Area *</label>
                    <input
                      type="text"
                      required
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      placeholder="City, State"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Experience *</label>
                    <input
                      type="text"
                      required
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="e.g., 5 years"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Services */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Services You Offer</h3>
                  {services.map((service, index) => (
                    <div key={index} className="mb-4 p-4 border rounded-lg">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium">Service {index + 1}</h4>
                        {services.length > 1 && (
                          <button type="button" onClick={() => removeService(index)} className="text-red-600 text-sm">
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Service Name *"
                          value={service.serviceName}
                          onChange={(e) => updateService(index, 'serviceName', e.target.value)}
                          className="px-3 py-2 border rounded-md"
                        />
                        <select
                          value={service.category}
                          onChange={(e) => updateService(index, 'category', e.target.value)}
                          className="px-3 py-2 border rounded-md"
                        >
                          <option value="home_maintenance">Home Maintenance</option>
                          <option value="parent_care">Parent Care</option>
                          <option value="property_inspection">Property Inspection</option>
                        </select>
                        <div className="md:col-span-2">
                          <textarea
                            placeholder="Description"
                            value={service.description}
                            onChange={(e) => updateService(index, 'description', e.target.value)}
                            rows="2"
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>
                        <input
                          type="number"
                          placeholder="Price (₹)"
                          value={service.price}
                          onChange={(e) => updateService(index, 'price', e.target.value)}
                          className="px-3 py-2 border rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Duration"
                          value={service.duration}
                          onChange={(e) => updateService(index, 'duration', e.target.value)}
                          className="px-3 py-2 border rounded-md"
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm mb-1">Service Image (Optional)</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(index, e)}
                            className="w-full"
                          />
                          {service.image && <img src={service.image} alt="Preview" className="mt-2 h-32 object-cover rounded" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addService} className="text-indigo-600 text-sm font-medium">
                    + Add Another Service
                  </button>
                </div>
              </>
            )}

            {/* NRI User Specific Fields */}
            {role === 'user' && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Location *</label>
                    <input
                      type="text"
                      required
                      value={currentLocation}
                      onChange={(e) => setCurrentLocation(e.target.value)}
                      placeholder="Country"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hometown (India) *</label>
                    <input
                      type="text"
                      required
                      value={hometown}
                      onChange={(e) => setHometown(e.target.value)}
                      placeholder="City, State"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Property Address in India *</label>
                    <textarea
                      required
                      value={propertyAddress}
                      onChange={(e) => setPropertyAddress(e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Caretaker ID Verification */}
                <div>
                  <label className="block text-sm font-medium mb-1">Caretaker ID *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={caretakerId}
                      onChange={(e) => setCaretakerId(e.target.value.toUpperCase())}
                      placeholder="CT_ABC123"
                      disabled={caretakerVerified}
                      className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 uppercase"
                    />
                    <button
                      type="button"
                      onClick={verifyCaretaker}
                      disabled={caretakerVerified}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {caretakerVerified ? '✓ Verified' : 'Verify'}
                    </button>
                  </div>
                  {caretakerVerified && caretakerInfo && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm">
                      <p className="font-semibold text-green-900">✓ {caretakerInfo.profile.name}</p>
                      <p className="text-green-700">Service Area: {caretakerInfo.profile.serviceArea}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (role === 'user' && !caretakerVerified)}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}