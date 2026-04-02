import mongoose from 'mongoose';
import User from '../models/User.js';

function digitsOnly(s) {
  if (!s) return '';
  return String(s).replace(/\D/g, '');
}

/**
 * Find the reporter account for reward payout: prefer Mongo id, then email, then phone (flexible formats).
 */
export async function resolveReporterUser(report) {
  const rawRid = report.reporterId;
  const reporterOid =
    rawRid && typeof rawRid === 'object' && rawRid._id != null ? rawRid._id : rawRid;
  if (reporterOid && mongoose.Types.ObjectId.isValid(String(reporterOid))) {
    const byId = await User.findById(reporterOid);
    if (byId) return byId;
  }

  if (report.reporterEmail) {
    const e = String(report.reporterEmail).trim().toLowerCase();
    const byEmail = await User.findOne({ email: e });
    if (byEmail) return byEmail;
  }

  const raw = report.reporterPhone;
  if (!raw || !String(raw).trim()) return null;

  const trimmed = String(raw).trim();
  const byExact = await User.findOne({ phone: trimmed });
  if (byExact) return byExact;

  const d = digitsOnly(trimmed);
  if (d.length >= 10) {
    const last10 = d.slice(-10);
    const bySuffix = await User.findOne({ phone: { $regex: new RegExp(`${last10}$`) } });
    if (bySuffix) return bySuffix;
  }

  return null;
}
