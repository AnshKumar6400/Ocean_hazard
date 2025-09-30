import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map, { Marker } from "react-map-gl";

export default function ReportForm() {
  const [reporterName, setReporterName] = useState('');
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [message, setMessage] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  // Automatically get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
        },
        (err) => {
          console.error('Error getting location', err);
          setMessage('Cannot get location. Please allow location access.');
        }
      );
    } else {
      setMessage('Geolocation not supported by your browser.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!lat || !lng) {
      setMessage('Waiting for location...');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('reporter_name', reporterName);
      formData.append('report_type', reportType);
      formData.append('description', description);
      formData.append('lat', lat);
      formData.append('lng', lng);
      if (photo) formData.append('photo', photo);

      await axios.post('http://localhost:5000/api/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('Report submitted successfully!');
      setReporterName('');
      setReportType('');
      setDescription('');
      setPhoto(null);
      setUseCustomLocation(false);
    } catch (err) {
      console.error(err);
      setMessage('Error submitting report.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-b from-blue-50 to-white">
      
      {/* Left Panel - Motivation / Stats */}
      <div className="hidden md:flex flex-col w-full md:w-1/2 relative p-8 justify-between">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixid=MnwzNjUyOXwwfDF8c2VhcmNofDJ8fG9jZWFuJTIwaGF6YXJkcyUyQ3xlbnwwfDB8fHww&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=60"
            alt="Marine Hazards"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
              Your Report Can Save Lives
            </h1>
            <p className="text-gray-700 mb-6">
              Timely hazard reports are crucial in preventing environmental disasters and saving lives. Your contribution strengthens early warning systems and helps authorities respond faster.
            </p>
          </div>

          {/* General Impact Stats */}
          <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Community Impact</h2>
            <div className="flex flex-col gap-3 text-gray-700">
              <div className="flex justify-between">
                <span>Incidents Preventable by Timely Reporting</span>
                <span className="font-semibold text-emerald-600">≈30%</span>
              </div>
              <div className="flex justify-between">
                <span>Average Response Delay (Hazard to Action)</span>
                <span className="font-semibold text-red-600">48 hours</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Coastal Pollution Events</span>
                <span className="font-semibold text-amber-600">~1,200 events</span>
              </div>
              <div className="flex justify-between">
                <span>Marine Wildlife Affected Annually</span>
                <span className="font-semibold text-teal-600">80 million</span>
              </div>
              <div className="flex justify-between">
                <span>Economic Loss Due to Late Reporting</span>
                <span className="font-semibold text-purple-600">$1.5B+ globally</span>
              </div>
            </div>
          </div>

          {/* Motivational Footer */}
          <div className="mt-6 text-gray-700">
            <p className="text-sm">
              Every observation matters. By reporting hazards promptly, you help protect communities, reduce environmental risks, and make a real difference.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Hazard Report Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg flex flex-col gap-6 bg-white rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 text-center">
            Submit Hazard Report
          </h2>
          <p className="text-sm text-gray-500 text-center">
            Fill out the form below to notify authorities.
          </p>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              required
              placeholder="Enter your name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          {/* Hazard Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hazard Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            >
              <option value="">Select Hazard Type</option>
              <option value="Flood">Flood</option>
              <option value="Oil Spill">Oil Spill</option>
              <option value="High Waves">High Waves</option>
              <option value="Marine Fire">Marine Fire</option>
              <option value="Accident">Accident</option>
              <option value="Dead Fish">Dead Fish</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Describe the hazard..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-28 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload or Capture Photo
            </label>
            <input
              type="file"
              accept="image/*;capture=camera"
              onChange={(e) => setPhoto(e.target.files[0])}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition"
            />
          </div>

          {/* Custom Location Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="customLocation"
              checked={useCustomLocation}
              onChange={(e) => setUseCustomLocation(e.target.checked)}
            />
            <label htmlFor="customLocation" className="text-sm text-gray-700">
              Choose location manually
            </label>
          </div>

          {/* Map for manual location selection */}
          {useCustomLocation && lat && lng && (
            <div className="h-64 w-full mt-2">
              <Map
                mapboxAccessToken="pk.eyJ1IjoiYW5zaDY0MDAiLCJhIjoiY21nM2p3ZXRrMGYxdTJxcXl1OXBkNmQ2dyJ9.aOP2X8_2NPPISc8Ytp2xdA"
                initialViewState={{
                  latitude: lat,
                  longitude: lng,
                  zoom: 12,
                }}
                style={{ width: "100%", height: "100%" }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
                onClick={(e) => {
                  setLat(e.lngLat.lat);
                  setLng(e.lngLat.lng);
                }}
              >
                <Marker
                  latitude={lat}
                  longitude={lng}
                  draggable
                  onDragEnd={(e) => {
                    setLat(e.lngLat.lat);
                    setLng(e.lngLat.lng);
                  }}
                />
              </Map>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all duration-200"
          >
            Submit Report
          </button>

          {message && (
            <p className="text-green-600 font-medium text-center mt-2">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
