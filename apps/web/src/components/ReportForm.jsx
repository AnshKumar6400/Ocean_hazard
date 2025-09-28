import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map, { Marker, Popup, Source, Layer } from "react-map-gl";

export default function ReportForm() {
  const [reporterName, setReporterName] = useState('');
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [message, setMessage] = useState('');

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
    } catch (err) {
      console.error(err);
      setMessage('Error submitting report.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: '500px',
        margin: '50px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <h2>Submit Hazard Report</h2>

      <input
        type="text"
        placeholder="Your Name"
        value={reporterName}
        onChange={(e) => setReporterName(e.target.value)}
        required
      />

      <select
        value={reportType}
        onChange={(e) => setReportType(e.target.value)}
        required
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

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setPhoto(e.target.files[0])}
      />

      <button type="submit">Submit</button>

      {message && <p>{message}</p>}
    </form>
  );
}
