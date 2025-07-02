import React, { useState } from "react";

export default function SprayFoamEstimator() {
  const [area, setArea] = useState(0);
  const [thickness, setThickness] = useState(0);
  const [materialCost, setMaterialCost] = useState(0);
  const [laborRate, setLaborRate] = useState(0);
  const [sprayHours, setSprayHours] = useState(0);
  const [prepHours, setPrepHours] = useState(0);
  const [totalCost, setTotalCost] = useState(null);

  const handleEstimate = () => {
    const sprayGallons = (area * thickness) / 2000 * 55; // gallon usage logic
    const materialTotal = sprayGallons * materialCost;
    const laborTotal = (sprayHours + prepHours) * laborRate;
    const total = materialTotal + laborTotal;
    setTotalCost(total.toFixed(2));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Spray Foam Estimator</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Area (sq ft)</label>
            <input type="number" value={area} onChange={e => setArea(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Thickness (inches)</label>
            <input type="number" value={thickness} onChange={e => setThickness(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Material Cost ($/gallon)</label>
            <input type="number" value={materialCost} onChange={e => setMaterialCost(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Labor Rate ($/hr)</label>
            <input type="number" value={laborRate} onChange={e => setLaborRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Spray Hours</label>
            <input type="number" value={sprayHours} onChange={e => setSprayHours(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Prep Hours</label>
            <input type="number" value={prepHours} onChange={e => setPrepHours(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 p-2" />
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
