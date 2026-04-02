import { Language, Violation } from '../../../types/misra-analysis';
import {
  MISRARule,
  RuleEngine,
  createViolation,
  findTokensByType,
  findTokensByValue,
  findKeywords,
  findFunctions,
  findFunctionsByName,
  findIdentifiers,
  getSourceLine,
} from '../rule-engine';
import { RuleConfig } from '../rule-config';
import { CodeParser, AST } from '../code-parser';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeRule(
  id: string,
  severity: MISRARule['severity'],
  language: MISRARule['language'] = 'C'
): MISRARule {
  return {
    id,
    description: `Test rule ${id}`,
    severity,
    category: 'Test',
    language,
    async check(_ast: AST, _src: string): Promise<Violation[]> {
      return [];
    },
  };
}

// ─── createViolation ───────────────────────────────────────────────────────

describe('createViolation()', () => {
  it('creates a Violation with the correct shape', () => {
    const rule = makeRule('MISRA-C-1.1', 'mandatory');
    const v = createViolation(rule, 10, 5, 'Test message', 'int x;');

    expect(v.ruleId).toBe('MISRA-C-1.1');
    expect(v.ruleName).toBe('MISRA-C-1.1');
    expect(v.severity).toBe('mandatory');
    expect(v.line).toBe(10);
    expect(v.column).toBe(5);
    expect(v.message).toBe('Test message');
    expect(v.codeSnippet).toBe('int x;');
  });

  it('preserves severity from the rule', () => {
    const advisory = makeRule('MISRA-C-2.1', 'advisory');
    const v = createViolation(advisory, 1, 1, 'msg', '');
    expect(v.severity).toBe('advisory');
  });
});

// ─── RuleEngine – registration & retrieval ─────────────────────────────────

describe('RuleEngine – registration and retrieval', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  it('starts with zero rules', () => {
    expect(engine.getRuleCount()).toBe(0);
  });

  it('registers a rule and retrieves it by id', () => {
    const rule = makeRule('MISRA-C-1.1', 'mandatory');
    engine.registerRule(rule);
    expect(engine.getRule('MISRA-C-1.1')).toBe(rule);
  });

  it('returns undefined for an unknown rule id', () => {
    expect(engine.getRule('MISRA-C-99.99')).toBeUndefined();
  });

  it('increments getRuleCount() after registration', () => {
    engine.registerRule(makeRule('MISRA-C-1.1', 'mandatory'));
    engine.registerRule(makeRule('MISRA-C-1.2', 'required'));
    expect(engine.getRuleCount()).toBe(2);
  });

  it('overwrites a rule registered with the same id', () => {
    const r1 = makeRule('MISRA-C-1.1', 'mandatory');
    const r2 = { ...makeRule('MISRA-C-1.1', 'advisory'), description: 'updated' };
    engine.registerRule(r1);
    engine.registerRule(r2);
    expect(engine.getRuleCount()).toBe(1);
    expect(engine.getRule('MISRA-C-1.1')!.description).toBe('updated');
  });
});

// ─── RuleEngine – language filtering ──────────────────────────────────────

describe('RuleEngine – getRulesForLanguage()', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
    engine.registerRule(makeRule('MISRA-C-1.1', 'mandatory', 'C'));
    engine.registerRule(makeRule('MISRA-C-1.2', 'required', 'C'));
    engine.registerRule(makeRule('MISRA-CPP-0-1-1', 'mandatory', 'CPP'));
    engine.registerRule(makeRule('MISRA-BOTH-X', 'advisory', 'BOTH'));
  });

  it('returns only C rules for Language.C', () => {
    const rules = engine.getRulesForLanguage(Language.C);
    const ids = rules.map(r => r.id);
    expect(ids).toContain('MISRA-C-1.1');
    expect(ids).toContain('MISRA-C-1.2');
    expect(ids).not.toContain('MISRA-CPP-0-1-1');
  });

  it('returns only CPP rules for Language.CPP', () => {
    const rules = engine.getRulesForLanguage(Language.CPP);
    const ids = rules.map(r => r.id);
    expect(ids).toContain('MISRA-CPP-0-1-1');
    expect(ids).not.toContain('MISRA-C-1.1');
  });

  it('includes BOTH rules for Language.C', () => {
    const rules = engine.getRulesForLanguage(Language.C);
    expect(rules.map(r => r.id)).toContain('MISRA-BOTH-X');
  });

  it('includes BOTH rules for Language.CPP', () => {
    const rules = engine.getRulesForLanguage(Language.CPP);
    expect(rules.map(r => r.id)).toContain('MISRA-BOTH-X');
  });

  it('returns empty array when no rules match the language', () => {
    const emptyEngine = new RuleEngine();
    emptyEngine.registerRule(makeRule('MISRA-CPP-0-1-1', 'mandatory', 'CPP'));
    expect(emptyEngine.getRulesForLanguage(Language.C)).toHaveLength(0);
  });
});

// ─── RuleEngine – profile filtering ───────────────────────────────────────

describe('RuleEngine – getEnabledRules() profile filtering', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
    engine.registerRule(makeRule('MISRA-C-M1', 'mandatory', 'C'));
    engine.registerRule(makeRule('MISRA-C-M2', 'mandatory', 'C'));
    engine.registerRule(makeRule('MISRA-C-R1', 'required', 'C'));
    engine.registerRule(makeRule('MISRA-C-A1', 'advisory', 'C'));
  });

  it("'minimal' profile returns only mandatory rules", () => {
    const rules = engine.getEnabledRules(Language.C, 'minimal');
    expect(rules.every(r => r.severity === 'mandatory')).toBe(true);
    expect(rules).toHaveLength(2);
  });

  it("'moderate' profile returns mandatory + required rules", () => {
    const rules = engine.getEnabledRules(Language.C, 'moderate');
    const severities = rules.map(r => r.severity);
    expect(severities).toContain('mandatory');
    expect(severities).toContain('required');
    expect(severities).not.toContain('advisory');
    expect(rules).toHaveLength(3);
  });

  it("'strict' profile returns all rules", () => {
    const rules = engine.getEnabledRules(Language.C, 'strict');
    expect(rules).toHaveLength(4);
  });

  it('profile filtering respects language filter', () => {
    engine.registerRule(makeRule('MISRA-CPP-M1', 'mandatory', 'CPP'));
    const rules = engine.getEnabledRules(Language.C, 'minimal');
    expect(rules.map(r => r.id)).not.toContain('MISRA-CPP-M1');
  });
});

// ─── RuleEngine – getConfiguredRules ──────────────────────────────────────

describe('RuleEngine – getConfiguredRules()', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
    engine.registerRule(makeRule('MISRA-C-M1', 'mandatory', 'C'));
    engine.registerRule(makeRule('MISRA-C-R1', 'required', 'C'));
    engine.registerRule(makeRule('MISRA-C-A1', 'advisory', 'C'));
  });

  it('applies profile baseline', () => {
    const config: RuleConfig = { profile: 'minimal' };
    const rules = engine.getConfiguredRules(Language.C, config);
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('MISRA-C-M1');
  });

  it('disabledRules removes a rule from the result', () => {
    const config: RuleConfig = { profile: 'moderate', disabledRules: ['MISRA-C-R1'] };
    const rules = engine.getConfiguredRules(Language.C, config);
    expect(rules.map(r => r.id)).not.toContain('MISRA-C-R1');
    expect(rules.map(r => r.id)).toContain('MISRA-C-M1');
  });

  it('enabledRules adds a rule not in the profile', () => {
    const config: RuleConfig = { profile: 'minimal', enabledRules: ['MISRA-C-A1'] };
    const rules = engine.getConfiguredRules(Language.C, config);
    expect(rules.map(r => r.id)).toContain('MISRA-C-A1');
    expect(rules.map(r => r.id)).toContain('MISRA-C-M1');
  });

  it('enabledRules does not duplicate a rule already in the profile', () => {
    const config: RuleConfig = { profile: 'moderate', enabledRules: ['MISRA-C-M1'] };
    const rules = engine.getConfiguredRules(Language.C, config);
    const ids = rules.map(r => r.id);
    expect(ids.filter(id => id === 'MISRA-C-M1')).toHaveLength(1);
  });
});

// ─── AST traversal utilities ───────────────────────────────────────────────

describe('AST traversal utilities', () => {
  let ast: AST;

  beforeAll(async () => {
    const parser = new CodeParser();
    const src = `
#include <stdio.h>
int add(int a, int b) {
    int result = a + b;
    return result;
}
void noop(void) {}
`.trim();
    ast = await parser.parse(src, Language.C);
  });

  describe('findTokensByType()', () => {
    it('returns keyword tokens', () => {
      const keywords = findTokensByType(ast, 'keyword');
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.every(t => t.type === 'keyword')).toBe(true);
    });

    it('returns identifier tokens', () => {
      const ids = findTokensByType(ast, 'identifier');
      expect(ids.length).toBeGreaterThan(0);
    });

    it('returns empty array when no tokens of that type exist', () => {
      const comments = findTokensByType(ast, 'comment');
      expect(Array.isArray(comments)).toBe(true);
    });
  });

  describe('findTokensByValue()', () => {
    it('finds tokens by exact value', () => {
      const tokens = findTokensByValue(ast, 'add');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.every(t => t.value === 'add')).toBe(true);
    });

    it('returns empty array for a value not present', () => {
      expect(findTokensByValue(ast, '__nonexistent__')).toHaveLength(0);
    });
  });

  describe('findKeywords()', () => {
    it('finds specific keywords', () => {
      const tokens = findKeywords(ast, ['int', 'void', 'return']);
      const values = tokens.map(t => t.value);
      expect(values).toContain('int');
      expect(values).toContain('void');
      expect(values).toContain('return');
    });

    it('does not return non-keyword tokens', () => {
      const tokens = findKeywords(ast, ['add']); // 'add' is an identifier, not a keyword
      expect(tokens).toHaveLength(0);
    });
  });

  describe('findFunctions()', () => {
    it('returns all function definitions', () => {
      const fns = findFunctions(ast);
      const names = fns.map(f => f.name);
      expect(names).toContain('add');
      expect(names).toContain('noop');
    });
  });

  describe('findFunctionsByName()', () => {
    it('filters functions by predicate', () => {
      const fns = findFunctionsByName(ast, name => name.startsWith('a'));
      expect(fns.map(f => f.name)).toContain('add');
      expect(fns.map(f => f.name)).not.toContain('noop');
    });

    it('returns empty array when predicate matches nothing', () => {
      expect(findFunctionsByName(ast, () => false)).toHaveLength(0);
    });
  });

  describe('findIdentifiers()', () => {
    it('returns identifier tokens', () => {
      const ids = findIdentifiers(ast);
      expect(ids.every(t => t.type === 'identifier')).toBe(true);
      expect(ids.map(t => t.value)).toContain('add');
    });
  });

  describe('getSourceLine()', () => {
    it('returns the correct source line for a 1-based line number', () => {
      const line1 = getSourceLine(ast, 1);
      expect(typeof line1).toBe('string');
      expect(line1.length).toBeGreaterThan(0);
    });

    it('returns empty string for out-of-range line numbers', () => {
      expect(getSourceLine(ast, 9999)).toBe('');
      expect(getSourceLine(ast, 0)).toBe('');
    });
  });
});
