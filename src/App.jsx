
import React, { useState } from 'react';

const MiniOutput = ({ sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost }) => (
  <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
    <div>Sq Ft: {sqft.toFixed(0)}</div>
    <div>Gallons: {gallons.toFixed(1)}</div>
    <div>Sets: {sets.toFixed(2)}</div>
    <div>Base Material: ${baseMaterialCost.toFixed(2)}</div>
    <div>Markup: ${markupAmount.toFixed(2)}</div>
    <div>Total: ${totalCost.toFixed(2)}</div>
  </div>
);

export default function SprayFoamEstimator() {
  const [estimateName, setEstimateName] = useState("");
  const [globalInputs, setGlobalInputs] = useState({
    laborHours: 0,
    manualLaborRate: 50,
    laborMarkup: 40,
    travelDistance: 0,
    travelRate: 0.68,
    wasteDisposal: 0,
    equipmentRental: 0,
    includeFranchiseRoyalty: true,
    includeBrandFund: true,
    includeSalesCommission: true
  });

  const [sprayAreas, setSprayAreas] = useState([{
    length: 0,
    width: 0,
    foamType: "Open",
    foamThickness: 6,
    materialPrice: 1870,
    materialMarkup: 80,
    areaType: "General Area",
    roofPitch: "4/12"
  }]);

  const [actuals, setActuals] = useState({
    actualLaborHours: 0,
    actualOpenGallons: 0,
    actualClosedGallons: 0
  });

  const labelMap = {
    laborHours: "Labor Hours",
    manualLaborRate: "Labor Rate ($/hr)",
    laborMarkup: "Labor Markup (%)",
    travelDistance: "Travel Distance (miles)",
    travelRate: "Travel Rate ($/mile)",
    wasteDisposal: "Waste Disposal ($)",
    equipmentRental: "Equipment Rental ($)",
    includeFranchiseRoyalty: "Include Franchise Royalty",
    includeBrandFund: "Include Brand Fund",
    includeSalesCommission: "Include Sales Commission",
    length: "Length (ft)",
    width: "Width (ft)",
    foamType: "Foam Type",
    foamThickness: "Foam Thickness (inches)",
    materialPrice: "Material Price ($/55gal drum)",
    materialMarkup: "Material Markup (%)",
    areaType: "Area Type",
    roofPitch: "Roof Pitch"
  };

  const calculateMaterialCost = (area) => {
    let sqft = area.length * area.width;
    
    if (area.areaType === "Roof Deck") {
      const [rise, run] = area.roofPitch.split("/").map(Number);
      const pitchMultiplier = Math.sqrt(Math.pow(rise, 2) + Math.pow(run, 2)) / run;
      sqft *= pitchMultiplier;
    } else if (area.areaType === "Gable") {
      sqft = 0.5 * area.length * area.width;
    }

    const boardFeetPerInch = sqft;
    const totalBoardFeet = boardFeetPerInch * area.foamThickness;
    const gallons = area.foamType === "Open" ? totalBoardFeet / 330 : totalBoardFeet / 165;
    const sets = gallons / 55;
    const baseMaterialCost = sets * area.materialPrice;
    const markupAmount = baseMaterialCost * (area.materialMarkup / 100);
    const totalCost = baseMaterialCost + markupAmount;

    return { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost };
  };

  const handleGlobalChange = (key, value) => {
    setGlobalInputs({ ...globalInputs, [key]: parseFloat(value) || 0 });
  };

  const handleActualsChange = (key, value) => {
    setActuals({ ...actuals, [key]: parseFloat(value) || 0 });
  };

  const updateArea = (index, key, value) => {
    const updated = [...sprayAreas];
    if (key === "foamType" || key === "areaType" || key === "roofPitch") {
      updated[index][key] = value;
      
      // Auto-configure foam thickness, material price, and markup based on foam type
      if (key === "foamType") {
        if (value === "Open") {
          updated[index].foamThickness = 6;
          updated[index].materialPrice = 1870;
          updated[index].materialMarkup = 80;
        } else if (value === "Closed") {
          updated[index].foamThickness = 2;
          updated[index].materialPrice = 2470;
          updated[index].materialMarkup = 75;
        }
      }
    } else {
      updated[index][key] = parseFloat(value) || 0;
    }
    setSprayAreas(updated);
  };

  const addArea = () => {
    setSprayAreas([...sprayAreas, {
      length: 0,
      width: 0,
      foamType: "Open",
      foamThickness: 6,
      materialPrice: 1870,
      materialMarkup: 80,
      areaType: "General Area",
      roofPitch: "4/12"
    }]);
  };

  const removeArea = (index) => {
    setSprayAreas(sprayAreas.filter((_, i) => i !== index));
  };

  const saveEstimate = () => {
    const json = JSON.stringify({ estimateName, globalInputs, sprayAreas, actuals }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${estimateName || 'spray-foam-estimate'}.json`;
    a.click();
  };

  const loadEstimate = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        setEstimateName(data.estimateName || "");
        setGlobalInputs(data.globalInputs || {});
        setSprayAreas(data.sprayAreas || []);
        setActuals(data.actuals || {});
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const totalGallons = { open: 0, closed: 0 };
  const totalSets = { open: 0, closed: 0 };
  let baseMaterialCost = 0;
  let materialMarkupAmount = 0;

  sprayAreas.forEach(area => {
    const { gallons, sets, baseMaterialCost: cost, markupAmount } = calculateMaterialCost(area);
    if (area.foamType === "Open") {
      totalGallons.open += gallons;
      totalSets.open += sets;
    } else {
      totalGallons.closed += gallons;
      totalSets.closed += sets;
    }
    baseMaterialCost += cost;
    materialMarkupAmount += markupAmount;
  });

  const fuelCost = globalInputs.travelDistance * globalInputs.travelRate;
  const baseLaborCost = globalInputs.laborHours * globalInputs.manualLaborRate;
  const totalBaseCost = baseMaterialCost + baseLaborCost + fuelCost + globalInputs.wasteDisposal + globalInputs.equipmentRental;
  const laborMarkupAmount = baseLaborCost * (globalInputs.laborMarkup / 100);
  const customerCost = totalBaseCost + materialMarkupAmount + laborMarkupAmount;
  const franchiseRoyalty = globalInputs.includeFranchiseRoyalty ? customerCost * 0.06 : 0;
  const brandFund = globalInputs.includeBrandFund ? customerCost * 0.01 : 0;
  const salesCommission = globalInputs.includeSalesCommission ? customerCost * 0.03 : 0;
  const totalFees = franchiseRoyalty + brandFund + salesCommission;
  const estimatedProfit = customerCost - totalBaseCost - totalFees;
  const profitMargin = (estimatedProfit / customerCost) * 100;

  const actualMaterialCost = ((actuals.actualOpenGallons + actuals.actualClosedGallons) / 55) * 1870;
  const actualLaborCost = actuals.actualLaborHours * globalInputs.manualLaborRate;
  const actualBaseCost = actualMaterialCost + actualLaborCost + fuelCost + globalInputs.wasteDisposal + globalInputs.equipmentRental;
  const actualCustomerCost = customerCost;
  const actualFees = actualCustomerCost * 0.10;
  const actualProfit = actualCustomerCost - actualBaseCost - actualFees;
  const actualMargin = (actualProfit / actualCustomerCost) * 100;
  const marginColor = profitMargin < 25 ? "text-red-600" : profitMargin < 30 ? "text-yellow-600" : "text-green-600";
  const actualMarginColor = actualMargin < 25 ? "text-red-600" : actualMargin < 30 ? "text-yellow-600" : "text-green-600";

  const pitchOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}/12`);

  return (
    <div className="p-6 space-y-10">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <input
          type="text"
          placeholder="Estimate Name"
          value={estimateName}
          onChange={(e) => setEstimateName(e.target.value)}
          className="border p-2 rounded w-full sm:w-1/2"
        />
        <div className="flex gap-2">
          <button onClick={saveEstimate} className="bg-green-600 text-white px-4 py-2 rounded">Save JSON</button>
          <input type="file" accept="application/json" onChange={loadEstimate} className="border p-2 rounded" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Global Inputs</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(globalInputs).map(([key, val]) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{labelMap[key] || key}</label>
              {key.startsWith('include') ? (
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => setGlobalInputs({ ...globalInputs, [key]: e.target.checked })}
                  className="h-4 w-4"
                />
              ) : (
                <input
                  type="number"
                  value={val}
                  onChange={(e) => handleGlobalChange(key, e.target.value)}
                  className="w-full border p-2 rounded"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Spray Areas</h2>
        {sprayAreas.map((area, index) => {
          const { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost } = calculateMaterialCost(area);
          return (
            <div key={index} className="border p-4 rounded mb-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(area).map(([key, val]) => {
                  if (key === "roofPitch" && area.areaType !== "Roof Deck") return null;
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1">{labelMap[key] || key}</label>
                      {key === "foamType" || key === "areaType" ? (
                        <select
                          value={val}
                          onChange={(e) => updateArea(index, key, e.target.value)}
                          className="w-full border p-2 rounded"
                        >
                          {(key === "foamType" ? ["Open", "Closed"] : ["General Area", "Roof Deck", "Gable"]).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : key === "roofPitch" ? (
                        <select
                          value={val}
                          onChange={(e) => updateArea(index, key, e.target.value)}
                          className="w-full border p-2 rounded"
                        >
                          {pitchOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={typeof val === "number" ? "number" : "text"}
                          value={val}
                          onChange={(e) => updateArea(index, key, e.target.value)}
                          className="w-full border p-2 rounded"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <MiniOutput
                sqft={sqft}
                gallons={gallons}
                sets={sets}
                baseMaterialCost={baseMaterialCost}
                markupAmount={markupAmount}
                totalCost={totalCost}
              />
              <button onClick={() => removeArea(index)} className="mt-2 text-red-500">Remove Area</button>
            </div>
          );
        })}
        <button onClick={addArea} className="bg-blue-600 text-white px-4 py-2 rounded">Add Area</button>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Estimate Summary</h2>
        <div className="text-sm space-y-1">
          <div>Open Cell: {totalGallons.open.toFixed(1)} gallons ({totalSets.open.toFixed(2)} sets)</div>
          <div>Closed Cell: {totalGallons.closed.toFixed(1)} gallons ({totalSets.closed.toFixed(2)} sets)</div>
          <div className="text-blue-600">Base Material Cost: ${baseMaterialCost.toFixed(2)}</div>
          <div className="text-blue-600">Base Labor Cost: ${baseLaborCost.toFixed(2)}</div>
          <div>Fuel Cost: ${fuelCost.toFixed(2)}</div>
          <div>Waste Disposal: ${globalInputs.wasteDisposal.toFixed(2)}</div>
          <div>Equipment Rental: ${globalInputs.equipmentRental.toFixed(2)}</div>
          <div className="font-bold">Base Job Cost: ${totalBaseCost.toFixed(2)}</div>
          <div>Material Markup: ${materialMarkupAmount.toFixed(2)}</div>
          <div>Labor Markup: ${laborMarkupAmount.toFixed(2)}</div>
          <div className="font-bold">Customer Charge: ${customerCost.toFixed(2)}</div>
          {globalInputs.includeFranchiseRoyalty && <div>Franchise Royalty: ${franchiseRoyalty.toFixed(2)}</div>}
          {globalInputs.includeBrandFund && <div>Brand Fund: ${brandFund.toFixed(2)}</div>}
          {globalInputs.includeSalesCommission && <div>Sales Commission: ${salesCommission.toFixed(2)}</div>}
          <div className="font-bold">Total Fees: ${totalFees.toFixed(2)}</div>
          <div className={`font-bold ${marginColor}`}>Estimated Profit: ${estimatedProfit.toFixed(2)} ({profitMargin.toFixed(1)}%)</div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mt-6 mb-2">Actual Results</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Actual Labor Hours</label>
            <input
              type="number"
              value={actuals.actualLaborHours}
              onChange={(e) => handleActualsChange("actualLaborHours", e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Actual Open Cell Gallons</label>
            <input
              type="number"
              value={actuals.actualOpenGallons}
              onChange={(e) => handleActualsChange("actualOpenGallons", e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Actual Closed Cell Gallons</label>
            <input
              type="number"
              value={actuals.actualClosedGallons}
              onChange={(e) => handleActualsChange("actualClosedGallons", e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
        <div className="mt-4 text-sm">
          <div className="font-bold text-blue-600">Actual Material Cost: ${actualMaterialCost.toFixed(2)}</div>
          <div className="font-bold text-blue-600">Actual Labor Cost: ${actualLaborCost.toFixed(2)}</div>
          <div className="font-bold">Actual Base Job Cost: ${actualBaseCost.toFixed(2)}</div>
          <div className="font-bold">Customer Charge: ${customerCost.toFixed(2)}</div>
          <div>Total Fees: ${actualFees.toFixed(2)}</div>
          <div className={`font-bold ${actualMarginColor}`}>Actual Profit: ${actualProfit.toFixed(2)} ({actualMargin.toFixed(1)}%)</div>
        </div>
      </div>
    </div>
  );
}
