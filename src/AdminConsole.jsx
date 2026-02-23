import React, { useState, useEffect } from 'react';

export default function AdminConsole({ onBack }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sessionPassword, setSessionPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const [settings, setSettings] = useState({
    companyName: '',
    openCell: { foamThickness: 6, materialPrice: 1870, materialMarkup: 76.77, boardFeetPerSet: 14000, defaultPricePerSqFt: 1.70 },
    closedCell: { foamThickness: 2, materialPrice: 2300, materialMarkup: 66.67, boardFeetPerSet: 4000, defaultPricePerSqFt: 2.30 },
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
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setLoading(false);
  };

  const recalcMarkupFromPrice = (foamType) => {
    const foam = settings[foamType];
    const materialCostPerSet = foam.materialPrice * 1.20;
    const baseCostPerSqFt = (foam.foamThickness / foam.boardFeetPerSet) * materialCostPerSet;
    if (baseCostPerSqFt > 0) {
      const newMarkup = Math.round(((foam.defaultPricePerSqFt / baseCostPerSqFt) - 1) * 10000) / 100;
      return Math.max(0, newMarkup);
    }
    return foam.materialMarkup;
  };

  const recalcPriceFromMarkup = (foamType) => {
    const foam = settings[foamType];
    const materialCostPerSet = foam.materialPrice * 1.20;
    const baseCostPerSqFt = (foam.foamThickness / foam.boardFeetPerSet) * materialCostPerSet;
    const totalPerSqFt = baseCostPerSqFt * (1 + foam.materialMarkup / 100);
    return Math.round(totalPerSqFt * 100) / 100;
  };

  const updateFoam = (foamType, key, value) => {
    const parsed = parseFloat(value);
    const numVal = isNaN(parsed) ? 0 : parsed;

    setSettings(prev => {
      const updated = { ...prev, [foamType]: { ...prev[foamType], [key]: numVal } };

      if (key === 'defaultPricePerSqFt') {
        const foam = updated[foamType];
        const materialCostPerSet = foam.materialPrice * 1.20;
        const baseCostPerSqFt = (foam.foamThickness / foam.boardFeetPerSet) * materialCostPerSet;
        if (baseCostPerSqFt > 0) {
          updated[foamType].materialMarkup = Math.max(0, Math.round(((numVal / baseCostPerSqFt) - 1) * 10000) / 100);
        }
      } else if (['materialMarkup', 'materialPrice', 'foamThickness', 'boardFeetPerSet'].includes(key)) {
        const foam = updated[foamType];
        const materialCostPerSet = foam.materialPrice * 1.20;
        const baseCostPerSqFt = (foam.foamThickness / foam.boardFeetPerSet) * materialCostPerSet;
        updated[foamType].defaultPricePerSqFt = Math.round(baseCostPerSqFt * (1 + foam.materialMarkup / 100) * 100) / 100;
      }

      return updated;
    });
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
      if (newPassword) {
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: sessionPassword, settings: payload }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setSaveSuccess('Settings saved successfully');
        setNewPassword('');
        setConfirmNewPassword('');
        if (newPassword) {
          setSessionPassword(newPassword);
        }
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
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Login
          </button>
          <button
            onClick={onBack}
            className="w-full mt-3 text-gray-600 hover:text-gray-800 py-2 text-sm"
          >
            Back to Estimator
          </button>
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

  const inputClass = "w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const FoamSection = ({ title, foamType }) => {
    const foam = settings[foamType];
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Default Thickness (inches)</label>
            <input type="number" step="0.5" min="0" value={foam.foamThickness || ''} onChange={(e) => updateFoam(foamType, 'foamThickness', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Foam Cost per Set ($)</label>
            <input type="number" step="0.01" min="0" value={foam.materialPrice || ''} onChange={(e) => updateFoam(foamType, 'materialPrice', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Board Feet per Set</label>
            <input type="number" step="100" min="0" value={foam.boardFeetPerSet || ''} onChange={(e) => updateFoam(foamType, 'boardFeetPerSet', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Default $/Sq Ft</label>
            <input type="number" step="0.01" min="0" value={foam.defaultPricePerSqFt || ''} onChange={(e) => updateFoam(foamType, 'defaultPricePerSqFt', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Material Markup (%)</label>
            <input type="number" step="0.01" min="0" value={foam.materialMarkup || ''} onChange={(e) => updateFoam(foamType, 'materialMarkup', e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={onBack}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Back to Estimator
            </button>
          </div>
        </div>

        {saveSuccess && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">{saveSuccess}</div>}
        {saveError && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">{saveError}</div>}

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
            <div className="max-w-md">
              <label className={labelClass}>Company Name</label>
              <input
                type="text"
                value={settings.companyName || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <FoamSection title="Closed Cell Defaults" foamType="closedCell" />
          <FoamSection title="Open Cell Defaults" foamType="openCell" />

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Labor Defaults</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Actual Labor Rate ($/hr)</label>
                <input type="number" step="0.01" min="0" value={settings.labor.laborRate || ''} onChange={(e) => updateLabor('laborRate', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Labor Markup (%)</label>
                <input type="number" step="0.01" min="0" value={settings.labor.laborMarkup || ''} onChange={(e) => updateLabor('laborMarkup', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Defaults</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Travel Distance (miles)</label>
                <input type="number" step="1" min="0" value={settings.project.travelDistance || ''} onChange={(e) => updateProject('travelDistance', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Travel Rate ($/mile)</label>
                <input type="number" step="0.01" min="0" value={settings.project.travelRate || ''} onChange={(e) => updateProject('travelRate', e.target.value)} className={inputClass} />
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
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Commission Tiers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <p className="text-sm text-gray-500 mt-3">
              Commission is calculated as: {settings.commission.tier1Rate}% of net profit at {settings.commission.tier1Threshold}–{settings.commission.tier2Threshold - 0.01}% margin, {settings.commission.tier2Rate}% at ≥{settings.commission.tier2Threshold}% margin. No commission below {settings.commission.tier1Threshold}%.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Admin Password</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div>
                <label className={labelClass}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Leave blank to keep current" />
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
