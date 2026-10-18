import mongoose from 'mongoose';
import { env } from '../config/env';
import { Department, IssueCategory } from '../models';

export const initialDepartments = [
  {
    code: 'ROADS',
    name: 'Roads & Infrastructure Department',
    description: 'Maintenance of city roads, pavements, footpaths, and bridges',
    contactEmail: 'roads@civicpulse.gov',
    contactPhone: '+91 1800-111-001',
    isActive: true,
  },
  {
    code: 'SANITATION',
    name: 'Solid Waste Management & Sanitation Department',
    description: 'Garbage collection, public bins, street cleaning, and debris removal',
    contactEmail: 'sanitation@civicpulse.gov',
    contactPhone: '+91 1800-111-002',
    isActive: true,
  },
  {
    code: 'ELECTRICAL',
    name: 'Public Lighting & Electrical Maintenance',
    description: 'Streetlights, public electrical hazards, and municipal transformers',
    contactEmail: 'electrical@civicpulse.gov',
    contactPhone: '+91 1800-111-003',
    isActive: true,
  },
  {
    code: 'WATER',
    name: 'Water Supply & Sewage Board',
    description: 'Drinking water pipelines, water supply disruptions, and sewer lines',
    contactEmail: 'water@civicpulse.gov',
    contactPhone: '+91 1800-111-004',
    isActive: true,
  },
  {
    code: 'DRAINAGE',
    name: 'Stormwater Drainage & Flood Control',
    description: 'Stormwater drains, canal clearance, and urban flood mitigation',
    contactEmail: 'drainage@civicpulse.gov',
    contactPhone: '+91 1800-111-005',
    isActive: true,
  },
  {
    code: 'TRAFFIC',
    name: 'Traffic Management & Public Safety',
    description: 'Traffic signals, signage, road dividers, and speed breakers',
    contactEmail: 'traffic@civicpulse.gov',
    contactPhone: '+91 1800-111-006',
    isActive: true,
  },
];

export const initialCategories = [
  {
    code: 'POTHOLE',
    name: 'Pothole on Road',
    description: 'Deep potholes or road craters hazardous to vehicles and pedestrians',
    defaultDepartmentCode: 'ROADS',
    defaultUrgency: 'High',
    slaHours: 24,
    iconName: 'AlertTriangle',
    isActive: true,
  },
  {
    code: 'ROAD_DAMAGE',
    name: 'Damaged Road or Pavement',
    description: 'Broken pavement, collapsed road surface, missing paver blocks',
    defaultDepartmentCode: 'ROADS',
    defaultUrgency: 'Medium',
    slaHours: 48,
    iconName: 'ShieldAlert',
    isActive: true,
  },
  {
    code: 'GARBAGE_DUMP',
    name: 'Overflowing Garbage or Waste Dump',
    description: 'Unattended trash pile, overflowing public dumpster, or illegal dumping',
    defaultDepartmentCode: 'SANITATION',
    defaultUrgency: 'Medium',
    slaHours: 24,
    iconName: 'Trash2',
    isActive: true,
  },
  {
    code: 'STREETLIGHT',
    name: 'Broken or Non-functional Streetlight',
    description: 'Dark street, flickering lamp, or physically damaged light pole',
    defaultDepartmentCode: 'ELECTRICAL',
    defaultUrgency: 'Medium',
    slaHours: 36,
    iconName: 'LightbulbOff',
    isActive: true,
  },
  {
    code: 'WATER_LEAK',
    name: 'Water Pipeline Leakage / Burst',
    description: 'Gushing water line, leaking pipe joint causing water wastage or road flooding',
    defaultDepartmentCode: 'WATER',
    defaultUrgency: 'High',
    slaHours: 12,
    iconName: 'Droplet',
    isActive: true,
  },
  {
    code: 'SEWAGE_OVERFLOW',
    name: 'Sewage Overflow / Broken Manhole',
    description: 'Blackwater overflow, contaminated drainage, open hazardous manhole',
    defaultDepartmentCode: 'WATER',
    defaultUrgency: 'Critical',
    slaHours: 12,
    iconName: 'Skull',
    isActive: true,
  },
  {
    code: 'BLOCKED_DRAIN',
    name: 'Clogged Stormwater Drain',
    description: 'Drain blocked with silt, plastic or debris causing water stagnation',
    defaultDepartmentCode: 'DRAINAGE',
    defaultUrgency: 'High',
    slaHours: 24,
    iconName: 'Waves',
    isActive: true,
  },
  {
    code: 'TRAFFIC_SIGNAL',
    name: 'Malfunctioning Traffic Signal',
    description: 'Dead or blinking traffic signal at busy intersection',
    defaultDepartmentCode: 'TRAFFIC',
    defaultUrgency: 'Critical',
    slaHours: 8,
    iconName: 'TrafficCone',
    isActive: true,
  },
];

export const seedDatabase = async () => {
  console.log('🌱 Starting idempotent database seeding...');
  await mongoose.connect(env.MONGODB_URI);

  // 1. Seed Departments
  for (const dept of initialDepartments) {
    await Department.findOneAndUpdate(
      { code: dept.code },
      { $set: dept },
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Seeded ${initialDepartments.length} departments.`);

  // 2. Seed Issue Categories
  for (const cat of initialCategories) {
    await IssueCategory.findOneAndUpdate(
      { code: cat.code },
      { $set: cat },
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Seeded ${initialCategories.length} issue categories.`);
};

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
