import { describe, it, expect } from 'vitest';
import { initialDepartments, initialCategories } from '../scripts/seed-departments';
import { Incident, User, CitizenReport, WorkOrder } from '../models';

describe('Database Models & Seed Data Definitions', () => {
  it('should have properly structured initial departments', () => {
    expect(initialDepartments.length).toBeGreaterThan(0);
    const roads = initialDepartments.find((d) => d.code === 'ROADS');
    expect(roads).toBeDefined();
    expect(roads?.name).toContain('Roads');
  });

  it('should have properly structured initial categories with valid SLA', () => {
    expect(initialCategories.length).toBeGreaterThan(0);
    initialCategories.forEach((cat) => {
      expect(cat.code).toBeDefined();
      expect(cat.slaHours).toBeGreaterThan(0);
      expect(['Critical', 'High', 'Medium', 'Low']).toContain(cat.defaultUrgency);
    });
  });

  it('Incident schema should require GeoJSON Point coordinates with 2dsphere index', () => {
    const geoField = Incident.schema.path('canonicalLocation.coordinates');
    expect(geoField).toBeDefined();

    const indexes = Incident.schema.indexes();
    const has2dSphere = indexes.some(
      (idx) => (idx[0] as any).canonicalLocation === '2dsphere'
    );
    expect(has2dSphere).toBe(true);
  });

  it('CitizenReport and User schemas should have required unique indexes', () => {
    const userIndexes = User.schema.indexes();
    const reportIndexes = CitizenReport.schema.indexes();
    const workOrderIndexes = WorkOrder.schema.indexes();

    expect(userIndexes.length).toBeGreaterThan(0);
    expect(reportIndexes.length).toBeGreaterThan(0);
    expect(workOrderIndexes.length).toBeGreaterThan(0);
  });
});
