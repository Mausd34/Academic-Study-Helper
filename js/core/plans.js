/**
 * Structured learning roadmaps: the 4-month career plan and the
 * AI/ML study track. Both are plain data so the user can edit them in-app.
 */
import { uid } from './utils.js';

const item = (title, hours = 2, resources = '') => ({ id: uid('itm'), title, hours, resources, done: false, notes: '' });

/** Four-month career roadmap (Month 1–4 as specified). */
export function defaultRoadmap() {
  return [
    {
      id: uid('rmp'),
      month: 1,
      title: 'Foundations',
      focus: 'Python · Git/GitHub · SQL · DSA basics',
      items: [
        item('Python: functions, files, OOP refresher', 6, 'python.org tutorial'),
        item('Set up virtual environments and pip', 2, 'docs.python.org'),
        item('Git: init, commit, branch, merge, push', 4, 'git-scm.com/book'),
        item('GitHub: repos, issues, README, profile', 3, 'docs.github.com'),
        item('SQL: SELECT, JOIN, GROUP BY, subqueries', 6, 'sqlbolt.com'),
        item('DSA: arrays, strings, two pointers', 6, 'leetcode explore'),
      ],
    },
    {
      id: uid('rmp'),
      month: 2,
      title: 'Data analysis',
      focus: 'NumPy · Pandas · Matplotlib · Statistics',
      items: [
        item('NumPy: arrays, broadcasting, indexing', 4, 'numpy.org/doc'),
        item('Pandas: DataFrame, groupby, merge', 8, 'pandas.pydata.org/docs'),
        item('Matplotlib and Seaborn charts', 4, 'matplotlib.org/cheatsheets'),
        item('Descriptive statistics: mean, median, SD, correlation', 4, 'Khan Academy statistics'),
        item('Project: analyse a public dataset and write findings', 8, 'Kaggle datasets'),
      ],
    },
    {
      id: uid('rmp'),
      month: 3,
      title: 'Machine learning',
      focus: 'ML · Scikit-learn · model evaluation · projects',
      items: [
        item('Supervised learning: regression and classification', 6, 'scikit-learn.org/user_guide'),
        item('Machine learning fundamentals: supervised vs unsupervised', 4, 'scikit-learn.org/user_guide'),
        item('Unsupervised: clustering and dimensionality reduction', 4, 'scikit-learn.org/user_guide'),
        item('Model evaluation: cross-validation, precision/recall/F1', 5, 'scikit-learn.org/model_selection'),
        item('Feature engineering and handling imbalance', 4, ''),
        item('Project: end-to-end ML notebook with README', 10, ''),
      ],
    },
    {
      id: uid('rmp'),
      month: 4,
      title: 'Ship it',
      focus: 'FastAPI · AI project · portfolio · CV · interviews',
      items: [
        item('FastAPI: routes, Pydantic models, docs', 6, 'fastapi.tiangolo.com'),
        item('Deploy a model/API (Docker basics)', 6, 'docs.docker.com/get-started'),
        item('AI project: build, document, publish', 14, ''),
        item('Portfolio site + 3 project READMEs', 6, ''),
        item('CV and LinkedIn rewrite', 3, ''),
        item('Interview prep: DSA + ML viva + HR', 8, ''),
      ],
    },
  ];
}

/** AI/ML learning plan tracks. */
export function defaultLearningPlan() {
  return [
    {
      id: uid('trk'),
      key: 'python',
      title: 'Python',
      summary: 'Language foundations for everything else.',
      items: [
        item('Variables, types, operators', 2, 'python.org tutorial'),
        item('Control flow and loops', 3, ''),
        item('Functions, scope, arguments', 4, ''),
        item('OOP: classes, inheritance, dunder methods', 5, ''),
        item('File handling and JSON', 3, ''),
        item('Working with APIs (requests)', 3, 'requests.readthedocs.io'),
        item('Virtual environments and dependency management', 2, 'venv docs'),
        item('Git workflow for Python projects', 2, 'git-scm.com/book'),
      ],
    },
    {
      id: uid('trk'),
      key: 'data',
      title: 'Data',
      summary: 'From raw tables to defensible conclusions.',
      items: [
        item('NumPy fundamentals', 4, 'numpy.org/doc'),
        item('Pandas DataFrames and indexing', 8, 'pandas.pydata.org/docs'),
        item('Data cleaning and missing values', 4, ''),
        item('Visualisation: Matplotlib, Seaborn, Plotly', 5, ''),
        item('Descriptive and inferential statistics', 6, ''),
        item('SQL for data analysis', 6, 'sqlbolt.com'),
      ],
    },
    {
      id: uid('trk'),
      key: 'ml',
      title: 'Machine learning',
      summary: 'Train, evaluate and improve models honestly.',
      items: [
        item('Linear and logistic regression', 5, ''),
        item('Decision trees and random forests', 4, ''),
        item('Classification: SVM, k-NN, Naive Bayes', 4, ''),
        item('Clustering: k-means, DBSCAN', 3, ''),
        item('Feature engineering and encoding', 4, ''),
        item('Train/test split and leakage', 2, ''),
        item('Cross-validation', 2, ''),
        item('Metrics: precision, recall, F1, ROC-AUC', 3, ''),
        item('Hyperparameter tuning (GridSearchCV)', 3, ''),
      ],
    },
    {
      id: uid('trk'),
      key: 'advanced',
      title: 'Advanced & deployment',
      summary: 'Ship the model and build AI applications.',
      items: [
        item('FastAPI service design', 6, 'fastapi.tiangolo.com'),
        item('Docker fundamentals', 5, 'docs.docker.com'),
        item('Model deployment patterns', 5, ''),
        item('LLM APIs and prompt design', 4, ''),
        item('RAG: embeddings, retrieval, grounding', 6, ''),
        item('AI agents and tool use', 6, ''),
      ],
    },
  ];
}
