export const TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'react',
    kind: 'frontend',
    name: 'React Starter',
    description: 'React 19 + Vite + TypeScript + FSD 기반 일반 프론트엔드 템플릿',
    map: 'none',
    repository: 'hwangilyong/react_init_agent',
    stable: '0.1.0',
    versions: Object.freeze([
      Object.freeze({ version: '0.1.0', ref: 'v0.1.0', channel: 'stable' }),
    ]),
  }),
  Object.freeze({
    id: 'react-ol',
    kind: 'frontend',
    name: 'React + OpenLayers Starter',
    description: 'React + OpenLayers Controller/Event/Layer 아키텍처 템플릿',
    map: 'openlayers',
    repository: 'hwangilyong/react_ol_init',
    stable: '0.2.0',
    versions: Object.freeze([
      Object.freeze({ version: '0.2.0', ref: 'v0.2.0', channel: 'stable' }),
    ]),
  }),
]);

function normalizeVersion(version) {
  return version?.startsWith('v') ? version.slice(1) : version;
}

export function getTemplateById(id) {
  return TEMPLATES.find((template) => template.id === id) ?? null;
}

export function getTemplateByMap(map) {
  return TEMPLATES.find((template) => template.kind === 'frontend' && template.map === map) ?? null;
}

export function resolveTemplateVersion(template, requestedVersion = null) {
  if (!template) return null;

  const version = normalizeVersion(requestedVersion ?? template.stable);
  const release = template.versions.find((item) => item.version === version);
  if (!release) {
    const supported = template.versions.map((item) => item.version).join(', ');
    throw new Error(
      `템플릿 ${template.id}의 버전 ${requestedVersion}을(를) 찾을 수 없습니다. ` +
        `지원 버전: ${supported}`,
    );
  }

  return Object.freeze({
    ...template,
    version: release.version,
    ref: release.ref,
    channel: release.channel,
  });
}

export function listTemplates() {
  return [...TEMPLATES];
}
