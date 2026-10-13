/**
 * Unit tests for scripts/consistency-check.js's check functions.
 *
 * Each check function reads fixed real file paths via fs.readFileSync, so
 * fixtures are supplied by mocking fs.readFileSync to return known-good or
 * known-bad content for those specific paths, rather than writing real
 * files to disk.
 */

const path = require('path');

describe('consistency-check.js', () => {
  let fs;
  let consistencyCheck;

  beforeEach(() => {
    jest.resetModules();
    fs = require('fs');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkSharedDocs', () => {
    const readmePath = path.join(__dirname, '..', 'packages/shared/README.md');
    const indexPath = path.join(__dirname, '..', 'packages/shared/src/index.ts');

    function mockReadFileSync(readmeContent, indexContent) {
      const original = fs.readFileSync.bind(fs);
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, ...rest) => {
        if (filePath === readmePath) return readmeContent;
        if (filePath === indexPath) return indexContent;
        return original(filePath, ...rest);
      });
    }

    it('reports both undocumented exports and stale README entries when they mismatch', () => {
      // index.ts exports 'validation' (undocumented) but not 'legacy' (which the README
      // documents and which does not exist on disk, so it is reported as stale)
      mockReadFileSync(
        "### Types (`src/types/`)\n### Legacy (`src/legacy/`)\n",
        "export * from './types';\nexport * from './validation';\n"
      );
      const originalExists = fs.existsSync.bind(fs);
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        if (p.endsWith(path.join('packages/shared/src', 'legacy'))) return false;
        return originalExists(p);
      });

      consistencyCheck = require('./consistency-check');
      const result = consistencyCheck.checkSharedDocs();

      expect(result).toBe(false);
    });

    it('passes when README-documented directories match index.ts exports exactly', () => {
      mockReadFileSync(
        "### Types (`src/types/`)\n### Utils (`src/utils/`)\n",
        "export * from './types';\nexport * from './utils';\n"
      );

      consistencyCheck = require('./consistency-check');
      const result = consistencyCheck.checkSharedDocs();

      expect(result).toBe(true);
    });
  });

  describe('checkAppDrift / extractStackSlugs', () => {
    const appTsPath = path.join(__dirname, '..', 'infrastructure/bin/app.ts');
    const appJsPath = path.join(__dirname, '..', 'infrastructure/bin/app.js');

    function mockReadFileSync(tsContent, jsContent) {
      const original = fs.readFileSync.bind(fs);
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, ...rest) => {
        if (filePath === appTsPath) return tsContent;
        if (filePath === appJsPath) return jsContent;
        return original(filePath, ...rest);
      });
    }

    it('reports a slug present only in app.ts as "only in app.ts"', () => {
      mockReadFileSync(
        'new DatabaseStack(app, `${stackPrefix}-database`, {});\nnew AuthStack(app, `${stackPrefix}-auth`, {});',
        'new DatabaseStack(app, `${stackPrefix}-database`, {});'
      );

      consistencyCheck = require('./consistency-check');
      const result = consistencyCheck.checkAppDrift();

      expect(result).toBe(false);
    });

    it('passes when app.ts and app.js have identical slug sets', () => {
      mockReadFileSync(
        'new DatabaseStack(app, `${stackPrefix}-database`, {});\nnew AuthStack(app, `${stackPrefix}-auth`, {});',
        'new x_1.DatabaseStack(app, `${stackPrefix}-database`, {});\nnew x_2.AuthStack(app, `${stackPrefix}-auth`, {});'
      );

      consistencyCheck = require('./consistency-check');
      const result = consistencyCheck.checkAppDrift();

      expect(result).toBe(true);
    });

    it('extractStackSlugs returns an empty set for a slug string present in neither fixture', () => {
      mockReadFileSync('', '');

      consistencyCheck = require('./consistency-check');
      const slugs = consistencyCheck.extractStackSlugs('no matches here');

      expect(slugs.size).toBe(0);
    });
  });
});