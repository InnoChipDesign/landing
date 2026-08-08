import { describe, expect, it } from 'vitest';
import { isActive, routes } from './routes';

describe('routes', () => {
  it('keeps every club URL under the /club prefix and the portal at the root', () => {
    expect(routes.portal()).toBe('/');
    for (const build of [
      routes.club,
      routes.projects,
      routes.about,
      routes.events,
      routes.equipment,
      routes.resources,
      routes.join,
      routes.contact,
    ]) {
      expect(build()).toMatch(/^\/club(\/|$)/);
    }
  });

  it('builds project and asset URLs', () => {
    expect(routes.project('school-riscv')).toBe('/club/projects/school-riscv');
    expect(routes.og('school-riscv')).toBe('/og/school-riscv.png');
    expect(routes.original('school-riscv', 'board.jpg')).toBe('/originals/school-riscv/board.jpg');
  });
});

describe('isActive', () => {
  it('marks a section active from any page beneath it', () => {
    expect(isActive(routes.projects(), '/club/projects')).toBe(true);
    expect(isActive(routes.projects(), '/club/projects/school-riscv')).toBe(true);
    expect(isActive(routes.about(), '/club/projects')).toBe(false);
  });

  it('does not let /club or / swallow every page below them', () => {
    expect(isActive(routes.club(), '/club/projects')).toBe(false);
    expect(isActive(routes.portal(), '/club')).toBe(false);
    expect(isActive(routes.portal(), '/')).toBe(true);
  });

  it('ignores a trailing slash', () => {
    expect(isActive(routes.projects(), '/club/projects/')).toBe(true);
  });
});
