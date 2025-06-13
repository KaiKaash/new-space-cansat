const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'top', labels: { font: { size: 14 } } },
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) label += ': ';
                    if (context.parsed.y !== null) {
                        label += context.parsed.y.toFixed(2);
                        if (context.dataset.label.includes('Temperature')) label += '°C';
                        else if (context.dataset.label.includes('Pressure')) label += ' hPa';
                        else if (context.dataset.label.includes('Humidity')) label += '%';
                        else if (context.dataset.label.includes('Height') || context.dataset.label.includes('Altitude')) label += ' m';
                        else if (context.dataset.label.includes('Velocity') || context.dataset.label.includes('Distance')) label += ' m';
                    }
                    return label;
                }
            }
        }
    },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: { grid: { color: '#e2e8f0' }, ticks: { font: { size: 12 } } }
    }
};

// Initialize charts
const charts = {
    height: new Chart(document.getElementById('chart1'), {
        type: 'line',
        data: {
            labels: [100],
            datasets: [{
                label: 'Altitude (m)',
                data: [],
                borderColor: 'var(--primary)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: 'white',
                pointBorderWidth: 2
            }]
        },
        options: {
            ...chartConfig,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const time = charts.height.data.labels[index];
                    highlightTableRow(time);
                }
            }
        }
    }),
    gyro: new Chart(document.getElementById('chart2'), {
        type: 'radar',
        data: {
            labels: ['X-axis', 'Y-axis', 'Z-axis', 'Roll', 'Pitch', 'Yaw'],
            datasets: [{
                label: 'Angular Velocity (rad/s)',
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderColor: 'var(--primary)',
                borderWidth: 2
            }]
        },
        options: chartConfig
    }),
    accel: new Chart(document.getElementById('chart3'), {
        type: 'bar',
        data: {
            labels: ['X-axis', 'Y-axis', 'Z-axis'],
            datasets: [{
                label: 'Acceleration (m/s²)',
                data: [0, 0, 0],
                backgroundColor: ['var(--primary)', '#1e40af', '#93c5fd'],
                borderRadius: 8
            }]
        },
        options: chartConfig
    }),
    temp: new Chart(document.getElementById('chart4'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: 'var(--temperature)',
                borderWidth: 3,
                fill: true,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.2
            }]
        },
        options: chartConfig
    }),
    pressure: new Chart(document.getElementById('chart5'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pressure (hPa)',
                data: [],
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'var(--pressure)',
                borderWidth: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: chartConfig
    }),
    humidity: new Chart(document.getElementById('chart6'), {
        type: 'doughnut',
        data: {
            labels: ['Current'],
            datasets: [{
                data: [0],
                backgroundColor: ['var(--humidity)'],
                borderWidth: 0
            }]
        },
        options: {
            ...chartConfig,
            plugins: {
                ...chartConfig.plugins,
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw + '%';
                        }
                    }
                }
            }
        }
    }),
    motion: new Chart(document.getElementById('chart7'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Horizontal Distance (m)',
                data: [],
                borderColor: 'var(--primary)',
                borderWidth: 3,
                tension: 0.1
            }, {
                label: 'Vertical Height (m)',
                data: [],
                borderColor: 'var(--temperature)',
                borderWidth: 3,
                tension: 0.3
            }]
        },
        options: {
            ...chartConfig,
            scales: {
                ...chartConfig.scales,
                y: { ...chartConfig.scales.y, title: { display: true, text: 'Distance/Height (m)' } },
                x: { ...chartConfig.scales.x, title: { display: true, text: 'Time (seconds)' } }
            }
        }
    })
};

// Calculate horizontal distance using Haversine formula
let lastLat = null, lastLon = null, totalDistance = 0;
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lat2 || !lon1 || !lon2) return 0;
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// WebSocket connection
const ws = new WebSocket('https://flask-server-vfih.onrender.com/api/latest-data'); // Replace with Render URL
ws.onopen = () => console.log('WebSocket connected');
ws.onmessage = event => {
    const data = JSON.parse(event.data);
    const timestamp = data.timestamp / 1000; // Convert ms to seconds

    // Update Height (Altitude) Chart
    charts.height.data.labels.push(timestamp.toFixed(1) + 's');
    charts.height.data.datasets[0].data.push(data.altitude_baro);
    if (charts.height.data.labels.length > 20) {
        charts.height.data.labels.shift();
        charts.height.data.datasets[0].data.shift();
    }
    charts.height.update();

    // Update Gyro Chart
    charts.gyro.data.datasets[0].data = [data.gyro_x, data.gyro_y, data.gyro_z, 0, 0, 0]; // Placeholder for roll/pitch/yaw
    charts.gyro.update();

    // Update Acceleration Chart
    charts.accel.data.datasets[0].data = [data.accel_x, data.accel_y, data.accel_z];
    charts.accel.update();

    // Update Temperature Chart
    if (data.temperature !== -999) {
        charts.temp.data.labels.push(timestamp.toFixed(1) + 's');
        charts.temp.data.datasets[0].data.push(data.temperature);
        if (charts.temp.data.labels.length > 20) {
            charts.temp.data.labels.shift();
            charts.temp.data.datasets[0].data.shift();
        }
        charts.temp.update();
    }

    // Update Pressure Chart
    charts.pressure.data.labels.push(timestamp.toFixed(1) + 's');
    charts.pressure.data.datasets[0].data.push(data.pressure);
    if (charts.pressure.data.labels.length > 20) {
        charts.pressure.data.labels.shift();
        charts.pressure.data.datasets[0].data.shift();
    }
    charts.pressure.update();

    // Update Humidity Chart
    if (data.humidity !== -999) {
        charts.humidity.data.datasets[0].data = [data.humidity];
        charts.humidity.update();
    }

    // Update Projectile Motion Chart
    if (data.gps_lock && data.latitude && data.longitude) {
        if (lastLat !== null && lastLon !== null) {
            const distance = calculateDistance(lastLat, lastLon, data.latitude, data.longitude);
            totalDistance += distance;
        }
        lastLat = data.latitude;
        lastLon = data.longitude;
    }
    charts.motion.data.labels.push(timestamp.toFixed(1) + 's');
    charts.motion.data.datasets[0].data.push(totalDistance);
    charts.motion.data.datasets[1].data.push(data.altitude_baro);
    if (charts.motion.data.labels.length > 20) {
        charts.motion.data.labels.shift();
        charts.motion.data.datasets[0].data.shift();
        charts.motion.data.datasets[1].data.shift();
    }
    charts.motion.update();

    // Update Table
    const tbody = document.querySelector('tbody');
    const row = document.createElement('tr');
    row.innerHTML = `<td>${timestamp.toFixed(1)}</td><td>${data.altitude_baro.toFixed(2)}</td><td>${data.speed.toFixed(2)}</td>`;
    tbody.prepend(row);
    if (tbody.children.length > 10) tbody.removeChild(tbody.lastChild);
};

ws.onerror = error => console.error('WebSocket error:', error);
ws.onclose = () => console.log('WebSocket disconnected');

function highlightTableRow(time) {
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const timeCell = row.cells[0].textContent;
        row.style.backgroundColor = timeCell === time ? '#e2e8f0' : '';
    });
}
