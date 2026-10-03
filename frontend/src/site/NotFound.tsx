import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHead } from './SiteLayout';

export default function NotFound() {
  return (
    <>
      <PageHead title="Page not found" img="/assets/img/stock/samburu-arid.jpg" crumb="404" />
      <section className="section"><div className="wrap" style={{ textAlign: 'center' }}>
        <p>The page you are looking for has moved or does not exist.</p>
        <Link className="btn" to="/">Back to home <Icon name="arrowR" /></Link>
      </div></section>
    </>
  );
}
