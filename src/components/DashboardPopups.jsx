import NumpadPopup from './popups/NumpadPopup.jsx';
import PricePickerPopup from './popups/PricePickerPopup.jsx';
import ShareCountPopup from './popups/ShareCountPopup.jsx';
import { getShareValue, getCalculatorGrandTotal, getBankShares } from '../utils/dashboardMath.js';

export default function DashboardPopups({
  activePopup,
  setActivePopup,
  dashboardState,
  activeCompanies,
  maxPlayerHolding,
  players,
  gameInstance,
  updateDashboardField,
  sharePriceOptions
}) {
  if (!activePopup) return null;

  return (
    <>
      {activePopup.type === 'shareValue' && (
        <PricePickerPopup
          company={activeCompanies.find(c => c.shortName === activePopup.companyId)}
          value={getShareValue(dashboardState, activeCompanies, activePopup.companyId)}
          options={sharePriceOptions}
          onChange={(val) => {
            updateDashboardField('shareValues', prev => ({ ...prev, [activePopup.companyId]: val }));
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
          maxAvailable={Math.min(maxPlayerHolding, getBankShares(dashboardState, players, activePopup.companyId) + Number(dashboardState.playerAssets[activePopup.player]?.shares?.[activePopup.companyId] || 0))}
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
