import { BadRequestError } from './errors';

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IGeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude] as per GeoJSON standard!
}

/**
 * Validates latitude and longitude values
 */
export const validateCoordinates = (longitude: number, latitude: number): void => {
  if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new BadRequestError(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
  }

  if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new BadRequestError(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
  }
};

/**
 * Constructs a standard GeoJSON Point from longitude and latitude
 */
export const createGeoJsonPoint = (longitude: number, latitude: number): IGeoJsonPoint => {
  validateCoordinates(longitude, latitude);
  return {
    type: 'Point',
    coordinates: [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))],
  };
};

/**
 * Calculates great-circle distance between two GPS points in meters using the Haversine formula
 */
export const calculateDistanceMeters = (
  coord1: ICoordinates,
  coord2: ICoordinates
): number => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (coord1.latitude * Math.PI) / 180;
  const phi2 = (coord2.latitude * Math.PI) / 180;
  const deltaPhi = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLambda = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Checks if there is a substantial discrepancy (> thresholdMeters) between EXIF GPS and confirmed map location
 */
export const checkLocationDiscrepancy = (
  exifCoord?: ICoordinates,
  confirmedCoord?: ICoordinates,
  thresholdMeters = 500
): { hasDiscrepancy: boolean; distanceMeters: number; warning?: string } => {
  if (!exifCoord || !confirmedCoord) {
    return { hasDiscrepancy: false, distanceMeters: 0 };
  }

  const distance = calculateDistanceMeters(exifCoord, confirmedCoord);
  if (distance > thresholdMeters) {
    return {
      hasDiscrepancy: true,
      distanceMeters: distance,
      warning: `Photo EXIF GPS location differs by ${Math.round(distance)}m from confirmed map pin.`,
    };
  }

  return {
    hasDiscrepancy: false,
    distanceMeters: distance,
  };
};
