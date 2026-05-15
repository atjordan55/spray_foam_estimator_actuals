 </tr>
                          <tr className="font-bold bg-yellow-50">
                            <td className="py-2 pr-2">True Net Profit</td>
                            <td className={`py-2 px-2 text-right ${(estimatedProfit - estimatedJobOverhead) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ${(estimatedProfit - estimatedJobOverhead).toFixed(2)}
                            </td>
                            <td className={`py-2 px-2 text-right ${(actualProfit - actualJobOverhead) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ${(actualProfit - actualJobOverhead).toFixed(2)}
                            </td>
                            <td className={`py-2 pl-2 text-right ${(actualProfit - actualJobOverhead) - (estimatedProfit - estimatedJobOverhead) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${((actualProfit - actualJobOverhead) - (estimatedProfit - estimatedJobOverhead)).toFixed(2)}
                            </td>
                          </tr>
                        </>
                      )}
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
                    {totalMonthlyOverhead > 0 && (
                      <>
                        <hr className="my-3 border-gray-400" />
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Job Overhead Allocation ({globalInputs.laborHours}h × ${overheadPerHour.toFixed(2)}):</span>
                          <span>${estimatedJobOverhead.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between py-1 font-bold text-lg ${(estimatedProfit - estimatedJobOverhead) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <span>True Net Profit:</span>
                          <span>${(estimatedProfit - estimatedJobOverhead).toFixed(2)}</span>
                        </div>
                      </>
                    )}
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
                      <span>${actualFees.toFixed(2)}</span>
                    </div>
                    <hr className="my-3" />
                    <div className={`flex justify-between py-1 font-bold text-lg ${actualMarginColor}`}>
                      <span>Final Actual Profit:</span>
                      <span>${actualProfit.toFixed(2)} ({actualMargin.toFixed(1)}%)</span>
                    </div>
                    {totalMonthlyOverhead > 0 && (
                      <>
                        <hr className="my-3 border-gray-400" />
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Job Overhead Allocation ({actualLaborHoursForOverhead}h × ${overheadPerHour.toFixed(2)}):</span>
                          <span>${actualJobOverhead.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between py-1 font-bold text-lg ${(actualProfit - actualJobOverhead) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <span>True Net Profit:</span>
                          <span>${(actualProfit - actualJobOverhead).toFixed(2)}</span>
                        </div>
                      </>
                    )}
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
