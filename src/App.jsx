import React, { useState } from "react";

const calculatePitchFactor = (pitchStr) => {
  const [rise, run] = pitchStr.split("/").map(Number);
  return Math.sqrt(1 + Math.pow(rise / run, 2));
};

const calculateMaterialValues = (area) => {
  let sqft = area.length * area.width;
  if (area.areaType === "Gable") sqft = sqft / 2;
  if (area.areaType === "Roof Deck") {
    sqft *= calculatePitchFactor(area.roofPitch);
  }
  const ratio = area.foamType === "Open" ? 6 : 2;
  const gallons = ((sqft * (area.foamThickness / ratio)) / 2000) * 55;
  const sets = gallons / 55;
  return { sqft, gallons, sets };
};

const calculateMaterialCost = (area) => {
  const { sqft, gallons, sets } = calculateMaterialValues(area);
  const baseMaterialCost = sets * area.materialPrice;
  const markupAmount = baseMaterialCost * (area.materialMarkup / 100);
  const totalCost = baseMaterialCost + markupAmount;
  return { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost };
};

const MiniOutput = ({ sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost }) => (
  <div className="text-sm text-gray-700 pt-2">
    SqFt: {sqft.toFixed(1)} | Gallons: {gallons.toFixed(1)} | Sets: {sets.toFixed(2)} |
    Base Cost: ${baseMaterialCost.toFixed(2)} | Markup: ${markupAmount.toFixed(2)} |
    <strong>Total Cost: ${totalCost.toFixed(2)}</strong>
  </div>
);

// ... (remainder omitted here for brevity but present in original canvas)
