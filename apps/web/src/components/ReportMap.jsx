import React, { useEffect, useState, useRef } from "react";
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYW5zaDY0MDAiLCJhIjoiY21nM2p3ZXRrMGYxdTJxcXl1OXBkNmQ2dyJ9.aOP2X8_2NPPISc8Ytp2xdA";

mapboxgl.accessToken = MAPBOX_TOKEN;

const ReportMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [reports, setReports] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markers = useRef([]);
  const hotspotMarkers = useRef([]);

  // Hotspot configuration
  const HOTSPOT_CONFIG = {
    MIN_REPORTS: 5,
    MAX_REPORTS: 10,
    CLUSTER_RADIUS: 1000, // meters - reports within this radius will be clustered
    HOTSPOT_RADIUS: 500, // meters - geofence radius around hotspot center
  };

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          checkGeofences(location);
        },
        (error) => {
          console.error("Error getting location:", error);
          const defaultLocation = { lat: 20.5937, lng: 78.9629 };
          setUserLocation(defaultLocation);
        }
      );
    }
  }, []);

  // Fetch reports from backend
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/reports');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setReports(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError(`Failed to load reports: ${err.message}`);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate distance between two points
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Create hotspots from reports
  const createHotspots = (reports) => {
    const clusters = [];
    const usedReports = new Set();

    reports.forEach((report, index) => {
      if (usedReports.has(index)) return;

      const cluster = [report];
      const clusterIndices = [index];
      
      // Find nearby reports
      reports.forEach((otherReport, otherIndex) => {
        if (index === otherIndex || usedReports.has(otherIndex)) return;
        
        const distance = calculateDistance(
          parseFloat(report.lat), parseFloat(report.lng),
          parseFloat(otherReport.lat), parseFloat(otherReport.lng)
        );
        
        if (distance <= HOTSPOT_CONFIG.CLUSTER_RADIUS) {
          cluster.push(otherReport);
          clusterIndices.push(otherIndex);
        }
      });

      // If cluster has enough reports, create a hotspot
      if (cluster.length >= HOTSPOT_CONFIG.MIN_REPORTS) {
        // Calculate center point
        const centerLat = cluster.reduce((sum, r) => sum + parseFloat(r.lat), 0) / cluster.length;
        const centerLng = cluster.reduce((sum, r) => sum + parseFloat(r.lng), 0) / cluster.length;
        
        // Get report type distribution
        const typeCount = {};
        cluster.forEach(r => {
          typeCount[r.report_type] = (typeCount[r.report_type] || 0) + 1;
        });
        
        // Find most common type
        const dominantType = Object.entries(typeCount)
          .sort(([,a], [,b]) => b - a)[0][0];

        const hotspot = {
          id: `hotspot-${Date.now()}-${index}`,
          centerLat,
          centerLng,
          reports: cluster,
          reportCount: cluster.length,
          dominantType,
          typeDistribution: typeCount,
          radius: HOTSPOT_CONFIG.HOTSPOT_RADIUS,
          severity: cluster.length >= 8 ? 'high' : cluster.length >= 6 ? 'medium' : 'low',
          createdAt: new Date().toISOString()
        };

        clusters.push(hotspot);
        
        // Mark reports as used
        clusterIndices.forEach(idx => usedReports.add(idx));
      }
    });

    return {
      hotspots: clusters,
      unclusteredReports: reports.filter((_, index) => !usedReports.has(index))
    };
  };

  // Update hotspots when reports change
  useEffect(() => {
    if (reports.length > 0) {
      const { hotspots: newHotspots } = createHotspots(reports);
      setHotspots(newHotspots);
    } else {
      setHotspots([]);
    }
  }, [reports]);

  // Initialize Mapbox map
  useEffect(() => {
    if (map.current) return;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [78.9629, 20.5937],
        zoom: 5,
        attributionControl: true
      });

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
      });

      map.current.on('styledata', () => {
        console.log('Map style loaded');
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Map failed to load. Please check your internet connection.');
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });
      
      map.current.addControl(geolocate, 'top-right');

      geolocate.on('geolocate', (e) => {
        const location = {
          lat: e.coords.latitude,
          lng: e.coords.longitude
        };
        setUserLocation(location);
        checkGeofences(location);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Convert meters to pixels at max zoom for circle radius
  const metersToPixelsAtMaxZoom = (meters, latitude) => {
    return meters / 0.075 / Math.cos(latitude * Math.PI / 180);
  };

  // Add hotspot markers and individual report markers
  useEffect(() => {
    if (!map.current || (!reports.length && !hotspots.length)) return;

    const addMarkersAndGeofences = () => {
      // Clear existing markers
      markers.current.forEach(marker => marker.remove());
      hotspotMarkers.current.forEach(marker => marker.remove());
      markers.current = [];
      hotspotMarkers.current = [];

      // Get unclustered reports
      const { unclusteredReports } = createHotspots(reports);

      // Add hotspot markers
      hotspots.forEach(hotspot => {
        const severityColors = {
          high: '#dc2626',
          medium: '#ea580c', 
          low: '#ca8a04'
        };

        const severityEmojis = {
          high: '🚨',
          medium: '⚠️',
          low: '📍'
        };

        // Create hotspot popup
        const hotspotPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-4 max-w-sm">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-2xl">${severityEmojis[hotspot.severity]}</span>
              <div>
                <h3 class="font-bold text-gray-900">Hotspot Area</h3>
                <span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                  ${hotspot.severity.toUpperCase()} PRIORITY
                </span>
              </div>
            </div>
            
            <div class="space-y-2 mb-3">
              <p class="text-sm"><strong>Reports:</strong> ${hotspot.reportCount}</p>
              <p class="text-sm"><strong>Primary Issue:</strong> ${hotspot.dominantType}</p>
              <p class="text-sm"><strong>Radius:</strong> ${hotspot.radius}m</p>
            </div>
            
            <div class="mb-3">
              <p class="text-sm font-medium mb-1">Issue Breakdown:</p>
              ${Object.entries(hotspot.typeDistribution)
                .map(([type, count]) => `
                  <div class="flex justify-between text-xs">
                    <span>${type}</span>
                    <span class="font-medium">${count}</span>
                  </div>
                `).join('')}
            </div>
            
            <div class="text-xs text-gray-500">
              Center: ${hotspot.centerLat.toFixed(4)}, ${hotspot.centerLng.toFixed(4)}
            </div>
          </div>
        `);

        // Create hotspot marker with custom HTML
        const hotspotElement = document.createElement('div');
        hotspotElement.className = 'hotspot-marker';
        hotspotElement.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: ${severityColors[hotspot.severity]};
            border: 4px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            animation: pulse 2s infinite;
          ">
            ${hotspot.reportCount}
          </div>
        `;

        const hotspotMarker = new mapboxgl.Marker(hotspotElement)
          .setLngLat([hotspot.centerLng, hotspot.centerLat])
          .setPopup(hotspotPopup)
          .addTo(map.current);

        hotspotMarkers.current.push(hotspotMarker);

        // Add hotspot geofence circle
        const hotspotSourceId = `hotspot-geofence-${hotspot.id}`;
        const hotspotLayerId = `hotspot-geofence-layer-${hotspot.id}`;
        
        if (map.current.getLayer(hotspotLayerId)) {
          map.current.removeLayer(hotspotLayerId);
        }
        if (map.current.getSource(hotspotSourceId)) {
          map.current.removeSource(hotspotSourceId);
        }
        
        map.current.addSource(hotspotSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [hotspot.centerLng, hotspot.centerLat]
            }
          }
        });

        map.current.addLayer({
          id: hotspotLayerId,
          source: hotspotSourceId,
          type: 'circle',
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, metersToPixelsAtMaxZoom(hotspot.radius, hotspot.centerLat)]
              ],
              base: 2
            },
            'circle-color': severityColors[hotspot.severity],
            'circle-opacity': 0.15,
            'circle-stroke-color': severityColors[hotspot.severity],
            'circle-stroke-width': 3,
            'circle-stroke-opacity': 0.7
          }
        });
      });

      // Add individual report markers for unclustered reports
      unclusteredReports.forEach(report => {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-3">
            <h3 class="font-bold text-gray-900">${report.report_type}</h3>
            <p class="text-sm text-gray-600 mt-1">${report.description}</p>
            ${report.reporter_name ? `<p class="text-xs text-purple-600 mt-1">By: ${report.reporter_name}</p>` : ''}
            ${report.photo_path ? `<img src="http://localhost:5000${report.photo_path}" alt="Report photo" class="w-full h-20 object-cover rounded mt-2" onerror="this.style.display='none'" />` : ''}
            <p class="text-xs text-gray-500 mt-2">${new Date(report.created_at).toLocaleDateString()}</p>
            <p class="text-xs text-gray-500">ID: ${report.id}</p>
          </div>
        `);

        const marker = new mapboxgl.Marker({
          color: getReportColor(report.report_type)
        })
          .setLngLat([parseFloat(report.lng), parseFloat(report.lat)])
          .setPopup(popup)
          .addTo(map.current);

        markers.current.push(marker);
      });
    };

    if (map.current.isStyleLoaded()) {
      addMarkersAndGeofences();
    } else {
      map.current.on('load', addMarkersAndGeofences);
    }
  }, [reports, hotspots]);

  // Check geofences for both hotspots and individual reports
  const checkGeofences = (location) => {
    if (!location) return;

    const newNotifications = [];
    
    // Check hotspot geofences
    hotspots.forEach(hotspot => {
      const distance = calculateDistance(
        location.lat, location.lng,
        hotspot.centerLat, hotspot.centerLng
      );
      
      if (distance <= hotspot.radius) {
        newNotifications.push({
          id: `hotspot-${hotspot.id}`,
          type: 'hotspot',
          title: `🚨 Entering ${hotspot.severity.toUpperCase()} Priority Zone`,
          message: `${hotspot.reportCount} ${hotspot.dominantType} reports in this area`,
          severity: hotspot.severity,
          distance: Math.round(distance),
          hotspotId: hotspot.id,
          reportCount: hotspot.reportCount
        });
      }
    });

    // Check individual report geofences for unclustered reports
    const { unclusteredReports } = createHotspots(reports);
    unclusteredReports.forEach(report => {
      if (report.geofence_radius) {
        const distance = calculateDistance(
          location.lat, location.lng,
          parseFloat(report.lat), parseFloat(report.lng)
        );
        
        if (distance <= report.geofence_radius) {
          newNotifications.push({
            id: `report-${report.id}`,
            type: 'report',
            title: '📍 Near reported issue',
            message: `${report.report_type}: ${report.description}`,
            severity: 'low',
            distance: Math.round(distance),
            reportId: report.id
          });
        }
      }
    });

    setNotifications(newNotifications);

    // Show browser notification for new alerts
    if (newNotifications.length > 0 && Notification.permission === 'granted') {
      newNotifications.forEach(notif => {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/warning-icon.png'
        });
      });
    }
  };

  const getReportColor = (reportType) => {
    const colors = {
      "Road Damage": "#dc2626",
      "Water Issue": "#2563eb",
      "Power Outage": "#eab308",
      "Waste Management": "#16a34a",
      "Street Light": "#f59e0b",
      "Traffic": "#7c3aed",
      "default": "#6b7280"
    };
    return colors[reportType] || colors.default;
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const refreshReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
        setError(null);
        
        if (userLocation) {
          checkGeofences(userLocation);
        }
      }
    } catch (err) {
      setError('Failed to refresh reports');
    } finally {
      setLoading(false);
    }
  };

  const focusOnReport = (report) => {
    if (map.current) {
      map.current.flyTo({
        center: [parseFloat(report.lng), parseFloat(report.lat)],
        zoom: 14,
        duration: 1000
      });
    }
    setSelectedReport(report);
  };

  const focusOnHotspot = (hotspot) => {
    if (map.current) {
      map.current.flyTo({
        center: [hotspot.centerLng, hotspot.centerLat],
        zoom: 13,
        duration: 1000
      });
    }
    setSelectedHotspot(hotspot);
  };

  // Request notification permission
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const { unclusteredReports } = reports.length > 0 ? createHotspots(reports) : { unclusteredReports: [] };

  return (
    <div className="w-full h-screen bg-gray-50">
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-emerald-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold"> Civic Reports - Hotspot Geofencing</h1>
          <div className="flex gap-4 items-center">
            <button 
              onClick={refreshReports}
              className="bg-emerald-500 px-4 py-2 rounded hover:bg-emerald-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
             Refresh
            </button>
            <div className="text-sm">
               Hotspots: {hotspots.length} |  Reports: {reports.length}
            </div>
            {notifications.length > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                {notifications.length} Alert{notifications.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          {notifications.map(notif => (
            <div key={notif.id} className={`flex items-center justify-between p-3 mb-2 bg-white rounded-lg border ${
              notif.severity === 'high' ? 'border-red-300 bg-red-50' :
              notif.severity === 'medium' ? 'border-orange-300 bg-orange-50' :
              'border-yellow-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {notif.type === 'hotspot' ? '🚨' : '⚠️'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{notif.title}</h4>
                  <p className="text-sm text-gray-700">{notif.message}</p>
                  <p className="text-xs text-gray-500">Distance: {notif.distance}m</p>
                  {notif.reportCount && (
                    <p className="text-xs text-red-600 font-medium">
                      {notif.reportCount} reports clustered
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {notif.hotspotId && (
                  <button 
                    onClick={() => {
                      const hotspot = hotspots.find(h => h.id === notif.hotspotId);
                      if (hotspot) focusOnHotspot(hotspot);
                    }}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    View Zone
                  </button>
                )}
                {notif.reportId && (
                  <button 
                    onClick={() => {
                      const report = reports.find(r => r.id === notif.reportId);
                      if (report) focusOnReport(report);
                    }}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    View Report
                  </button>
                )}
                <button 
                  onClick={() => dismissNotification(notif.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Hotspots & Reports</h2>
              {loading && <div className="text-sm text-gray-500">Loading...</div>}
            </div>
            
            {/* Hotspots Section */}
            {hotspots.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-semibold text-red-600 mb-3 flex items-center gap-2">
                   Active Hotspots ({hotspots.length})
                </h3>
                <div className="space-y-3">
                  {hotspots.map(hotspot => (
                    <div 
                      key={hotspot.id}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedHotspot?.id === hotspot.id 
                          ? 'border-red-500 bg-red-50 shadow-md' 
                          : hotspot.severity === 'high' ? 'border-red-300 bg-red-50' :
                            hotspot.severity === 'medium' ? 'border-orange-300 bg-orange-50' :
                            'border-yellow-300 bg-yellow-50'
                      }`}
                      onClick={() => focusOnHotspot(hotspot)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          hotspot.severity === 'high' ? 'bg-red-500' :
                          hotspot.severity === 'medium' ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }`}>
                          {hotspot.reportCount}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-900">{hotspot.dominantType} Zone</h4>
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                              hotspot.severity === 'high' ? 'bg-red-200 text-red-800' :
                              hotspot.severity === 'medium' ? 'bg-orange-200 text-orange-800' :
                              'bg-yellow-200 text-yellow-800'
                            }`}>
                              {hotspot.severity.toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">
                            {hotspot.reportCount} reports clustered
                          </p>
                          
                          <div className="text-xs text-gray-500 mt-2">
                            Issues: {Object.entries(hotspot.typeDistribution)
                              .map(([type, count]) => `${type} (${count})`)
                              .join(', ')}
                          </div>
                          
                          <div className="text-xs text-purple-600 mt-1">
                            🔄 Geofence: {hotspot.radius}m
                          </div>
                          
                          <div className="text-xs text-gray-400 mt-1">
                            {hotspot.centerLat.toFixed(4)}, {hotspot.centerLng.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Individual Reports Section */}
            {unclusteredReports.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-600 mb-3 flex items-center gap-2">
                  📍 Individual Reports ({unclusteredReports.length})
                </h3>
                <div className="space-y-3">
                  {unclusteredReports.map(report => (
                    <div 
                      key={report.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedReport?.id === report.id 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => focusOnReport(report)}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-4 h-4 rounded-full mt-1"
                          style={{ backgroundColor: getReportColor(report.report_type) }}
                        ></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-gray-900">{report.report_type}</h3>
                            <span className="text-xs text-gray-500">#{report.id}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{report.description}</p>
                          
                          {report.reporter_name && (
                            <div className="text-xs text-blue-600 mt-1">
                              By: {report.reporter_name}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(report.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {parseFloat(report.lat).toFixed(4)}, {parseFloat(report.lng).toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reports.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                {error ? 'Failed to load reports' : 'No reports found'}
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {!mapLoaded && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading map...</p>
                <p className="text-sm text-gray-400">Connecting to Mapbox...</p>
              </div>
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
          
          {/* Map Overlay Info */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
            <h4 className="text-sm font-semibold mb-2">🗺️ Map Info</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span> Hotspots:</span>
                <span className="font-bold text-red-600">{hotspots.length}</span>
              </div>
              <div className="flex justify-between">
                <span> Individual Reports:</span>
                <span className="font-bold text-blue-600">{unclusteredReports.length}</span>
              </div>
              <div className="flex justify-between">
                <span> Active Alerts:</span>
                <span className="font-bold text-yellow-600">{notifications.length}</span>
              </div>
              <div className="flex justify-between">
                <span> Total Reports:</span>
                <span className="font-bold">{reports.length}</span>
              </div>
              {userLocation && (
                <div className="text-gray-600 pt-1 border-t">
                  Your Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </div>
              )}
              <div className="mt-2 text-gray-600">
                🔴 Red circles = Hotspot zones • 📍 Pins = Individual reports
              </div>
              {mapLoaded && (
                <div className="text-green-600 text-xs">✓ Map loaded</div>
              )}
            </div>
          </div>

          {/* Hotspot Legend */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
            <h4 className="text-sm font-semibold mb-2">🚨 Hotspot Priority</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>High (8+ reports)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Medium (6-7 reports)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Low (5 reports)</span>
              </div>
              <div className="text-gray-600 mt-2 pt-1 border-t">
                Cluster radius: {HOTSPOT_CONFIG.CLUSTER_RADIUS}m<br/>
                Geofence radius: {HOTSPOT_CONFIG.HOTSPOT_RADIUS}m
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportMap;