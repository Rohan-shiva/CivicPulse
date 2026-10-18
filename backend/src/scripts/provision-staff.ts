import mongoose from 'mongoose';
import { env } from '../config/env';
import { User, Department } from '../models';

export const provisionStaffUser = async (params: {
  name: string;
  phone: string;
  role: 'officer' | 'field_worker' | 'admin';
  departmentCode?: string;
  ward?: string;
  email?: string;
}) => {
  await mongoose.connect(env.MONGODB_URI);

  // Normalize phone number (E.164-like e.g. +91XXXXXXXXXX)
  let cleanPhone = params.phone.replace(/[\s\-\(\)]/g, '');
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = `+91${cleanPhone.replace(/^0+/, '')}`;
  }

  let deptDoc = null;
  if (params.departmentCode) {
    deptDoc = await Department.findOne({ code: params.departmentCode.toUpperCase() });
    if (!deptDoc) {
      console.warn(`⚠️ Warning: Department code '${params.departmentCode}' not found. Leaving unset.`);
    }
  }

  const existing = await User.findOne({ phone: cleanPhone });
  if (existing) {
    existing.name = params.name;
    existing.role = params.role;
    existing.departmentId = deptDoc?._id as any;
    existing.departmentName = deptDoc?.name || params.departmentCode;
    existing.ward = params.ward;
    if (params.email) existing.email = params.email;
    existing.phoneVerifiedAt = new Date();
    await existing.save();
    console.log(`✅ Updated existing staff user: ${existing.name} (${existing.role})`);
    return existing;
  }

  const user = await User.create({
    name: params.name,
    phone: cleanPhone,
    role: params.role,
    departmentId: deptDoc?._id,
    departmentName: deptDoc?.name || params.departmentCode,
    ward: params.ward,
    email: params.email,
    phoneVerifiedAt: new Date(),
    isActive: true,
  });

  console.log(`🎉 Successfully provisioned staff user: ${user.name} (${user.role}) - Phone: ${user.phone}`);
  return user;
};

// Command line execution parser
if (require.main === module) {
  const args = process.argv.slice(2);
  const parsedArgs: Record<string, string> = {};

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      if (key && val) parsedArgs[key] = val;
    }
  });

  const name = parsedArgs.name || 'Municipal Officer';
  const phone = parsedArgs.phone || '+919876543210';
  const role = (parsedArgs.role as any) || 'officer';
  const departmentCode = parsedArgs.department || 'ROADS';
  const ward = parsedArgs.ward || 'Central Ward';
  const email = parsedArgs.email;

  if (!['officer', 'field_worker', 'admin'].includes(role)) {
    console.error("❌ Role must be 'officer', 'field_worker', or 'admin'");
    process.exit(1);
  }

  provisionStaffUser({ name, phone, role, departmentCode, ward, email })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Provisioning failed:', err);
      process.exit(1);
    });
}
