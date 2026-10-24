import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import '../styles/AccountBenefits.css';

const FEATURES_COMPARISON = [
  { label: 'Access to all questions',  guest: true,  account: true },
  { label: 'Track your progress',      guest: false, account: true },
  { label: 'Exam sessions',            guest: false, account: true },
  { label: 'Daily challenges',         guest: false, account: true },
  { label: 'Terminal practice',        guest: false, account: true },
  { label: 'Debug Challenges',         guest: false, account: true },
  { label: 'Roadmaps',                 guest: false, account: true },
  { label: 'Scripts Interface',        guest: false, account: true },
  { label: 'Forums',                   guest: false, account: true },
];

export default function AccountBenefits() {
  return <section className="h-section account-benefits" aria-labelledby="account-benefits-title">
    <div className="h-container account-benefits-layout">
      <div className="account-benefits-intro">
        <h2 id="account-benefits-title">Free to start, better with an account</h2>
        <p>You can browse questions without signing up. But you'll want to track where you're going.</p>
        <div className="account-benefits-actions">
          <Link to="/register" className="account-benefits-register">Create free account <ArrowRight size={16} /></Link>
        </div>
      </div>
      <div className="account-benefits-comparison">
        <table aria-label="Features available with and without an account">
          <colgroup><col className="account-benefits-feature-col" /><col /><col /></colgroup>
          <thead><tr><th scope="col">Feature</th><th scope="col">Without account</th><th scope="col" className="account-benefits-account">With account</th></tr></thead>
          <tbody>{FEATURES_COMPARISON.map(feature => <tr key={feature.label}>
            <th scope="row">{feature.label}</th>
            {[feature.guest, feature.account].map((available, index) => <td key={index} className={index === 1 ? 'account-benefits-account' : undefined}>
              <span className={available ? 'account-benefits-yes' : 'account-benefits-no'} aria-hidden="true">{available ? <Check size={15} strokeWidth={1.8} /> : <span>&mdash;</span>}</span>
              <span className="account-benefits-sr-only">{available ? 'Included' : 'Not included'}</span>
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </section>;
}
