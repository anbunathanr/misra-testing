import { Language, Violation } from '../../types/misra-analysis';
import { AST, Token, FunctionDef } from './code-parser';
import { RuleConfig, RuleProfile, PROFILE_SEVERITIES } from './rule-config';
import { registerMISRACRules } from './rules/c/index';
import { registerMISRACPPRules } from './rules/cpp/index';

// ─── MISRARule interface ────────────────────────────────────────────────────

export interface MISRARule {
  id: string;
  description: string;
  severity: 'mandatory' | 'required' | 'advisory';
  category: string;
  language: 'C' | 'CPP' | 'BOTH';
  check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

// ─── createViolation helper ─────────────────────────────────────────────────

export function createViolation(
  rule: MISRARule,
  line: number,
  column: number,
  message: string,
  codeSnippet: string
): Violation {
  return {
    ruleId: rule.id,
    ruleName: rule.id,
    severity: rule.severity,
    line,
    column,
    message,
    codeSnippet,
  };
}


// ─── AST traversal utilities ────────────────────────────────────────────────

export function findTokensByType(ast: AST, type: Token['type']): Token[] {
  return ast.tokens.filter(t => t.type === type);
}

export function findTokensByValue(ast: AST, value: string): Token[] {
  return ast.tokens.filter(t => t.value === value);
}

export function findKeywords(ast: AST, keywords: string[]): Token[] {
  return ast.tokens.filter(t => t.type === 'keyword' && keywords.includes(t.value));
}

export function findFunctions(ast: AST): FunctionDef[] {
  return ast.functions;
}

export function findFunctionsByName(ast: AST, predicate: (name: string) => boolean): FunctionDef[] {
  return ast.functions.filter(f => predicate(f.name));
}

export function findIdentifiers(ast: AST): Token[] {
  return ast.tokens.filter(t => t.type === 'identifier');
}

export function getSourceLine(ast: AST, lineNumber: number): string {
  if (lineNumber < 1 || lineNumber > ast.lines.length) return '';
  return ast.lines[lineNumber - 1];
}

// ─── RuleEngine class ───────────────────────────────────────────────────────

export class RuleEngine {
  private rules: Map<string, MISRARule> = new Map();

  registerRule(rule: MISRARule): void {
    this.rules.set(rule.id, rule);
  }

  getRule(id: string): MISRARule | undefined {
    return this.rules.get(id);
  }

  getRuleCount(): number {
    return this.rules.size;
  }

  getRulesForLanguage(language: Language): MISRARule[] {
    const langStr = language === Language.C ? 'C' : 'CPP';
    return Array.from(this.rules.values()).filter(
      r => r.language === langStr || r.language === 'BOTH'
    );
  }

  getEnabledRules(language: Language, profile: RuleProfile): MISRARule[] {
    const allowedSeverities = PROFILE_SEVERITIES[profile];
    return this.getRulesForLanguage(language).filter(r =>
      allowedSeverities.includes(r.severity)
    );
  }

  getConfiguredRules(language: Language, config: RuleConfig): MISRARule[] {
    const baseRules = this.getEnabledRules(language, config.profile);
    const ruleSet = new Map<string, MISRARule>(baseRules.map(r => [r.id, r]));

    if (config.disabledRules) {
      for (const id of config.disabledRules) {
        ruleSet.delete(id);
      }
    }

    if (config.enabledRules) {
      for (const id of config.enabledRules) {
        if (!ruleSet.has(id)) {
          const rule = this.rules.get(id);
          if (rule) ruleSet.set(id, rule);
        }
      }
    }

    return Array.from(ruleSet.values());
  }

  // Load all MISRA rules for C and C++ analysis
  loadRules(): void {
    console.log('Loading MISRA rules...');
    
    const initialRuleCount = this.getRuleCount();
    
    // Register MISRA C rules
    registerMISRACRules(this);
    const cRulesCount = this.getRuleCount() - initialRuleCount;
    console.log(`Loaded ${cRulesCount} MISRA C rules`);
    
    // Register MISRA C++ rules
    registerMISRACPPRules(this);
    const cppRulesCount = this.getRuleCount() - initialRuleCount - cRulesCount;
    console.log(`Loaded ${cppRulesCount} MISRA C++ rules`);
    
    const totalRulesLoaded = this.getRuleCount();
    console.log(`Total rules loaded: ${totalRulesLoaded}`);
    
    // Verify that rules were actually registered
    if (totalRulesLoaded === 0) {
      throw new Error('Failed to load MISRA rules: No rules were registered');
    }
    
    console.log('MISRA rule loading completed successfully');
  }
}
