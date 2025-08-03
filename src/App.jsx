
import React, { useState, useEffect } from 'react';

const MiniOutput = ({ sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost }) => (
  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
    <h4 className="font-medium text-gray-900 mb-2">Area Results</h4>
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span>Square Feet:</span>
        <span>{sqft.toFixed(1)}</span>
      </div>
      <div className="flex justify-between">
        <span>Gallons:</span>
        <span>{gallons.toFixed(1)}</span>
      </div>
      <div className="flex justify-between">
        <span>Sets:</span>
        <span>{sets.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Base Material Cost:</span>
        <span>${baseMaterialCost.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Markup Amount:</span>
        <span>${markupAmount.toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Total Cost:</span>
        <span>${totalCost.toFixed(2)}</span>
      </div>
    </div>
  </div>
);

export default function SprayFoamEstimator() {
  const [areas, setAreas] = useState([
    {
      foamType: "Open",
      foamThickness: 6,
      materialPrice: 1870,
      materialMarkup: 75,
      areaType: "General Area",
      roofPitch: "4/12",
      boardFeetPerSet: 14000
    }
  ]);

  const [globalInputs, setGlobalInputs] = useState({
    laborRate: 50,
    laborMarkup: 30,
    materialMarkup: 75,
    travelDistance: 50,
    fuelCostPerMile: 0.5,
    wasteDisposal: 50,
    equipmentRental: 0,
    includeFranchiseRoyalty: false,
    franchiseRoyaltyRate: 6,
    includeBrandFund: false,
    brandFundRate: 2,
    includeSalesCommission: false,
    salesCommissionRate: 5
  });

  const [actuals, setActuals] = useState({
    actualLaborHours: 0,
    actualOpenGallons: 0,
    actualClosedGallons: 0
  });

  const [areaInputs, setAreaInputs] = useState({});

  useEffect(() => {
    const initialInputs = {};
    areas.forEach((area, index) => {
      if (!areaInputs[index]) {
        initialInputs[index] = {
          area: "",
          width: "",
          height: "",
          roofPitch: area.roofPitch
        };
      }
    });
    if (Object.keys(initialInputs).length > 0) {
      setAreaInputs(prev => ({ ...prev, ...initialInputs }));
    }
  }, [areas.length]);

  const areaTypes = {
    "General Area": { labor: 2 },
    "Rim Joist": { labor: 1.5 },
    "Crawl Space": { labor: 3 },
    "Attic": { labor: 2.5 },
    "Wall": { labor: 1.8 },
    "Basement": { labor: 2.2 }
  };

  const roofPitches = ["1/12", "2/12", "3/12", "4/12", "5/12", "6/12", "7/12", "8/12", "9/12", "10/12", "11/12", "12/12"];

  const addArea = () => {
    const newArea = {
      foamType: "Open",
      foamThickness: 6,
      materialPrice: 1870,
      materialMarkup: 75,
      areaType: "General Area",
      roofPitch: "4/12",
      boardFeetPerSet: 14000
    };
    setAreas([...areas, newArea]);
  };

  const removeArea = (index) => {
    if (areas.length > 1) {
      setAreas(areas.filter((_, i) => i !== index));
      const newAreaInputs = { ...areaInputs };
      delete newAreaInputs[index];
      
      const reindexed = {};
      Object.keys(newAreaInputs).forEach((key, newIndex) => {
        if (parseInt(key) > index) {
          reindexed[parseInt(key) - 1] = newAreaInputs[key];
        } else {
          reindexed[key] = newAreaInputs[key];
        }
      });
      setAreaInputs(reindexed);
    }
  };

  const updateArea = (index, field, value) => {
    const updated = [...areas];
    if (field === "foamType") {
      updated[index][field] = value;
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
    } else {
      updated[index][field] = parseFloat(value) || 0;
    }
    setAreas(updated);
  };

  const updateAreaInput = (index, field, value) => {
    setAreaInputs(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const handleActualsChange = (field, value) => {
    setActuals(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const calculateAreaResults = (area, index) => {
    const inputs = areaInputs[index] || {};
    let sqft = 0;

    if (inputs.area) {
      sqft = parseFloat(inputs.area) || 0;
    } else if (inputs.width && inputs.height) {
      const width = parseFloat(inputs.width) || 0;
      const height = parseFloat(inputs.height) || 0;
      sqft = width * height;

      if (area.areaType === "General Area" && inputs.roofPitch) {
        const pitch = inputs.roofPitch.split('/');
        const rise = parseFloat(pitch[0]);
        const run = parseFloat(pitch[1]);
        const pitchMultiplier = Math.sqrt((rise * rise + run * run)) / run;
        sqft *= pitchMultiplier;
      }
    }

    const gallons = (sqft * area.foamThickness) / 12;
    const sets = gallons / (area.boardFeetPerSet / 1000);
    const baseMaterialCost = sets * (area.materialPrice * 1.20);
    const markupAmount = baseMaterialCost * (area.materialMarkup / 100);
    const totalCost = baseMaterialCost + markupAmount;

    return { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost };
  };

  const totalResults = areas.reduce((acc, area, index) => {
    const results = calculateAreaResults(area, index);
    acc.sqft += results.sqft;
    acc.gallons[area.foamType.toLowerCase()] += results.gallons;
    acc.sets[area.foamType.toLowerCase()] += results.sets;
    acc.baseMaterialCost += results.baseMaterialCost;
    acc.markupAmount += results.markupAmount;
    acc.totalCost += results.totalCost;
    return acc;
  }, {
    sqft: 0,
    gallons: { open: 0, closed: 0 },
    sets: { open: 0, closed: 0 },
    baseMaterialCost: 0,
    markupAmount: 0,
    totalCost: 0
  });

  const totalGallons = totalResults.gallons;
  const totalSets = totalResults.sets;
  const baseMaterialCost = totalResults.baseMaterialCost;
  const materialMarkupAmount = totalResults.markupAmount;

  const totalLaborHours = areas.reduce((acc, area, index) => {
    const results = calculateAreaResults(area, index);
    const laborMultiplier = areaTypes[area.areaType]?.labor || 2;
    return acc + (results.sqft * laborMultiplier / 1000);
  }, 0);

  const baseLaborCost = totalLaborHours * globalInputs.laborRate;
  const laborMarkupAmount = baseLaborCost * (globalInputs.laborMarkup / 100);

  const fuelCost = globalInputs.travelDistance * globalInputs.fuelCostPerMile;

  const totalBaseCost = baseMaterialCost + baseLaborCost + fuelCost + globalInputs.wasteDisposal + globalInputs.equipmentRental;
  const customerCost = baseMaterialCost + materialMarkupAmount + baseLaborCost + laborMarkupAmount + fuelCost + globalInputs.wasteDisposal + globalInputs.equipmentRental;

  const franchiseRoyalty = globalInputs.includeFranchiseRoyalty ? customerCost * (globalInputs.franchiseRoyaltyRate / 100) : 0;
  const brandFund = globalInputs.includeBrandFund ? customerCost * (globalInputs.brandFundRate / 100) : 0;
  const salesCommission = globalInputs.includeSalesCommission ? customerCost * (globalInputs.salesCommissionRate / 100) : 0;

  const totalFees = franchiseRoyalty + brandFund + salesCommission;
  const estimatedProfit = customerCost - totalBaseCost - totalFees;
  const profitMargin = customerCost > 0 ? (estimatedProfit / customerCost) * 100 : 0;

  const marginColor = profitMargin >= 20 ? 'text-green-600' : profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600';

  const actualOpenCost = actuals.actualOpenGallons * (1870 * 1.20 / 1000);
  const actualClosedCost = actuals.actualClosedGallons * (2470 * 1.20 / 1000);
  const actualMaterialCost = actualOpenCost + actualClosedCost;
  const actualLaborCost = actuals.actualLaborHours * globalInputs.laborRate;
  const actualBaseCost = actualMaterialCost + actualLaborCost + fuelCost + globalInputs.wasteDisposal + globalInputs.equipmentRental;

  const actualFranchiseRoyalty = globalInputs.includeFranchiseRoyalty ? customerCost * (globalInputs.franchiseRoyaltyRate / 100) : 0;
  const actualBrandFund = globalInputs.includeBrandFund ? customerCost * (globalInputs.brandFundRate / 100) : 0;
  const actualSalesCommission = globalInputs.includeSalesCommission ? customerCost * (globalInputs.salesCommissionRate / 100) : 0;
  const actualFees = actualFranchiseRoyalty + actualBrandFund + actualSalesCommission;

  const actualProfit = customerCost - actualBaseCost - actualFees;
  const actualMargin = customerCost > 0 ? (actualProfit / customerCost) * 100 : 0;

  const actualMarginColor = actualMargin >= 20 ? 'text-green-600' : actualMargin >= 10 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Spray Foam Estimator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Parameters */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Project Parameters</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Labor Rate ($/hr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={globalInputs.laborRate}
                    onChange={(e) => setGlobalInputs(prev => ({ ...prev, laborRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Labor Markup (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={globalInputs.laborMarkup}
                    onChange={(e) => setGlobalInputs(prev => ({ ...prev, laborMarkup: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel Distance (miles)</label>
                  <input
                    type="number"
                    step="1"
                    value={globalInputs.travelDistance}
                    onChange={(e) => setGlobalInputs(prev => ({ ...prev, travelDistance: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Cost ($/mile)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={globalInputs.fuelCostPerMile}
                    onChange={(e) => setGlobalInputs(prev => ({ ...prev, fuelCostPerMile: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Waste Disposal ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={globalInputs.wasteDisposal}
                    onChange={(e) => setGlobalInputs(prev => ({ ...prev, wasteDisposal: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Rental ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={globalInputs.equipmentRental}
                    onChange={(e) => setGlobalInputs(prev => ({ ...prev, equipmentRental: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={globalInputs.includeFranchiseRoyalty}
                      onChange={(e) => setGlobalInputs(prev => ({ ...prev, includeFranchiseRoyalty: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Franchise Royalty</span>
                  </label>
                  {globalInputs.includeFranchiseRoyalty && (
                    <input
                      type="number"
                      step="0.1"
                      value={globalInputs.franchiseRoyaltyRate}
                      onChange={(e) => setGlobalInputs(prev => ({ ...prev, franchiseRoyaltyRate: parseFloat(e.target.value) || 0 }))}
                      className="w-20 border border-gray-300 p-1 rounded text-sm"
                      placeholder="%"
                    />
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={globalInputs.includeBrandFund}
                      onChange={(e) => setGlobalInputs(prev => ({ ...prev, includeBrandFund: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Brand Fund</span>
                  </label>
                  {globalInputs.includeBrandFund && (
                    <input
                      type="number"
                      step="0.1"
                      value={globalInputs.brandFundRate}
                      onChange={(e) => setGlobalInputs(prev => ({ ...prev, brandFundRate: parseFloat(e.target.value) || 0 }))}
                      className="w-20 border border-gray-300 p-1 rounded text-sm"
                      placeholder="%"
                    />
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={globalInputs.includeSalesCommission}
                      onChange={(e) => setGlobalInputs(prev => ({ ...prev, includeSalesCommission: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Sales Commission</span>
                  </label>
                  {globalInputs.includeSalesCommission && (
                    <input
                      type="number"
                      step="0.1"
                      value={globalInputs.salesCommissionRate}
                      onChange={(e) => setGlobalInputs(prev => ({ ...prev, salesCommissionRate: parseFloat(e.target.value) || 0 }))}
                      className="w-20 border border-gray-300 p-1 rounded text-sm"
                      placeholder="%"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Areas */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Areas</h2>
                <button
                  onClick={addArea}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                >
                  Add Area
                </button>
              </div>
              
              <div className="space-y-6">
                {areas.map((area, index) => {
                  const results = calculateAreaResults(area, index);
                  const { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost } = results;

                  return (
                    <div key={index} className="border border-gray-200 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Area {index + 1}</h3>
                        {areas.length > 1 && (
                          <button
                            onClick={() => removeArea(index)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqft)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={areaInputs[index]?.area || ""}
                            onChange={(e) => updateAreaInput(index, "area", e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Direct area input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Width (ft)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={areaInputs[index]?.width || ""}
                            onChange={(e) => updateAreaInput(index, "width", e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="For calculation"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Height (ft)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={areaInputs[index]?.height || ""}
                            onChange={(e) => updateAreaInput(index, "height", e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="For calculation"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(area).map(([key, val]) => {
                          const options = key === "foamType" ? ["Open", "Closed"] :
                                        key === "areaType" ? Object.keys(areaTypes) :
                                        key === "roofPitch" ? roofPitches : null;

                          const label = key === "materialPrice" ? "Foam Price per Set" :
                                       key === "foamType" ? "Foam Type" :
                                       key === "foamThickness" ? "Foam Thickness (in)" :
                                       key === "materialMarkup" ? "Material Markup (%)" :
                                       key === "areaType" ? "Area Type" :
                                       key === "roofPitch" ? "Roof Pitch" :
                                       key === "boardFeetPerSet" ? "Board Feet per Set" : key;

                          return (
                            <div key={key}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                              {options ? (
                                <select
                                  value={val}
                                  onChange={(e) => {
                                    if (key === "roofPitch") {
                                      updateAreaInput(index, key, e.target.value);
                                    } else {
                                      updateArea(index, key, e.target.value);
                                    }
                                  }}
                                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {options.map(opt => (
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
