// Generates unique readable class codes
// Format: CS-300-2025-X7K2

const generateClassCode = (department, level, year) => {
  const dept = department
    .trim()
    .split(" ")
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 4);

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");

  return `${dept}-${level}-${year}-${random}`;
};

module.exports = { generateClassCode };
