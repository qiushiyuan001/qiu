const MapModule = (function() {
    let mainMap = null;
    let obstacleMap = null;
    let monitorMap = null;
    let startMarker = null;
    let startPoint = { lat: 32.2342, lng: 118.7494 };

    let currentTileLayer = 'amap';

    const CAMPUS_CENTER = [32.2342, 118.7494];

    const tileLayers = {
        osm: {
            name: 'OpenStreetMap',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        },
        amap: {
            name: '高德地图',
            url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            subdomains: ['1', '2', '3', '4'],
            attribution: '&copy; 高德地图',
            maxZoom: 18
        },
        amapSatellite: {
            name: '高德卫星',
            url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
            subdomains: ['1', '2', '3', '4'],
            attribution: '&copy; 高德地图',
            maxZoom: 18
        }
    };

    function createTileLayer(type) {
        const config = tileLayers[type] || tileLayers.amap;
        return L.tileLayer(config.url, {
            attribution: config.attribution,
            maxZoom: config.maxZoom,
            subdomains: config.subdomains || ['a', 'b', 'c']
        });
    }

    function addLayerControl(map, baseLayers) {
        const control = L.control.layers(baseLayers, null, {
            position: 'topright',
            collapsed: true
        });
        control.addTo(map);
        return control;
    }

    function createAllBaseLayers(defaultType) {
        const layers = {};
        for (const [key, config] of Object.entries(tileLayers)) {
            layers[config.name] = createTileLayer(key);
        }
        return layers;
    }

    function initMainMap() {
        if (mainMap) return mainMap;
        
        mainMap = L.map('map', {
            center: CAMPUS_CENTER,
            zoom: 17,
            zoomControl: true
        });

        const baseLayers = createAllBaseLayers();
        baseLayers[tileLayers[currentTileLayer].name].addTo(mainMap);
        addLayerControl(mainMap, baseLayers);

        const startIcon = L.divIcon({
            className: 'start-marker',
            html: '<div style="background:#22c55e;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        startMarker = L.marker(CAMPUS_CENTER, { icon: startIcon }).addTo(mainMap);
        startMarker.bindPopup('<b>起始点</b><br>校内出发点');

        mainMap.on('baselayerchange', function(e) {
            const layerNameEl = document.getElementById('map-layer-name');
            if (layerNameEl) layerNameEl.textContent = e.name;
            for (const [key, config] of Object.entries(tileLayers)) {
                if (config.name === e.name) {
                    currentTileLayer = key;
                    break;
                }
            }
        });

        updateMapInfo();
        mainMap.on('moveend zoomend', updateMapInfo);

        return mainMap;
    }

    function initObstacleMap() {
        if (obstacleMap) return obstacleMap;

        obstacleMap = L.map('map-obstacle', {
            center: CAMPUS_CENTER,
            zoom: 17,
            zoomControl: true
        });

        const baseLayers = createAllBaseLayers();
        baseLayers[tileLayers[currentTileLayer].name].addTo(obstacleMap);
        addLayerControl(obstacleMap, baseLayers);

        return obstacleMap;
    }

    function initMonitorMap() {
        if (monitorMap) return monitorMap;

        monitorMap = L.map('map-monitor', {
            center: CAMPUS_CENTER,
            zoom: 17,
            zoomControl: false,
            attributionControl: false
        });

        createTileLayer(currentTileLayer).addTo(monitorMap);

        const uavIcon = L.divIcon({
            className: 'uav-marker',
            html: '<div style="font-size:24px;">✈️</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const uavMarker = L.marker(CAMPUS_CENTER, { icon: uavIcon }).addTo(monitorMap);
        monitorMap._uavMarker = uavMarker;

        return monitorMap;
    }

    function updateMapInfo() {
        if (!mainMap) return;
        const center = mainMap.getCenter();
        const zoom = mainMap.getZoom();
        const centerEl = document.getElementById('map-center');
        const zoomEl = document.getElementById('map-zoom');
        const layerEl = document.getElementById('map-layer');
        if (centerEl) centerEl.textContent = `${center.lat.toFixed(4)}°, ${center.lng.toFixed(4)}°`;
        if (zoomEl) zoomEl.textContent = zoom;
    }

    function getCurrentTileLayer() {
        return currentTileLayer;
    }

    function setTileLayer(type) {
        if (!tileLayers[type]) return;
        currentTileLayer = type;
    }

    function setStartPoint(lng, lat) {
        startPoint = { lng, lat };
        if (startMarker && mainMap) {
            startMarker.setLatLng([lat, lng]);
            mainMap.setView([lat, lng], mainMap.getZoom());
        }
    }

    function getStartPoint() {
        return startPoint;
    }

    function centerToStart() {
        if (mainMap && startPoint) {
            mainMap.setView([startPoint.lat, startPoint.lng], 17);
        }
    }

    function invalidateAllSize() {
        setTimeout(() => {
            if (mainMap) mainMap.invalidateSize();
            if (obstacleMap) obstacleMap.invalidateSize();
            if (monitorMap) monitorMap.invalidateSize();
        }, 100);
    }

    return {
        initMainMap,
        initObstacleMap,
        initMonitorMap,
        setStartPoint,
        getStartPoint,
        centerToStart,
        invalidateAllSize,
        getCurrentTileLayer,
        setTileLayer,
        getMainMap: () => mainMap,
        getObstacleMap: () => obstacleMap,
        getMonitorMap: () => monitorMap
    };
})();
