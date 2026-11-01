import { useSeasonPass } from '../context/SeasonPassContext';
import '../styles/SeasonRewardBadge.css';

export default function SeasonRewardBadge() {
  const { unclaimedCount } = useSeasonPass();
  if (!unclaimedCount) return null;
  return (
    <span className="season-reward-badge" aria-label={`${unclaimedCount} unclaimed Season Pass rewards`}>
      {unclaimedCount > 99 ? '99+' : unclaimedCount}
    </span>
  );
}
