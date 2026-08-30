import { useLingui } from '@lingui/react/macro';
import type { Page } from '../router/pages';
import { Icon } from '../ui/icon';
import { RESEARCH_PAPERS } from './research-papers';

export function ResearchPage({ navigate }: { navigate: (page: Page) => void }) {
  const { t } = useLingui();
  return (
    <div className="page research-page">
      <button type="button" className="back-link" onClick={() => navigate('settings')}>
        <Icon name="arrow" size={16} /> {t`Back to settings`}
      </button>
      <div className="research-header">
        <p className="eyebrow">Nota / 01</p>
        <h1>{t`Research behind Nota`}</h1>
        <p className="lead">
          {t`Nota is inspired by research on visual perceptual learning, musical-note recognition, retrieval practice, and spaced learning. The curriculum and thresholds are product-design hypotheses, not scientifically validated promises.`}
        </p>
      </div>
      <div className="research-list">
        {RESEARCH_PAPERS.map((paper, index) => (
          <article className="surface research-card" key={paper.doi}>
            <div className="research-number">{String(index + 1).padStart(2, '0')}</div>
            <div>
              <h2>{t(paper.title)}</h2>
              <p>{t(paper.body)}</p>
              <p className="paper-meta">
                {paper.authors}
                <br />
                <em>{paper.doi}</em>
              </p>
              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                {t`Read the original paper`} <Icon name="arrow" size={15} />
              </a>
            </div>
          </article>
        ))}
      </div>
      <p className="research-disclaimer">
        {t`Nota does not claim scientific certification or guarantee a result in a particular number of hours.`}
      </p>
    </div>
  );
}
