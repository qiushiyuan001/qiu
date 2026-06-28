const PathPlanning = (function() {

    function planRoute(start, end, obstacles, options) {
        const { strategy = 'overfly', flightAltitude = 100, safetyRadius = 20 } = options;
        
        const startPoint = L.latLng(start);
        const endPoint = L.latLng(end);
        
        if (strategy === 'overfly') {
            return planOverflyRoute(startPoint, endPoint, obstacles, flightAltitude, safetyRadius);
        } else {
            return planAroundRoute(startPoint, endPoint, obstacles, flightAltitude, safetyRadius);
        }
    }

    function planOverflyRoute(start, end, obstacles, flightAltitude, safetyRadius) {
        const points = [];
        const waypoints = [];
        
        points.push(start);
        
        let maxObstacleHeight = 0;
        obstacles.forEach(obs => {
            if (lineIntersectsObstacle(start, end, obs)) {
                if (obs.height > maxObstacleHeight) {
                    maxObstacleHeight = obs.height;
                }
            }
        });

        if (maxObstacleHeight > 0 && flightAltitude <= maxObstacleHeight + safetyRadius) {
            const climbAlt = maxObstacleHeight + safetyRadius + 10;
            
            const midStart = midpoint(start, end, 0.3);
            const midEnd = midpoint(start, end, 0.7);
            
            points.push(midStart);
            waypoints.push(midStart);
            points.push(midEnd);
            waypoints.push(midEnd);
        }
        
        points.push(end);
        
        let distance = 0;
        for (let i = 0; i < points.length - 1; i++) {
            distance += points[i].distanceTo(points[i + 1]);
        }
        
        return {
            points: points,
            waypoints: waypoints,
            distance: distance,
            strategy: 'overfly',
            altitude: Math.max(flightAltitude, maxObstacleHeight + safetyRadius + 10)
        };
    }

    function planAroundRoute(start, end, obstacles, flightAltitude, safetyRadius) {
        const points = [];
        const waypoints = [];
        
        points.push(start);
        
        let currentPos = start;
        let targetPos = end;
        
        const intersectingObstacles = obstacles.filter(obs => 
            lineIntersectsObstacle(currentPos, targetPos, obs)
        );

        if (intersectingObstacles.length === 0) {
            points.push(end);
            return {
                points: points,
                waypoints: waypoints,
                distance: currentPos.distanceTo(end),
                strategy: 'around',
                altitude: flightAltitude
            };
        }

        let remaining = [...intersectingObstacles];
        
        while (remaining.length > 0) {
            let nearestObs = null;
            let nearestDist = Infinity;
            let nearestIdx = -1;
            
            remaining.forEach((obs, idx) => {
                const dist = distanceToObstacle(currentPos, obs);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestObs = obs;
                    nearestIdx = idx;
                }
            });

            if (nearestObs) {
                const bypassPoints = calculateBypassPoints(currentPos, targetPos, nearestObs, safetyRadius);
                
                if (bypassPoints.length > 0) {
                    bypassPoints.forEach(bp => {
                        points.push(bp);
                        waypoints.push(bp);
                        currentPos = bp;
                    });
                }
                
                remaining.splice(nearestIdx, 1);
                
                remaining = remaining.filter(obs => 
                    lineIntersectsObstacle(currentPos, targetPos, obs)
                );
            } else {
                break;
            }
        }
        
        points.push(end);
        
        const simplifiedPoints = simplifyPath(points, obstacles, safetyRadius);
        
        let distance = 0;
        for (let i = 0; i < simplifiedPoints.length - 1; i++) {
            distance += simplifiedPoints[i].distanceTo(simplifiedPoints[i + 1]);
        }
        
        return {
            points: simplifiedPoints,
            waypoints: simplifiedPoints.slice(1, -1),
            distance: distance,
            strategy: 'around',
            altitude: flightAltitude
        };
    }

    function lineIntersectsObstacle(p1, p2, obstacle) {
        const points = obstacle.points;
        if (!points || points.length < 3) return false;

        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            if (lineSegmentsIntersect(
                p1.lat, p1.lng, p2.lat, p2.lng,
                points[i].lat, points[i].lng, points[j].lat, points[j].lng
            )) {
                return true;
            }
        }

        return pointInPolygon(p1, points) || pointInPolygon(p2, points);
    }

    function lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (Math.abs(denom) < 0.0000001) return false;
        
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    function pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat, yi = polygon[i].lng;
            const xj = polygon[j].lat, yj = polygon[j].lng;
            
            if (((yi > point.lng) !== (yj > point.lng)) &&
                (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    function distanceToObstacle(point, obstacle) {
        let minDist = Infinity;
        const points = obstacle.points;
        
        if (pointInPolygon(point, points)) return 0;
        
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const dist = distanceToLineSegment(
                point,
                L.latLng(points[i].lat, points[i].lng),
                L.latLng(points[j].lat, points[j].lng)
            );
            if (dist < minDist) minDist = dist;
        }
        
        return minDist;
    }

    function distanceToLineSegment(p, v, w) {
        const l2 = Math.pow(v.distanceTo(w), 2);
        if (l2 === 0) return p.distanceTo(v);
        
        let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
        t = Math.max(0, Math.min(1, t));
        
        const proj = L.latLng(
            v.lat + t * (w.lat - v.lat),
            v.lng + t * (w.lng - v.lng)
        );
        
        return p.distanceTo(proj);
    }

    function midpoint(p1, p2, ratio = 0.5) {
        return L.latLng(
            p1.lat + (p2.lat - p1.lat) * ratio,
            p1.lng + (p2.lng - p1.lng) * ratio
        );
    }

    function calculateBypassPoints(start, end, obstacle, safetyRadius) {
        const points = obstacle.points;
        
        let cx = 0, cy = 0;
        points.forEach(p => {
            cx += p.lat;
            cy += p.lng;
        });
        cx /= points.length;
        cy /= points.length;
        const center = L.latLng(cx, cy);

        let maxDist = 0;
        points.forEach(p => {
            const d = center.distanceTo(L.latLng(p.lat, p.lng));
            if (d > maxDist) maxDist = d;
        });
        
        const offsetDist = maxDist + safetyRadius;

        const dx = end.lng - start.lng;
        const dy = end.lat - start.lat;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return [];

        const perpX = -dy / len;
        const perpY = dx / len;

        const latOffset = perpY * offsetDist / 111000;
        const lngOffset = perpX * offsetDist / (111000 * Math.cos(center.lat * Math.PI / 180));

        const side1 = L.latLng(center.lat + latOffset, center.lng + lngOffset);
        const side2 = L.latLng(center.lat - latOffset, center.lng - lngOffset);

        const dist1 = start.distanceTo(side1) + side1.distanceTo(end);
        const dist2 = start.distanceTo(side2) + side2.distanceTo(end);

        const bypass = dist1 < dist2 ? side1 : side2;

        const entryBearing = bearing(start, center);
        const exitBearing = bearing(center, end);
        
        const entryPoint = offsetPointAlongBearing(center, -entryBearing, offsetDist * 1.2);
        const exitPoint = offsetPointAlongBearing(center, exitBearing, offsetDist * 1.2);

        return [bypass];
    }

    function bearing(start, end) {
        const startLat = start.lat * Math.PI / 180;
        const startLng = start.lng * Math.PI / 180;
        const endLat = end.lat * Math.PI / 180;
        const endLng = end.lng * Math.PI / 180;

        const dLng = endLng - startLng;
        const y = Math.sin(dLng) * Math.cos(endLat);
        const x = Math.cos(startLat) * Math.sin(endLat) -
                  Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
        const brng = Math.atan2(y, x);
        return (brng * 180 / Math.PI + 360) % 360;
    }

    function offsetPointAlongBearing(point, bearingDeg, distanceMeters) {
        const R = 6378137;
        const brng = bearingDeg * Math.PI / 180;
        const lat1 = point.lat * Math.PI / 180;
        const lng1 = point.lng * Math.PI / 180;

        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceMeters / R) +
                               Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(brng));
        const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(distanceMeters / R) * Math.cos(lat1),
                                        Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2));

        return L.latLng(lat2 * 180 / Math.PI, lng2 * 180 / Math.PI);
    }

    function simplifyPath(points, obstacles, safetyRadius) {
        if (points.length <= 2) return points;
        
        const simplified = [points[0]];
        let lastValidIndex = 0;
        
        for (let i = points.length - 1; i > lastValidIndex; i--) {
            let valid = true;
            for (const obs of obstacles) {
                if (lineIntersectsObstacleWithBuffer(points[lastValidIndex], points[i], obs, safetyRadius)) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                simplified.push(points[i]);
                lastValidIndex = i;
                if (i < points.length - 1) {
                    i = points.length;
                }
            }
        }
        
        if (simplified[simplified.length - 1] !== points[points.length - 1]) {
            simplified.push(points[points.length - 1]);
        }
        
        return simplified;
    }

    function lineIntersectsObstacleWithBuffer(p1, p2, obstacle, bufferMeters) {
        if (lineIntersectsObstacle(p1, p2, obstacle)) return true;
        
        const points = obstacle.points;
        for (const pt of points) {
            const dist = distanceToLineSegment(
                L.latLng(pt.lat, pt.lng), p1, p2
            );
            if (dist < bufferMeters) return true;
        }
        
        return false;
    }

    return {
        planRoute
    };
})();
