import { describe, it, expect } from 'vitest';
import {
  validateCoordinates,
  createGeoJsonPoint,
  calculateDistanceMeters,
  checkLocationDiscrepancy,
} from '../utils/geo';
import { exifService } from '../services/exif.service';

describe('Geospatial Utilities & Calculations', () => {
  it('should validate valid coordinates and reject invalid ones', () => {
    expect(() => validateCoordinates(77.5946, 12.9716)).not.toThrow(); // Bangalore
    expect(() => validateCoordinates(200, 12.9716)).toThrow(/longitude/);
    expect(() => validateCoordinates(77.5946, -100)).toThrow(/latitude/);
  });

  it('createGeoJsonPoint should output standard [longitude, latitude] array', () => {
    const point = createGeoJsonPoint(77.594562, 12.971598);
    expect(point.type).toBe('Point');
    expect(point.coordinates[0]).toBe(77.594562); // longitude first!
    expect(point.coordinates[1]).toBe(12.971598); // latitude second!
  });

  it('calculateDistanceMeters should calculate accurate Haversine distance', () => {
    const pt1 = { latitude: 12.9716, longitude: 77.5946 };
    const pt2 = { latitude: 12.9716, longitude: 77.5946 };
    expect(calculateDistanceMeters(pt1, pt2)).toBe(0);

    // Nearby point ~111m away (0.001 degree latitude)
    const pt3 = { latitude: 12.9726, longitude: 77.5946 };
    const dist = calculateDistanceMeters(pt1, pt3);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(125);
  });

  it('checkLocationDiscrepancy should warn when distance exceeds threshold', () => {
    const exif = { latitude: 12.9716, longitude: 77.5946 };
    const confirmedNear = { latitude: 12.972, longitude: 77.5946 }; // ~45m
    const confirmedFar = { latitude: 12.9816, longitude: 77.5946 }; // ~1110m

    const resNear = checkLocationDiscrepancy(exif, confirmedNear, 500);
    expect(resNear.hasDiscrepancy).toBe(false);

    const resFar = checkLocationDiscrepancy(exif, confirmedFar, 500);
    expect(resFar.hasDiscrepancy).toBe(true);
    expect(resFar.warning).toBeDefined();
  });

  it('exifService should safely handle empty or non-image buffers without crashing', async () => {
    const emptyBuffer = Buffer.alloc(100);
    const result = await exifService.extractGps(emptyBuffer);
    expect(result).toBeNull();
  });
});
