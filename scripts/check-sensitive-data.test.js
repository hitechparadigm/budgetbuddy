/**
 * Unit tests for scripts/check-sensitive-data.js.
 *
 * Every sample the scanner should flag is assembled from string parts at runtime, so this file
 * contains no literal that the scanner (or scripts/security-check.sh) would itself report.
 * git and the file system are mocked with jest.spyOn, as in consistency-check.test.js.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const scanner = require('./check-sensitive-data');

const sample = {
  jwt: () =>
    'ey' + 'JhbGciOiJIUzI1NiJ9' + '.' + 'ey' + 'JzdWIiOiIxMjM0In0' + '.' + 'c2lnbmF0dXJlcGFydA',
  accessKeyId: () => 'AK' + 'IA' + 'Z3XC' + 'V4BN' + 'M5LK' + 'J6HG',
  privateKey: () => '-----BEGIN ' + 'RSA ' + 'PRIV' + 'ATE KEY-----',
  credential: () => 'const db' + 'Pass' + 'word = ' + "'" + 'R3al' + 'V4lue' + '99' + "'",
  freeMail: () => 'someone.real' + '@' + 'gmail' + '.com',
  accountArn: () => 'arn:aws:iam::' + '1111' + '2222' + '3333' + ':role/app-role',
  accountAssignment: () => 'Acc' + 'ountId: ' + "'" + '4444' + '5555' + '6666' + "'",
  windowsHome: () => 'C:' + '\\Users\\' + 'someone' + '\\project',
  gitBashHome: () => '/c' + '/Users/' + 'someone' + '/project',
  linuxHome: () => 'cd /ho' + 'me/' + 'someone' + '/project',
  macHome: () => 'cd /Us' + 'ers/' + 'someone' + '/project',
};

// Synthetic stand-in for a term that only a machine's local patterns file would hold.
const SYNTHETIC_LOCAL_TERM = 'examplecorp-internal-tool';

const EMPTY_ALLOWLIST = { values: [], paths: [] };

function categories(results) {
  return results.map((result) => result.category);
}

describe('check-sensitive-data.js', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('scanLine', () => {
    it.each([
      ['jwt', sample.jwt],
      ['aws-access-key-id', sample.accessKeyId],
      ['private-key', sample.privateKey],
      ['credential-assignment', sample.credential],
      ['free-mail-email', sample.freeMail],
      ['aws-account-id', sample.accountArn],
      ['aws-account-id', sample.accountAssignment],
      ['home-path', sample.windowsHome],
      ['home-path', sample.gitBashHome],
      ['home-path', sample.linuxHome],
      ['home-path', sample.macHome],
    ])('detects %s', (category, build) => {
      expect(categories(scanner.scanLine(build()))).toContain(category);
    });

    it.each([
      ['a <name> placeholder in a drive-letter path', 'C:' + '\\Users\\<name>\\project'],
      ['a <name> placeholder in a Linux path', '/ho' + 'me/<name>/project'],
      ['an environment-variable home path', '%USERPROFILE%\\.aws-profile\\config'],
      ['an <ACCOUNT_ID> placeholder in an ARN', 'arn:aws:iam::<ACCOUNT_ID>:role/app-role'],
      ['a credential read from process.env', 'const db' + 'Pass' + "word = 'process.env.DB_VALUE'"],
      ['a credential built from a template', 'tok' + "en: '" + '${' + "ENV_VALUE_HERE}'"],
      ['a credential fixture marked mock', 'tok' + "en: '" + 'mock-value-123' + "'"],
      ['a validation message', 'pass' + "word: 'Must be at least 8 characters'"],
      ['a storage key that names the credential', 'ID_TOK' + "EN_KEY = 'auth_id_" + "tok" + "en'"],
      ['an example.com address', 'contact user' + '@' + 'example.com'],
      ['ordinary prose', 'The budget page loads in under two seconds.'],
    ])('does not flag %s', (_label, line) => {
      expect(scanner.scanLine(line)).toEqual([]);
    });

    it('skips tokens on inline source-map lines', () => {
      const line = '//# sourceMappingURL=data:application/json;base64,' + sample.jwt();
      expect(categories(scanner.scanLine(line))).not.toContain('jwt');
    });

    it('reports the account ID digits, not the whole ARN, as the matched value', () => {
      const [result] = scanner.scanLine(sample.accountArn());
      expect(result.match).toBe('1111' + '2222' + '3333');
    });

    it('applies extra local patterns as the local-pattern category', () => {
      const local = scanner.parseLocalPatterns('# comment\nzz-local-marker-[0-9]+\n');
      expect(categories(scanner.scanLine('found zz-local-marker-42 here', local))).toEqual([
        'local-pattern',
      ]);
    });

    it('rejects an invalid local pattern without echoing it', () => {
      expect(() => scanner.parseLocalPatterns('valid\n(unclosed\n')).toThrow(/line 2/);
      expect(() => scanner.parseLocalPatterns('(unclosed\n')).not.toThrow(/unclosed/);
    });
  });

  describe('parseAllowlist and isAllowed', () => {
    const allowlist = scanner.parseAllowlist(
      [
        '# comment',
        '',
        'path:scripts/check-sensitive-data.js',
        'path: docs\\generated/',
        '1234' + '5678' + '9012',
        'Info' + '@' + 'Example.org',
      ].join('\r\n')
    );

    it('separates path prefixes from values and lowercases values', () => {
      expect(allowlist.paths).toEqual(['scripts/check-sensitive-data.js', 'docs/generated/']);
      expect(allowlist.values).toEqual(['1234' + '5678' + '9012', 'info' + '@' + 'example.org']);
    });

    it('allows an exact allowlisted value', () => {
      const line = 'arn:aws:iam::' + '1234' + '5678' + '9012' + ':role/app-role';
      const [match] = scanner.scanLine(line);
      expect(scanner.isAllowed(match, 'docs/a.md', allowlist, line)).toBe(true);
    });

    it('allows a match that lies inside an allowlisted value on the same line', () => {
      const local = scanner.parseLocalPatterns('example\\.org');
      const line = 'Sender: INFO' + '@' + 'EXAMPLE.ORG';
      const [match] = scanner.scanLine(line, local);
      expect(scanner.isAllowed(match, 'docs/a.md', allowlist, line)).toBe(true);
    });

    it('allows any finding in a path-allowlisted file', () => {
      const [match] = scanner.scanLine(sample.freeMail());
      expect(scanner.isAllowed(match, 'scripts/check-sensitive-data.js', allowlist)).toBe(true);
      expect(scanner.isAllowed(match, 'docs/generated/x.md', allowlist)).toBe(true);
    });

    it('does not allow a value that is not listed', () => {
      const line = sample.freeMail();
      const [match] = scanner.scanLine(line);
      expect(scanner.isAllowed(match, 'docs/a.md', allowlist, line)).toBe(false);
    });
  });

  describe('scanFiles', () => {
    it('reports file, line and category once per category per line and skips binaries', () => {
      const contents = {
        'docs/a.md': Buffer.from(['# Title', 'mail ' + sample.freeMail() + ' and ' +
          'other' + '@' + 'yahoo.com', 'clean line', sample.windowsHome()].join('\r\n')),
        'docs/b.md': Buffer.from('owner contact user' + '@' + 'example.com\n'),
        'assets/logo.png': Buffer.from(sample.freeMail()),
        'data/blob.bin': Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(sample.freeMail())]),
      };
      const readFile = (absPath) => contents[path.relative('/repo', absPath).replace(/\\/g, '/')];

      const result = scanner.scanFiles(Object.keys(contents), {
        root: '/repo',
        allowlist: scanner.parseAllowlist('user' + '@' + 'example.com'),
        localPatterns: [],
        readFile,
      });

      expect(result.findings).toEqual([
        { file: 'docs/a.md', line: 2, category: 'free-mail-email' },
        { file: 'docs/a.md', line: 4, category: 'home-path' },
      ]);
      expect(result.scanned).toBe(2);
    });
  });

  describe('parseStagedDiff', () => {
    it('maps added lines to new-file line numbers across two files and two hunks', () => {
      const diff = [
        'diff --git a/docs/a.md b/docs/a.md',
        'index 1111111..2222222 100644',
        '--- a/docs/a.md',
        '+++ b/docs/a.md',
        '@@ -3,0 +4,2 @@ heading',
        '+first added',
        '+second added',
        '@@ -10 +12 @@',
        '-old line',
        '+replaced line',
        'diff --git a/src/b.js b/src/b.js',
        'new file mode 100644',
        'index 0000000..3333333',
        '--- /dev/null',
        '+++ b/src/b.js',
        '@@ -0,0 +1,2 @@',
        '+const x = 1;',
        '+++counter;',
        '\\ No newline at end of file',
        '',
      ].join('\n');

      expect(scanner.parseStagedDiff(diff)).toEqual([
        { file: 'docs/a.md', line: 4, text: 'first added' },
        { file: 'docs/a.md', line: 5, text: 'second added' },
        { file: 'docs/a.md', line: 12, text: 'replaced line' },
        { file: 'src/b.js', line: 1, text: 'const x = 1;' },
        { file: 'src/b.js', line: 2, text: '++counter;' },
      ]);
    });
  });

  describe('main', () => {
    const root = path.join(__dirname, '..');
    let output;

    function mockGit(responses) {
      jest.spyOn(childProcess, 'execFileSync').mockImplementation((cmd, args) => {
        if (args.includes('rev-parse')) return root + '\n';
        if (args.includes('diff')) return responses.diff || '';
        if (args.includes('ls-files')) return responses.files || '';
        throw new Error('unexpected git call');
      });
    }

    beforeEach(() => {
      output = [];
      jest.spyOn(console, 'log').mockImplementation((...args) => output.push(args.join(' ')));
      jest.spyOn(console, 'error').mockImplementation((...args) => output.push(args.join(' ')));
      const originalExists = fs.existsSync.bind(fs);
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        if (String(p).endsWith('.sensitive-data-patterns.local')) return false;
        return originalExists(p);
      });
    });

    it('exits 0 with an empty staged diff', () => {
      mockGit({ diff: '' });
      expect(scanner.main(['--staged'])).toBe(0);
    });

    it('exits 1 for a staged finding and never prints the matched value', () => {
      const value = sample.freeMail();
      mockGit({
        diff: [
          'diff --git a/docs/a.md b/docs/a.md',
          '--- a/docs/a.md',
          '+++ b/docs/a.md',
          '@@ -3,0 +4 @@',
          '+contact ' + value,
          '',
        ].join('\n'),
      });

      expect(scanner.main(['--staged'])).toBe(1);
      expect(output).toContain('docs/a.md:4  free-mail-email');
      expect(output.join('\n')).not.toContain(value);
    });

    it('scans tracked files in --all mode without printing the matched value', () => {
      const value = sample.jwt();
      const target = path.join(root, 'docs/fixture.md');
      mockGit({ files: 'docs/fixture.md\0' });
      const originalRead = fs.readFileSync.bind(fs);
      jest.spyOn(fs, 'readFileSync').mockImplementation((p, ...rest) => {
        if (p === target) return Buffer.from('line one\nAuthorization: Bearer ' + value + '\n');
        return originalRead(p, ...rest);
      });

      expect(scanner.main(['--all'])).toBe(1);
      expect(output).toContain('docs/fixture.md:2  jwt');
      expect(output.join('\n')).not.toContain(value);
      output
        .filter((line) => !line.startsWith('check-sensitive-data:') && !line.startsWith('See '))
        .forEach((line) => expect(line).toMatch(/^[^ ]+:[0-9]+ {2}[a-z-]+$/));
    });

    it('loads the local patterns file and reports its matches as file:line and category', () => {
      fs.existsSync.mockRestore();
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'check-sensitive-data-'));
      try {
        fs.writeFileSync(
          path.join(tmpRoot, '.sensitive-data-patterns.local'),
          '# synthetic local term\n' + SYNTHETIC_LOCAL_TERM + '\n'
        );
        fs.mkdirSync(path.join(tmpRoot, 'docs'));
        fs.writeFileSync(
          path.join(tmpRoot, 'docs', 'notes.md'),
          'first line\nrun ' + SYNTHETIC_LOCAL_TERM + ' locally\n'
        );
        jest.spyOn(childProcess, 'execFileSync').mockImplementation((cmd, args) => {
          if (args.includes('rev-parse')) return tmpRoot + '\n';
          if (args.includes('ls-files')) return 'docs/notes.md\0';
          throw new Error('unexpected git call');
        });

        expect(scanner.main(['--all'])).toBe(1);
        expect(output).toContain('docs/notes.md:2  local-pattern');
        expect(output.join('\n')).not.toContain(SYNTHETIC_LOCAL_TERM);
      } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
    });

    it('exits 2 for an unknown argument', () => {
      mockGit({});
      expect(scanner.main(['--everything'])).toBe(2);
    });

    it('exits 2 when git is unavailable', () => {
      jest.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw new Error('git not found');
      });
      expect(scanner.main([])).toBe(2);
    });
  });
});
