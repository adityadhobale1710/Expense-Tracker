import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

async function verify() {
  await mongoose.connect(process.env.MONGO_URI);
  const email = 'audit_fe_1787990167021@example.com';
  const res = await mongoose.connection.collection('users').updateOne(
    { email: email.toLowerCase() },
    { $set: { isEmailVerified: true, isVerified: true, otpVerified: true } }
  );
  console.log('Verified user in DB:', res.modifiedCount);
  await mongoose.disconnect();
}

verify().catch(console.error);
