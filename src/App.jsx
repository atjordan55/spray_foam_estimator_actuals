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

const MiniOutput = ({ sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost, rValue }) => (
  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm border">
    <div className="grid grid-cols-3 gap-2">
      <div><span className="font-medium">Sq Ft:</span> {sqft.toFixed(0)}</div>
      <div><span className="font-medium">R-Value:</span> {rValue.toFixed(1)}</div>
      <div><span className="font-medium">Gallons:</span> {gallons.toFixed(1)}</div>
      <div><span className="font-medium">Sets:</span> {sets.toFixed(2)}</div>
      <div><span className="font-medium">Base Cost:</span> ${baseMaterialCost.toFixed(2)}</div>
      <div><span className="font-medium">Markup:</span> ${markupAmount.toFixed(2)}</div>
      <div><span className="font-medium">Total:</span> ${totalCost.toFixed(2)}</div>
    </div>
  </div>
);

const AreaSummary = ({ areaSqFt, totalRValue, openCellGallons, openCellSets, closedCellGallons, closedCellSets, coatingBreakdown = [], totalBaseCost, totalMarkup, totalCost }) => (
  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <h5 className="font-semibold text-blue-800 mb-3">Area Summary</h5>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
      <div><span className="font-medium">Sq Ft:</span> {areaSqFt.toFixed(0)}</div>
      <div><span className="font-medium">R-Value:</span> {totalRValue.toFixed(1)}</div>
      {(openCellGallons > 0 || openCellSets > 0) && (
        <div><span className="font-medium">Open Cell:</span> {openCellGallons.toFixed(1)} gallons ({openCellSets.toFixed(2)} sets)</div>
      )}
      {(closedCellGallons > 0 || closedCellSets > 0) && (
        <div><span className="font-medium">Closed Cell:</span> {closedCellGallons.toFixed(1)} gallons ({closedCellSets.toFixed(2)} sets)</div>
      )}
      {coatingBreakdown.map(([name, info]) => (
        <div key={name}><span className="font-medium">{name}:</span> {info.gallons.toFixed(1)} gallons ({info.containers} containers)</div>
      ))}
      <div><span className="font-medium">Base Cost:</span> ${totalBaseCost.toFixed(2)}</div>
      <div><span className="font-medium">Markup:</span> ${totalMarkup.toFixed(2)}</div>
      <div><span className="font-medium text-blue-800">Total:</span> <span className="font-semibold text-blue-800">${totalCost.toFixed(2)}</span></div>
    </div>
  </div>
);

const getFoamTypesFromSettings = (settings) => {
  if (settings?.foamTypes?.length > 0) return settings.foamTypes;
  // Backwards compat: derive from old openCell/closedCell
  return [
    { id: 'open-cell', name: 'Open Cell', category: 'Open', foamThickness: settings?.openCell?.foamThickness ?? 6, foamCostPerSet: settings?.openCell?.materialPrice ?? 1870, materialCostPct: 20, boardFeetPerSet: settings?.openCell?.boardFeetPerSet ?? 14000, materialMarkup: settings?.openCell?.materialMarkup ?? 76.77 },
    { id: 'closed-cell', name: 'Closed Cell', category: 'Closed', foamThickness: settings?.closedCell?.foamThickness ?? 2, foamCostPerSet: settings?.closedCell?.materialPrice ?? 2300, materialCostPct: 20, boardFeetPerSet: settings?.closedCell?.boardFeetPerSet ?? 4000, materialMarkup: settings?.closedCell?.materialMarkup ?? 66.67 },
  ];
};

const createFoamApplication = (foamTypeObj = null, settings = null) => {
  const foamTypes = getFoamTypesFromSettings(settings);
  // foamTypeObj can be a foam type object from settings, or null (use first)
  const ft = foamTypeObj || foamTypes[0] || { id: 'open-cell', name: 'Open Cell', category: 'Open', foamThickness: 6, foamCostPerSet: 1870, materialCostPct: 20, boardFeetPerSet: 14000, materialMarkup: 76.77 };
  return {
    id: Date.now() + Math.random(),
    applicationType: 'Foam',
    foamTypeId: ft.id,
    foamTypeName: ft.productName ?? ft.name,
    foamTypeCategory: ft.category,  // "Open" or "Closed" for R-value
    foamThickness: ft.defaultThicknessInches ?? ft.foamThickness ?? 6,
    materialPrice: ft.cost ?? ft.foamCostPerSet ?? ft.materialPrice ?? 1870,
    materialCostPct: ft.materialCostPct ?? 20,
    materialMarkup: ft.materialMarkupPercent ?? ft.materialMarkup ?? 76.77,
    wasteFactorPercent: ft.wasteFactorPercent ?? 0,
    boardFeetPerSet: ft.boardFeetPerSet ?? 14000,
  };
};

const createCoatingApplication = (coatingTypeObj = null) => {
  const ct = coatingTypeObj || {};
  return {
    id: Date.now() + Math.random(),
    applicationType: 'Coating',
    coatingTypeId: ct.id || null,
    coatingTypeName: ct.productName ?? ct.name ?? '',
    materialCostPerContainer: ct.cost ?? ct.foamCostPerContainer ?? 0,
    materialCostPct: ct.materialCostPct ?? 20,
    materialMarkup: ct.materialMarkupPercent ?? ct.materialMarkup ?? 0,
    containerType: ct.containerType ?? '5 gallon bucket',
    containerGallons: ct.containerGallons ?? 5,
    usableGallonsPerSet: ct.usableGallonsPerSet ?? ct.containerGallons ?? 5,
    calculationMethod: ct.calculationMethod ?? 'manualOverride',
    thicknessType: ct.thicknessType ?? 'none',
    defaultThickness: ct.defaultThickness ?? 0,
    sqFtPerGallon: ct.sqFtPerGallon ?? 0,
    maxSinglePassWetMils: ct.maxSinglePassWetMils ?? 0,
    solidsByVolumePercent: ct.solidsByVolumePercent ?? 0,
    pricePerContainer: ct.defaultPricePerContainer ?? 0,
    defaultPricePerSqFt: ct.defaultPricePerSqFt ?? 0,
  };
};

// Legacy compat: convert old foamType:"Open"|"Closed" to new structure
const migrateFoamApplication = (foamApp) => {
  if (foamApp.applicationType) return foamApp; // already new format
  const category = foamApp.foamType === 'Closed' ? 'Closed' : 'Open';
  return {
    ...foamApp,
    applicationType: 'Foam',
    foamTypeId: category === 'Closed' ? 'closed-cell' : 'open-cell',
    foamTypeName: category === 'Closed' ? 'Closed Cell' : 'Open Cell',
    foamTypeCategory: category,
    materialCostPct: 20,
  };
};

const createArea = (name = "Area 1", settings = null) => ({
  id: Date.now() + Math.random(),
  name,
  areaSqFt: 0,
  length: 0,
  width: 0,
  areaType: "General Area",
  roofPitch: "4/12",
  applyPitchToManualArea: false,
  foamApplications: [createFoamApplication(null, settings)],
});

const getDefaultState = () => ({
  estimateName: "",
  customerInfo: {
    name: "",
    address: "",
    phone: "",
    email: ""
  },
  engagementDate: new Date().toISOString().split('T')[0],
  completionDate: "",
  projectNotes: "",
  globalInputs: {
    laborHours: 0,
    manualLaborRate: 65,
    laborMarkup: 40,
    travelDistance: 50,
    travelRate: 0.70,
    dieselPricePerGallon: 0,
    wasteDisposal: 50,
    equipmentRental: 0,
    generatorRuntime: 0,
  },
  sprayAreas: [createArea("Area 1")],
  actuals: {
    actualLaborHours: null,
    actualOpenGallons: null,
    actualClosedGallons: null,
    actualCoatingGallonsByType: {},
    actualFuelCost: null,
    actualWasteDisposal: null,
    actualEquipmentRental: null
  }
});

export default function SprayFoamEstimator({ onAdmin }) {
  const defaultState = getDefaultState();
  
  const [adminSettings, setAdminSettings] = useState(null);
  const [estimateName, setEstimateName] = useState(defaultState.estimateName);
  const [customerInfo, setCustomerInfo] = useState(defaultState.customerInfo);
  const [engagementDate, setEngagementDate] = useState(defaultState.engagementDate);
  const [completionDate, setCompletionDate] = useState(defaultState.completionDate);
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
  const [chargedLaborRateFocused, setChargedLaborRateFocused] = useState(false);
  const [wasteDisposalInput, setWasteDisposalInput] = useState(null);
  const [wasteDisposalFocused, setWasteDisposalFocused] = useState(false);
  const [materialPriceInputs, setMaterialPriceInputs] = useState({});
  const [materialPriceFocused, setMaterialPriceFocused] = useState({});
  const [actualsInputs, setActualsInputs] = useState({});
  const [actualsFocused, setActualsFocused] = useState({});
  const [jobberConnected, setJobberConnected] = useState(false);
  const [jobberLoading, setJobberLoading] = useState(false);
  const [jobberError, setJobberError] = useState("");
  const [jobberSuccess, setJobberSuccess] = useState("");
  const [discountDollar, setDiscountDollar] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountDollarInput, setDiscountDollarInput] = useState("");
  const [discountPercentInput, setDiscountPercentInput] = useState("");
  const [discountDollarFocused, setDiscountDollarFocused] = useState(false);
  const [discountPercentFocused, setDiscountPercentFocused] = useState(false);
  const [depositDollar, setDepositDollar] = useState(0);
  const [depositPercent, setDepositPercent] = useState(0);
  const [depositDollarInput, setDepositDollarInput] = useState("");
  const [depositPercentInput, setDepositPercentInput] = useState("");
  const [depositDollarFocused, setDepositDollarFocused] = useState(false);
  const [depositPercentFocused, setDepositPercentFocused] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('recentEstimates');
    if (saved) {
      try {
        setRecentEstimates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent estimates');
      }
    }
    
    checkJobberStatus();
    loadAdminSettings();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('jobber_connected') === 'true') {
      setJobberConnected(true);
      setJobberSuccess('Successfully connected to Jobber!');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setJobberSuccess(''), 5000);
    }
    if (params.get('jobber_error')) {
      setJobberError('Failed to connect to Jobber: ' + params.get('jobber_error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadAdminSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        setAdminSettings(data.settings);
        const s = data.settings;
        setGlobalInputs(prev => ({
          ...prev,
          manualLaborRate: s.labor?.laborRate ?? prev.manualLaborRate,
          laborMarkup: s.labor?.laborMarkup ?? prev.laborMarkup,
          travelDistance: s.project?.travelDistance ?? prev.travelDistance,
          travelRate: s.project?.travelRate ?? prev.travelRate,
          wasteDisposal: s.project?.wasteDisposal ?? prev.wasteDisposal,
          equipmentRental: s.project?.equipmentRental ?? prev.equipmentRental,
          generatorRuntime: prev.generatorRuntime,
        }));
        // Update initial spray area with correct foam type from admin settings
        setSprayAreas(prev => {
          if (prev.length === 1 && prev[0].name === 'Area 1' &&
              prev[0].foamApplications.length === 1 &&
              prev[0].foamApplications[0].foamThickness === (prev[0].foamApplications[0].foamThickness)) {
            // Only update if it's still the default empty area
            const hasData = prev[0].areaSqFt > 0 || prev[0].length > 0 || prev[0].width > 0;
            if (!hasData) {
              return [{ ...prev[0], foamApplications: [createFoamApplication(null, data.settings)] }];
            }
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load admin settings:', err);
    }
  };
  
  const checkJobberStatus = async () => {
    try {
      const response = await fetch('/api/jobber/status');
      const data = await response.json();
      setJobberConnected(data.connected);
    } catch (err) {
      console.error('Failed to check Jobber status');
    }
  };
  
  const connectToJobber = () => {
    window.location.href = '/auth/jobber';
  };
  
  const disconnectFromJobber = async () => {
    try {
      await fetch('/api/jobber/disconnect', { method: 'POST' });
      setJobberConnected(false);
      setJobberSuccess('Disconnected from Jobber');
      setTimeout(() => setJobberSuccess(''), 3000);
    } catch (err) {
      setJobberError('Failed to disconnect');
    }
  };

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
    travelRate: "Cost per mile for travel (fuel, wear, etc.) — auto-calculated from diesel price if diesel > 0",
    dieselPricePerGallon: "Current diesel price per gallon — sets travel rate and generator fuel cost automatically",
    wasteDisposal: "Cost for disposing of waste materials",
    equipmentRental: "Any equipment rental costs for this job",
    generatorRuntime: "Total generator run time in hours (includes warmup, spray, and cleanup)",
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
    dieselPricePerGallon: "Diesel Price ($/gal)",
    wasteDisposal: "Waste Disposal ($)",
    equipmentRental: "Equipment Rental ($)",
    generatorRuntime: "Generator Runtime (hrs)",
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

  const calculateEffectiveSqFt = (area) => {
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
    return sqft;
  };

  const calculateFoamApplicationCost = (area, foamApp) => {
    const rawSqft = calculateEffectiveSqFt(area);
    const sqft = Math.round(rawSqft);
    const boardFeetPerInch = sqft;
    const totalBoardFeet = boardFeetPerInch * foamApp.foamThickness;
    const sets = foamApp.boardFeetPerSet > 0 ? totalBoardFeet / foamApp.boardFeetPerSet : 0;
    const gallons = sets * 100;
    const materialCostPct = foamApp.materialCostPct ?? 20;
    const materialCost = foamApp.materialPrice * (1 + materialCostPct / 100);
    const baseMaterialCost = Math.round(sets * materialCost * 100) / 100;
    const rawMarkup = baseMaterialCost * (foamApp.materialMarkup / 100);
    const rawTotal = baseMaterialCost + rawMarkup;
    const pricePerSqFt = sqft > 0 ? Math.round((rawTotal / sqft) * 100) / 100 : 0;
    const totalCost = Math.round(pricePerSqFt * sqft * 100) / 100;
    const markupAmount = Math.round((totalCost - baseMaterialCost) * 100) / 100;
    // Support both old foamType and new foamTypeCategory
    const category = foamApp.foamTypeCategory || foamApp.foamType;
    const rValuePerInch = category === "Closed" ? 7.2 : 3.8;
    const rValue = rValuePerInch * foamApp.foamThickness;

    return { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost, materialCost, rValue, pricePerSqFt };
  };

  // Compute live coverage outputs for a coating application against an area's sq ft
  const calculateCoatingCoverage = (coatingApp, areaSqFt) => {
    const sqFt = parseFloat(areaSqFt) || 0;
    const containerGallons = parseFloat(coatingApp.containerGallons) || 0;
    const usableGals = parseFloat(coatingApp.usableGallonsPerSet) || 0;
    const effectivePerContainer = usableGals > 0 ? usableGals : containerGallons;
    const calcMethod = coatingApp.calculationMethod || 'manualOverride';

    let gallonsNeeded = 0;
    let sqFtPerGallon = parseFloat(coatingApp.sqFtPerGallon) || 0;
    let wetMilWarning = '';

    if (calcMethod === 'wetFilmThickness') {
      const wetMils = parseFloat(coatingApp.defaultThickness) || 0;
      const maxWet = parseFloat(coatingApp.maxSinglePassWetMils) || 0;
      const TAR = wetMils > 0 ? wetMils / 16 : 0;
      gallonsNeeded = TAR > 0 ? (sqFt / 100) * TAR : 0;
      sqFtPerGallon = TAR > 0 ? 100 / TAR : 0;
      if (maxWet > 0 && wetMils > maxWet) {
        wetMilWarning = `Wet mil thickness (${wetMils.toFixed(2)}) exceeds max single-pass (${maxWet.toFixed(2)}). Multiple passes required.`;
      }
    } else if (calcMethod === 'coveragePerGallon') {
      gallonsNeeded = sqFtPerGallon > 0 ? sqFt / sqFtPerGallon : 0;
    }

    const containersNeeded = (effectivePerContainer > 0 && gallonsNeeded > 0) ? Math.ceil(gallonsNeeded / effectivePerContainer) : 0;
    const sqFtPerContainer = sqFtPerGallon * effectivePerContainer;
    return { gallonsNeeded, containersNeeded, sqFtPerGallon, sqFtPerContainer, wetMilWarning };
  };

  const calculateCoatingApplicationCost = (coatingApp, areaSqFt = 0) => {
    const sqFt = parseFloat(areaSqFt) || 0;
    const materialCostPct = coatingApp.materialCostPct ?? 20;
    const costPerContainer = parseFloat(coatingApp.materialCostPerContainer) || 0;
    // "Price/Container" = Cost × (1 + Material Cost overhead). Material Markup is applied on top of this.
    const pricePerContainer = costPerContainer * (1 + materialCostPct / 100);
    const calcMethod = coatingApp.calculationMethod || 'manualOverride';
    const coverage = calculateCoatingCoverage(coatingApp, areaSqFt);
    const containers = (calcMethod === 'manualOverride')
      ? (coatingApp.numContainers || 0)
      : coverage.containersNeeded;
    const baseMaterialCost = Math.round(pricePerContainer * containers * 100) / 100;
    const markupPct = parseFloat(coatingApp.materialMarkup) || 0;
    const markupAmount = Math.round(baseMaterialCost * (markupPct / 100) * 100) / 100;
    const totalCost = Math.round((baseMaterialCost + markupAmount) * 100) / 100;
    return { containers, baseMaterialCost, markupAmount, totalCost, costPerContainer, pricePerContainer, coverage };
  };

  // Build per-coating-type breakdown across given areas. Returns Map<typeName, info>.
  const buildCoatingTypeBreakdown = (areas) => {
    const map = new Map();
    areas.forEach(area => {
      const sqft = calculateEffectiveSqFt(area);
      area.foamApplications.forEach(app => {
        if (app.applicationType !== "Coating") return;
        const cc = calculateCoatingApplicationCost(app, sqft);
        const name = (app.coatingTypeName && app.coatingTypeName.trim()) || "Coating";
        const existing = map.get(name) || {
          gallonsNeeded: 0,
          containers: 0,
          baseMaterialCost: 0,
          markupAmount: 0,
          containerGallons: parseFloat(app.containerGallons) || 0,
          pricePerContainer: cc.pricePerContainer || 0,
        };
        existing.gallonsNeeded += cc.coverage.gallonsNeeded || 0;
        existing.containers += cc.containers || 0;
        existing.baseMaterialCost += cc.baseMaterialCost;
        existing.markupAmount += cc.markupAmount;
        if (parseFloat(app.containerGallons) > 0) existing.containerGallons = parseFloat(app.containerGallons);
        if (cc.pricePerContainer > 0) existing.pricePerContainer = cc.pricePerContainer;
        map.set(name, existing);
      });
    });
    return map;
  };

  const handleActualCoatingGallonsChange = (typeName, value) => {
    const parsed = parseFloat(value);
    setActuals(prev => ({
      ...prev,
      actualCoatingGallonsByType: {
        ...(prev.actualCoatingGallonsByType || {}),
        [typeName]: isNaN(parsed) ? null : Math.max(0, parsed),
      },
    }));
  };

  const validateAndSet = (value, setter, key, currentState) => {
    const parsed = parseFloat(value);
    const validated = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setter({ ...currentState, [key]: validated });
  };

  const handleGlobalChange = (key, value) => {
    if (key === 'dieselPricePerGallon') {
      const diesel = parseFloat(value) || 0;
      const truckMpg = adminSettings?.generator?.truckMpg ?? 8;
      const newTravelRate = truckMpg > 0 ? Math.round((diesel / truckMpg) * 100) / 100 : globalInputs.travelRate;
      setGlobalInputs(prev => ({
        ...prev,
        dieselPricePerGallon: Math.max(0, diesel),
        travelRate: diesel > 0 ? newTravelRate : prev.travelRate,
      }));
    } else {
      validateAndSet(value, setGlobalInputs, key, globalInputs);
    }
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

  const handleDiscountDollarChange = (value, totalJobCostValue) => {
    const dollarValue = parseFloat(value) || 0;
    const validDollar = Math.max(0, Math.min(dollarValue, totalJobCostValue));
    setDiscountDollar(validDollar);
    setDiscountDollarInput(value);
    if (totalJobCostValue > 0) {
      const percentValue = (validDollar / totalJobCostValue) * 100;
      setDiscountPercent(percentValue);
      setDiscountPercentInput(percentValue.toFixed(2));
    }
  };

  const handleDiscountPercentChange = (value, totalJobCostValue) => {
    const percentValue = parseFloat(value) || 0;
    const validPercent = Math.max(0, Math.min(percentValue, 100));
    setDiscountPercent(validPercent);
    setDiscountPercentInput(value);
    const dollarValue = (validPercent / 100) * totalJobCostValue;
    setDiscountDollar(dollarValue);
    setDiscountDollarInput(dollarValue.toFixed(2));
  };

  const handleDiscountDollarBlur = (totalJobCostValue) => {
    setDiscountDollarFocused(false);
    const validDollar = Math.max(0, Math.min(discountDollar, totalJobCostValue));
    setDiscountDollar(validDollar);
    setDiscountDollarInput(validDollar.toFixed(2));
    if (totalJobCostValue > 0) {
      const percentValue = (validDollar / totalJobCostValue) * 100;
      setDiscountPercent(percentValue);
      setDiscountPercentInput(percentValue.toFixed(2));
    }
  };

  const handleDiscountPercentBlur = (totalJobCostValue) => {
    setDiscountPercentFocused(false);
    const validPercent = Math.max(0, Math.min(discountPercent, 100));
    setDiscountPercent(validPercent);
    setDiscountPercentInput(validPercent.toFixed(2));
    const dollarValue = (validPercent / 100) * totalJobCostValue;
    setDiscountDollar(dollarValue);
    setDiscountDollarInput(dollarValue.toFixed(2));
  };

  const handleDepositDollarChange = (value, customerChargeValue) => {
    const parsed = parseFloat(value) || 0;
    const validDollar = Math.max(0, Math.min(parsed, customerChargeValue));
    setDepositDollar(validDollar);
    setDepositDollarInput(value);
    if (customerChargeValue > 0) {
      const percentValue = (validDollar / customerChargeValue) * 100;
      setDepositPercent(percentValue);
      setDepositPercentInput(percentValue.toFixed(2));
    }
  };

  const handleDepositPercentChange = (value, customerChargeValue) => {
    const parsed = parseFloat(value) || 0;
    const validPercent = Math.max(0, Math.min(parsed, 100));
    setDepositPercent(validPercent);
    setDepositPercentInput(value);
    const dollarValue = (validPercent / 100) * customerChargeValue;
    setDepositDollar(dollarValue);
    setDepositDollarInput(dollarValue.toFixed(2));
  };

  const handleDepositDollarBlur = (customerChargeValue) => {
    setDepositDollarFocused(false);
    const validDollar = Math.max(0, Math.min(depositDollar, customerChargeValue));
    setDepositDollar(validDollar);
    setDepositDollarInput(validDollar.toFixed(2));
    if (customerChargeValue > 0) {
      const percentValue = (validDollar / customerChargeValue) * 100;
      setDepositPercent(percentValue);
      setDepositPercentInput(percentValue.toFixed(2));
    }
  };

  const handleDepositPercentBlur = (customerChargeValue) => {
    setDepositPercentFocused(false);
    const validPercent = Math.max(0, Math.min(depositPercent, 100));
    setDepositPercent(validPercent);
    setDepositPercentInput(validPercent.toFixed(2));
    const dollarValue = (validPercent / 100) * customerChargeValue;
    setDepositDollar(dollarValue);
    setDepositDollarInput(dollarValue.toFixed(2));
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
    if (key === "name" || key === "areaType" || key === "roofPitch" || key === "applyPitchToManualArea") {
      updated[index][key] = value;
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

  const updateFoamApplication = (areaIndex, foamIndex, key, value) => {
    const updated = [...sprayAreas];
    const foamApp = updated[areaIndex].foamApplications[foamIndex];
    if (key === "foamTypeId") {
      // User selected a foam type from admin settings dropdown
      const foamTypes = getFoamTypesFromSettings(adminSettings);
      const ft = foamTypes.find(f => f.id === value);
      if (ft) {
        foamApp.foamTypeId = ft.id;
        foamApp.foamTypeName = ft.name;
        foamApp.foamTypeCategory = ft.category;
        foamApp.foamThickness = ft.foamThickness ?? foamApp.foamThickness;
        foamApp.materialPrice = ft.foamCostPerSet ?? ft.materialPrice ?? foamApp.materialPrice;
        foamApp.materialCostPct = ft.materialCostPct ?? foamApp.materialCostPct;
        foamApp.materialMarkup = ft.materialMarkup ?? foamApp.materialMarkup;
        foamApp.boardFeetPerSet = ft.boardFeetPerSet ?? foamApp.boardFeetPerSet;
      }
    } else {
      const parsed = parseFloat(value);
      foamApp[key] = isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    setSprayAreas(updated);
  };

  const computeCoatingBaseCostPerSqFt = (coatingApp, area) => {
    const sqFt = calculateEffectiveSqFt(area);
    if (!sqFt) return 0;
    const cov = calculateCoatingCoverage(coatingApp, sqFt);
    const matCostPct = coatingApp.materialCostPct ?? 20;
    const pricePerContainer = (parseFloat(coatingApp.materialCostPerContainer) || 0) * (1 + matCostPct / 100);
    const calcMethod = coatingApp.calculationMethod || 'manualOverride';
    const containers = (calcMethod === 'manualOverride')
      ? (coatingApp.numContainers || 0)
      : cov.containersNeeded;
    return (pricePerContainer * containers) / sqFt;
  };

  const updateCoatingApplication = (areaIndex, foamIndex, key, value) => {
    const updated = [...sprayAreas];
    const area = updated[areaIndex];
    const coatingApp = area.foamApplications[foamIndex];
    if (key === "coatingTypeId") {
      const coatingTypes = adminSettings?.coatingTypes || [];
      const ct = coatingTypes.find(c => c.id === value);
      if (ct) {
        coatingApp.coatingTypeId = ct.id;
        coatingApp.coatingTypeName = ct.productName ?? ct.name;
        coatingApp.materialCostPerContainer = ct.cost ?? ct.foamCostPerContainer ?? coatingApp.materialCostPerContainer;
        coatingApp.materialCostPct = ct.materialCostPct ?? coatingApp.materialCostPct;
        coatingApp.materialMarkup = ct.materialMarkupPercent ?? ct.materialMarkup ?? coatingApp.materialMarkup;
        coatingApp.containerType = ct.containerType ?? coatingApp.containerType;
        coatingApp.containerGallons = ct.containerGallons ?? coatingApp.containerGallons;
        coatingApp.usableGallonsPerSet = ct.usableGallonsPerSet ?? ct.containerGallons ?? coatingApp.usableGallonsPerSet;
        coatingApp.calculationMethod = ct.calculationMethod ?? coatingApp.calculationMethod;
        coatingApp.thicknessType = ct.thicknessType ?? coatingApp.thicknessType;
        coatingApp.defaultThickness = ct.defaultThickness ?? coatingApp.defaultThickness;
        coatingApp.sqFtPerGallon = ct.sqFtPerGallon ?? coatingApp.sqFtPerGallon;
        coatingApp.maxSinglePassWetMils = ct.maxSinglePassWetMils ?? coatingApp.maxSinglePassWetMils;
        coatingApp.solidsByVolumePercent = ct.solidsByVolumePercent ?? coatingApp.solidsByVolumePercent;
        coatingApp.pricePerContainer = ct.defaultPricePerContainer ?? coatingApp.pricePerContainer;
        // Reconcile $/Sq Ft from markup % + base cost so the two stay in sync
        const baseCostPerSqFt = computeCoatingBaseCostPerSqFt(coatingApp, area);
        coatingApp.defaultPricePerSqFt = Math.round(baseCostPerSqFt * (1 + (parseFloat(coatingApp.materialMarkup) || 0) / 100) * 1000) / 1000;
      }
    } else if (key === "materialMarkup" || key === "defaultPricePerSqFt") {
      const parsed = parseFloat(value);
      const newVal = isNaN(parsed) ? 0 : Math.max(0, parsed);
      const baseCostPerSqFt = computeCoatingBaseCostPerSqFt(coatingApp, area);
      if (key === "materialMarkup") {
        coatingApp.materialMarkup = newVal;
        coatingApp.defaultPricePerSqFt = Math.round(baseCostPerSqFt * (1 + newVal / 100) * 1000) / 1000;
      } else {
        coatingApp.defaultPricePerSqFt = newVal;
        coatingApp.materialMarkup = baseCostPerSqFt > 0
          ? Math.max(0, Math.round(((newVal / baseCostPerSqFt) - 1) * 100 * 100) / 100)
          : 0;
      }
    } else {
      const parsed = parseFloat(value);
      coatingApp[key] = isNaN(parsed) ? 0 : Math.max(0, parsed);
      // If a parameter that affects baseCostPerSqFt changes, keep $/Sq Ft locked to current markup
      if (["materialCostPerContainer", "containerGallons", "usableGallonsPerSet", "defaultThickness", "sqFtPerGallon"].includes(key)) {
        const baseCostPerSqFt = computeCoatingBaseCostPerSqFt(coatingApp, area);
        coatingApp.defaultPricePerSqFt = Math.round(baseCostPerSqFt * (1 + (parseFloat(coatingApp.materialMarkup) || 0) / 100) * 1000) / 1000;
      }
    }
    setSprayAreas(updated);
  };

  const addFoamApplication = (areaIndex) => {
    const updated = [...sprayAreas];
    const foamTypes = getFoamTypesFromSettings(adminSettings);
    updated[areaIndex].foamApplications.push(createFoamApplication(foamTypes[0] || null, adminSettings));
    setSprayAreas(updated);
  };

  const addCoatingApplication = (areaIndex) => {
    const updated = [...sprayAreas];
    updated[areaIndex].foamApplications.push(createCoatingApplication());
    setSprayAreas(updated);
  };

  const removeFoamApplication = (areaIndex, foamIndex) => {
    const updated = [...sprayAreas];
    if (updated[areaIndex].foamApplications.length > 1) {
      updated[areaIndex].foamApplications = updated[areaIndex].foamApplications.filter((_, i) => i !== foamIndex);
      setSprayAreas(updated);
    }
  };

  const addArea = () => {
    const areaNumber = sprayAreas.length + 1;
    setSprayAreas([...sprayAreas, createArea(`Area ${areaNumber}`)]);
  };

  const removeArea = (index) => {
    setSprayAreas(sprayAreas.filter((_, i) => i !== index));
    setPricePerSqFtErrors(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.startsWith(`${index}-`)) {
          delete updated[key];
        }
      });
      return updated;
    });
  };

  const handlePricePerSqFtInputChange = (key, value) => {
    setPricePerSqFtInputs(prev => ({ ...prev, [key]: value }));
  };

  const handlePricePerSqFtBlur = (areaIndex, foamIndex, foamApp) => {
    const key = `${areaIndex}-${foamIndex}`;
    const value = pricePerSqFtInputs[key];
    if (value === undefined || value === "") {
      setPricePerSqFtInputs(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      return;
    }
    
    const newPricePerSqFt = parseFloat(value) || 0;
    const materialCostPctLocal = foamApp.materialCostPct ?? 20;
    const materialCostPerSet = foamApp.materialPrice * (1 + materialCostPctLocal / 100);
    const minPricePerSqFt = foamApp.boardFeetPerSet > 0
      ? (foamApp.foamThickness / foamApp.boardFeetPerSet) * materialCostPerSet
      : 0;
    
    const roundedInput = Math.round(newPricePerSqFt * 100) / 100;
    const roundedMin = Math.round(minPricePerSqFt * 100) / 100;
    
    if (roundedInput < roundedMin) {
      setPricePerSqFtErrors(prev => ({
        ...prev,
        [key]: `Price must be at least $${minPricePerSqFt.toFixed(2)} (derived from Material Cost per Set)`
      }));
    } else {
      setPricePerSqFtErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      
      const pricePerSet = newPricePerSqFt * (foamApp.boardFeetPerSet / foamApp.foamThickness);
      const newMarkup = ((pricePerSet / materialCostPerSet) - 1) * 100;
      
      const updated = [...sprayAreas];
      updated[areaIndex].foamApplications[foamIndex].materialMarkup = Math.max(0, Math.round(newMarkup * 100) / 100);
      setSprayAreas(updated);
    }
    
    setPricePerSqFtInputs(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const resetEstimate = () => {
    if (window.confirm('Are you sure you want to clear all fields and start a new estimate?')) {
      const defaults = getDefaultState();
      setEstimateName(defaults.estimateName);
      setCustomerInfo(defaults.customerInfo);
      setEngagementDate(defaults.engagementDate);
      setCompletionDate(defaults.completionDate);
      setProjectNotes(defaults.projectNotes);
      const s = adminSettings;
      setGlobalInputs({
        ...defaults.globalInputs,
        manualLaborRate: s?.labor?.laborRate ?? defaults.globalInputs.manualLaborRate,
        laborMarkup: s?.labor?.laborMarkup ?? defaults.globalInputs.laborMarkup,
        travelDistance: s?.project?.travelDistance ?? defaults.globalInputs.travelDistance,
        travelRate: s?.project?.travelRate ?? defaults.globalInputs.travelRate,
        wasteDisposal: s?.project?.wasteDisposal ?? defaults.globalInputs.wasteDisposal,
        equipmentRental: s?.project?.equipmentRental ?? defaults.globalInputs.equipmentRental,
        generatorRuntime: defaults.globalInputs.generatorRuntime,
      });
      setSprayAreas([{
        ...createArea("Area 1"),
        foamApplications: [createFoamApplication(null, adminSettings)]
      }]);
      setActuals(defaults.actuals);
      setActualsConfirmed(false);
      setEstimateNameManuallyEdited(false);
      setChargedLaborRateError("");
      setChargedLaborRateInput("");
      setPricePerSqFtErrors({});
      setPricePerSqFtInputs({});
      setLaborRateInput(null);
      setChargedLaborRateFocused(false);
      setWasteDisposalInput(null);
      setWasteDisposalFocused(false);
      setMaterialPriceInputs({});
      setMaterialPriceFocused({});
      setActualsInputs({});
      setActualsFocused({});
      setDiscountDollar(0);
      setDiscountPercent(0);
      setDiscountDollarInput("");
      setDiscountPercentInput("");
      setDepositDollar(0);
      setDepositPercent(0);
      setDepositDollarInput("");
      setDepositPercentInput("");
    }
  };

  const saveEstimate = () => {
    const data = { 
      estimateName, 
      customerInfo, 
      engagementDate,
      completionDate,
      projectNotes, 
      globalInputs, 
      sprayAreas, 
      actuals,
      discountDollar,
      discountPercent,
      depositDollar,
      depositPercent,
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

  const migrateSprayAreas = (areas) => {
    if (!areas || areas.length === 0) return getDefaultState().sprayAreas;
    
    return areas.map((area, index) => {
      if (area.foamApplications) {
        // Migrate individual foam apps if they're in old format
        return {
          ...area,
          foamApplications: area.foamApplications.map(app => {
            if (app.applicationType === "Coating") return app;
            return migrateFoamApplication(app);
          }),
        };
      }
      
      return {
        id: area.id || Date.now() + Math.random() + index,
        name: area.name || `Area ${index + 1}`,
        areaSqFt: area.areaSqFt || 0,
        length: area.length || 0,
        width: area.width || 0,
        areaType: area.areaType || "General Area",
        roofPitch: area.roofPitch || "4/12",
        applyPitchToManualArea: area.applyPitchToManualArea || false,
        foamApplications: [{
          id: Date.now() + Math.random(),
          foamType: area.foamType || "Open",
          foamThickness: area.foamThickness || 6,
          materialPrice: area.materialPrice || 1870,
          materialMarkup: area.materialMarkup || 76.77,
          boardFeetPerSet: area.boardFeetPerSet || 14000
        }]
      };
    });
  };

  const applyEstimateData = (data) => {
    setEstimateName(data.estimateName || "");
    setCustomerInfo(data.customerInfo || getDefaultState().customerInfo);
    setEngagementDate(data.engagementDate || "");
    setCompletionDate(data.completionDate || "");
    setProjectNotes(data.projectNotes || "");
    setGlobalInputs(data.globalInputs || getDefaultState().globalInputs);
    setSprayAreas(migrateSprayAreas(data.sprayAreas));
    setActuals({
      actualLaborHours: data.actuals?.actualLaborHours ?? null,
      actualOpenGallons: data.actuals?.actualOpenGallons ?? null,
      actualClosedGallons: data.actuals?.actualClosedGallons ?? null,
      actualCoatingGallonsByType: data.actuals?.actualCoatingGallonsByType
        ?? (data.actuals?.actualCoatingGallons != null ? { Coating: data.actuals.actualCoatingGallons } : {}),
      actualFuelCost: data.actuals?.actualFuelCost ?? null,
      actualWasteDisposal: data.actuals?.actualWasteDisposal ?? null,
      actualEquipmentRental: data.actuals?.actualEquipmentRental ?? null
    });
    setDiscountDollar(data.discountDollar ?? 0);
    setDiscountPercent(data.discountPercent ?? 0);
    setDepositDollar(data.depositDollar ?? 0);
    setDepositPercent(data.depositPercent ?? 0);
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
  
  const sendToJobber = async () => {
    if (!jobberConnected) {
      setJobberError('Please connect to Jobber first');
      return;
    }
    
    setJobberLoading(true);
    setJobberError('');
    setJobberSuccess('');
    
    try {
      const clientResponse = await fetch('/api/jobber/find-or-create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerInfo.name || 'Unknown Customer',
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address,
        }),
      });
      
      if (!clientResponse.ok) {
        const err = await clientResponse.json();
        throw new Error(err.error || 'Failed to create client');
      }
      
      const { client, propertyId } = await clientResponse.json();
      
      if (!propertyId) {
        throw new Error('Could not find or create a property for this client. Please ensure an address is provided or add a property in Jobber.');
      }
      
      const lineItems = [];
      
      const getLineItemDescription = (area, foamApp, rValue) => {
        const thickness = foamApp.foamThickness;
        const rValueFormatted = rValue.toFixed(1);
        const category = foamApp.foamTypeCategory || foamApp.foamType;
        
        // Check admin-configured Jobber descriptions first
        const descKey = `${area.areaType}-${category}`;
        const adminDesc = adminSettings?.jobberDescriptions?.[descKey];
        if (adminDesc) {
          return `${adminDesc}\n[Resulting in an effective R-Value of ${rValueFormatted}]`;
        }
        
        if (area.areaType === "Exterior Walls" && category === "Closed") {
          return `Closed-cell spray foam insulation applied at an average depth of ${thickness} inches within exterior wall cavities, creating a high-performance thermal barrier, moisture seal, and structural enhancement. Includes sealing around all windows and doors as well as sealing bottom plates.\n[Resulting in an effective R-Value of ${rValueFormatted}]`;
        }
        if (area.areaType === "Exterior Walls" && category === "Open") {
          return `Open-cell spray foam insulation applied at an average depth of ${thickness} inches within exterior wall cavities, creating a high performance air seal, sound deadening, and high level thermal resistance. Includes sealing around all windows and doors as well as sealing bottom plates.\n[Resulting in an effective R-Value of ${rValueFormatted}]`;
        }
        if (area.areaType === "Roof Deck" && category === "Closed") {
          return `Closed-cell spray foam insulation applied at an average depth of ${thickness} inches to the underside of the roof deck, providing a high-performance air seal, moisture barrier, and superior thermal resistance.\n[Resulting in an effective R-Value of ${rValueFormatted}]`;
        }
        if (area.areaType === "Roof Deck" && category === "Open") {
          return `Open cell spray foam applied at an average depth of ${thickness} inches to the underside of the roof deck, providing a high performance air seal, sound deadening, and high level thermal resistance.\n[Resulting in an effective R-Value of ${rValueFormatted}]`;
        }
        return '';
      };
      
      sprayAreas.forEach(area => {
        const areaSqFtForCalcs = calculateEffectiveSqFt(area);
        area.foamApplications.forEach(foamApp => {
          if (foamApp.applicationType === "Coating") {
            const calcs = calculateCoatingApplicationCost(foamApp, areaSqFtForCalcs);
            lineItems.push({
              name: `${area.name} - ${foamApp.coatingTypeName || 'Coating'}`,
              description: `${foamApp.numContainers || 0} containers`,
              quantity: foamApp.numContainers || 0,
              unitPrice: foamApp.pricePerContainer || 0,
            });
            return;
          }
          const calcs = calculateFoamApplicationCost(area, foamApp);
          const sqft = Math.round(calcs.sqft);
          const description = getLineItemDescription(area, foamApp, calcs.rValue);
          const category = foamApp.foamTypeCategory || foamApp.foamType;
          const displayName = foamApp.foamTypeName || `${category} Cell`;
          
          lineItems.push({
            name: `${area.name} (${displayName} ${foamApp.foamThickness}in)`,
            description,
            quantity: sqft,
            unitPrice: calcs.pricePerSqFt,
          });
        });
      });
      
      const laborTotal = Math.round((baseLaborCost + laborMarkupAmount + additionalJobCostBase + additionalJobCostMarkup) * 100) / 100;
      if (laborTotal > 0) {
        lineItems.push({
          name: 'Complete Spray Foam Insulation Solution',
          description: 'Includes a full-service spray foam insulation package: on-site evaluation, masking and surface prep, application of open or closed cell spray foam at the specified thickness, and post-job cleanup. Designed to deliver maximum R-value, air sealing, and moisture control for residential or commercial projects.',
          quantity: 1,
          unitPrice: laborTotal,
        });
      }
      
      const quotePayload = {
        clientId: client.id,
        propertyId,
        title: estimateName || 'Spray Foam Estimate',
        lineItems,
        notes: projectNotes,
      };
      
      if (discountDollar > 0) {
        quotePayload.discount = {
          rate: parseFloat(discountDollar.toFixed(2)),
          type: 'Unit',
        };
      }
      
      if (depositDollar > 0) {
        quotePayload.deposit = {
          rate: parseFloat(depositDollar.toFixed(2)),
          type: 'Unit',
        };
      }
      
      const quoteResponse = await fetch('/api/jobber/create-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotePayload),
      });
      
      if (!quoteResponse.ok) {
        const err = await quoteResponse.json();
        throw new Error(err.error || 'Failed to create quote');
      }
      
      const { quote } = await quoteResponse.json();
      
      setJobberSuccess(`Quote #${quote.quoteNumber} created successfully!`);
      setTimeout(() => setJobberSuccess(''), 10000);
      
      if (quote.jobberWebUri) {
        window.open(quote.jobberWebUri, '_blank');
      }
    } catch (err) {
      setJobberError(err.message);
    } finally {
      setJobberLoading(false);
    }
  };

  const totalGallons = { open: 0, closed: 0 };
  const totalSets = { open: 0, closed: 0 };
  let baseMaterialCost = 0;
  let materialMarkupAmount = 0;
  let weightedOpenCostPerGallon = 0;
  let weightedClosedCostPerGallon = 0;
  let totalCoatingBaseCost = 0;
  let totalCoatingMarkupAmount = 0;

  let totalCoatingGallons = 0;
  let totalCoatingContainers = 0;

  sprayAreas.forEach(area => {
    const areaSqFtForTotals = calculateEffectiveSqFt(area);
    area.foamApplications.forEach(app => {
      if (app.applicationType === "Coating") {
        const cc = calculateCoatingApplicationCost(app, areaSqFtForTotals);
        const cost = cc.baseMaterialCost;
        const markupAmount = cc.markupAmount;
        totalCoatingBaseCost += cost;
        totalCoatingMarkupAmount += markupAmount;
        totalCoatingGallons += cc.coverage.gallonsNeeded || 0;
        totalCoatingContainers += cc.containers || 0;
        baseMaterialCost += cost;
        materialMarkupAmount += markupAmount;
      } else {
        const { gallons, sets, baseMaterialCost: cost, markupAmount } = calculateFoamApplicationCost(area, app);
        const category = app.foamTypeCategory || app.foamType;
        if (category === "Open") {
          totalGallons.open += gallons;
          totalSets.open += sets;
          weightedOpenCostPerGallon += gallons > 0 ? cost : 0;
        } else {
          totalGallons.closed += gallons;
          totalSets.closed += sets;
          weightedClosedCostPerGallon += gallons > 0 ? cost : 0;
        }
        baseMaterialCost += cost;
        materialMarkupAmount += markupAmount;
      }
    });
  });

  const openCostPerGallon = totalGallons.open > 0 ? weightedOpenCostPerGallon / totalGallons.open : 0;
  const closedCostPerGallon = totalGallons.closed > 0 ? weightedClosedCostPerGallon / totalGallons.closed : 0;

  // Per-coating-type breakdown for display + per-type actuals
  const coatingBreakdown = buildCoatingTypeBreakdown(sprayAreas);
  const coatingBreakdownEntries = Array.from(coatingBreakdown.entries());

  // Fuel cost: travel + generator
  const travelFuelCost = Math.round(globalInputs.travelDistance * globalInputs.travelRate * 100) / 100;
  const generatorBurnRate = adminSettings?.generator?.burnRate ?? 0;
  const generatorRuntime = parseFloat(globalInputs.generatorRuntime) || 0;
  const generatorFuelCost = Math.round(generatorBurnRate * generatorRuntime * (globalInputs.dieselPricePerGallon || 0) * 100) / 100;
  const fuelCost = Math.round((travelFuelCost + generatorFuelCost) * 100) / 100;

  // Backward-compat: if old single field present, use as fallback for all 3
  const legacyJobCostMarkup = adminSettings?.additionalJobCostMarkupPct ?? 30;
  const fuelMarkupPct = (adminSettings?.fuelMarkupPercent ?? legacyJobCostMarkup) / 100;
  const wasteDisposalMarkupPct = (adminSettings?.wasteDisposalMarkupPercent ?? legacyJobCostMarkup) / 100;
  const equipmentRentalMarkupPct = (adminSettings?.equipmentRentalMarkupPercent ?? legacyJobCostMarkup) / 100;

  const wasteDisposalBase = parseFloat(globalInputs.wasteDisposal) || 0;
  const equipmentRentalBase = parseFloat(globalInputs.equipmentRental) || 0;
  const additionalJobCostBase = Math.round((fuelCost + wasteDisposalBase + equipmentRentalBase) * 100) / 100;

  const fuelMarkupAmount = Math.round(fuelCost * fuelMarkupPct * 100) / 100;
  const wasteDisposalMarkupAmount = Math.round(wasteDisposalBase * wasteDisposalMarkupPct * 100) / 100;
  const equipmentRentalMarkupAmount = Math.round(equipmentRentalBase * equipmentRentalMarkupPct * 100) / 100;
  const additionalJobCostMarkup = Math.round((fuelMarkupAmount + wasteDisposalMarkupAmount + equipmentRentalMarkupAmount) * 100) / 100;

  const baseLaborCost = Math.round(globalInputs.laborHours * globalInputs.manualLaborRate * 100) / 100;
  const totalBaseCost = Math.round((baseMaterialCost + baseLaborCost + additionalJobCostBase) * 100) / 100;
  const laborMarkupAmount = Math.round(baseLaborCost * (globalInputs.laborMarkup / 100) * 100) / 100;
  const totalJobCost = Math.round((totalBaseCost + materialMarkupAmount + laborMarkupAmount + additionalJobCostMarkup) * 100) / 100;
  const customerCost = totalJobCost - discountDollar;
  
  const netProfitBeforeCommission = customerCost - totalBaseCost;
  const profitMarginBeforeCommission = customerCost > 0 ? (netProfitBeforeCommission / customerCost) * 100 : 0;
  
  const calculateSalesCommission = (netProfit, margin) => {
    const tiers = adminSettings?.commission || {};
    const tier2Min = tiers.tier2Threshold ?? 35;
    const tier2Rate = (tiers.tier2Rate ?? 12) / 100;
    const tier1Min = tiers.tier1Threshold ?? 30;
    const tier1Rate = (tiers.tier1Rate ?? 10) / 100;
    if (margin >= tier2Min) {
      return netProfit * tier2Rate;
    } else if (margin >= tier1Min && margin < tier2Min) {
      return netProfit * tier1Rate;
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
  const effectiveActualFuelCost = actuals.actualFuelCost ?? fuelCost;
  const effectiveActualWasteDisposal = actuals.actualWasteDisposal ?? globalInputs.wasteDisposal;
  const effectiveActualEquipmentRental = actuals.actualEquipmentRental ?? globalInputs.equipmentRental;

  // Per-coating-type actual material cost: ceil(actualGallons / containerGallons) × pricePerContainer
  let actualCoatingMaterialCost = 0;
  coatingBreakdownEntries.forEach(([name, info]) => {
    const userActual = actuals.actualCoatingGallonsByType?.[name];
    const effectiveGallons = (userActual !== undefined && userActual !== null) ? userActual : info.gallonsNeeded;
    const containers = info.containerGallons > 0 ? Math.ceil(effectiveGallons / info.containerGallons) : 0;
    actualCoatingMaterialCost += containers * info.pricePerContainer;
  });
  actualCoatingMaterialCost = Math.round(actualCoatingMaterialCost * 100) / 100;
  const actualMaterialCost = Math.round((effectiveActualOpenGallons * openCostPerGallon + effectiveActualClosedGallons * closedCostPerGallon + actualCoatingMaterialCost) * 100) / 100;
  const actualLaborCost = Math.round(effectiveActualLaborHours * globalInputs.manualLaborRate * 100) / 100;
  const actualWasteDisposalBase = parseFloat(effectiveActualWasteDisposal) || 0;
  const actualEquipmentRentalBase = parseFloat(effectiveActualEquipmentRental) || 0;
  const actualAdditionalJobCostBase = Math.round((effectiveActualFuelCost + actualWasteDisposalBase + actualEquipmentRentalBase) * 100) / 100;
  const actualFuelMarkupAmount = Math.round(effectiveActualFuelCost * fuelMarkupPct * 100) / 100;
  const actualWasteDisposalMarkupAmount = Math.round(actualWasteDisposalBase * wasteDisposalMarkupPct * 100) / 100;
  const actualEquipmentRentalMarkupAmount = Math.round(actualEquipmentRentalBase * equipmentRentalMarkupPct * 100) / 100;
  const actualAdditionalJobCostMarkup = Math.round((actualFuelMarkupAmount + actualWasteDisposalMarkupAmount + actualEquipmentRentalMarkupAmount) * 100) / 100;
  const actualBaseCost = Math.round((actualMaterialCost + actualLaborCost + actualAdditionalJobCostBase) * 100) / 100;
  const actualCustomerCost = customerCost;
  
  const actualNetProfitBeforeCommission = actualCustomerCost - actualBaseCost;
  const actualProfitMarginBeforeCommission = actualCustomerCost > 0 ? (actualNetProfitBeforeCommission / actualCustomerCost) * 100 : 0;
  
  const actualSalesCommission = calculateSalesCommission(actualNetProfitBeforeCommission, actualProfitMarginBeforeCommission);
  const actualTotalFees = actualSalesCommission;
  const actualProfit = actualCustomerCost - actualBaseCost - actualTotalFees;
  const actualMargin = actualCustomerCost > 0 ? (actualProfit / actualCustomerCost) * 100 : 0;
  const marginColor = profitMargin < 25 ? "text-red-600" : profitMargin < 30 ? "text-yellow-600" : "text-green-600";
  const actualMarginColor = actualMargin < 25 ? "text-red-600" : actualMargin < 30 ? "text-yellow-600" : "text-green-600";

  // Color logic for comparing actual vs estimated costs
  const getComparisonColor = (actual, estimated, inverse = false) => {
    if (actual === estimated) return "";
    if (inverse) {
      return actual < estimated ? "text-green-600" : "text-red-600";
    }
    return actual < estimated ? "text-green-600" : "text-red-600";
  };
  
  const actualMaterialCostColor = getComparisonColor(actualMaterialCost, baseMaterialCost);
  const actualLaborCostColor = getComparisonColor(actualLaborCost, baseLaborCost);
  const actualBaseCostColor = getComparisonColor(actualBaseCost, totalBaseCost);
  
  const getJobNetProfitColor = (margin) => {
    const tier2Min = adminSettings?.commission?.tier2Threshold ?? 35;
    const tier1Min = adminSettings?.commission?.tier1Threshold ?? 30;
    if (margin >= tier2Min) return "text-green-600";
    if (margin >= tier1Min) return "text-yellow-600";
    return "text-red-600";
  };
  
  const estimatedJobNetProfit = customerCost - totalBaseCost;
  const estimatedJobNetProfitMargin = customerCost > 0 ? (estimatedJobNetProfit / customerCost) * 100 : 0;
  const actualJobNetProfit = customerCost - actualBaseCost;
  const actualJobNetProfitMargin = customerCost > 0 ? (actualJobNetProfit / customerCost) * 100 : 0;

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
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{adminSettings?.companyName ? `${adminSettings.companyName} Estimator` : 'Eco Innovations Estimator'}</h1>
                  {onAdmin && <button onClick={onAdmin} className="text-xs text-gray-400 hover:text-gray-600 no-print">Admin</button>}
                </div>
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
                {jobberConnected ? (
                  <>
                    <button 
                      onClick={sendToJobber} 
                      disabled={jobberLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base disabled:opacity-50"
                    >
                      {jobberLoading ? 'Sending...' : 'Send to Jobber'}
                    </button>
                    <button 
                      onClick={disconnectFromJobber}
                      disabled={jobberLoading}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={connectToJobber}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base"
                  >
                    Connect Jobber
                  </button>
                )}
              </div>
            </div>
            
            {/* Jobber Status Messages */}
            {(jobberError || jobberSuccess) && (
              <div className={`p-3 rounded-lg ${jobberError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} no-print`}>
                {jobberError || jobberSuccess}
                {jobberConnected && !jobberLoading && (
                  <button 
                    onClick={disconnectFromJobber}
                    className="ml-4 text-sm underline hover:no-underline"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            )}

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Engagement Date</label>
                <input
                  type="date"
                  value={engagementDate}
                  onChange={(e) => setEngagementDate(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Completion Date</label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
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
                              value={chargedLaborRateFocused ? chargedLaborRateInput : (chargedLaborRate === 0 ? "" : chargedLaborRate.toFixed(2))}
                              onChange={(e) => handleChargedLaborRateChange(e.target.value)}
                              onFocus={() => {
                                setChargedLaborRateFocused(true);
                                setChargedLaborRateInput(chargedLaborRate > 0 ? chargedLaborRate.toFixed(2) : "");
                              }}
                              onBlur={() => {
                                setChargedLaborRateFocused(false);
                                validateChargedLaborRate();
                              }}
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
                      ) : key === 'dieselPricePerGallon' ? (
                        <div>
                          <input
                            type="range"
                            min="0"
                            max="8"
                            step="0.05"
                            value={val}
                            onChange={(e) => handleGlobalChange('dieselPricePerGallon', e.target.value)}
                            className="w-full mb-1"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>$0</span><span>$4</span><span>$8</span>
                          </div>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="8"
                            value={val === 0 ? "" : val}
                            onChange={(e) => handleGlobalChange('dieselPricePerGallon', e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {val > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Travel rate auto-set to ${(val / (adminSettings?.generator?.truckMpg ?? 8)).toFixed(2)}/mile
                              {generatorBurnRate > 0 && ` · Gen fuel: $${generatorFuelCost.toFixed(2)}`}
                            </p>
                          )}
                        </div>
                      ) : key === 'travelRate' ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={val === 0 ? "" : val.toFixed(2)}
                          onChange={(e) => handleGlobalChange('travelRate', e.target.value)}
                          disabled={globalInputs.dieselPricePerGallon > 0}
                          className={`w-full border border-gray-300 p-2 rounded-lg ${globalInputs.dieselPricePerGallon > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        />
                      ) : key === 'wasteDisposal' ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={wasteDisposalFocused ? wasteDisposalInput : (val === 0 ? "" : val.toFixed(2))}
                          onChange={(e) => setWasteDisposalInput(e.target.value)}
                          onFocus={() => {
                            setWasteDisposalFocused(true);
                            setWasteDisposalInput(val > 0 ? val.toFixed(2) : "");
                          }}
                          onBlur={() => {
                            setWasteDisposalFocused(false);
                            if (wasteDisposalInput !== null && wasteDisposalInput !== "") {
                              handleGlobalChange('wasteDisposal', wasteDisposalInput);
                            }
                            setWasteDisposalInput(null);
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
              
              {/* Discount Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount ($)
                      <Tooltip text="Dollar amount to discount from the total job cost" />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountDollarFocused ? discountDollarInput : (discountDollar === 0 ? "" : discountDollar.toFixed(2))}
                      onChange={(e) => handleDiscountDollarChange(e.target.value, totalJobCost)}
                      onFocus={() => {
                        setDiscountDollarFocused(true);
                        setDiscountDollarInput(discountDollar === 0 ? "" : discountDollar.toFixed(2));
                      }}
                      onBlur={() => handleDiscountDollarBlur(totalJobCost)}
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount (%)
                      <Tooltip text="Percentage to discount from the total job cost" />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={discountPercentFocused ? discountPercentInput : (discountPercent === 0 ? "" : discountPercent.toFixed(2))}
                      onChange={(e) => handleDiscountPercentChange(e.target.value, totalJobCost)}
                      onFocus={() => {
                        setDiscountPercentFocused(true);
                        setDiscountPercentInput(discountPercent === 0 ? "" : discountPercent.toFixed(2));
                      }}
                      onBlur={() => handleDiscountPercentBlur(totalJobCost)}
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Deposit Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Deposit</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deposit ($)
                      <Tooltip text="Dollar amount for the required deposit on the customer charge" />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={depositDollarFocused ? depositDollarInput : (depositDollar === 0 ? "" : depositDollar.toFixed(2))}
                      onChange={(e) => handleDepositDollarChange(e.target.value, customerCost)}
                      onFocus={() => {
                        setDepositDollarFocused(true);
                        setDepositDollarInput(depositDollar === 0 ? "" : depositDollar.toFixed(2));
                      }}
                      onBlur={() => handleDepositDollarBlur(customerCost)}
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deposit (%)
                      <Tooltip text="Percentage of the customer charge for the required deposit" />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={depositPercentFocused ? depositPercentInput : (depositPercent === 0 ? "" : depositPercent.toFixed(2))}
                      onChange={(e) => handleDepositPercentChange(e.target.value, customerCost)}
                      onFocus={() => {
                        setDepositPercentFocused(true);
                        setDepositPercentInput(depositPercent === 0 ? "" : depositPercent.toFixed(2));
                      }}
                      onBlur={() => handleDepositPercentBlur(customerCost)}
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
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
                {sprayAreas.map((area, areaIndex) => {
                  const effectiveSqFt = calculateEffectiveSqFt(area);
                  return (
                    <div key={area.id || areaIndex} className="border border-gray-200 p-4 rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <input
                          type="text"
                          value={area.name}
                          onChange={(e) => updateArea(areaIndex, 'name', e.target.value)}
                          placeholder="Enter area name..."
                          className="text-lg font-medium text-gray-900 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto sm:min-w-64"
                        />
                        {sprayAreas.length > 1 && (
                          <button onClick={() => removeArea(areaIndex)} className="text-red-500 hover:text-red-700 text-sm font-medium no-print">
                            Remove Area
                          </button>
                        )}
                      </div>
                      
                      {/* Shared Area Properties */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Area (Sq Ft)
                            <Tooltip text={tooltips.areaSqFt} />
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={area.areaSqFt === 0 ? "" : area.areaSqFt}
                            onChange={(e) => updateArea(areaIndex, 'areaSqFt', e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Length (ft)
                            <Tooltip text={tooltips.length} />
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={area.areaSqFt > 0 ? "" : (area.length === 0 ? "" : area.length)}
                            onChange={(e) => updateArea(areaIndex, 'length', e.target.value)}
                            disabled={area.areaSqFt > 0}
                            className={`w-full border border-gray-300 p-2 rounded-lg ${area.areaSqFt > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Width (ft)
                            <Tooltip text={tooltips.width} />
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={area.areaSqFt > 0 ? "" : (area.width === 0 ? "" : area.width)}
                            onChange={(e) => updateArea(areaIndex, 'width', e.target.value)}
                            disabled={area.areaSqFt > 0}
                            className={`w-full border border-gray-300 p-2 rounded-lg ${area.areaSqFt > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Area Type
                            <Tooltip text={tooltips.areaType} />
                          </label>
                          <select
                            value={area.areaType}
                            onChange={(e) => updateArea(areaIndex, 'areaType', e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {["General Area", "Exterior Walls", "Roof Deck", "Gable"].map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                        {area.areaType === "Roof Deck" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Roof Pitch
                              <Tooltip text={tooltips.roofPitch} />
                            </label>
                            <select
                              value={area.roofPitch}
                              onChange={(e) => updateArea(areaIndex, 'roofPitch', e.target.value)}
                              className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {pitchOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      
                      {area.areaType === "Roof Deck" && area.areaSqFt > 0 && (
                        <div className="flex items-center mb-4">
                          <input
                            type="checkbox"
                            id={`applyPitch-${areaIndex}`}
                            checked={area.applyPitchToManualArea || false}
                            onChange={(e) => updateArea(areaIndex, 'applyPitchToManualArea', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={`applyPitch-${areaIndex}`} className="ml-2 text-sm font-medium text-gray-700">
                            Apply pitch multiplier to entered Area (Sq Ft)
                            <Tooltip text={tooltips.applyPitchToManualArea} />
                          </label>
                        </div>
                      )}
                      
                      {effectiveSqFt > 0 && (
                        <div className="text-sm text-gray-600 mb-4">
                          Effective Area: <span className="font-medium">{effectiveSqFt.toFixed(0)} sq ft</span>
                          {area.areaType === "Roof Deck" && (area.applyPitchToManualArea || area.length > 0 || area.width > 0) && " (with pitch multiplier)"}
                          {area.areaType === "Gable" && " (triangular area)"}
                        </div>
                      )}
                      
                      {/* Foam Applications */}
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-800">Applications</h4>
                          <div className="flex gap-2 no-print">
                            <button 
                              onClick={() => addFoamApplication(areaIndex)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              + Add Foam
                            </button>
                            <button 
                              onClick={() => addCoatingApplication(areaIndex)}
                              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                            >
                              + Add Coating
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {area.foamApplications.map((foamApp, foamIndex) => {
                            const isCoating = foamApp.applicationType === "Coating";
                            const foamKey = `${areaIndex}-${foamIndex}`;

                            if (isCoating) {
                              const areaSqFtForCoating = calculateEffectiveSqFt(area);
                              const coatingCalcs = calculateCoatingApplicationCost(foamApp, areaSqFtForCoating);
                              const cov = coatingCalcs.coverage;
                              const coatingTypes = adminSettings?.coatingTypes || [];
                              const showWetMil = (foamApp.calculationMethod === 'wetFilmThickness');
                              return (
                                <div key={foamApp.id || foamIndex} className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-semibold text-purple-700">Coating Application</span>
                                    {area.foamApplications.length > 1 && (
                                      <button onClick={() => removeFoamApplication(areaIndex, foamIndex)} className="text-red-500 hover:text-red-700 text-xs font-medium no-print">Remove</button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Coating Type</label>
                                      {coatingTypes.length > 0 ? (
                                        <select
                                          value={foamApp.coatingTypeId || ""}
                                          onChange={(e) => updateCoatingApplication(areaIndex, foamIndex, 'coatingTypeId', e.target.value)}
                                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="">Select coating...</option>
                                          {coatingTypes.map(ct => (
                                            <option key={ct.id} value={ct.id}>{ct.productName ?? ct.name}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          placeholder="Coating name..."
                                          value={foamApp.coatingTypeName || ""}
                                          onChange={(e) => {
                                            const updated = [...sprayAreas];
                                            updated[areaIndex].foamApplications[foamIndex].coatingTypeName = e.target.value;
                                            setSprayAreas(updated);
                                          }}
                                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Container Type</label>
                                      <input
                                        type="text"
                                        readOnly
                                        value={foamApp.containerType || ""}
                                        className="w-full border border-gray-200 bg-gray-100 text-gray-600 p-2 rounded-lg cursor-not-allowed"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft / Container</label>
                                      <input
                                        type="text"
                                        readOnly
                                        value={cov.sqFtPerContainer > 0 ? cov.sqFtPerContainer.toFixed(0) : '—'}
                                        className="w-full border border-gray-200 bg-gray-100 text-gray-600 p-2 rounded-lg cursor-not-allowed"
                                      />
                                    </div>
                                    {showWetMil && (
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Thickness (wet mil)</label>
                                        <input
                                          type="number" step="0.1" min="0"
                                          value={foamApp.defaultThickness || ""}
                                          onChange={(e) => updateCoatingApplication(areaIndex, foamIndex, 'defaultThickness', e.target.value)}
                                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cost/Container ($)
                                        <Tooltip text="Editable raw cost per container — change to reflect supplier price updates." />
                                      </label>
                                      <input
                                        type="number" step="0.01" min="0"
                                        value={foamApp.materialCostPerContainer || ""}
                                        onChange={(e) => updateCoatingApplication(areaIndex, foamIndex, 'materialCostPerContainer', e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Material Markup (%)
                                        <Tooltip text="Editable. Changing this updates Price ($/Sq Ft) and the live totals below." />
                                      </label>
                                      <input
                                        type="number" step="0.01" min="0"
                                        value={foamApp.materialMarkup || ""}
                                        onChange={(e) => updateCoatingApplication(areaIndex, foamIndex, 'materialMarkup', e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price/Container ($)
                                        <Tooltip text="Auto-calculated from Price ($/Sq Ft) × Sq Ft per Container." />
                                      </label>
                                      <input
                                        type="text"
                                        readOnly
                                        value={coatingCalcs.pricePerContainer > 0 ? `$${coatingCalcs.pricePerContainer.toFixed(2)}` : '—'}
                                        className="w-full border border-gray-200 bg-gray-100 text-gray-600 p-2 rounded-lg cursor-not-allowed"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price ($/Sq Ft)
                                        <Tooltip text="Editable. Changing this updates Material Markup % and the live totals below." />
                                      </label>
                                      <input
                                        type="number" step="0.001" min="0"
                                        value={foamApp.defaultPricePerSqFt || ""}
                                        onChange={(e) => updateCoatingApplication(areaIndex, foamIndex, 'defaultPricePerSqFt', e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                  {cov.wetMilWarning && (
                                    <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
                                      ⚠ {cov.wetMilWarning}
                                    </div>
                                  )}
                                  {(cov.gallonsNeeded > 0 || coatingCalcs.containers > 0) && (
                                    <div className="mt-3 text-sm text-gray-600 bg-white p-2 rounded border border-purple-100 grid grid-cols-2 sm:grid-cols-5 gap-2">
                                      <span>Gallons: <strong>{cov.gallonsNeeded.toFixed(2)}</strong></span>
                                      <span>Containers: <strong>{coatingCalcs.containers}</strong></span>
                                      <span>Base: <strong>${coatingCalcs.baseMaterialCost.toFixed(2)}</strong></span>
                                      <span>Markup: <strong>${coatingCalcs.markupAmount.toFixed(2)}</strong></span>
                                      <span>Total: <strong className="text-purple-700">${coatingCalcs.totalCost.toFixed(2)}</strong></span>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            const foamCalcs = calculateFoamApplicationCost(area, foamApp);
                            const availableFoamTypes = getFoamTypesFromSettings(adminSettings);
                            return (
                              <div key={foamApp.id || foamIndex} className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-sm font-medium text-gray-700">
                                    {foamApp.foamTypeName || `${foamApp.foamTypeCategory || foamApp.foamType} Cell`} — {foamApp.foamThickness}" thick
                                  </span>
                                  {area.foamApplications.length > 1 && (
                                    <button 
                                      onClick={() => removeFoamApplication(areaIndex, foamIndex)}
                                      className="text-red-500 hover:text-red-700 text-xs font-medium no-print"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Foam Type
                                      <Tooltip text={tooltips.foamType} />
                                    </label>
                                    {availableFoamTypes.length > 0 ? (
                                      <select
                                        value={foamApp.foamTypeId || ""}
                                        onChange={(e) => updateFoamApplication(areaIndex, foamIndex, 'foamTypeId', e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        {availableFoamTypes.map(ft => (
                                          <option key={ft.id} value={ft.id}>{ft.name}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <select
                                        value={foamApp.foamTypeCategory || foamApp.foamType || "Open"}
                                        onChange={(e) => updateFoamApplication(areaIndex, foamIndex, 'foamTypeCategory', e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="Open">Open Cell</option>
                                        <option value="Closed">Closed Cell</option>
                                      </select>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Foam Thickness (inches)
                                      <Tooltip text={tooltips.foamThickness} />
                                    </label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      value={foamApp.foamThickness === 0 ? "" : foamApp.foamThickness}
                                      onChange={(e) => updateFoamApplication(areaIndex, foamIndex, 'foamThickness', e.target.value)}
                                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Foam Cost per Set
                                      <Tooltip text={tooltips.materialPrice} />
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={materialPriceFocused[foamKey] ? materialPriceInputs[foamKey] : (foamApp.materialPrice === 0 ? "" : foamApp.materialPrice.toFixed(2))}
                                      onChange={(e) => setMaterialPriceInputs(prev => ({ ...prev, [foamKey]: e.target.value }))}
                                      onFocus={() => {
                                        setMaterialPriceFocused(prev => ({ ...prev, [foamKey]: true }));
                                        setMaterialPriceInputs(prev => ({ ...prev, [foamKey]: foamApp.materialPrice > 0 ? foamApp.materialPrice.toFixed(2) : "" }));
                                      }}
                                      onBlur={() => {
                                        setMaterialPriceFocused(prev => ({ ...prev, [foamKey]: false }));
                                        if (materialPriceInputs[foamKey] !== undefined && materialPriceInputs[foamKey] !== "") {
                                          updateFoamApplication(areaIndex, foamIndex, 'materialPrice', materialPriceInputs[foamKey]);
                                        }
                                        setMaterialPriceInputs(prev => {
                                          const updated = { ...prev };
                                          delete updated[foamKey];
                                          return updated;
                                        });
                                      }}
                                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Material Markup (%)
                                      <Tooltip text={tooltips.materialMarkup} />
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={foamApp.materialMarkup === 0 ? "" : foamApp.materialMarkup}
                                      onChange={(e) => updateFoamApplication(areaIndex, foamIndex, 'materialMarkup', e.target.value)}
                                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Board Feet per Set
                                      <Tooltip text={tooltips.boardFeetPerSet} />
                                    </label>
                                    <input
                                      type="number"
                                      value={foamApp.boardFeetPerSet}
                                      readOnly
                                      className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100 text-gray-600"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Material Cost per Set</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={(foamApp.materialPrice * 1.20).toFixed(2)}
                                      readOnly
                                      className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100 text-gray-600"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">$/Per Set</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={(foamApp.materialPrice * 1.20 * (1 + foamApp.materialMarkup / 100)).toFixed(2)}
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
                                      value={pricePerSqFtInputs[foamKey] !== undefined ? pricePerSqFtInputs[foamKey] : (foamCalcs.pricePerSqFt ? foamCalcs.pricePerSqFt.toFixed(2) : "")}
                                      onChange={(e) => handlePricePerSqFtInputChange(foamKey, e.target.value)}
                                      onBlur={() => handlePricePerSqFtBlur(areaIndex, foamIndex, foamApp)}
                                      className={`w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${pricePerSqFtErrors[foamKey] ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {pricePerSqFtErrors[foamKey] && (
                                      <p className="text-red-600 text-xs mt-1">{pricePerSqFtErrors[foamKey]}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <MiniOutput
                                  sqft={foamCalcs.sqft}
                                  gallons={foamCalcs.gallons}
                                  sets={foamCalcs.sets}
                                  baseMaterialCost={foamCalcs.baseMaterialCost}
                                  markupAmount={foamCalcs.markupAmount}
                                  totalCost={foamCalcs.totalCost}
                                  rValue={foamCalcs.rValue}
                                />
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Area Summary - show when multiple foam applications */}
                        {area.foamApplications.length > 1 && (() => {
                          const areaEffectiveSqFt = calculateEffectiveSqFt(area);
                          let totalRValue = 0;
                          let openCellGallons = 0;
                          let openCellSets = 0;
                          let closedCellGallons = 0;
                          let closedCellSets = 0;
                          let totalBaseCost = 0;
                          let totalMarkup = 0;
                          let totalCost = 0;
                          
                          const areaCoatingMap = new Map();
                          area.foamApplications.forEach(foamApp => {
                            if (foamApp.applicationType === "Coating") {
                              const coatingCalcs = calculateCoatingApplicationCost(foamApp, areaEffectiveSqFt);
                              totalBaseCost += coatingCalcs.baseMaterialCost;
                              totalMarkup += coatingCalcs.markupAmount;
                              totalCost += coatingCalcs.totalCost;
                              const coatingName = (foamApp.coatingTypeName && foamApp.coatingTypeName.trim()) || "Coating";
                              const prev = areaCoatingMap.get(coatingName) || { gallons: 0, containers: 0 };
                              prev.gallons += coatingCalcs.coverage.gallonsNeeded || 0;
                              prev.containers += coatingCalcs.containers || 0;
                              areaCoatingMap.set(coatingName, prev);
                              return;
                            }
                            const foamCalcs = calculateFoamApplicationCost(area, foamApp);
                            totalRValue += foamCalcs.rValue;
                            totalBaseCost += foamCalcs.baseMaterialCost;
                            totalMarkup += foamCalcs.markupAmount;
                            totalCost += foamCalcs.totalCost;
                            const category = foamApp.foamTypeCategory || foamApp.foamType;
                            if (category === "Open") {
                              openCellGallons += foamCalcs.gallons;
                              openCellSets += foamCalcs.sets;
                            } else {
                              closedCellGallons += foamCalcs.gallons;
                              closedCellSets += foamCalcs.sets;
                            }
                          });
                          
                          return (
                            <AreaSummary
                              areaSqFt={areaEffectiveSqFt}
                              totalRValue={totalRValue}
                              openCellGallons={openCellGallons}
                              openCellSets={openCellSets}
                              closedCellGallons={closedCellGallons}
                              closedCellSets={closedCellSets}
                              coatingBreakdown={Array.from(areaCoatingMap.entries())}
                              totalBaseCost={totalBaseCost}
                              totalMarkup={totalMarkup}
                              totalCost={totalCost}
                            />
                          );
                        })()}
                      </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Labor Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actualsFocused.laborHours 
                      ? actualsInputs.laborHours 
                      : (actuals.actualLaborHours !== null 
                          ? (actuals.actualLaborHours === 0 ? "" : actuals.actualLaborHours) 
                          : (globalInputs.laborHours === 0 ? "" : globalInputs.laborHours))}
                    onChange={(e) => setActualsInputs(prev => ({ ...prev, laborHours: e.target.value }))}
                    onFocus={() => {
                      setActualsFocused(prev => ({ ...prev, laborHours: true }));
                      const currentVal = actuals.actualLaborHours !== null ? actuals.actualLaborHours : globalInputs.laborHours;
                      setActualsInputs(prev => ({ ...prev, laborHours: currentVal > 0 ? String(currentVal) : "" }));
                    }}
                    onBlur={() => {
                      setActualsFocused(prev => ({ ...prev, laborHours: false }));
                      if (actualsInputs.laborHours !== undefined && actualsInputs.laborHours !== "") {
                        handleActualsChange("actualLaborHours", actualsInputs.laborHours);
                      }
                      setActualsInputs(prev => {
                        const updated = { ...prev };
                        delete updated.laborHours;
                        return updated;
                      });
                    }}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Open Cell Gallons</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actualsFocused.openGallons 
                      ? actualsInputs.openGallons 
                      : (actuals.actualOpenGallons !== null 
                          ? (actuals.actualOpenGallons === 0 ? "" : actuals.actualOpenGallons.toFixed(1)) 
                          : (totalGallons.open === 0 ? "" : totalGallons.open.toFixed(1)))}
                    onChange={(e) => setActualsInputs(prev => ({ ...prev, openGallons: e.target.value }))}
                    onFocus={() => {
                      setActualsFocused(prev => ({ ...prev, openGallons: true }));
                      const currentVal = actuals.actualOpenGallons !== null ? actuals.actualOpenGallons : totalGallons.open;
                      setActualsInputs(prev => ({ ...prev, openGallons: currentVal > 0 ? currentVal.toFixed(1) : "" }));
                    }}
                    onBlur={() => {
                      setActualsFocused(prev => ({ ...prev, openGallons: false }));
                      if (actualsInputs.openGallons !== undefined && actualsInputs.openGallons !== "") {
                        handleActualsChange("actualOpenGallons", actualsInputs.openGallons);
                      }
                      setActualsInputs(prev => {
                        const updated = { ...prev };
                        delete updated.openGallons;
                        return updated;
                      });
                    }}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Closed Cell Gallons</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actualsFocused.closedGallons 
                      ? actualsInputs.closedGallons 
                      : (actuals.actualClosedGallons !== null 
                          ? (actuals.actualClosedGallons === 0 ? "" : actuals.actualClosedGallons.toFixed(1)) 
                          : (totalGallons.closed === 0 ? "" : totalGallons.closed.toFixed(1)))}
                    onChange={(e) => setActualsInputs(prev => ({ ...prev, closedGallons: e.target.value }))}
                    onFocus={() => {
                      setActualsFocused(prev => ({ ...prev, closedGallons: true }));
                      const currentVal = actuals.actualClosedGallons !== null ? actuals.actualClosedGallons : totalGallons.closed;
                      setActualsInputs(prev => ({ ...prev, closedGallons: currentVal > 0 ? currentVal.toFixed(1) : "" }));
                    }}
                    onBlur={() => {
                      setActualsFocused(prev => ({ ...prev, closedGallons: false }));
                      if (actualsInputs.closedGallons !== undefined && actualsInputs.closedGallons !== "") {
                        handleActualsChange("actualClosedGallons", actualsInputs.closedGallons);
                      }
                      setActualsInputs(prev => {
                        const updated = { ...prev };
                        delete updated.closedGallons;
                        return updated;
                      });
                    }}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {coatingBreakdownEntries.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {coatingBreakdownEntries.map(([name, info]) => {
                    const inputKey = `coatingGallons_${name}`;
                    const stored = actuals.actualCoatingGallonsByType?.[name];
                    const fallback = info.gallonsNeeded;
                    return (
                      <div key={name}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Actual {name} Gallons</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={actualsFocused[inputKey]
                            ? (actualsInputs[inputKey] ?? "")
                            : (stored !== undefined && stored !== null
                                ? (stored === 0 ? "" : stored.toFixed(1))
                                : (fallback === 0 ? "" : fallback.toFixed(1)))}
                          onChange={(e) => setActualsInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                          onFocus={() => {
                            setActualsFocused(prev => ({ ...prev, [inputKey]: true }));
                            const currentVal = (stored !== undefined && stored !== null) ? stored : fallback;
                            setActualsInputs(prev => ({ ...prev, [inputKey]: currentVal > 0 ? currentVal.toFixed(1) : "" }));
                          }}
                          onBlur={() => {
                            setActualsFocused(prev => ({ ...prev, [inputKey]: false }));
                            if (actualsInputs[inputKey] !== undefined && actualsInputs[inputKey] !== "") {
                              handleActualCoatingGallonsChange(name, actualsInputs[inputKey]);
                            }
                            setActualsInputs(prev => {
                              const updated = { ...prev };
                              delete updated[inputKey];
                              return updated;
                            });
                          }}
                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Fuel Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualsFocused.fuelCost 
                      ? actualsInputs.fuelCost 
                      : (actuals.actualFuelCost !== null 
                          ? (actuals.actualFuelCost === 0 ? "" : actuals.actualFuelCost.toFixed(2)) 
                          : (fuelCost === 0 ? "" : fuelCost.toFixed(2)))}
                    onChange={(e) => setActualsInputs(prev => ({ ...prev, fuelCost: e.target.value }))}
                    onFocus={() => {
                      setActualsFocused(prev => ({ ...prev, fuelCost: true }));
                      const currentVal = actuals.actualFuelCost !== null ? actuals.actualFuelCost : fuelCost;
                      setActualsInputs(prev => ({ ...prev, fuelCost: currentVal > 0 ? currentVal.toFixed(2) : "" }));
                    }}
                    onBlur={() => {
                      setActualsFocused(prev => ({ ...prev, fuelCost: false }));
                      if (actualsInputs.fuelCost !== undefined && actualsInputs.fuelCost !== "") {
                        handleActualsChange("actualFuelCost", actualsInputs.fuelCost);
                      }
                      setActualsInputs(prev => {
                        const updated = { ...prev };
                        delete updated.fuelCost;
                        return updated;
                      });
                    }}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Waste Disposal ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualsFocused.wasteDisposal 
                      ? actualsInputs.wasteDisposal 
                      : (actuals.actualWasteDisposal !== null 
                          ? (actuals.actualWasteDisposal === 0 ? "" : actuals.actualWasteDisposal.toFixed(2)) 
                          : (globalInputs.wasteDisposal === 0 ? "" : globalInputs.wasteDisposal.toFixed(2)))}
                    onChange={(e) => setActualsInputs(prev => ({ ...prev, wasteDisposal: e.target.value }))}
                    onFocus={() => {
                      setActualsFocused(prev => ({ ...prev, wasteDisposal: true }));
                      const currentVal = actuals.actualWasteDisposal !== null ? actuals.actualWasteDisposal : globalInputs.wasteDisposal;
                      setActualsInputs(prev => ({ ...prev, wasteDisposal: currentVal > 0 ? currentVal.toFixed(2) : "" }));
                    }}
                    onBlur={() => {
                      setActualsFocused(prev => ({ ...prev, wasteDisposal: false }));
                      if (actualsInputs.wasteDisposal !== undefined && actualsInputs.wasteDisposal !== "") {
                        handleActualsChange("actualWasteDisposal", actualsInputs.wasteDisposal);
                      }
                      setActualsInputs(prev => {
                        const updated = { ...prev };
                        delete updated.wasteDisposal;
                        return updated;
                      });
                    }}
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Equipment Rental ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualsFocused.equipmentRental 
                      ? actualsInputs.equipmentRental 
                      : (actuals.actualEquipmentRental !== null 
                          ? (actuals.actualEquipmentRental === 0 ? "" : actuals.actualEquipmentRental.toFixed(2)) 
                          : (globalInputs.equipmentRental === 0 ? "" : globalInputs.equipmentRental.toFixed(2)))}
                    onChange={(e) => setActualsInputs(prev => ({ ...prev, equipmentRental: e.target.value }))}
                    onFocus={() => {
                      setActualsFocused(prev => ({ ...prev, equipmentRental: true }));
                      const currentVal = actuals.actualEquipmentRental !== null ? actuals.actualEquipmentRental : globalInputs.equipmentRental;
                      setActualsInputs(prev => ({ ...prev, equipmentRental: currentVal > 0 ? currentVal.toFixed(2) : "" }));
                    }}
                    onBlur={() => {
                      setActualsFocused(prev => ({ ...prev, equipmentRental: false }));
                      if (actualsInputs.equipmentRental !== undefined && actualsInputs.equipmentRental !== "") {
                        handleActualsChange("actualEquipmentRental", actualsInputs.equipmentRental);
                      }
                      setActualsInputs(prev => {
                        const updated = { ...prev };
                        delete updated.equipmentRental;
                        return updated;
                      });
                    }}
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
                      <tr className="font-bold">
                        <td className="py-2 pr-2">Job Net Profit</td>
                        <td className={`py-2 px-2 text-right ${getJobNetProfitColor(estimatedJobNetProfitMargin)}`}>${estimatedJobNetProfit.toFixed(2)}</td>
                        <td className={`py-2 px-2 text-right ${getJobNetProfitColor(actualJobNetProfitMargin)}`}>${actualJobNetProfit.toFixed(2)}</td>
                        <td className={`py-2 pl-2 text-right ${actualJobNetProfit - estimatedJobNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${(actualJobNetProfit - estimatedJobNetProfit).toFixed(2)}
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
                        <td className="py-2 pr-2">Final Profit</td>
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
                    {coatingBreakdownEntries.map(([name, info]) => (
                      <div key={name} className="flex justify-between py-1">
                        <span className="text-gray-600">{name}:</span>
                        <span>{info.gallonsNeeded.toFixed(1)} gallons ({info.containers} containers)</span>
                      </div>
                    ))}
                    <hr className="my-3" />
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Base Material Cost:</span>
                      <span>${baseMaterialCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Base Labor Cost:</span>
                      <span>${baseLaborCost.toFixed(2)}</span>
                    </div>
                    {generatorBurnRate > 0 ? (
                      <>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Travel Fuel:</span>
                          <span>${travelFuelCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Generator Runtime ({generatorRuntime.toFixed(1)} hrs):</span>
                          <span>${generatorFuelCost.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">Fuel Cost:</span>
                        <span>${fuelCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Waste Disposal:</span>
                      <span>${(parseFloat(globalInputs.wasteDisposal) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Equipment Rental:</span>
                      <span>${(parseFloat(globalInputs.equipmentRental) || 0).toFixed(2)}</span>
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
                    {fuelMarkupAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">Fuel Markup ({(fuelMarkupPct * 100).toFixed(1)}%):</span>
                        <span>${fuelMarkupAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {wasteDisposalMarkupAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">Waste Disposal Markup ({(wasteDisposalMarkupPct * 100).toFixed(1)}%):</span>
                        <span>${wasteDisposalMarkupAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {equipmentRentalMarkupAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">Equipment Rental Markup ({(equipmentRentalMarkupPct * 100).toFixed(1)}%):</span>
                        <span>${equipmentRentalMarkupAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <hr className="my-3" />
                    <div className="flex justify-between py-1 font-bold text-lg">
                      <span>Sales Price:</span>
                      <span>${totalJobCost.toFixed(2)}</span>
                    </div>
                    {discountDollar > 0 && (
                      <div className="flex justify-between py-1 text-blue-600">
                        <span>Discount ({discountPercent.toFixed(1)}%):</span>
                        <span>-${discountDollar.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 font-bold text-lg">
                      <span>Customer Charge:</span>
                      <span>${customerCost.toFixed(2)}</span>
                    </div>
                    {depositDollar > 0 && (
                      <div className="flex justify-between py-1 text-blue-600">
                        <span>Deposit Due ({depositPercent.toFixed(1)}%):</span>
                        <span>${depositDollar.toFixed(2)}</span>
                      </div>
                    )}
                    <div className={`flex justify-between py-1 font-bold ${getJobNetProfitColor(estimatedJobNetProfitMargin)}`}>
                      <span>Estimated Job Net Profit:</span>
                      <span>${estimatedJobNetProfit.toFixed(2)} ({estimatedJobNetProfitMargin.toFixed(1)}%)</span>
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
                      <span>Final Estimated Profit:</span>
                      <span>${estimatedProfit.toFixed(2)} ({profitMargin.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>

                {/* Actual Results */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Actual Results</h2>
                  <div className="space-y-3 text-sm">
                    <div className={`flex justify-between py-1 ${actualMaterialCostColor}`}>
                      <span className={actualMaterialCostColor || "text-gray-600"}>Actual Material Cost:</span>
                      <span>${actualMaterialCost.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between py-1 ${actualLaborCostColor}`}>
                      <span className={actualLaborCostColor || "text-gray-600"}>Actual Labor Cost:</span>
                      <span>${actualLaborCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Actual Fuel Cost:</span>
                      <span>${effectiveActualFuelCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Actual Waste Disposal:</span>
                      <span>${effectiveActualWasteDisposal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Actual Equipment Rental:</span>
                      <span>${effectiveActualEquipmentRental.toFixed(2)}</span>
                    </div>
                    <hr className="my-3" />
                    <div className={`flex justify-between py-1 font-bold ${actualBaseCostColor}`}>
                      <span>Actual Base Job Cost:</span>
                      <span>${actualBaseCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Material Markup:</span>
                      <span>${materialMarkupAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Labor Markup:</span>
                      <span>${laborMarkupAmount.toFixed(2)}</span>
                    </div>
                    {actualFuelMarkupAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">Fuel Markup ({(fuelMarkupPct * 100).toFixed(1)}%):</span>
                        <span>${actualFuelMarkupAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {actualWasteDisposalMarkupAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">Waste Disposal Markup ({(wasteDisposalMarkupPct * 100).toFixed(1)}%):</span>
                        <span>${actualWasteDisposalMarkupAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {actualEquipmentRentalMarkupAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">Equipment Rental Markup ({(equipmentRentalMarkupPct * 100).toFixed(1)}%):</span>
                        <span>${actualEquipmentRentalMarkupAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <hr className="my-3" />
                    <div className="flex justify-between py-1 font-bold text-lg">
                      <span>Sales Price:</span>
                      <span>${totalJobCost.toFixed(2)}</span>
                    </div>
                    {discountDollar > 0 && (
                      <div className="flex justify-between py-1 text-blue-600">
                        <span>Discount ({discountPercent.toFixed(1)}%):</span>
                        <span>-${discountDollar.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 font-bold text-lg">
                      <span>Customer Charge:</span>
                      <span>${customerCost.toFixed(2)}</span>
                    </div>
                    {depositDollar > 0 && (
                      <div className="flex justify-between py-1 text-blue-600">
                        <span>Deposit Due ({depositPercent.toFixed(1)}%):</span>
                        <span>${depositDollar.toFixed(2)}</span>
                      </div>
                    )}
                    <div className={`flex justify-between py-1 font-bold ${getJobNetProfitColor(actualJobNetProfitMargin)}`}>
                      <span>Actual Job Net Profit:</span>
                      <span>${actualJobNetProfit.toFixed(2)} ({actualJobNetProfitMargin.toFixed(1)}%)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Sales Commission {actualProfitMarginBeforeCommission >= 35 ? '(12%)' : actualProfitMarginBeforeCommission >= 30 ? '(10%)' : '(0%)'}:</span>
                      <span>${actualSalesCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Total Fees:</span>
                      <span>${actualTotalFees.toFixed(2)}</span>
                    </div>
                    <hr className="my-3" />
                    <div className={`flex justify-between py-1 font-bold text-lg ${actualMarginColor}`}>
                      <span>Final Actual Profit:</span>
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
