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
