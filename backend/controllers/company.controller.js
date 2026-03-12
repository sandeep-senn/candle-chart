import { getInstruments } from "../services/instrumentService.js";

export const searchCompanies = (req, res) => {
  const query = req.query.q?.toUpperCase() || "";

  // Only search if user has typed at least 2 characters
  if (query.length < 2) {
    return res.json([]);
  }

  const all = getInstruments();

  // Filter by symbol or company name
  const results = all.filter(c =>
    (c.symbol && c.symbol.toUpperCase().includes(query)) ||
    (c.name && c.name.toUpperCase().includes(query))
  ).slice(0, 10); // LIMIT TO FIRST 10 RESULTS

  console.log(`[Search] Query: "${query}" | Results: ${results.length} / ${all.length}`);

  res.json(results);
};
