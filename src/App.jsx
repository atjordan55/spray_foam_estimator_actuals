import React, { useState } from 'react';

const MiniOutput = ({ sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost }) => (
  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm border">
    <div className="grid grid-cols-3 gap-2">
      <div><span className="font-medium">Sq Ft:</span> {sqft.toFixed(0)}</div>
      <div><span className="font-medium">Gallons:</span> {gallons.toFixed(1)}</div>
      <div><span className="font-medium">Sets:</span> {sets.toFixed(2)}</div>
      <div><span className="font-medium">Base Cost:</span> ${baseMaterialCost.toFixed(2)}</div>
      <div><span className="font-medium">Markup:</span> ${markupAmount.toFixed(2)}</div>
      <div><span className="font-medium">Total:</span> ${totalCost.toFixed(2)}</div>
    </div>
  </div>
);

export default function SprayFoamEstimator() {
  const [estimateName, setEstimateName] = useState("");
  const [globalInputs, setGlobalInputs] = useState({
    laborHours: 0,
    manualLaborRate: 50,
    laborMarkup: 40,
    travelDistance: 50,
    travelRate: 0.68,
    wasteDisposal: 50,
    equipmentRental: 0,
    salesCommission: 3,
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
    materialMarkup: 75,
    areaType: "General Area",
    roofPitch: "4/12",
    boardFeetPerSet: 14000
  }]);

  const [actuals, setActuals] = useState({
    actualLaborHours: 0,
    actualOpenGallons: 0,
    actualClosedGallons: 0
  });

  const labelMap = {
    laborHours: "Labor Hours",
    manualLaborRate: "Actual Labor Rate ($/hr)",
    laborMarkup: "Labor Markup (%)",
    chargedLaborRate: "Charged Labor Rate ($/hr)",
    travelDistance: "Travel Distance (miles)",
    travelRate: "Travel Rate ($/mile)",
    wasteDisposal: "Waste Disposal ($)",
    equipmentRental: "Equipment Rental ($)",
    salesCommission: "Sales Commission (%)",
    includeFranchiseRoyalty: "Include Franchise Royalty",
    includeBrandFund: "Include Brand Fund",
    includeSalesCommission: "Include Sales Commission",
    length: "Length (ft)",
    width: "Width (ft)",
    foamType: "Foam Type",
    foamThickness: "Foam Thickness (inches)",
    materialPrice: "Foam Price per Set",
    materialMarkup: "Material Markup (%)",
    areaType: "Area Type",
    roofPitch: "Roof Pitch",
    boardFeetPerSet: "Board Feet per Set"
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
    const sets = totalBoardFeet / area.boardFeetPerSet;
    const gallons = sets * 100;
    const materialCost = area.materialPrice * 1.20;
    const baseMaterialCost = sets * materialCost;
    const markupAmount = baseMaterialCost * (area.materialMarkup / 100);
    const totalCost = baseMaterialCost + markupAmount;

    return { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost, materialCost };
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

      // Auto-configure foam thickness, material price, markup, and board feet per set based on foam type
      if (key === "foamType") {
        if (value === "Open") {
          updated[index].foamThickness = 6;
          updated[index].materialPrice = 1870;
          updated[index].materialMarkup = 75;
          updated[index].boardFeetPerSet = 14000;
        } else if (value === "Closed") {
          updated[index].foamThickness = 2;
          updated[index].materialPrice = 2470;
          updated[index].materialMarkup = 60;
          updated[index].boardFeetPerSet = 4000;
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
      materialMarkup: 75,
      areaType: "General Area",
      roofPitch: "4/12",
      boardFeetPerSet: 14000
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
  const salesCommission = globalInputs.includeSalesCommission ? customerCost * (globalInputs.salesCommission / 100) : 0;
  const totalFees = franchiseRoyalty + brandFund + salesCommission;
  const estimatedProfit = customerCost - totalBaseCost - totalFees;
  const profitMargin = (estimatedProfit / customerCost) * 100;

  const actualMaterialCost = (actuals.actualOpenGallons / 100) * (1870 * 1.20) + (actuals.actualClosedGallons / 100) * (2470 * 1.20);
  const actualLaborCost = actuals.actualLaborHours * globalInputs.manualLaborRate;
  const actualBaseCost = actualMaterialCost + actualLaborCost + fuelCost + globalInputs.wasteDisposal + globalInputs.equipmentRental;
  const actualCustomerCost = customerCost;
  const actualFees = totalFees;
  const actualProfit = actualCustomerCost - actualBaseCost - actualFees;
  const actualMargin = (actualProfit / actualCustomerCost) * 100;
  const marginColor = profitMargin < 25 ? "text-red-600" : profitMargin < 30 ? "text-yellow-600" : "text-green-600";
  const actualMarginColor = actualMargin < 25 ? "text-red-600" : actualMargin < 30 ? "text-yellow-600" : "text-green-600";

  const pitchOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}/12`);

  // Calculate the charged labor rate
  const chargedLaborRate = globalInputs.manualLaborRate * (1 + (globalInputs.laborMarkup / 100));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start bg-white p-6 rounded-lg shadow-sm">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Eco Innovations Estimator</h1>
              <input
                type="text"
                placeholder="Enter estimate name..."
                value={estimateName}
                onChange={(e) => setEstimateName(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={saveEstimate} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Save Estimate
              </button>
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors">
                Load Estimate
                <input type="file" accept="application/json" onChange={loadEstimate} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Inputs */}
          <div className="xl:col-span-2 space-y-8">
            {/* Global Inputs */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Project Parameters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(globalInputs).map(([key, val]) => {
                  if (key === 'salesCommission') {
                      return (
                          <div key={key}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">{labelMap[key] || key}</label>
                              <input
                                  type="number"
                                  step="0.01"
                                  value={val}
                                  onChange={(e) => handleGlobalChange(key, e.target.value)}
                                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                          </div>
                      );
                  }
                  return (
                      <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{labelMap[key] || key}</label>
                          {key.startsWith('include') ? (
                              <div className="flex items-center">
                                  <input
                                      type="checkbox"
                                      checked={val}
                                      onChange={(e) => setGlobalInputs({ ...globalInputs, [key]: e.target.checked })}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-600">Include in calculation</span>
                              </div>
                          ) : key === 'laborMarkup' ? (
                              <>
                                  <input
                                      type="number"
                                      step="0.01"
                                      value={val}
                                      onChange={(e) => handleGlobalChange(key, e.target.value)}
                                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <div className="mt-4">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">{labelMap['chargedLaborRate']}</label>
                                      <input
                                          type="number"
                                          step="0.01"
                                          value={chargedLaborRate.toFixed(2)}
                                          readOnly
                                          className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100 text-gray-600"
                                      />
                                  </div>
                              </>
                          ) : (
                              <input
                                  type="number"
                                  step="0.01"
                                  value={val}
                                  onChange={(e) => handleGlobalChange(key, e.target.value)}
                                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                          )}
                      </div>
                  );
                })}
              </div>
            </div>

            {/* Spray Areas */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Project Areas</h2>
                <button onClick={addArea} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  + Add Area
                </button>
              </div>
              <div className="space-y-6">
                {sprayAreas.map((area, index) => {
                  const { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost } = calculateMaterialCost(area);
                  return (
                    <div key={index} className="border border-gray-200 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-gray-900">Area {index + 1}</h3>
                        {sprayAreas.length > 1 && (
                          <button onClick={() => removeArea(index)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(area).map(([key, val]) => {
                          if (key === "roofPitch" && area.areaType !== "Roof Deck") return null;
                          return (
                            <div key={key}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{labelMap[key] || key}</label>
                              {key === "foamType" || key === "areaType" ? (
                                <select
                                  value={val}
                                  onChange={(e) => updateArea(index, key, e.target.value)}
                                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {(key === "foamType" ? ["Open", "Closed"] : ["General Area", "Roof Deck", "Gable"]).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : key === "roofPitch" ? (
                                <select
                                  value={val}
                                  onChange={(e) => updateArea(index, key, e.target.value)}
                                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {pitchOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={typeof val === "number" ? "number" : "text"}
                                  step="0.01"
                                  value={val}
                                  onChange={(e) => updateArea(index, key, e.target.value)}
                                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              )}
                            </div>
                          );
                        })}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Material Cost</label>
                          <input
                            type="number"
                            step="0.01"
                            value={(area.materialPrice * 1.20).toFixed(2)}
                            readOnly
                            className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100 text-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price per Sq Ft</label>
                          <input
                            type="number"
                            step="0.01"
                            value={(totalCost / sqft).toFixed(2)}
                            readOnly
                            className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100 text-gray-600"
                          />
                        </div>
                      </div>
                      <MiniOutput
                        sqft={sqft}
                        gallons={gallons}
                        sets={sets}
                        baseMaterialCost={baseMaterialCost}
                        markupAmount={markupAmount}
                        totalCost={totalCost}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actual Results Input */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Actual Results Input</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Labor Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={actuals.actualLaborHours}
                    onChange={(e) => handleActualsChange("actualLaborHours", e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Open Cell Gallons</label>
                  <input
                    type="number"
                    step="0.1"
                    value={actuals.actualOpenGallons}
                    onChange={(e) => handleActualsChange("actualOpenGallons", e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Closed Cell Gallons</label>
                  <input
                    type="number"
                    step="0.1"
                    value={actuals.actualClosedGallons}
                    onChange={(e) => handleActualsChange("actualClosedGallons", e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-8">
            {/* Estimate Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Estimate Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Open Cell:</span>
                  <span>{totalGallons.open.toFixed(1)} gallons ({totalSets.open.toFixed(2)} sets)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Closed Cell:</span>
                  <span>{totalGallons.closed.toFixed(1)} gallons ({totalSets.closed.toFixed(2)} sets)</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between py-1">
                  <span className="text-blue-600 font-medium">Base Material Cost:</span>
                  <span className="text-blue-600 font-medium">${baseMaterialCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-blue-600 font-medium">Base Labor Cost:</span>
                  <span className="text-blue-600 font-medium">${baseLaborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Fuel Cost:</span>
                  <span>${fuelCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Waste Disposal:</span>
                  <span>${globalInputs.wasteDisposal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Equipment Rental:</span>
                  <span>${globalInputs.equipmentRental.toFixed(2)}</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between py-1 font-medium">
                  <span>Base Job Cost:</span>
                  <span>${totalBaseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Material Markup:</span>
                  <span>${materialMarkupAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Labor Markup:</span>
                  <span>${laborMarkupAmount.toFixed(2)}</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between py-1 font-bold text-lg">
                  <span>Customer Charge:</span>
                  <span>${customerCost.toFixed(2)}</span>
                </div>
                {globalInputs.includeFranchiseRoyalty && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Franchise Royalty:</span>
                    <span>${franchiseRoyalty.toFixed(2)}</span>
                  </div>
                )}
                {globalInputs.includeBrandFund && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Brand Fund:</span>
                    <span>${brandFund.toFixed(2)}</span>
                  </div>
                )}
                {globalInputs.includeSalesCommission && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Sales Commission:</span>
                    <span>${salesCommission.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-medium">
                  <span>Total Fees:</span>
                  <span>${totalFees.toFixed(2)}</span>
                </div>
                <hr className="my-3" />
                <div className={`flex justify-between py-1 font-bold text-lg ${marginColor}`}>
                  <span>Estimated Profit:</span>
                  <span>${estimatedProfit.toFixed(2)} ({profitMargin.toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            {/* Actual Results */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Actual Results</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="font-bold text-blue-600">Actual Material Cost:</span>
                  <span className="font-bold text-blue-600">${actualMaterialCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-blue-600">Actual Labor Cost:</span>
                  <span className="font-bold text-blue-600">${actualLaborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-medium">
                  <span>Actual Base Job Cost:</span>
                  <span>${actualBaseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-lg">
                  <span>Customer Charge:</span>
                  <span>${customerCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Total Fees:</span>
                  <span>${actualFees.toFixed(2)}</span>
                </div>
                <hr className="my-3" />
                <div className={`flex justify-between py-1 font-bold text-lg ${actualMarginColor}`}>
                  <span>Actual Profit:</span>
                  <span>${actualProfit.toFixed(2)} ({actualMargin.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
