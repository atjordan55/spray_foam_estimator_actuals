import React, { useState, useEffect } from 'react';

const Tooltip = ({ text }) => (
  <div className="group relative inline-block ml-1">
    <span className="cursor-help text-gray-400 hover:text-gray-600">
      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
        <path strokeWidth="2" d="M12 16v-4M12 8h.01"/>
      </svg>
    </span>
    <div className="invisible group-hover:visible absolute z-50 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg -left-20 bottom-6">
      {text}
    </div>
  </div>
);

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

const getDefaultState = () => ({
  estimateName: "",
  customerInfo: {
    name: "",
    address: "",
    phone: "",
    email: ""
  },
  estimateDate: new Date().toISOString().split('T')[0],
  expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  projectNotes: "",
  globalInputs: {
    laborHours: 0,
    manualLaborRate: 50,
    laborMarkup: 40,
    travelDistance: 50,
    travelRate: 0.68,
    wasteDisposal: 50,
    equipmentRental: 0
  },
  sprayAreas: [{
    areaSqFt: 0,
    length: 0,
    width: 0,
    foamType: "Open",
    foamThickness: 6,
    materialPrice: 1870,
    materialMarkup: 75,
    areaType: "General Area",
    roofPitch: "4/12",
    boardFeetPerSet: 14000,
    applyPitchToManualArea: false
  }],
  actuals: {
    actualLaborHours: null,
    actualOpenGallons: null,
    actualClosedGallons: null
  }
});

export default function SprayFoamEstimator() {
  const defaultState = getDefaultState();
  
  const [estimateName, setEstimateName] = useState(defaultState.estimateName);
  const [customerInfo, setCustomerInfo] = useState(defaultState.customerInfo);
  const [estimateDate, setEstimateDate] = useState(defaultState.estimateDate);
  const [expirationDate, setExpirationDate] = useState(defaultState.expirationDate);
  const [projectNotes, setProjectNotes] = useState(defaultState.projectNotes);
  const [globalInputs, setGlobalInputs] = useState(defaultState.globalInputs);
  const [sprayAreas, setSprayAreas] = useState(defaultState.sprayAreas);
  const [actuals, setActuals] = useState(defaultState.actuals);
  const [actualsConfirmed, setActualsConfirmed] = useState(false);
  const [recentEstimates, setRecentEstimates] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [estimateNameManuallyEdited, setEstimateNameManuallyEdited] = useState(false);
  const [chargedLaborRateInput, setChargedLaborRateInput] = useState("");
  const [chargedLaborRateError, setChargedLaborRateError] = useState("");
  const [pricePerSqFtErrors, setPricePerSqFtErrors] = useState({});
  const [pricePerSqFtInputs, setPricePerSqFtInputs] = useState({});
  const [laborRateInput, setLaborRateInput] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('recentEstimates');
    if (saved) {
      try {
        setRecentEstimates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent estimates');
      }
    }
  }, []);

  useEffect(() => {
    if (customerInfo.name && !estimateNameManuallyEdited) {
      setEstimateName(customerInfo.name);
    }
  }, [customerInfo.name, estimateNameManuallyEdited]);

  useEffect(() => {
    if (chargedLaborRateError) {
      const chargedRate = parseFloat(chargedLaborRateInput) || 0;
      if (chargedRate >= globalInputs.manualLaborRate) {
        setChargedLaborRateError("");
        if (globalInputs.manualLaborRate > 0) {
          const newMarkup = ((chargedRate / globalInputs.manualLaborRate) - 1) * 100;
          setGlobalInputs(prev => ({ ...prev, laborMarkup: newMarkup }));
        }
      } else if (chargedRate < globalInputs.manualLaborRate && chargedLaborRateInput) {
        setChargedLaborRateError(`Charged rate must be at least $${globalInputs.manualLaborRate.toFixed(2)} (the Actual Labor Rate)`);
      }
    }
  }, [globalInputs.manualLaborRate]);

  const tooltips = {
    laborHours: "Total estimated labor hours for the project",
    manualLaborRate: "Your actual cost per hour for labor",
    laborMarkup: "Percentage markup added to labor cost",
    chargedLaborRate: "Rate charged to customer (labor rate + markup)",
    travelDistance: "Round-trip distance to job site",
    travelRate: "Cost per mile for travel (fuel, wear, etc.)",
    wasteDisposal: "Cost for disposing of waste materials",
    equipmentRental: "Any equipment rental costs for this job",
    areaSqFt: "Total square footage for this area (enter directly or use Length × Width)",
    length: "Optional: Length in feet (used to calculate area if provided)",
    width: "Optional: Width in feet (used to calculate area if provided)",
    foamType: "Open cell is less dense, closed cell is denser",
    foamThickness: "Thickness of foam application in inches",
    materialPrice: "Cost per set of foam from supplier",
    materialMarkup: "Percentage markup on material cost",
    areaType: "Type of surface being sprayed",
    roofPitch: "Slope of the roof (rise/run)",
    boardFeetPerSet: "Board feet coverage per set of foam",
    applyPitchToManualArea: "Apply roof pitch multiplier to manually entered square footage"
  };

  const labelMap = {
    laborHours: "Labor Hours",
    manualLaborRate: "Actual Labor Rate ($/hr)",
    laborMarkup: "Labor Markup (%)",
    chargedLaborRate: "Charged Labor Rate ($/hr)",
    travelDistance: "Travel Distance (miles)",
    travelRate: "Travel Rate ($/mile)",
    wasteDisposal: "Waste Disposal ($)",
    equipmentRental: "Equipment Rental ($)",
    areaSqFt: "Area (Sq Ft)",
    length: "Length (ft) - Optional",
    width: "Width (ft) - Optional",
    foamType: "Foam Type",
    foamThickness: "Foam Thickness (inches)",
    materialPrice: "Foam Cost per Set",
    materialMarkup: "Material Markup (%)",
    areaType: "Area Type",
    roofPitch: "Roof Pitch",
    boardFeetPerSet: "Board Feet per Set"
  };

  const calculateMaterialCost = (area) => {
    let sqft;
    
    if (area.areaSqFt > 0) {
      sqft = area.areaSqFt;
      if (area.areaType === "Roof Deck" && area.applyPitchToManualArea) {
        const [rise, run] = area.roofPitch.split("/").map(Number);
        const pitchMultiplier = Math.sqrt(Math.pow(rise, 2) + Math.pow(run, 2)) / run;
        sqft *= pitchMultiplier;
      }
    } else {
      sqft = area.length * area.width;
      
      if (area.areaType === "Roof Deck") {
        const [rise, run] = area.roofPitch.split("/").map(Number);
        const pitchMultiplier = Math.sqrt(Math.pow(rise, 2) + Math.pow(run, 2)) / run;
        sqft *= pitchMultiplier;
      } else if (area.areaType === "Gable") {
        sqft = 0.5 * area.length * area.width;
      }
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

  const validateAndSet = (value, setter, key, currentState) => {
    const parsed = parseFloat(value);
    const validated = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setter({ ...currentState, [key]: validated });
  };

  const handleGlobalChange = (key, value) => {
    validateAndSet(value, setGlobalInputs, key, globalInputs);
  };

  const handleChargedLaborRateChange = (value) => {
    setChargedLaborRateInput(value);
  };

  const validateChargedLaborRate = () => {
    const chargedRate = parseFloat(chargedLaborRateInput) || 0;
    const actualRate = globalInputs.manualLaborRate;
    
    if (chargedLaborRateInput === "" || chargedLaborRateInput === null) {
      setChargedLaborRateError("");
      setChargedLaborRateInput("");
      return;
    }
    
    if (chargedRate < actualRate) {
      setChargedLaborRateError(`Charged rate must be at least $${actualRate.toFixed(2)} (the Actual Labor Rate)`);
    } else {
      setChargedLaborRateError("");
      setChargedLaborRateInput("");
      if (actualRate > 0) {
        const newMarkup = ((chargedRate / actualRate) - 1) * 100;
        setGlobalInputs({ ...globalInputs, laborMarkup: newMarkup });
      }
    }
  };

  const handleActualsChange = (key, value) => {
    const parsed = parseFloat(value);
    setActuals({ ...actuals, [key]: isNaN(parsed) ? null : Math.max(0, parsed) });
  };

  const handleCustomerInfoChange = (key, value) => {
    setCustomerInfo({ ...customerInfo, [key]: value });
  };

  const updateArea = (index, key, value) => {
    const updated = [...sprayAreas];
    if (key === "foamType" || key === "areaType" || key === "roofPitch" || key === "applyPitchToManualArea") {
      updated[index][key] = value;

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
      const parsed = parseFloat(value);
      const validatedValue = isNaN(parsed) ? 0 : Math.max(0, parsed);
      updated[index][key] = validatedValue;
      
      if (key === "areaSqFt" && validatedValue > 0) {
        updated[index].length = 0;
        updated[index].width = 0;
      }
      
      if ((key === "length" || key === "width") && validatedValue > 0) {
        updated[index].areaSqFt = 0;
        updated[index].applyPitchToManualArea = false;
      }
    }
    setSprayAreas(updated);
  };

  const addArea = () => {
    setSprayAreas([...sprayAreas, {
      areaSqFt: 0,
      length: 0,
      width: 0,
      foamType: "Open",
      foamThickness: 6,
      materialPrice: 1870,
      materialMarkup: 75,
      areaType: "General Area",
      roofPitch: "4/12",
      boardFeetPerSet: 14000,
      applyPitchToManualArea: false
    }]);
  };

  const removeArea = (index) => {
    setSprayAreas(sprayAreas.filter((_, i) => i !== index));
    setPricePerSqFtErrors(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const handlePricePerSqFtInputChange = (index, value) => {
    setPricePerSqFtInputs(prev => ({ ...prev, [index]: value }));
  };

  const handlePricePerSqFtBlur = (index, area) => {
    const value = pricePerSqFtInputs[index];
    if (value === undefined || value === "") {
      setPricePerSqFtInputs(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return;
    }
    
    const newPricePerSqFt = parseFloat(value) || 0;
    const materialCostPerSet = area.materialPrice * 1.20;
    const minPricePerSqFt = (area.foamThickness / area.boardFeetPerSet) * materialCostPerSet;
    
    const roundedInput = Math.round(newPricePerSqFt * 100) / 100;
    const roundedMin = Math.round(minPricePerSqFt * 100) / 100;
    
    if (roundedInput < roundedMin) {
      setPricePerSqFtErrors(prev => ({
        ...prev,
        [index]: `Price must be at least $${minPricePerSqFt.toFixed(2)} (derived from Material Cost per Set)`
      }));
    } else {
      setPricePerSqFtErrors(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      
      const pricePerSet = newPricePerSqFt * (area.boardFeetPerSet / area.foamThickness);
      const newMarkup = ((pricePerSet / materialCostPerSet) - 1) * 100;
      
      const updated = [...sprayAreas];
      updated[index].materialMarkup = Math.max(0, newMarkup);
      setSprayAreas(updated);
    }
    
    setPricePerSqFtInputs(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const resetEstimate = () => {
    if (window.confirm('Are you sure you want to clear all fields and start a new estimate?')) {
      const defaults = getDefaultState();
      setEstimateName(defaults.estimateName);
      setCustomerInfo(defaults.customerInfo);
      setEstimateDate(defaults.estimateDate);
      setExpirationDate(defaults.expirationDate);
      setProjectNotes(defaults.projectNotes);
      setGlobalInputs(defaults.globalInputs);
      setSprayAreas(defaults.sprayAreas);
      setActuals(defaults.actuals);
      setActualsConfirmed(false);
      setEstimateNameManuallyEdited(false);
      setChargedLaborRateError("");
      setChargedLaborRateInput("");
      setPricePerSqFtErrors({});
      setPricePerSqFtInputs({});
      setLaborRateInput(null);
    }
  };

  const saveEstimate = () => {
    const data = { 
      estimateName, 
      customerInfo, 
      estimateDate, 
      expirationDate, 
      projectNotes, 
      globalInputs, 
      sprayAreas, 
      actuals,
      savedAt: new Date().toISOString()
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${estimateName || 'spray-foam-estimate'}.json`;
    a.click();

    const newRecent = [
      { name: estimateName || 'Untitled', savedAt: new Date().toISOString(), data },
      ...recentEstimates.filter(r => r.name !== estimateName).slice(0, 9)
    ];
    setRecentEstimates(newRecent);
    localStorage.setItem('recentEstimates', JSON.stringify(newRecent));
  };

  const loadEstimate = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        applyEstimateData(data);
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const applyEstimateData = (data) => {
    setEstimateName(data.estimateName || "");
    setCustomerInfo(data.customerInfo || getDefaultState().customerInfo);
    setEstimateDate(data.estimateDate || getDefaultState().estimateDate);
    setExpirationDate(data.expirationDate || getDefaultState().expirationDate);
    setProjectNotes(data.projectNotes || "");
    setGlobalInputs(data.globalInputs || getDefaultState().globalInputs);
    setSprayAreas(data.sprayAreas || getDefaultState().sprayAreas);
    setActuals({
      actualLaborHours: data.actuals?.actualLaborHours ?? null,
      actualOpenGallons: data.actuals?.actualOpenGallons ?? null,
      actualClosedGallons: data.actuals?.actualClosedGallons ?? null
    });
    setActualsConfirmed(false);
    setEstimateNameManuallyEdited(!!data.estimateName);
    setChargedLaborRateError("");
    setChargedLaborRateInput("");
  };

  const loadRecentEstimate = (estimate) => {
    applyEstimateData(estimate.data);
  };

  const deleteRecentEstimate = (index) => {
    const updated = recentEstimates.filter((_, i) => i !== index);
    setRecentEstimates(updated);
    localStorage.setItem('recentEstimates', JSON.stringify(updated));
  };

  const handlePrint = () => {
    window.print();
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
  
  const netProfitBeforeCommission = customerCost - totalBaseCost;
  const profitMarginBeforeCommission = customerCost > 0 ? (netProfitBeforeCommission / customerCost) * 100 : 0;
  
  const calculateSalesCommission = (netProfit, margin) => {
    if (margin >= 35) {
      return netProfit * 0.12;
    } else if (margin >= 30 && margin < 35) {
      return netProfit * 0.10;
    }
    return 0;
  };
  
  const salesCommission = calculateSalesCommission(netProfitBeforeCommission, profitMarginBeforeCommission);
  const totalFees = salesCommission;
  const estimatedProfit = customerCost - totalBaseCost - totalFees;
  const profitMargin = customerCost > 0 ? (estimatedProfit / customerCost) * 100 : 0;

  const effectiveActualLaborHours = actuals.actualLaborHours ?? globalInputs.laborHours;
  const effectiveActualOpenGallons = actuals.actualOpenGallons ?? totalGallons.open;
  const effectiveActualClosedGallons = actuals.actualClosedGallons ?? totalGallons.closed;

  const actualMaterialCost = (effectiveActualOpenGallons / 100) * (1870 * 1.20) + (effectiveActualClosedGallons / 100) * (2470 * 1.20);
  const actualLaborCost = effectiveActualLaborHours * globalInputs.manualLaborRate;
  const actualBaseCost = actualMaterialCost + actualLaborCost + fuelCost + globalInputs.wasteDisposal + globalInputs.equipmentRental;
  const actualCustomerCost = customerCost;
  
  const actualNetProfitBeforeCommission = actualCustomerCost - actualBaseCost;
  const actualProfitMarginBeforeCommission = actualCustomerCost > 0 ? (actualNetProfitBeforeCommission / actualCustomerCost) * 100 : 0;
  
  const actualSalesCommission = calculateSalesCommission(actualNetProfitBeforeCommission, actualProfitMarginBeforeCommission);
  const actualFees = actualSalesCommission;
  const actualProfit = actualCustomerCost - actualBaseCost - actualFees;
  const actualMargin = actualCustomerCost > 0 ? (actualProfit / actualCustomerCost) * 100 : 0;
  const marginColor = profitMargin < 25 ? "text-red-600" : profitMargin < 30 ? "text-yellow-600" : "text-green-600";
  const actualMarginColor = actualMargin < 25 ? "text-red-600" : actualMargin < 30 ? "text-yellow-600" : "text-green-600";

  const pitchOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}/12`);
  const chargedLaborRate = globalInputs.manualLaborRate * (1 + (globalInputs.laborMarkup / 100));

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>
      <div className="container mx-auto max-w-7xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col gap-4 bg-white p-4 md:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start">
              <div className="flex-1 w-full">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Eco Innovations Estimator</h1>
                <input
                  type="text"
                  placeholder="Enter estimate name..."
                  value={estimateName}
                  onChange={(e) => {
                    setEstimateName(e.target.value);
                    setEstimateNameManuallyEdited(true);
                  }}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3 no-print">
                <button onClick={resetEstimate} className="bg-gray-500 hover:bg-gray-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base">
                  Reset
                </button>
                <button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base">
                  Print/PDF
                </button>
                <button onClick={saveEstimate} className="bg-green-600 hover:bg-green-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base">
                  Save
                </button>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium cursor-pointer transition-colors text-sm md:text-base">
                  Load
                  <input type="file" accept="application/json" onChange={loadEstimate} className="hidden" />
                </label>
              </div>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Date</label>
                <input
                  type="date"
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Estimates */}
        {recentEstimates.length > 0 && (
          <div className="mb-6 bg-white p-4 md:p-6 rounded-lg shadow-sm no-print">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Recent Estimates</h2>
            <div className="flex flex-wrap gap-2">
              {recentEstimates.map((estimate, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => loadRecentEstimate(estimate)}
                    className="px-3 py-2 hover:bg-gray-200 text-sm font-medium text-gray-700"
                  >
                    {estimate.name}
                  </button>
                  <button
                    onClick={() => deleteRecentEstimate(index)}
                    className="px-2 py-2 text-red-500 hover:bg-red-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Information */}
        <div className="mb-6 bg-white p-4 md:p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                placeholder="John Smith"
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                placeholder="john@example.com"
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={customerInfo.address}
                onChange={(e) => handleCustomerInfoChange('address', e.target.value)}
                placeholder="123 Main St, City, State"
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Inputs */}
          <div className="xl:col-span-2 space-y-6 md:space-y-8">
            {/* Global Inputs */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Project Parameters</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(globalInputs).map(([key, val]) => {
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {labelMap[key] || key}
                        <Tooltip text={tooltips[key]} />
                      </label>
                      {key === 'laborMarkup' ? (
                        <>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={val === 0 ? "" : val}
                            onChange={(e) => handleGlobalChange(key, e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {labelMap['chargedLaborRate']}
                              <Tooltip text={tooltips['chargedLaborRate']} />
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={chargedLaborRateInput !== "" ? chargedLaborRateInput : (chargedLaborRate === 0 ? "" : chargedLaborRate.toFixed(2))}
                              onChange={(e) => handleChargedLaborRateChange(e.target.value)}
                              onFocus={() => {
                                if (chargedLaborRateInput === "" && chargedLaborRate > 0) {
                                  setChargedLaborRateInput(chargedLaborRate.toFixed(2));
                                }
                              }}
                              onBlur={() => validateChargedLaborRate()}
                              disabled={globalInputs.manualLaborRate <= 0}
                              className={`w-full border p-2 rounded-lg ${chargedLaborRateError ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'} ${globalInputs.manualLaborRate <= 0 ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                            />
                            {chargedLaborRateError && (
                              <p className="text-red-600 text-sm mt-1">{chargedLaborRateError}</p>
                            )}
                          </div>
                        </>
                      ) : key === 'manualLaborRate' ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={laborRateInput !== null ? laborRateInput : (val === 0 ? "" : val.toFixed(2))}
                          onChange={(e) => setLaborRateInput(e.target.value)}
                          onBlur={() => {
                            if (laborRateInput !== null && laborRateInput !== "") {
                              handleGlobalChange('manualLaborRate', laborRateInput);
                            }
                            setLaborRateInput(null);
                          }}
                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={val === 0 ? "" : val}
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
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Project Areas</h2>
                <button onClick={addArea} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors no-print">
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
                          <button onClick={() => removeArea(index)} className="text-red-500 hover:text-red-700 text-sm font-medium no-print">
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(area).map(([key, val]) => {
                          if (key === "roofPitch" && area.areaType !== "Roof Deck") return null;
                          if (key === "applyPitchToManualArea") return null;
                          
                          const isLengthOrWidth = key === "length" || key === "width";
                          const isDisabledByAreaSqFt = isLengthOrWidth && area.areaSqFt > 0;
                          
                          return (
                            <div key={key}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {labelMap[key] || key}
                                <Tooltip text={tooltips[key]} />
                              </label>
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
                                  min="0"
                                  value={isDisabledByAreaSqFt ? "" : (val === 0 ? "" : val)}
                                  onChange={(e) => updateArea(index, key, e.target.value)}
                                  disabled={isDisabledByAreaSqFt}
                                  className={`w-full border border-gray-300 p-2 rounded-lg ${isDisabledByAreaSqFt ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                                />
                              )}
                            </div>
                          );
                        })}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Material Cost per Set</label>
                          <input
                            type="number"
                            step="0.01"
                            value={(area.materialPrice * 1.20).toFixed(2)}
                            readOnly
                            className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100 text-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">$/Per Set</label>
                          <input
                            type="number"
                            step="0.01"
                            value={(area.materialPrice * 1.20 * (1 + area.materialMarkup / 100)).toFixed(2)}
                            readOnly
                            className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100 text-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            $/Sq Ft
                            <Tooltip text="Price charged per square foot. Editing this will adjust Material Markup (%)." />
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={pricePerSqFtInputs[index] !== undefined ? pricePerSqFtInputs[index] : (sqft > 0 ? (totalCost / sqft).toFixed(2) : "")}
                            onChange={(e) => handlePricePerSqFtInputChange(index, e.target.value)}
                            onBlur={() => handlePricePerSqFtBlur(index, area)}
                            className={`w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${pricePerSqFtErrors[index] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                          {pricePerSqFtErrors[index] && (
                            <p className="text-red-600 text-sm mt-1">{pricePerSqFtErrors[index]}</p>
                          )}
                        </div>
                        {area.areaType === "Roof Deck" && area.areaSqFt > 0 && (
                          <div className="flex items-center col-span-full mt-2">
                            <input
                              type="checkbox"
                              id={`applyPitch-${index}`}
                              checked={area.applyPitchToManualArea || false}
                              onChange={(e) => updateArea(index, 'applyPitchToManualArea', e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`applyPitch-${index}`} className="ml-2 text-sm font-medium text-gray-700">
                              Apply pitch multiplier to entered Area (Sq Ft)
                              <Tooltip text={tooltips.applyPitchToManualArea} />
                            </label>
                          </div>
                        )}
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

            {/* Project Notes */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Project Notes</h2>
              <textarea
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                placeholder="Add any special instructions, job site conditions, or other notes here..."
                rows={4}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
            </div>

            {/* Actual Results Input */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Actual Results Input</h2>
              {!actualsConfirmed && (
                <p className="text-red-600 font-medium mb-4">Please confirm that actuals are correct</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Labor Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actuals.actualLaborHours !== null ? (actuals.actualLaborHours === 0 ? "" : actuals.actualLaborHours) : (globalInputs.laborHours === 0 ? "" : globalInputs.laborHours)}
                    onChange={(e) => handleActualsChange("actualLaborHours", e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Open Cell Gallons</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actuals.actualOpenGallons !== null ? (actuals.actualOpenGallons === 0 ? "" : actuals.actualOpenGallons) : (totalGallons.open === 0 ? "" : totalGallons.open.toFixed(1))}
                    onChange={(e) => handleActualsChange("actualOpenGallons", e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Closed Cell Gallons</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actuals.actualClosedGallons !== null ? (actuals.actualClosedGallons === 0 ? "" : actuals.actualClosedGallons) : (totalGallons.closed === 0 ? "" : totalGallons.closed.toFixed(1))}
                    onChange={(e) => handleActualsChange("actualClosedGallons", e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  checked={actualsConfirmed}
                  onChange={(e) => setActualsConfirmed(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Labor and Material Confirmed</span>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6 md:space-y-8">
            {/* Comparison Toggle */}
            <div className="bg-white p-4 rounded-lg shadow-sm no-print">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showComparison}
                  onChange={(e) => setShowComparison(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Show Side-by-Side Comparison</span>
              </label>
            </div>

            {showComparison ? (
              /* Side-by-Side Comparison View */
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Estimated vs Actual Comparison</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-2">Item</th>
                        <th className="text-right py-2 px-2">Estimated</th>
                        <th className="text-right py-2 px-2">Actual</th>
                        <th className="text-right py-2 pl-2">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2 pr-2 text-gray-600">Material Cost</td>
                        <td className="py-2 px-2 text-right">${baseMaterialCost.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right">${actualMaterialCost.toFixed(2)}</td>
                        <td className={`py-2 pl-2 text-right ${actualMaterialCost - baseMaterialCost > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${(actualMaterialCost - baseMaterialCost).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-2 text-gray-600">Labor Cost</td>
                        <td className="py-2 px-2 text-right">${baseLaborCost.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right">${actualLaborCost.toFixed(2)}</td>
                        <td className={`py-2 pl-2 text-right ${actualLaborCost - baseLaborCost > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${(actualLaborCost - baseLaborCost).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-2 text-gray-600">Base Job Cost</td>
                        <td className="py-2 px-2 text-right">${totalBaseCost.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right">${actualBaseCost.toFixed(2)}</td>
                        <td className={`py-2 pl-2 text-right ${actualBaseCost - totalBaseCost > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${(actualBaseCost - totalBaseCost).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-2 text-gray-600">Sales Commission</td>
                        <td className="py-2 px-2 text-right">${salesCommission.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right">${actualSalesCommission.toFixed(2)}</td>
                        <td className={`py-2 pl-2 text-right ${actualSalesCommission - salesCommission > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${(actualSalesCommission - salesCommission).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="font-bold">
                        <td className="py-2 pr-2">Profit</td>
                        <td className={`py-2 px-2 text-right ${marginColor}`}>${estimatedProfit.toFixed(2)}</td>
                        <td className={`py-2 px-2 text-right ${actualMarginColor}`}>${actualProfit.toFixed(2)}</td>
                        <td className={`py-2 pl-2 text-right ${actualProfit - estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${(actualProfit - estimatedProfit).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="font-bold">
                        <td className="py-2 pr-2">Margin</td>
                        <td className={`py-2 px-2 text-right ${marginColor}`}>{profitMargin.toFixed(1)}%</td>
                        <td className={`py-2 px-2 text-right ${actualMarginColor}`}>{actualMargin.toFixed(1)}%</td>
                        <td className={`py-2 pl-2 text-right ${actualMargin - profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(actualMargin - profitMargin).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* Estimate Summary */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
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
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Sales Commission {profitMarginBeforeCommission >= 35 ? '(12%)' : profitMarginBeforeCommission >= 30 ? '(10%)' : '(0%)'}:</span>
                      <span>${salesCommission.toFixed(2)}</span>
                    </div>
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
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
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
                      <span className="text-gray-600">Sales Commission {actualProfitMarginBeforeCommission >= 35 ? '(12%)' : actualProfitMarginBeforeCommission >= 30 ? '(10%)' : '(0%)'}:</span>
                      <span>${actualSalesCommission.toFixed(2)}</span>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
