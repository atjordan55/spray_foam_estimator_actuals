import React, { useState } from "react";

export default function SprayFoamEstimator() {
  const [areaType, setAreaType] = useState("General Area");
  const [areaSqFt, setAreaSqFt] = useState(0);
  const [thickness, setThickness] = useState(0);
  const [materialType, setMaterialType] = useState("Open Cell");
  const [materialCostOpen, setMaterialCostOpen] = useState(1870);
  const [materialCostClosed, setMaterialCostClosed] = useState(2470);
  const [laborRate, setLaborRate] = useState(25);
  const [sprayHours, setSprayHours] = useState(0);
  const [prepHours, setPrepHours] = useState(0);
  const [manualHours, setManualHours] = useState(0);
  const [materialMarkup, setMaterialMarkup] = useState(0.5);
  const [laborMarkup, setLaborMarkup] = useState(0.3);
  const [discount, setDiscount] = useState(0);
  const [travelMiles, setTravelMiles] = useState(0);
  const [travelRate, setTravelRate] = useState(0.67);
  const [equipmentRental, setEquipmentRental] = useState(0);
  const [wasteDisposal, setWasteDisposal] = useState(0);
  const [totalCost, setTotalCost] = useState(null);

  const handleEstimate = () => {
    const baseCoverage = materialType === "Open Cell" ? 2000 : 2000;
    const setGallons = 55;
    const sprayGallons = (areaSqFt * thickness) / baseCoverage * setGallons;
    const materialUnitCost = materialType === "Open Cell" ? materialCostOpen : materialCostClosed;
    const materialRaw = (sprayGallons / setGallons) * materialUnitCost;
    const materialWithMarkup = materialRaw * (1 + materialMarkup);

    const laborRaw = (sprayHours + prepHours + manualHours) * laborRate;
    const laborWithMarkup = laborRaw * (1 + laborMarkup);

    const travelCost = travelMiles * travelRate;

    const baseTotal = materialWithMarkup + laborWithMarkup + travelCost + Number(equipmentRental) + Number(wasteDisposal);
    const discountedTotal = baseTotal * (1 - discount);

    setTotalCost(discountedTotal.toFixed(2));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl p-8 space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">Spray Foam Estimator</h1>

        {/* Global Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium">Material Type</label>
            <select value={materialType} onChange={e => setMaterialType(e.target.value)} className="w-full p-2 border rounded-lg">
              <option value="Open Cell">Open Cell</option>
              <option value="Closed Cell">Closed Cell</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Material Cost (Open)</label>
            <input type="number" value={materialCostOpen} onChange={e => setMaterialCostOpen(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Material Cost (Closed)</label>
            <input type="number" value={materialCostClosed} onChange={e => setMaterialCostClosed(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Material Markup (%)</label>
            <input type="number" value={materialMarkup} onChange={e => setMaterialMarkup(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Labor Markup (%)</label>
            <input type="number" value={laborMarkup} onChange={e => setLaborMarkup(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Discount (%)</label>
            <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
        </div>

        {/* Spray Area */}
        <h2 className="text-xl font-semibold text-gray-700 pt-4">Spray Area</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium">Area Type</label>
            <input type="text" value={areaType} onChange={e => setAreaType(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Square Footage</label>
            <input type="number" value={areaSqFt} onChange={e => setAreaSqFt(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Thickness (inches)</label>
            <input type="number" value={thickness} onChange={e => setThickness(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
        </div>

        {/* Labor + Other */}
        <h2 className="text-xl font-semibold text-gray-700 pt-4">Labor and Other Costs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium">Spray Hours</label>
            <input type="number" value={sprayHours} onChange={e => setSprayHours(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Prep Hours</label>
            <input type="number" value={prepHours} onChange={e => setPrepHours(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Manual Hours</label>
            <input type="number" value={manualHours} onChange={e => setManualHours(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Labor Rate ($/hr)</label>
            <input type="number" value={laborRate} onChange={e => setLaborRate(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Travel (miles)</label>
            <input type="number" value={travelMiles} onChange={e => setTravelMiles(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Equipment Rental ($)</label>
            <input type="number" value={equipmentRental} onChange={e => setEquipmentRental(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium">Waste Disposal ($)</label>
            <input type="number" value={wasteDisposal} onChange={e => setWasteDisposal(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
        </div>

        <button onClick={handleEstimate} className="w-full mt-6 bg-blue-600 text-white text-lg font-semibold py-3 rounded-xl hover:bg-blue-700 transition">
          Estimate Job Cost
        </button>

        {totalCost !== null && (
          <div className="mt-6 bg-green-100 text-green-800 text-lg text-center py-4 rounded-xl">
            <strong>Total Estimated Cost:</strong> ${totalCost}
          </div>
        )}
      </div>
    </div>
  );
}
