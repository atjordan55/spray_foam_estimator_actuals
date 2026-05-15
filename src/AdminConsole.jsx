import React, { useState, useEffect } from 'react';

const inputClass = "w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";
const disabledInputClass = "w-full border border-gray-200 p-2 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed";

function SectionCard({ title, children }) {
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );
}

const DEFAULT_FOAM_TYPE = {
  productName: '', name: '',
  productCategory: 'foam',
  active: true,
  category: 'Open',
  containerType: '110-gallon set',
  grossGallonsPerSet: 110,
  usableGallonsPerSet: 100,
  thicknessType: 'inch',
  defaultThicknessInches: 0, foamThickness: 0,
  cost: 0, foamCostPerSet: 0,
  materialCostPct: 20,
  boardFeetPerSet: 0,
  materialMarkupPercent: 0, materialMarkup: 0,
  wasteFactorPercent: 0,
  defaultPricePerSqFt: 0,
  notes: '',
};

const DEFAULT_COATING_TYPE = {
  productName: '', name: '',
  productCategory: 'coating',
  active: true,
  containerType: '5 gallon bucket',
  containerGallons: 5,
  calculationMethod: 'manualOverride',
  thicknessType: 'none',
  defaultThickness: 0,
  sqFtPerGallon: 0,
  solidsByVolumePercent: 0,
  maxSinglePassWetMils: 0,
  cost: 0, foamCostPerContainer: 0,
  materialCostPct: 20,
  materialMarkupPercent: 0, materialMarkup: 0,
  wasteFactorPercent: 0,
  defaultPricePerContainer: 0,
  notes: '',
};

const CONTAINER_GALLONS_MAP = {
  '55 gallon drum': 55,
  '5 gallon bucket': 5,
  '1 gallon bucket': 1,
};

function FoamTypeRow({ foam, index, onChange, onRemove }) {
  const recalcPriceFromMarkup = (f) => {
    const materialCostPerSet = f.foamCostPerSet * (1 + f.materialCostPct / 100);
    const baseCostPerSqFt = f.boardFeetPerSet > 0 ? (f.foamThickness / f.boardFeetPerSet) * materialCostPerSet : 0;
    return baseCostPerSqFt > 0 ? Math.round(baseCostPerSqFt * (1 + f.materialMarkup / 100) * 100) / 100 : 0;
  };
  const recalcMarkupFromPrice = (f) => {
    const materialCostPerSet = f.foamCostPerSet * (1 + f.materialCostPct / 100);
    const baseCostPerSqFt = f.boardFeetPerSet > 0 ? (f.foamThickness / f.boardFeetPerSet) * materialCostPerSet : 0;
    return baseCostPerSqFt > 0 ? Math.max(0, Math.round(((f.defaultPricePerSqFt / baseCostPerSqFt) - 1) * 10000) / 100) : 0;
  };

  const update = (key, value) => {
    const isText = ['productName', 'name', 'category', 'containerType', 'thicknessType', 'notes'].includes(key);
    const isBool = key === 'active';
    const parsed = isBool ? !!value : (isText ? value : (parseFloat(value) || 0));
    const updated = { ...foam, [key]: parsed };

    // Sync alias fields so legacy estimator code keeps working
    if (key === 'productName') updated.name = parsed;
    if (key === 'name') updated.productName = parsed;
    if (key === 'cost') updated.foamCostPerSet = parsed;
    if (key === 'foamCostPerSet') updated.cost = parsed;
    if (key === 'materialMarkupPercent') updated.materialMarkup = parsed;
    if (key === 'materialMarkup') updated.materialMarkupPercent = parsed;
    if (key === 'defaultThicknessInches') updated.foamThickness = parsed;
    if (key === 'foamThickness') updated.defaultThicknessInches = parsed;

    if (key === 'defaultPricePerSqFt') {
      const nm = recalcMarkupFromPrice(updated);
      updated.materialMarkup = nm;
      updated.materialMarkupPercent = nm;
    } else if (['materialMarkup', 'materialMarkupPercent', 'cost', 'foamCostPerSet', 'materialCostPct', 'defaultThicknessInches', 'foamThickness', 'boardFeetPerSet'].includes(key)) {
      updated.defaultPricePerSqFt = recalcPriceFromMarkup(updated);
    }
    onChange(index, updated);
  };

  const materialCostPerSet = (foam.foamCostPerSet || foam.cost || 0) * (1 + (foam.materialCostPct || 0) / 100);
  const baseCostPerSqFt = foam.boardFeetPerSet > 0 ? ((foam.foamThickness || foam.defaultThicknessInches || 0) / foam.boardFeetPerSet) * materialCostPerSet : 0;
  const grossGals = parseFloat(foam.grossGallonsPerSet) || 0;
  const usableGals = parseFloat(foam.usableGallonsPerSet) || 0;
  const impliedWastePercent = grossGals > 0 ? ((grossGals - usableGals) / grossGals) * 100 : 0;

  return (
    <div className={`border rounded-lg p-4 mb-3 ${foam.active === false ? 'bg-gray-100 border-gray-300 opacity-70' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{foam.productName || foam.name || `Foam Type ${index + 1}`}</span>
          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={foam.active !== false} onChange={(e) => update('active', e.target.checked)} className="h-3.5 w-3.5" />
            <span>{foam.active !== false ? 'Active' : 'Inactive'}</span>
          </label>
        </div>
        <button onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50">Remove</button>
      </div>

      {/* Identity */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        <div className="col-span-2">
          <label className={labelClass}>Product Name</label>
          <input type="text" value={foam.productName || foam.name || ''} onChange={(e) => update('productName', e.target.value)} className={inputClass} placeholder="e.g. Open Cell" />
        </div>
        <div>
          <label className={labelClass}>Product Category</label>
          <input type="text" value="foam" readOnly className={disabledInputClass} />
        </div>
        <div>
          <label className={labelClass}>R-Value Category</label>
          <select value={foam.category} onChange={(e) => update('category', e.target.value)} className={inputClass}>
            <option value="Open">Open Cell (R-3.8/in)</option>
            <option value="Closed">Closed Cell (R-7.2/in)</option>
          </select>
        </div>
      </div>

      {/* Container & yield */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className={labelClass}>Container Type</label>
          <input type="text" value={foam.containerType || '110-gallon set'} onChange={(e) => update('containerType', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Gross Gallons / Set</label>
          <input type="number" step="1" min="0" value={foam.grossGallonsPerSet ?? ''} onChange={(e) => update('grossGallonsPerSet', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Usable Gallons / Set</label>
          <input type="number" step="1" min="0" value={foam.usableGallonsPerSet ?? ''} onChange={(e) => update('usableGallonsPerSet', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Implied Waste (%)</label>
          <input type="text" value={`${impliedWastePercent.toFixed(2)}%`} readOnly className={disabledInputClass} />
        </div>
        <div>
          <label className={labelClass}>Board Feet per Set</label>
          <input type="number" step="100" min="0" value={foam.boardFeetPerSet || ''} onChange={(e) => update('boardFeetPerSet', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Thickness Type</label>
          <select value={foam.thicknessType || 'inch'} onChange={(e) => update('thicknessType', e.target.value)} className={inputClass}>
            <option value="inch">Inch</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Default Thickness (in)</label>
          <input type="number" step="0.5" min="0" value={foam.defaultThicknessInches ?? foam.foamThickness ?? ''} onChange={(e) => update('defaultThicknessInches', e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Cost & pricing */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className={labelClass}>Cost per Set ($)</label>
          <input type="number" step="0.01" min="0" value={foam.cost ?? foam.foamCostPerSet ?? ''} onChange={(e) => update('cost', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Overhead % (Material Cost)</label>
          <input type="number" step="0.1" min="0" value={foam.materialCostPct || ''} onChange={(e) => update('materialCostPct', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Material Markup (%)</label>
          <input type="number" step="0.01" min="0" value={foam.materialMarkupPercent ?? foam.materialMarkup ?? ''} onChange={(e) => update('materialMarkupPercent', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Default $/Sq Ft</label>
          <input type="number" step="0.01" min="0" value={foam.defaultPricePerSqFt || ''} onChange={(e) => update('defaultPricePerSqFt', e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Notes */}
      <div className="mb-2">
        <label className={labelClass}>Notes</label>
        <textarea rows={2} value={foam.notes || ''} onChange={(e) => update('notes', e.target.value)} className={inputClass} placeholder="Internal notes, supplier info, application tips..." />
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Material Cost/Set: ${materialCostPerSet.toFixed(2)} &nbsp;|&nbsp; Base Cost/Sq Ft: ${baseCostPerSqFt.toFixed(4)}
      </p>
    </div>
  );
}

function CoatingTypeRow({ coating, index, onChange, onRemove }) {
  const [sampleSqFt, setSampleSqFt] = useState(1000);

  const recalcPriceFromMarkup = (c) => {
    const cost = c.cost ?? c.foamCostPerContainer ?? 0;
    const materialCostPerContainer = cost * (1 + (c.materialCostPct || 0) / 100);
    const markup = c.materialMarkupPercent ?? c.materialMarkup ?? 0;
    return Math.round(materialCostPerContainer * (1 + markup / 100) * 100) / 100;
  };
  const recalcMarkupFromPrice = (c) => {
    const cost = c.cost ?? c.foamCostPerContainer ?? 0;
    const materialCostPerContainer = cost * (1 + (c.materialCostPct || 0) / 100);
    return materialCostPerContainer > 0 ? Math.max(0, Math.round(((c.defaultPricePerContainer / materialCostPerContainer) - 1) * 10000) / 100) : 0;
  };

  const update = (key, value) => {
    const isText = ['productName', 'name', 'containerType', 'calculationMethod', 'thicknessType', 'notes'].includes(key);
    const isBool = key === 'active';
    const parsed = isBool ? !!value : (isText ? value : (parseFloat(value) || 0));
    const updated = { ...coating, [key]: parsed };

    // Sync alias fields so legacy estimator code keeps working
    if (key === 'productName') updated.name = parsed;
    if (key === 'name') updated.productName = parsed;
    if (key === 'cost') updated.foamCostPerContainer = parsed;
    if (key === 'foamCostPerContainer') updated.cost = parsed;
    if (key === 'materialMarkupPercent') updated.materialMarkup = parsed;
    if (key === 'materialMarkup') updated.materialMarkupPercent = parsed;

    // Auto-set containerGallons when containerType changes
    if (key === 'containerType' && CONTAINER_GALLONS_MAP[parsed] !== undefined) {
      updated.containerGallons = CONTAINER_GALLONS_MAP[parsed];
    }

    if (key === 'defaultPricePerContainer') {
      const nm = recalcMarkupFromPrice(updated);
      updated.materialMarkup = nm;
      updated.materialMarkupPercent = nm;
    } else if (['materialMarkupPercent', 'materialMarkup', 'cost', 'foamCostPerContainer', 'materialCostPct'].includes(key)) {
      updated.defaultPricePerContainer = recalcPriceFromMarkup(updated);
    }
    onChange(index, updated);
  };

  // Derived values
  const cost = parseFloat(coating.cost ?? coating.foamCostPerContainer ?? 0) || 0;
  const containerGallons = parseFloat(coating.containerGallons) || 0;
  const usableGals = parseFloat(coating.usableGallonsPerSet) || 0;
  const coatingImpliedWastePercent = containerGallons > 0 ? ((containerGallons - usableGals) / containerGallons) * 100 : 0;
  const markupPct = parseFloat(coating.materialMarkupPercent ?? coating.materialMarkup ?? 0) || 0;
  const calcMethod = coating.calculationMethod || 'manualOverride';
  const sqFt = parseFloat(sampleSqFt) || 0;

  // Live calculations based on calculationMethod
  let gallonsNeeded = 0;
  let sqFtPerGallon = parseFloat(coating.sqFtPerGallon) || 0;
  let wetMilWarning = '';

  if (calcMethod === 'wetFilmThickness') {
    const wetMils = parseFloat(coating.defaultThickness) || 0;
    const maxWet = parseFloat(coating.maxSinglePassWetMils) || 0;
    const TAR = wetMils > 0 ? wetMils / 16 : 0;
    gallonsNeeded = TAR > 0 ? (sqFt / 100) * TAR : 0;
    sqFtPerGallon = TAR > 0 ? 100 / TAR : 0;
    if (maxWet > 0 && wetMils > maxWet) {
      wetMilWarning = `Wet mil thickness (${wetMils.toFixed(2)}) exceeds max single-pass (${maxWet.toFixed(2)}). Multiple passes will be required.`;
    }
  } else if (calcMethod === 'coveragePerGallon') {
    gallonsNeeded = sqFtPerGallon > 0 ? sqFt / sqFtPerGallon : 0;
  } else {
    // manualOverride — coverage not auto-computed
    gallonsNeeded = 0;
  }

  // Use usable gallons (already accounts for waste) for container counts
  const effectivePerContainer = usableGals > 0 ? usableGals : containerGallons;
  const containersNeeded = (effectivePerContainer > 0 && gallonsNeeded > 0) ? Math.ceil(gallonsNeeded / effectivePerContainer) : 0;
  const sqFtPerContainer = sqFtPerGallon * effectivePerContainer;
  const materialCost = containersNeeded * cost;
  const materialPriceWithMarkup = materialCost * (1 + markupPct / 100);

  const showThickness = (coating.thicknessType || 'none') !== 'none';
  const showSqFtPerGallon = calcMethod === 'coveragePerGallon';
  const showWetFilmFields = calcMethod === 'wetFilmThickness';

  return (
    <div className={`border rounded-lg p-4 mb-3 ${coating.active === false ? 'bg-gray-100 border-gray-300 opacity-70' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{coating.productName || coating.name || `Coating Type ${index + 1}`}</span>
          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={coating.active !== false} onChange={(e) => update('active', e.target.checked)} className="h-3.5 w-3.5" />
            <span>{coating.active !== false ? 'Active' : 'Inactive'}</span>
          </label>
        </div>
        <button onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50">Remove</button>
      </div>

      {/* Identity */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        <div className="col-span-2">
          <label className={labelClass}>Product Name</label>
          <input type="text" value={coating.productName || coating.name || ''} onChange={(e) => update('productName', e.target.value)} className={inputClass} placeholder="e.g. Elastomeric Coating" />
        </div>
        <div>
          <label className={labelClass}>Product Category</label>
          <input type="text" value="coating" readOnly className={disabledInputClass} />
        </div>
      </div>

      {/* Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className={labelClass}>Container Type</label>
          <select value={coating.containerType || '5 gallon bucket'} onChange={(e) => update('containerType', e.target.value)} className={inputClass}>
            <option value="55 gallon drum">55 gallon drum</option>
            <option value="5 gallon bucket">5 gallon bucket</option>
            <option value="1 gallon bucket">1 gallon bucket</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Container Gallons (override)</label>
          <input type="number" step="0.1" min="0" value={coating.containerGallons ?? ''} onChange={(e) => update('containerGallons', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Usable Gallons / Set</label>
          <input type="number" step="0.1" min="0" value={coating.usableGallonsPerSet ?? ''} onChange={(e) => update('usableGallonsPerSet', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Implied Waste (%)</label>
          <input type="text" value={`${coatingImpliedWastePercent.toFixed(2)}%`} readOnly className={disabledInputClass} />
        </div>
      </div>

      {/* Calculation method & thickness */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className={labelClass}>Calculation Method</label>
          <select value={calcMethod} onChange={(e) => update('calculationMethod', e.target.value)} className={inputClass}>
            <option value="coveragePerGallon">Coverage per Gallon</option>
            <option value="wetFilmThickness">Wet Film Thickness</option>
            <option value="manualOverride">Manual Override</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Thickness Type</label>
          <select value={coating.thicknessType || 'none'} onChange={(e) => update('thicknessType', e.target.value)} className={inputClass}>
            <option value="none">None</option>
            <option value="inch">Inch</option>
            <option value="wetMil">Wet Mil</option>
            <option value="dryMil">Dry Mil</option>
          </select>
        </div>
        {showThickness && (
          <div>
            <label className={labelClass}>Default Thickness ({coating.thicknessType})</label>
            <input type="number" step="0.01" min="0" value={coating.defaultThickness ?? ''} onChange={(e) => update('defaultThickness', e.target.value)} className={inputClass} />
          </div>
        )}
        {showSqFtPerGallon && (
          <div>
            <label className={labelClass}>Sq Ft per Gallon</label>
            <input type="number" step="0.1" min="0" value={coating.sqFtPerGallon ?? ''} onChange={(e) => update('sqFtPerGallon', e.target.value)} className={inputClass} />
          </div>
        )}
        {showWetFilmFields && (
          <>
            <div>
              <label className={labelClass}>Solids by Volume (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={coating.solidsByVolumePercent ?? ''} onChange={(e) => update('solidsByVolumePercent', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Max Single-Pass Wet Mils</label>
              <input type="number" step="0.1" min="0" value={coating.maxSinglePassWetMils ?? ''} onChange={(e) => update('maxSinglePassWetMils', e.target.value)} className={inputClass} />
            </div>
          </>
        )}
      </div>

      {/* Cost & pricing */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
        <div>
          <label className={labelClass}>Cost per Container ($)</label>
          <input type="number" step="0.01" min="0" value={coating.cost ?? coating.foamCostPerContainer ?? ''} onChange={(e) => update('cost', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Overhead % (Material Cost)</label>
          <input type="number" step="0.1" min="0" value={coating.materialCostPct || ''} onChange={(e) => update('materialCostPct', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Material Markup (%)</label>
          <input type="number" step="0.01" min="0" value={coating.materialMarkupPercent ?? coating.materialMarkup ?? ''} onChange={(e) => update('materialMarkupPercent', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Default $/Container</label>
          <input type="number" step="0.01" min="0" value={coating.defaultPricePerContainer || ''} onChange={(e) => update('defaultPricePerContainer', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Default $/Sq Ft</label>
          <input type="number" step="0.01" min="0" value={coating.defaultPricePerSqFt ?? ''} onChange={(e) => update('defaultPricePerSqFt', e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Notes */}
      <div className="mb-3">
        <label className={labelClass}>Notes</label>
        <textarea rows={2} value={coating.notes || ''} onChange={(e) => update('notes', e.target.value)} className={inputClass} placeholder="Internal notes, supplier info, application tips..." />
      </div>

      {/* Live outputs preview */}
      {calcMethod !== 'manualOverride' && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-blue-800">Live Calculation Preview</h5>
            <div className="flex items-center gap-2">
              <label className="text-xs text-blue-800">Sample Sq Ft:</label>
              <input type="number" step="100" min="0" value={sampleSqFt} onChange={(e) => setSampleSqFt(e.target.value)} className="border border-blue-300 px-2 py-1 rounded text-xs w-24" />
            </div>
          </div>
          {wetMilWarning && (
            <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 mb-2">⚠ {wetMilWarning}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-blue-900">
            <div><span className="text-blue-700">Gallons Needed:</span> <strong>{gallonsNeeded.toFixed(2)}</strong></div>
            <div><span className="text-blue-700">Containers Needed:</span> <strong>{containersNeeded}</strong></div>
            <div><span className="text-blue-700">Sq Ft / Gallon:</span> <strong>{sqFtPerGallon.toFixed(1)}</strong></div>
            <div><span className="text-blue-700">Sq Ft / Container:</span> <strong>{sqFtPerContainer.toFixed(1)}</strong></div>
            <div><span className="text-blue-700">Material Cost:</span> <strong>${materialCost.toFixed(2)}</strong></div>
            <div><span className="text-blue-700">Material Price w/ Markup:</span> <strong>${materialPriceWithMarkup.toFixed(2)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

const AREA_TYPES = ['General Area', 'Exterior Walls', 'Roof Deck', 'Gable'];
const FOAM_CATEGORIES = ['Open', 'Closed'];

export default function AdminConsole({ onBack }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sessionPassword, setSessionPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [activeSection, setActiveSection] = useState('company');

  const [settings, setSettings] = useState({
    companyName: '',
    foamTypes: [],
    coatingTypes: [],
    generator: { burnRate: 0.86, warmupHours: 1.0, cleanupHours: 0.5, truckMpg: 12, runtimeMultiplierDefault: 1.15 },
    fuelMarkupPercent: 30,
    wasteDisposalMarkupPercent: 30,
    equipmentRentalMarkupPercent: 30,
    jobberDescriptions: {},
    labor: { laborRate: 65, laborMarkup: 40 },
    project: { travelDistance: 50, travelRate: 0.70, wasteDisposal: 50, equipmentRental: 0 },
    commission: { tier1Threshold: 30, tier1Rate: 10, tier2Threshold: 35, tier2Rate: 12 },
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setSessionPassword(password);
        setAuthenticated(true);
        loadSettings();
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Connection error');
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        const s = data.settings;
        const legacyMarkup = s.additionalJobCostMarkupPct ?? 30;
        setSettings({
          companyName: s.companyName || '',
          foamTypes: s.foamTypes || [],
          coatingTypes: s.coatingTypes || [],
          generator: s.generator || { burnRate: 0.86, warmupHours: 1.0, cleanupHours: 0.5, truckMpg: 12, runtimeMultiplierDefault: 1.15 },
          fuelMarkupPercent: s.fuelMarkupPercent ?? legacyMarkup,
          wasteDisposalMarkupPercent: s.wasteDisposalMarkupPercent ?? legacyMarkup,
          equipmentRentalMarkupPercent: s.equipmentRentalMarkupPercent ?? legacyMarkup,
          jobberDescriptions: s.jobberDescriptions || {},
          labor: s.labor || { laborRate: 65, laborMarkup: 40 },
          project: s.project || { travelDistance: 50, travelRate: 0.70, wasteDisposal: 50, equipmentRental: 0 },
          commission: s.commission || { tier1Threshold: 30, tier1Rate: 10, tier2Threshold: 35, tier2Rate: 12 },
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmNewPassword) {
      setSaveError('New passwords do not match');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const payload = { ...settings };
      if (newPassword) payload.newPassword = newPassword;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: sessionPassword, settings: payload }),
      });
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        setSettings(prev => ({
          ...prev,
          foamTypes: s.foamTypes || prev.foamTypes,
          coatingTypes: s.coatingTypes || prev.coatingTypes,
          generator: s.generator || prev.generator,
          fuelMarkupPercent: s.fuelMarkupPercent ?? prev.fuelMarkupPercent,
          wasteDisposalMarkupPercent: s.wasteDisposalMarkupPercent ?? prev.wasteDisposalMarkupPercent,
          equipmentRentalMarkupPercent: s.equipmentRentalMarkupPercent ?? prev.equipmentRentalMarkupPercent,
          jobberDescriptions: s.jobberDescriptions || prev.jobberDescriptions,
        }));
        setSaveSuccess('Settings saved successfully');
        setNewPassword('');
        setConfirmNewPassword('');
        if (newPassword) setSessionPassword(newPassword);
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        const err = await res.json();
        setSaveError(err.error || 'Failed to save settings');
      }
    } catch {
      setSaveError('Connection error');
    }
    setSaving(false);
  };

  const updateFoamType = (index, updated) => {
    setSettings(prev => {
      const foamTypes = [...prev.foamTypes];
      foamTypes[index] = updated;
      return { ...prev, foamTypes };
    });
  };

  const addFoamType = () => {
    setSettings(prev => ({
      ...prev,
      foamTypes: [...prev.foamTypes, { ...DEFAULT_FOAM_TYPE, id: `foam-${Date.now()}` }]
    }));
  };

  const removeFoamType = (index) => {
    setSettings(prev => ({ ...prev, foamTypes: prev.foamTypes.filter((_, i) => i !== index) }));
  };

  const updateCoatingType = (index, updated) => {
    setSettings(prev => {
      const coatingTypes = [...prev.coatingTypes];
      coatingTypes[index] = updated;
      return { ...prev, coatingTypes };
    });
  };

  const addCoatingType = () => {
    setSettings(prev => ({
      ...prev,
      coatingTypes: [...prev.coatingTypes, { ...DEFAULT_COATING_TYPE, id: `coating-${Date.now()}` }]
    }));
  };

  const removeCoatingType = (index) => {
    setSettings(prev => ({ ...prev, coatingTypes: prev.coatingTypes.filter((_, i) => i !== index) }));
  };

  const updateGenerator = (key, value) => {
    const parsed = parseFloat(value);
    setSettings(prev => ({ ...prev, generator: { ...prev.generator, [key]: isNaN(parsed) ? 0 : parsed } }));
  };

  const updateLabor = (key, value) => {
    const parsed = parseFloat(value);
    setSettings(prev => ({ ...prev, labor: { ...prev.labor, [key]: isNaN(parsed) ? 0 : parsed } }));
  };

  const updateProject = (key, value) => {
    const parsed = parseFloat(value);
    setSettings(prev => ({ ...prev, project: { ...prev.project, [key]: isNaN(parsed) ? 0 : parsed } }));
  };

  const updateCommission = (key, value) => {
    const parsed = parseFloat(value);
    setSettings(prev => ({ ...prev, commission: { ...prev.commission, [key]: isNaN(parsed) ? 0 : parsed } }));
  };

  const updateJobberDesc = (key, value) => {
    setSettings(prev => ({ ...prev, jobberDescriptions: { ...prev.jobberDescriptions, [key]: value } }));
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Console</h1>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter admin password"
            />
          </div>
          {loginError && <p className="text-red-600 text-sm mb-4">{loginError}</p>}
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">Login</button>
          <button onClick={onBack} className="w-full mt-3 text-gray-600 hover:text-gray-800 py-2 text-sm">Back to Estimator</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  const navItems = [
    { id: 'company', label: 'Company' },
    { id: 'foamTypes', label: 'Foam Types' },
    { id: 'coatingTypes', label: 'Coating Types' },
    { id: 'generator', label: 'Generator & Fuel' },
    { id: 'labor', label: 'Labor' },
    { id: 'project', label: 'Project' },
    { id: 'commission', label: 'Commission' },
    { id: 'jobberDesc', label: 'Jobber Descriptions' },
    { id: 'password', label: 'Password' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Admin Console</h1>
          <div className="flex gap-3">
            {saveSuccess && <span className="text-green-600 text-sm self-center">{saveSuccess}</span>}
            {saveError && <span className="text-red-600 text-sm self-center">{saveError}</span>}
            <button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button onClick={onBack} className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded-lg font-medium transition-colors text-sm">
              Back to Estimator
            </button>
          </div>
        </div>
        {/* Section nav */}
        <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 pb-0">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${activeSection === item.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">

        {/* Company Information */}
        {activeSection === 'company' && (
          <SectionCard title="Company Information">
            <div className="max-w-sm">
              <label className={labelClass}>Company Name</label>
              <input type="text" value={settings.companyName} onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))} className={inputClass} />
            </div>
          </SectionCard>
        )}

        {/* Foam Types */}
        {activeSection === 'foamTypes' && (
          <SectionCard title="Foam Types">
            <p className="text-sm text-gray-500 mb-4">Configure available foam types. Material Cost/Set = Foam Cost × (1 + Overhead%). Markup and $/Sq Ft are kept in sync.</p>
            {settings.foamTypes.map((foam, index) => (
              <FoamTypeRow key={foam.id || index} foam={foam} index={index} onChange={updateFoamType} onRemove={removeFoamType} />
            ))}
            <button onClick={addFoamType} className="mt-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 font-medium">
              + Add Foam Type
            </button>
          </SectionCard>
        )}

        {/* Coating Types */}
        {activeSection === 'coatingTypes' && (
          <SectionCard title="Coating Types">
            <p className="text-sm text-gray-500 mb-4">Configure available coating types. Material Cost/Container = Cost × (1 + Overhead%). Markup and $/Container are kept in sync.</p>
            {settings.coatingTypes.length === 0 && (
              <p className="text-sm text-gray-400 italic mb-4">No coating types configured yet.</p>
            )}
            {settings.coatingTypes.map((coating, index) => (
              <CoatingTypeRow key={coating.id || index} coating={coating} index={index} onChange={updateCoatingType} onRemove={removeCoatingType} />
            ))}
            <button onClick={addCoatingType} className="mt-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 font-medium">
              + Add Coating Type
            </button>
          </SectionCard>
        )}

        {/* Generator & Fuel */}
        {activeSection === 'generator' && (
          <div className="space-y-4">
            <SectionCard title="Generator Defaults">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Generator Burn Rate (gal/hr) — Admin Only</label>
                  <input type="number" step="0.01" min="0" value={settings.generator.burnRate || ''} onChange={(e) => updateGenerator('burnRate', e.target.value)} className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">Not editable by users on the estimator</p>
                </div>
                <div>
                  <label className={labelClass}>Default Warmup Hours</label>
                  <input type="number" step="0.25" min="0" value={settings.generator.warmupHours || ''} onChange={(e) => updateGenerator('warmupHours', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Default Cleanup Hours</label>
                  <input type="number" step="0.25" min="0" value={settings.generator.cleanupHours || ''} onChange={(e) => updateGenerator('cleanupHours', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Default Runtime Multiplier</label>
                  <input type="number" step="0.01" min="1.0" max="2.0" value={settings.generator.runtimeMultiplierDefault || ''} onChange={(e) => updateGenerator('runtimeMultiplierDefault', e.target.value)} className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">Typical range 1.10–1.25</p>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Travel Fuel Calculation">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Truck MPG (diesel)</label>
                  <input type="number" step="0.1" min="1" value={settings.generator.truckMpg || ''} onChange={(e) => updateGenerator('truckMpg', e.target.value)} className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">Used to calculate Travel Rate from diesel price</p>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Job Cost Markups">
              <p className="text-sm text-gray-500 mb-4">Set separate markup percentages for each additional job cost. These are applied independently — not combined.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Fuel Markup (%)</label>
                  <input type="number" step="0.1" min="0" value={settings.fuelMarkupPercent ?? 30} onChange={(e) => setSettings(prev => ({ ...prev, fuelMarkupPercent: parseFloat(e.target.value) || 0 }))} className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">Applied to travel + generator fuel</p>
                </div>
                <div>
                  <label className={labelClass}>Waste Disposal Markup (%)</label>
                  <input type="number" step="0.1" min="0" value={settings.wasteDisposalMarkupPercent ?? 30} onChange={(e) => setSettings(prev => ({ ...prev, wasteDisposalMarkupPercent: parseFloat(e.target.value) || 0 }))} className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">Applied to waste disposal cost</p>
                </div>
                <div>
                  <label className={labelClass}>Equipment Rental Markup (%)</label>
                  <input type="number" step="0.1" min="0" value={settings.equipmentRentalMarkupPercent ?? 30} onChange={(e) => setSettings(prev => ({ ...prev, equipmentRentalMarkupPercent: parseFloat(e.target.value) || 0 }))} className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">Applied to equipment rental cost</p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Labor */}
        {activeSection === 'labor' && (
          <SectionCard title="Labor Defaults">
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div>
                <label className={labelClass}>Actual Labor Rate ($/hr)</label>
                <input type="number" step="0.01" min="0" value={settings.labor.laborRate || ''} onChange={(e) => updateLabor('laborRate', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Labor Markup (%)</label>
                <input type="number" step="0.01" min="0" value={settings.labor.laborMarkup || ''} onChange={(e) => updateLabor('laborMarkup', e.target.value)} className={inputClass} />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Project */}
        {activeSection === 'project' && (
          <SectionCard title="Project Defaults">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Travel Distance (miles)</label>
                <input type="number" step="1" min="0" value={settings.project.travelDistance || ''} onChange={(e) => updateProject('travelDistance', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Travel Rate ($/mile)</label>
                <input type="number" step="0.01" min="0" value={settings.project.travelRate || ''} onChange={(e) => updateProject('travelRate', e.target.value)} className={inputClass} />
                <p className="text-xs text-gray-400 mt-1">Auto-overridden by diesel price slider</p>
              </div>
              <div>
                <label className={labelClass}>Waste Disposal ($)</label>
                <input type="number" step="0.01" min="0" value={settings.project.wasteDisposal || ''} onChange={(e) => updateProject('wasteDisposal', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Equipment Rental ($)</label>
                <input type="number" step="0.01" min="0" value={settings.project.equipmentRental || ''} onChange={(e) => updateProject('equipmentRental', e.target.value)} className={inputClass} />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Commission */}
        {activeSection === 'commission' && (
          <SectionCard title="Sales Commission Tiers">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className={labelClass}>Tier 1 Margin Threshold (%)</label>
                <input type="number" step="0.1" min="0" max="100" value={settings.commission.tier1Threshold || ''} onChange={(e) => updateCommission('tier1Threshold', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tier 1 Commission Rate (%)</label>
                <input type="number" step="0.1" min="0" max="100" value={settings.commission.tier1Rate || ''} onChange={(e) => updateCommission('tier1Rate', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tier 2 Margin Threshold (%)</label>
                <input type="number" step="0.1" min="0" max="100" value={settings.commission.tier2Threshold || ''} onChange={(e) => updateCommission('tier2Threshold', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tier 2 Commission Rate (%)</label>
                <input type="number" step="0.1" min="0" max="100" value={settings.commission.tier2Rate || ''} onChange={(e) => updateCommission('tier2Rate', e.target.value)} className={inputClass} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {settings.commission.tier1Rate}% of net profit at {settings.commission.tier1Threshold}–{(settings.commission.tier2Threshold - 0.01).toFixed(2)}% margin, &nbsp;
              {settings.commission.tier2Rate}% at ≥{settings.commission.tier2Threshold}%. No commission below {settings.commission.tier1Threshold}%.
            </p>
          </SectionCard>
        )}

        {/* Jobber Descriptions */}
        {activeSection === 'jobberDesc' && (
          <div className="space-y-4">
            <SectionCard title="Jobber Quote — Labor Line Item Description">
              <div>
                <label className={labelClass}>Labor Line Item Description</label>
                <textarea rows={3} value={settings.jobberDescriptions['labor'] || ''} onChange={(e) => updateJobberDesc('labor', e.target.value)} className={inputClass} />
              </div>
            </SectionCard>
            <SectionCard title="Jobber Quote — Material Line Item Descriptions">
              <p className="text-sm text-gray-500 mb-4">Set default descriptions for each area type and foam category combination sent to Jobber.</p>
              {AREA_TYPES.map(areaType => (
                <div key={areaType} className="mb-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{areaType}</h4>
                  <div className="space-y-3">
                    {FOAM_CATEGORIES.map(cat => {
                      const key = `${areaType}-${cat}`;
                      return (
                        <div key={key}>
                          <label className={labelClass}>{cat} Cell</label>
                          <textarea rows={2} value={settings.jobberDescriptions[key] || ''} onChange={(e) => updateJobberDesc(key, e.target.value)} className={inputClass} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </SectionCard>
          </div>
        )}

        {/* Password */}
        {activeSection === 'password' && (
          <SectionCard title="Change Admin Password">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div>
                <label className={labelClass}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Leave blank to keep current" />
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={inputClass} />
              </div>
            </div>
          </SectionCard>
        )}

        <div className="flex justify-end pt-2 pb-6">
          <button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
