const CoordTransform = (function() {
    const PI = 3.14159265358979324;
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    const x_pi = PI * 3000.0 / 180.0;

    function outOfChina(lng, lat) {
        if (lng < 72.004 || lng > 137.8347) return true;
        if (lat < 0.8293 || lat > 55.8271) return true;
        return false;
    }

    function transformLat(x, y) {
        let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    function transformLng(x, y) {
        let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
        return ret;
    }

    function wgs84ToGcj02(lng, lat) {
        if (outOfChina(lng, lat)) {
            return { lng: lng, lat: lat };
        }
        let dLat = transformLat(lng - 105.0, lat - 35.0);
        let dLng = transformLng(lng - 105.0, lat - 35.0);
        const radLat = lat / 180.0 * PI;
        let magic = Math.sin(radLat);
        magic = 1 - ee * magic * magic;
        const sqrtMagic = Math.sqrt(magic);
        dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
        dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
        const mgLat = lat + dLat;
        const mgLng = lng + dLng;
        return { lng: mgLng, lat: mgLat };
    }

    function gcj02ToWgs84(lng, lat) {
        if (outOfChina(lng, lat)) {
            return { lng: lng, lat: lat };
        }
        let dLat = transformLat(lng - 105.0, lat - 35.0);
        let dLng = transformLng(lng - 105.0, lat - 35.0);
        const radLat = lat / 180.0 * PI;
        let magic = Math.sin(radLat);
        magic = 1 - ee * magic * magic;
        const sqrtMagic = Math.sqrt(magic);
        dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
        dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
        const mgLat = lat + dLat;
        const mgLng = lng + dLng;
        return {
            lng: lng * 2 - mgLng,
            lat: lat * 2 - mgLat
        };
    }

    function gcj02ToBd09(lng, lat) {
        const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_pi);
        const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_pi);
        const bdLng = z * Math.cos(theta) + 0.0065;
        const bdLat = z * Math.sin(theta) + 0.006;
        return { lng: bdLng, lat: bdLat };
    }

    function bd09ToGcj02(lng, lat) {
        const x = lng - 0.0065;
        const y = lat - 0.006;
        const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
        const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
        const ggLng = z * Math.cos(theta);
        const ggLat = z * Math.sin(theta);
        return { lng: ggLng, lat: ggLat };
    }

    function wgs84ToBd09(lng, lat) {
        const gcj = wgs84ToGcj02(lng, lat);
        return gcj02ToBd09(gcj.lng, gcj.lat);
    }

    function bd09ToWgs84(lng, lat) {
        const gcj = bd09ToGcj02(lng, lat);
        return gcj02ToWgs84(gcj.lng, gcj.lat);
    }

    function distance(lng1, lat1, lng2, lat2) {
        const radLat1 = lat1 * PI / 180.0;
        const radLat2 = lat2 * PI / 180.0;
        const a = radLat1 - radLat2;
        const b = lng1 * PI / 180.0 - lng2 * PI / 180.0;
        let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
            Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
        s = s * 6378.137;
        s = Math.round(s * 10000) / 10000;
        return s * 1000;
    }

    function formatCoord(lng, lat, decimals = 6) {
        return `${lat.toFixed(decimals)}°N, ${lng.toFixed(decimals)}°E`;
    }

    return {
        wgs84ToGcj02,
        gcj02ToWgs84,
        gcj02ToBd09,
        bd09ToGcj02,
        wgs84ToBd09,
        bd09ToWgs84,
        distance,
        formatCoord,
        outOfChina
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoordTransform;
}
