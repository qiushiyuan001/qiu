const CommModule = (function() {
    let mavInterval = null;
    let isPaused = false;
    let messageCount = 0;
    let totalBytes = 0;
    let messagesInLastSec = 0;
    let currentRate = 0;
    let speedMap = { slow: 1000, normal: 500, fast: 200 };
    let currentSpeed = 'normal';
    let currentFilter = 'all';

    const mavMessageTypes = [
        { name: 'HEARTBEAT', id: 0, frequency: 1, color: '#22c55e' },
        { name: 'GLOBAL_POSITION_INT', id: 33, frequency: 4, color: '#3b82f6' },
        { name: 'ATTITUDE', id: 30, frequency: 4, color: '#f59e0b' },
        { name: 'BATTERY_STATUS', id: 147, frequency: 1, color: '#14b8a6' },
        { name: 'GPS_RAW_INT', id: 24, frequency: 2, color: '#ec4899' },
        { name: 'COMMAND_LONG', id: 76, frequency: 0.2, color: '#ef4444' }
    ];

    function init() {
        setupEventListeners();
        startMavlinkSimulation();
        startRateCalculation();
        startLatencySimulation();
    }

    function setupEventListeners() {
        document.getElementById('btn-pause-mav').addEventListener('click', togglePause);
        document.getElementById('btn-clear-mav').addEventListener('click', clearMessages);
        document.getElementById('mav-filter').addEventListener('change', (e) => {
            currentFilter = e.target.value;
        });
        document.getElementById('mav-speed').addEventListener('change', (e) => {
            currentSpeed = e.target.value;
            restartSimulation();
        });
    }

    function togglePause() {
        isPaused = !isPaused;
        const btn = document.getElementById('btn-pause-mav');
        btn.textContent = isPaused ? '继续' : '暂停';
        btn.style.background = isPaused ? '#22c55e' : '';
    }

    function clearMessages() {
        const log = document.getElementById('mavlink-log');
        log.innerHTML = '<div class="mav-empty">等待MAVLink报文...</div>';
        messageCount = 0;
        totalBytes = 0;
        updateStats();
    }

    function restartSimulation() {
        if (mavInterval) {
            clearInterval(mavInterval);
        }
        startMavlinkSimulation();
    }

    function startMavlinkSimulation() {
        const interval = speedMap[currentSpeed];
        mavInterval = setInterval(() => {
            if (isPaused) return;
            generateMavMessage();
        }, interval);
    }

    function generateMavMessage() {
        const msgType = selectMessageType();
        if (!msgType) return;

        const message = generateMessageData(msgType);
        
        if (currentFilter !== 'all' && msgType.name !== currentFilter) {
            messageCount++;
            totalBytes += message.size;
            messagesInLastSec++;
            return;
        }

        addMavMessage(msgType, message);
        
        messageCount++;
        totalBytes += message.size;
        messagesInLastSec++;
        updateStats();
    }

    function selectMessageType() {
        const rand = Math.random();
        let cumulative = 0;
        const totalFreq = mavMessageTypes.reduce((sum, m) => sum + m.frequency, 0);
        
        for (const msgType of mavMessageTypes) {
            cumulative += msgType.frequency / totalFreq;
            if (rand < cumulative) {
                return msgType;
            }
        }
        return mavMessageTypes[0];
    }

    function generateMessageData(msgType) {
        const timestamp = Date.now();
        let data = {};
        let size = 0;

        switch (msgType.name) {
            case 'HEARTBEAT':
                data = {
                    type: 2,
                    autopilot: 12,
                    base_mode: 81,
                    custom_mode: 4,
                    system_status: 4,
                    mavlink_version: 3
                };
                size = 15;
                break;
            case 'GLOBAL_POSITION_INT':
                data = {
                    time_boot_ms: Math.floor(timestamp % 100000),
                    lat: Math.floor(39.9897 * 1e7 + (Math.random() - 0.5) * 1000),
                    lon: Math.floor(116.3147 * 1e7 + (Math.random() - 0.5) * 1000),
                    alt: Math.floor(135 * 1000 + (Math.random() - 0.5) * 1000),
                    relative_alt: Math.floor(85 * 1000 + (Math.random() - 0.5) * 1000),
                    vx: Math.floor((Math.random() - 0.3) * 500),
                    vy: Math.floor((Math.random() - 0.3) * 500),
                    vz: Math.floor((Math.random() - 0.5) * 200),
                    hdg: Math.floor(Math.random() * 65535)
                };
                size = 36;
                break;
            case 'ATTITUDE':
                data = {
                    time_boot_ms: Math.floor(timestamp % 100000),
                    roll: (Math.random() - 0.5) * 0.3,
                    pitch: (Math.random() - 0.5) * 0.2,
                    yaw: Math.random() * Math.PI * 2,
                    rollspeed: (Math.random() - 0.5) * 0.1,
                    pitchspeed: (Math.random() - 0.5) * 0.1,
                    yawspeed: (Math.random() - 0.5) * 0.1
                };
                size = 28;
                break;
            case 'BATTERY_STATUS':
                data = {
                    id: 0,
                    battery_function: 0,
                    type: 3,
                    temperature: 300 + Math.floor(Math.random() * 50),
                    voltages: [12600 + Math.floor(Math.random() * 200), 12500, 0, 0, 0, 0, 0, 0, 0, 0],
                    current_battery: -8500 + Math.floor(Math.random() * 1000),
                    current_consumed: 5000 + Math.floor(Math.random() * 100),
                    energy_consumed: 3000 + Math.floor(Math.random() * 100),
                    battery_remaining: 78 + Math.floor(Math.random() * 5),
                    time_remaining: 1320 + Math.floor(Math.random() * 60)
                };
                size = 54;
                break;
            case 'GPS_RAW_INT':
                data = {
                    time_usec: timestamp * 1000,
                    fix_type: 3,
                    lat: Math.floor(39.9897 * 1e7),
                    lon: Math.floor(116.3147 * 1e7),
                    alt: Math.floor(135 * 1000),
                    eph: 100 + Math.floor(Math.random() * 50),
                    epv: 100 + Math.floor(Math.random() * 50),
                    vel: Math.floor(500 + Math.random() * 200),
                    cog: Math.floor(Math.random() * 36000),
                    satellites_visible: 15 + Math.floor(Math.random() * 8)
                };
                size = 30;
                break;
            case 'COMMAND_LONG':
                const commands = ['MAV_CMD_NAV_WAYPOINT', 'MAV_CMD_NAV_LOITER_UNLIM', 'MAV_CMD_NAV_RETURN_TO_LAUNCH', 'MAV_CMD_DO_SET_MODE'];
                data = {
                    target_system: 1,
                    target_component: 1,
                    command: commands[Math.floor(Math.random() * commands.length)],
                    confirmation: 0,
                    param1: Math.random() * 10,
                    param2: 0,
                    param3: 0,
                    param4: 0,
                    param5: 39.9897,
                    param6: 116.3147,
                    param7: 100
                };
                size = 33;
                break;
            default:
                size = 10;
        }

        return {
            timestamp: timestamp,
            seq: messageCount % 256,
            system_id: 1,
            component_id: 1,
            msgid: msgType.id,
            data: data,
            size: size
        };
    }

    function addMavMessage(msgType, message) {
        const log = document.getElementById('mavlink-log');
        const emptyEl = log.querySelector('.mav-empty');
        if (emptyEl) emptyEl.remove();

        const timeStr = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        const dataStr = formatMessageData(message.data);

        const msgEl = document.createElement('div');
        msgEl.className = `mav-message ${msgType.name}`;
        msgEl.innerHTML = `
            <span class="mav-time">${timeStr}</span>
            <span class="mav-type">[${msgType.name}]</span>
            <span class="mav-data">${dataStr}</span>
        `;
        
        log.appendChild(msgEl);
        
        while (log.children.length > 200) {
            log.removeChild(log.firstChild);
        }
        
        log.scrollTop = log.scrollHeight;
    }

    function formatMessageData(data) {
        const parts = [];
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'number') {
                parts.push(`${key}:${value.toFixed ? value.toFixed(2) : value}`);
            } else if (Array.isArray(value)) {
                parts.push(`${key}:[${value.slice(0, 3).join(',')}${value.length > 3 ? '...' : ''}]`);
            } else {
                parts.push(`${key}:${value}`);
            }
        }
        return parts.join(' ').substring(0, 150);
    }

    function updateStats() {
        document.getElementById('mav-total').textContent = messageCount.toLocaleString();
        document.getElementById('mav-loss').textContent = '0.2%';
        document.getElementById('mav-rate').textContent = currentRate.toFixed(1) + ' Hz';
        document.getElementById('mav-bytes').textContent = (totalBytes / 1024).toFixed(1) + ' KB';
    }

    function startRateCalculation() {
        setInterval(() => {
            currentRate = messagesInLastSec * (1000 / speedMap[currentSpeed]);
            messagesInLastSec = 0;
            updateStats();
        }, 1000);
    }

    function startLatencySimulation() {
        setInterval(() => {
            document.getElementById('latency-gcs-obc1').textContent = 
                (10 + Math.random() * 6).toFixed(0) + 'ms';
            document.getElementById('latency-gcs-obc2').textContent = 
                (13 + Math.random() * 6).toFixed(0) + 'ms';
            document.getElementById('latency-obc1-fcu').textContent = 
                (1 + Math.random() * 3).toFixed(0) + 'ms';
            document.getElementById('latency-obc2-fcu').textContent = 
                (1 + Math.random() * 3).toFixed(0) + 'ms';
        }, 2000);
    }

    function getMessageStats() {
        return {
            total: messageCount,
            bytes: totalBytes,
            rate: currentRate
        };
    }

    return {
        init,
        getMessageStats,
        clearMessages,
        togglePause
    };
})();
