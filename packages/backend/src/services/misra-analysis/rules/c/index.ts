import { RuleEngine } from '../../rule-engine';
import { Rule_C_1_1 } from './rule-1-1';
import { Rule_C_2_1 } from './rule-2-1';
import { Rule_C_8_1 } from './rule-8-1';
import { Rule_C_8_2 } from './rule-8-2';
import { Rule_C_8_4 } from './rule-8-4';
import { Rule_C_9_1 } from './rule-9-1';
import { Rule_C_10_1 } from './rule-10-1';
import { Rule_C_10_3 } from './rule-10-3';
import { Rule_C_11_1 } from './rule-11-1';
import { Rule_C_11_3 } from './rule-11-3';
import { Rule_C_14_4 } from './rule-14-4';
import { Rule_C_15_5 } from './rule-15-5';
import { Rule_C_16_3 } from './rule-16-3';
import { Rule_C_17_7 } from './rule-17-7';
import { Rule_C_20_4 } from './rule-20-4';
import { Rule_C_20_9 } from './rule-20-9';
import { Rule_C_21_3 } from './rule-21-3';
import { Rule_C_21_6 } from './rule-21-6';
import { Rule_C_22_1 } from './rule-22-1';
import { Rule_C_22_2 } from './rule-22-2';

export {
  Rule_C_1_1,
  Rule_C_2_1,
  Rule_C_8_1,
  Rule_C_8_2,
  Rule_C_8_4,
  Rule_C_9_1,
  Rule_C_10_1,
  Rule_C_10_3,
  Rule_C_11_1,
  Rule_C_11_3,
  Rule_C_14_4,
  Rule_C_15_5,
  Rule_C_16_3,
  Rule_C_17_7,
  Rule_C_20_4,
  Rule_C_20_9,
  Rule_C_21_3,
  Rule_C_21_6,
  Rule_C_22_1,
  Rule_C_22_2,
};

export const ALL_MISRA_C_RULES = [
  new Rule_C_1_1(),
  new Rule_C_2_1(),
  new Rule_C_8_1(),
  new Rule_C_8_2(),
  new Rule_C_8_4(),
  new Rule_C_9_1(),
  new Rule_C_10_1(),
  new Rule_C_10_3(),
  new Rule_C_11_1(),
  new Rule_C_11_3(),
  new Rule_C_14_4(),
  new Rule_C_15_5(),
  new Rule_C_16_3(),
  new Rule_C_17_7(),
  new Rule_C_20_4(),
  new Rule_C_20_9(),
  new Rule_C_21_3(),
  new Rule_C_21_6(),
  new Rule_C_22_1(),
  new Rule_C_22_2(),
];

/**
 * Register all MISRA C rules with the given RuleEngine instance.
 */
export function registerMISRACRules(engine: RuleEngine): void {
  for (const rule of ALL_MISRA_C_RULES) {
    engine.registerRule(rule);
  }
}
