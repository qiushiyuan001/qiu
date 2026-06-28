(function() {
    let initializedTabs = new Set();

    document.addEventListener('DOMContentLoaded', function() {
        initTabs();
        initMapTab();
        startSystemTime();
        initCoordTransform();
        initStartPointControls();
    });

    function initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));

                this.classList.add('active');
                document.getElementById('tab-' + targetTab).classList.add('active');

                initializeTab(targetTab);
            });
        });
    }

    function initializeTab(tabName) {
        if (initializedTabs.has(tabName)) {
            MapModule.invalidateAllSize();
            return;
        }

        switch (tabName) {
            case 'map':
                initMapTab();
                break;
            case 'obstacle':
                initObstacleTab();
                break;
            case 'monitor':
                initMonitorTab();
                break;
            case 'comm':
                initCommTab();
                break;
        }

        initializedTabs.add(tabName);
        MapModule.invalidateAllSize();
    }

    function initMapTab() {
        if (initializedTabs.has('map')) return;
        MapModule.initMainMap();
        initializedTabs.add('map');
    }

    function initObstacleTab() {
        const map = MapModule.initObstacleMap();
        ObstacleModule.init(map);
    }

    function initMonitorTab() {
        const map = MapModule.initMonitorMap();
        FlightMonitor.init(map);
    }

    function initCommTab() {
        CommModule.init();
    }

    function startSystemTime() {
        function updateTime() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
            const el = document.getElementById('system-time');
            if (el) el.textContent = timeStr;
        }
        updateTime();
        setInterval(updateTime, 1000);
    }

    function initCoordTransform() {
        const convertBtn = document.getElementById('btn-convert');
        const reverseBtn = document.getElementById('btn-reverse-convert');

        if (convertBtn) {
            convertBtn.addEventListener('click', function() {
                const lng = parseFloat(document.getElementById('wgs-lng').value);
                const lat = parseFloat(document.getElementById('wgs-lat').value);

                if (isNaN(lng) || isNaN(lat)) {
                    alert('请输入有效的经纬度');
                    return;
                }

                const result = CoordTransform.wgs84ToGcj02(lng, lat);
                document.getElementById('gcj-lng').textContent = result.lng.toFixed(6);
                document.getElementById('gcj-lat').textContent = result.lat.toFixed(6);
            });
        }

        if (reverseBtn) {
            reverseBtn.addEventListener('click', function() {
                const lng = parseFloat(document.getElementById('wgs-lng').value);
                const lat = parseFloat(document.getElementById('wgs-lat').value);

                if (isNaN(lng) || isNaN(lat)) {
                    alert('请输入有效的经纬度');
                    return;
                }

                const result = CoordTransform.gcj02ToWgs84(lng, lat);
                document.getElementById('gcj-lng').textContent = result.lng.toFixed(6);
                document.getElementById('gcj-lat').textContent = result.lat.toFixed(6);
            });
        }
    }

    function initStartPointControls() {
        const setBtn = document.getElementById('btn-set-start');
        const centerBtn = document.getElementById('btn-center-start');

        if (setBtn) {
            setBtn.addEventListener('click', function() {
                const lng = parseFloat(document.getElementById('start-lng').value);
                const lat = parseFloat(document.getElementById('start-lat').value);

                if (isNaN(lng) || isNaN(lat)) {
                    alert('请输入有效的经纬度');
                    return;
                }

                MapModule.setStartPoint(lng, lat);
            });
        }

        if (centerBtn) {
            centerBtn.addEventListener('click', function() {
                MapModule.centerToStart();
            });
        }
    }

    window.App = {
        initializeTab: initializeTab
    };
})();
