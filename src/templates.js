export const TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'react',
    kind: 'frontend',
    name: 'React Starter',
    description: 'React 19 + Vite + TypeScript + FSD 기반 일반 프론트엔드 템플릿',
    map: 'none',
    repository: 'hwangilyong/react_init_agent',
    ref: 'main',
  }),
  Object.freeze({
    id: 'react-ol',
    kind: 'frontend',
    name: 'React + OpenLayers Starter',
    description: 'React + OpenLayers Controller/Event/Layer 아키텍처 템플릿',
    map: 'openlayers',
    repository: 'hwangilyong/react_ol_init',
    ref: 'main',
  }),
]);

export function getTemplateById(id) {
  return TEMPLATES.find((template) => template.id === id) ?? null;
}

export function getTemplateByMap(map) {
  return TEMPLATES.find((template) => template.kind === 'frontend' && template.map === map) ?? null;
}

export function listTemplates() {
  return [...TEMPLATES];
}
