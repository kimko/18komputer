import NumpadPopup from './popups/NumpadPopup.jsx';
import PricePickerPopup from './popups/PricePickerPopup.jsx';
import ShareCountPopup from './popups/ShareCountPopup.jsx';
import { getShareValue, getCalculatorGrandTotal, getBankShares } from '../utils/dashboardMath.js';
import { getStructure, getHoldingOptions } from '../utils/corporateStructures.js';

export default function DashboardPopups({
  activePopup,
  setActivePopup,
  dashboardState,
  activeCompanies,
  players,
  gameInstance,
  updateDashboardField,
  updateDashboardFields,
  sharePriceOptions,
  stockMarket
}) {
  if (!activePopup) return null;

  return (
    <>
      {activePopup.type === 'shareValue' && (
        <PricePickerPopup
          company={activeCompanies.find(c => c.shortName === activePopup.companyId)}
          value={getShareValue(dashboardState, activeCompanies, activePopup.companyId)}
          position={dashboardState.sharePositions?.[activePopup.companyId] || null}
          parValue={activeCompanies.find(c => c.shortName === activePopup.companyId)?.parValue}
          options={sharePriceOptions}
          market={stockMarket}
          onChange={(val, position) => {
            updateDashboardFields({
              shareValues: prev => ({ ...prev, [activePopup.companyId]: val }),
              sharePositions: prev => ({ ...prev, [activePopup.companyId]: position })
            });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}

      {activePopup.type === 'or' && (
        <NumpadPopup
          title={`Set OR ${activePopup.orIndex} revenue for`}
          subtitle={activePopup.companyId}
          badgeColor={activeCompanies.find(c => c.shortName === activePopup.companyId)?.color}
          value={dashboardState.ors[activePopup.companyId]?.[`or${activePopup.orIndex}`]}
          onSubtitleClick={() => {
            const val = getCalculatorGrandTotal(gameInstance, activePopup.companyId);
            if (val > 0) {
              updateDashboardField('ors', prev => ({
                ...prev,
                [activePopup.companyId]: { ...(prev[activePopup.companyId] || {}), [`or${activePopup.orIndex}`]: val }
              }));
            }
          }}
          onCopyLast={activePopup.orIndex > 1 ? () => {
            const val = dashboardState.ors[activePopup.companyId]?.[`or${activePopup.orIndex - 1}`] || '';
            updateDashboardField('ors', prev => ({
              ...prev,
              [activePopup.companyId]: { ...(prev[activePopup.companyId] || {}), [`or${activePopup.orIndex}`]: val }
            }));
          } : undefined}
          onChange={(val) => {
            updateDashboardField('ors', prev => ({
              ...prev,
              [activePopup.companyId]: { ...(prev[activePopup.companyId] || {}), [`or${activePopup.orIndex}`]: val }
            }));
          }}
          onClose={() => setActivePopup(null)}
        />
      )}

      {activePopup.type === 'cash' && (
        <NumpadPopup
          title="Set cash for"
          subtitle={activePopup.player}
          value={dashboardState.playerAssets[activePopup.player]?.cash}
          onChange={(val) => {
            updateDashboardField('playerAssets', prev => ({
              ...prev,
              [activePopup.player]: { ...(prev[activePopup.player] || { shares: {} }), cash: val }
            }));
          }}
          onClose={() => setActivePopup(null)}
        />
      )}

      {activePopup.type === 'shares' && (
        <ShareCountPopup
          company={activeCompanies.find(c => c.shortName === activePopup.companyId)}
          player={activePopup.player}
          options={getHoldingOptions(
            getStructure(gameInstance?.staticConfig, activeCompanies.find(c => c.shortName === activePopup.companyId)?.totalShares),
            getBankShares(dashboardState, players, activePopup.companyId) + Number(dashboardState.playerAssets[activePopup.player]?.shares?.[activePopup.companyId] || 0)
          )}
          value={dashboardState.playerAssets[activePopup.player]?.shares?.[activePopup.companyId]}
          onChange={(val) => {
            updateDashboardField('playerAssets', prev => {
              const pAssets = prev[activePopup.player] || { shares: {} };
              return {
                ...prev,
                [activePopup.player]: { ...pAssets, shares: { ...pAssets.shares, [activePopup.companyId]: val } }
              };
            });
          }}
          onClose={() => setActivePopup(null)}
        />
      )}
    </>
  );
}
