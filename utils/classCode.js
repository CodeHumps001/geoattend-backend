// Generates unique readable class codes
// Format: CS-300-2025-X7K2

// utils/classCode.js
const generateClassCode = (department, level, academicYear) => {
  const dept = department
    .trim()
    .split(" ")
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 4);

  // 🔧 FIX: Replace slash with dash if present
  const cleanYear = academicYear.replace("/", "-");

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");

  return `${dept}-${level}-${cleanYear}-${random}`;
};

module.exports = { generateClassCode };
