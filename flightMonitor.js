const FlightMonitor = (function() {
    let updateInterval = null;
    let map = null;
    let uavMarker = null;
    let pathTrail = [];
    let trailLine = null;
    let isRunning = false;
    
    const state = {
        roll: 0,
        pitch: 0,
        yaw: 0,
        altitude: 85.5,
        altitudeAbs: 135.2,
        lat: 32.2342,
        lng: 118.7494,
        groundSpeed: 5.2,
        airSpeed: 4.8,
        batteryVoltage: 11.8,
        batteryCurrent: 8.5,
        batteryPercent: 78,
        satCount: 18,
        flightMode: 'GUIDED',
        vehicleStatus: '空中'
    };

    function init(mapInstance) {
        map = mapInstance;
        setupLogFunction();
        updateButtonState();
        return state;
    }

    function setupLogFunction() {
        window.flightLogAdd = function(type, message) {
            addLogItem(type, message);
        };
    }

    function startSimulation() {
        if (updateInterval) return;
        updateInterval = setInterval(updateSimulation, 500);
        isRunning = true;
        updateButtonState();
    }

    function stopSimulation() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        isRunning = false;
        updateButtonState();
    }

    function updateButtonState() {
        const startBtn = document.getElementById('btn-flight-start');
        const stopBtn = document.getElementById('btn-flight-stop');
        if (startBtn) {
            startBtn.disabled = isRunning;
            startBtn.style.opacity = isRunning ? '0.5' : '1';
        }
        if (stopBtn) {
            stopBtn.disabled = !isRunning;
            stopBtn.style.opacity = !isRunning ? '0.5' : '1';
        }
    }

    function updateSimulation() {
        state.roll = (Math.random() - 0.5) * 10;
        state.pitch = (Math.random() - 0.5) * 8;
        state.yaw = (state.yaw + Math.random() * 2) % 360;

        const moveSpeed = 0.00002;
        state.lat += (Math.random() - 0.3) * moveSpeed;
        state.lng += (Math.random() - 0.2) * moveSpeed;

        state.altitude += (Math.random() - 0.5) * 1;
        state.altitude = Math.max(10, Math.min(150, state.altitude));
        state.altitudeAbs = state.altitude + 49.7;

        state.groundSpeed = 4 + Math.random() * 3;
        state.airSpeed = state.groundSpeed - 0.5 + Math.random();

        state.batteryPercent = Math.max(0, state.batteryPercent - 0.02);
        state.batteryVoltage = 12.6 - (100 - state.batteryPercent) * 0.015;
        state.batteryCurrent = 7 + Math.random() * 3;

        state.satCount = Math.floor(15 + Math.random() * 8);

        updateUI();
        updateMapPosition();
    }

    function updateUI() {
        document.getElementById('roll-value').textContent = state.roll.toFixed(1) + '°';
        document.getElementById('pitch-value').textContent = state.pitch.toFixed(1) + '°';
        document.getElementById('yaw-value').textContent = state.yaw.toFixed(1) + '°';

        document.getElementById('roll-bar').style.width = ((state.roll + 45) / 90 * 100).toFixed(1) + '%';
        document.getElementById('pitch-bar').style.width = ((state.pitch + 45) / 90 * 100).toFixed(1) + '%';
        document.getElementById('yaw-bar').style.width = (state.yaw / 360 * 100).toFixed(1) + '%';

        document.getElementById('battery-voltage').textContent = state.batteryVoltage.toFixed(1) + ' V';
        document.getElementById('battery-current').textContent = state.batteryCurrent.toFixed(1) + ' A';
        document.getElementById('battery-percent').textContent = state.batteryPercent.toFixed(1) + '%';
        document.getElementById('flight-time-left').textContent = 
            '~' + Math.floor(state.batteryPercent * 0.3) + ' min';

        const batteryLevel = document.getElementById('battery-level');
        if (batteryLevel) {
            batteryLevel.style.height = state.batteryPercent + '%';
            if (state.batteryPercent > 60) {
                batteryLevel.style.background = 'linear-gradient(to top, #22c55e, #4ade80)';
            } else if (state.batteryPercent > 30) {
                batteryLevel.style.background = 'linear-gradient(to top, #f59e0b, #fbbf24)';
            } else {
                batteryLevel.style.background = 'linear-gradient(to top, #ef4444, #f87171)';
            }
        }

        document.getElementById('mon-lat').textContent = state.lat.toFixed(4) + '°';
        document.getElementById('mon-lng').textContent = state.lng.toFixed(4) + '°';
        document.getElementById('mon-alt-rel').textContent = state.altitude.toFixed(1) + ' m';
        document.getElementById('mon-alt-abs').textContent = state.altitudeAbs.toFixed(1) + ' m';
        document.getElementById('mon-ground-speed').textContent = state.groundSpeed.toFixed(1) + ' m/s';
        document.getElementById('mon-air-speed').textContent = state.airSpeed.toFixed(1) + ' m/s';

        document.getElementById('sat-count').textContent = state.satCount;
        document.getElementById('flight-mode').textContent = state.flightMode;
        document.getElementById('vehicle-status').textContent = state.vehicleStatus;
    }

    function updateMapPosition() {
        if (!map) return;
        
        const newPos = L.latLng(state.lat, state.lng);
        
        if (map._uavMarker) {
            map._uavMarker.setLatLng(newPos);
        }

        pathTrail.push(newPos);
        if (pathTrail.length > 100) {
            pathTrail.shift();
        }

        if (trailLine) {
            trailLine.setLatLngs(pathTrail);
        } else {
            trailLine = L.polyline(pathTrail, {
                color: '#3b82f6',
                weight: 2,
                opacity: 0.7
            }).addTo(map);
        }

        map.panTo(newPos, { animate: true, duration: 0.5 });
    }

    function addLogItem(type, message) {
        const logPanel = document.getElementById('flight-log');
        if (!logPanel) return;

        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        const item = document.createElement('div');
        item.className = `log-item ${type}`;
        item.textContent = `[${time}] ${message}`;
        logPanel.appendChild(item);
        logPanel.scrollTop = logPanel.scrollHeight;
    }

    function getState() {
        return { ...state };
    }

    function setFlightMode(mode) {
        state.flightMode = mode;
        addLogItem('info', `切换飞行模式: ${mode}`);
        updateUI();
    }

    return {
        init,
        startSimulation,
        stopSimulation,
        addLogItem,
        getState,
        setFlightMode,
        updateButtonState
    };
})();
