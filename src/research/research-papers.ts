import { msg } from '@lingui/core/macro';

export const RESEARCH_PAPERS = [
  {
    title: msg`Visual recognition`,
    body: msg`Fluent note reading is a visual-perceptual skill. Targeted practice can focus on recognizing a note’s whole pattern instead of consciously calculating its position.`,
    doi: '10.3389/fcogn.2025.1439439',
    authors: 'Yetta Kwailing Wong & Joy Fong Fang · 2025',
    url: 'https://doi.org/10.3389/fcogn.2025.1439439',
  },
  {
    title: msg`Speed`,
    body: msg`In perceptual-training studies, presentation became progressively more demanding as performance improved. Nota uses a gentle Practice mode and a separate two-second Speed mode inspired by that idea — not as a proven threshold.`,
    doi: '10.1167/16.8.15',
    authors: 'Yetta Kwailing Wong & Alan C.-N. Wong · 2016',
    url: 'https://doi.org/10.1167/16.8.15',
  },
  {
    title: msg`Practice changes perception`,
    body: msg`Experimental work with musical notation has found measurable changes in visual processing after targeted training. That is evidence about trained visual tasks, not a claim to make an expert pianist or sight-reader.`,
    doi: '10.1167/19.7.8',
    authors: 'Alan C.-N. Wong et al. · 2019',
    url: 'https://doi.org/10.1167/19.7.8',
  },
  {
    title: msg`Retrieval and spacing`,
    body: msg`Notes return after a pause because retrieving an answer and spacing practice can support retention better than simply looking at the answer again.`,
    doi: '10.1038/s44159-022-00089-1',
    authors: 'Shana K. Carpenter, Steven C. Pan & Andrew C. Butler · 2022',
    url: 'https://doi.org/10.1038/s44159-022-00089-1',
  },
] as const;
