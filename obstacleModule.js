const ObstacleModule = (function() {
    let map = null;
    let obstacles = [];
    let isDrawing = false;
    let currentPolygon = null;
    let currentPoints = [];
    let tempMarkers = [];
    let startPoint = null;
    let endPoint = null;
    let startMarker = null;
    let endMarker = null;
    let routeLayer = null;
    let settingStart = false;
    let settingEnd = false;
    let obstacleIdCounter = 0;

    function init(mapInstance) {
        map = mapInstance;
        setupEventListeners();
        updateObstacleCount();
    }

    function setupEventListeners() {
        document.getElementById('btn-draw-polygon').addEventListener('click', startDrawing);
        document.getElementById('btn-finish-polygon').addEventListener('click', finishDrawing);
        document.getElementById('btn-clear-obstacles').addEventListener('click', clearAllObstacles);
        document.getElementById('btn-save-obstacle').addEventListener('click', saveCurrentObstacle);
        document.getElementById('btn-export-json').addEventListener('click', exportToJson);
        document.getElementById('btn-import-json').addEventListener('click', () => {
            document.getElementById('file-import').click();
        });
        document.getElementById('file-import').addEventListener('change', importFromJson);
        document.getElementById('btn-set-start-point').addEventListener('click', () => {
            settingStart = true;
            settingEnd = false;
            updateButtonState();
        });
        document.getElementById('btn-set-end-point').addEventListener('click', () => {
            settingEnd = true;
            settingStart = false;
            updateButtonState();
        });
        document.getElementById('btn-plan-route').addEventListener('click', planRoute);

        map.on('click', onMapClick);
        map.on('dblclick', onMapDoubleClick);
    }

    function updateButtonState() {
        const startBtn = document.getElementById('btn-set-start-point');
        const endBtn = document.getElementById('btn-set-end-point');
        startBtn.style.background = settingStart ? '#16a34a' : '';
        endBtn.style.background = settingEnd ? '#16a34a' : '';
    }

    function onMapClick(e) {
        if (settingStart) {
            setStartPoint(e.latlng);
            settingStart = false;
            updateButtonState();
            return;
        }
        if (settingEnd) {
            setEndPoint(e.latlng);
            settingEnd = false;
            updateButtonState();
            return;
        }
        if (isDrawing) {
            addPolygonPoint(e.latlng);
        }
    }

    function onMapDoubleClick(e) {
        if (isDrawing && currentPoints.length >= 3) {
            finishDrawing();
        }
    }

    function startDrawing() {
        isDrawing = true;
        currentPoints = [];
        clearTempMarkers();
        if (currentPolygon) {
            map.removeLayer(currentPolygon);
            currentPolygon = null;
        }
    }

    function addPolygonPoint(latlng) {
        currentPoints.push(latlng);
        
        const marker = L.circleMarker(latlng, {
            radius: 5,
            fillColor: '#3b82f6',
            color: '#fff',
            weight: 2,
            fillOpacity: 1
        }).addTo(map);
        tempMarkers.push(marker);

        if (currentPolygon) {
            map.removeLayer(currentPolygon);
        }

        if (currentPoints.length >= 2) {
            currentPolygon = L.polygon(currentPoints, {
                color: '#3b82f6',
                weight: 2,
                fillColor: '#3b82f6',
                fillOpacity: 0.3,
                dashArray: '5, 5'
            }).addTo(map);
        }
    }

    function finishDrawing() {
        if (currentPoints.length < 3) {
            alert('至少需要3个点才能形成多边形');
            return;
        }
        
        isDrawing = false;
        clearTempMarkers();
        updateObstacleList();
    }

    function clearTempMarkers() {
        tempMarkers.forEach(m => map.removeLayer(m));
        tempMarkers = [];
    }

    function saveCurrentObstacle() {
        if (!currentPolygon || currentPoints.length < 3) {
            alert('请先绘制一个多边形');
            return;
        }

        const height = parseFloat(document.getElementById('obstacle-height').value) || 50;
        const name = document.getElementById('obstacle-name').value || '障碍物';

        const obstacle = {
            id: ++obstacleIdCounter,
            name: name,
            height: height,
            points: currentPoints.map(p => ({ lat: p.lat, lng: p.lng })),
            color: getRandomColor()
        };

        obstacles.push(obstacle);

        if (currentPolygon) {
            map.removeLayer(currentPolygon);
        }

        const polygon = L.polygon(currentPoints, {
            color: obstacle.color,
            weight: 2,
            fillColor: obstacle.color,
            fillOpacity: 0.4
        }).addTo(map);

        polygon.bindPopup(`
            <strong>${name}</strong><br>
            高度: ${height}m<br>
            顶点数: ${currentPoints.length}
        `);

        obstacle._polygon = polygon;

        currentPolygon = null;
        currentPoints = [];
        isDrawing = false;
        clearTempMarkers();

        updateObstacleList();
        updateObstacleCount();
    }

    function getRandomColor() {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function updateObstacleList() {
        const listEl = document.getElementById('obstacle-list');
        if (obstacles.length === 0) {
            listEl.innerHTML = '<p class="empty-tip">暂无障碍物</p>';
            return;
        }

        listEl.innerHTML = obstacles.map(obs => `
            <div class="obstacle-item" data-id="${obs.id}">
                <div class="obstacle-info">
                    <div class="obstacle-name" style="color: ${obs.color}">${obs.name}</div>
                    <div class="obstacle-detail">高度: ${obs.height}m · ${obs.points.length}个顶点</div>
                </div>
                <span class="obstacle-delete" onclick="ObstacleModule.deleteObstacle(${obs.id})">删除</span>
            </div>
        `).join('');
    }

    function deleteObstacle(id) {
        const index = obstacles.findIndex(o => o.id === id);
        if (index !== -1) {
            const obs = obstacles[index];
            if (obs._polygon) {
                map.removeLayer(obs._polygon);
            }
            obstacles.splice(index, 1);
            updateObstacleList();
            updateObstacleCount();
        }
    }

    function clearAllObstacles() {
        obstacles.forEach(obs => {
            if (obs._polygon) {
                map.removeLayer(obs._polygon);
            }
        });
        obstacles = [];
        
        if (currentPolygon) {
            map.removeLayer(currentPolygon);
            currentPolygon = null;
        }
        currentPoints = [];
        isDrawing = false;
        clearTempMarkers();

        if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
        if (endMarker) { map.removeLayer(endMarker); endMarker = null; }
        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
        startPoint = null;
        endPoint = null;

        updateRouteInfo();
        updateObstacleList();
        updateObstacleCount();
    }

    function updateObstacleCount() {
        const el = document.getElementById('obstacle-count');
        if (el) el.textContent = obstacles.length;
    }

    function setStartPoint(latlng) {
        startPoint = latlng;
        if (startMarker) map.removeLayer(startMarker);
        const icon = L.divIcon({
            className: 'route-start',
            html: '<div style="background:#22c55e;width:24px;height:24px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">起</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        startMarker = L.marker(latlng, { icon }).addTo(map);
        updateRouteInfo();
    }

    function setEndPoint(latlng) {
        endPoint = latlng;
        if (endMarker) map.removeLayer(endMarker);
        const icon = L.divIcon({
            className: 'route-end',
            html: '<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">终</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        endMarker = L.marker(latlng, { icon }).addTo(map);
        updateRouteInfo();
    }

    function updateRouteInfo() {
        document.getElementById('route-start').textContent = 
            startPoint ? `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}` : '未设置';
        document.getElementById('route-end').textContent = 
            endPoint ? `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}` : '未设置';
    }

    function planRoute() {
        if (!startPoint || !endPoint) {
            alert('请先设置起点和终点');
            return;
        }

        const strategy = document.getElementById('plan-strategy').value;
        const flightAltitude = parseFloat(document.getElementById('flight-altitude').value) || 100;
        const safetyRadius = parseFloat(document.getElementById('safety-radius').value) || 20;

        if (routeLayer) {
            map.removeLayer(routeLayer);
        }

        const path = PathPlanning.planRoute(
            startPoint,
            endPoint,
            obstacles,
            { strategy, flightAltitude, safetyRadius }
        );

        routeLayer = L.layerGroup().addTo(map);

        const routeLine = L.polyline(path.points, {
            color: strategy === 'overfly' ? '#22c55e' : '#3b82f6',
            weight: 3,
            opacity: 0.8,
            dashArray: strategy === 'around' ? '10, 5' : null
        }).addTo(routeLayer);

        if (strategy === 'around' && path.waypoints) {
            path.waypoints.forEach((wp, i) => {
                L.circleMarker(wp, {
                    radius: 6,
                    fillColor: '#f59e0b',
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 1
                }).bindPopup(`航点 ${i + 1}<br>高度: ${flightAltitude}m`).addTo(routeLayer);
            });
        }

        const distance = path.distance.toFixed(2);
        document.getElementById('route-distance').textContent = `${distance} m`;

        if (window.flightLogAdd) {
            window.flightLogAdd('info', `路径规划完成，策略: ${strategy === 'overfly' ? '飞越' : '绕飞'}，距离: ${distance}m`);
        }
    }

    function exportToJson() {
        if (obstacles.length === 0) {
            alert('没有障碍物数据可导出');
            return;
        }

        const data = {
            version: '1.0',
            exportTime: new Date().toISOString(),
            obstacles: obstacles.map(o => ({
                id: o.id,
                name: o.name,
                height: o.height,
                points: o.points,
                color: o.color
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `obstacles_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importFromJson(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.obstacles && Array.isArray(data.obstacles)) {
                    clearAllObstacles();
                    
                    data.obstacles.forEach(obs => {
                        const obstacle = {
                            id: ++obstacleIdCounter,
                            name: obs.name,
                            height: obs.height,
                            points: obs.points,
                            color: obs.color || getRandomColor()
                        };
                        obstacles.push(obstacle);

                        const polygon = L.polygon(obs.points, {
                            color: obstacle.color,
                            weight: 2,
                            fillColor: obstacle.color,
                            fillOpacity: 0.4
                        }).addTo(map);

                        polygon.bindPopup(`
                            <strong>${obs.name}</strong><br>
                            高度: ${obs.height}m<br>
                            顶点数: ${obs.points.length}
                        `);

                        obstacle._polygon = polygon;
                    });

                    updateObstacleList();
                    updateObstacleCount();
                    alert(`成功导入 ${data.obstacles.length} 个障碍物`);
                }
            } catch (err) {
                alert('导入失败：JSON格式错误');
                console.error(err);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function getObstacles() {
        return obstacles;
    }

    return {
        init,
        startDrawing,
        finishDrawing,
        clearAllObstacles,
        deleteObstacle,
        exportToJson,
        planRoute,
        getObstacles
    };
})();
