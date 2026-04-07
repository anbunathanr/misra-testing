"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_15_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 15.4
 * There shall be no more than one break or goto statement used to terminate
 * any iteration statement.
 * Detects multiple break statements in a single loop.
 */
class Rule_C_15_4 {
    id = 'MISRA-C-15.4';
    description = 'There shall be no more than one break or goto statement used to terminate any iteration statement';
    severity = 'advisory';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track loop nesting and break counts
        // We look for for/while/do loops and count break statements within them
        const loopKeywords = /\b(for|while|do)\b/;
        const breakRegex = /\bbreak\s*;/;
        let depth = 0;
        const loopStack = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            // Check for loop start
            if (loopKeywords.test(line)) {
                loopStack.push({ startLine: i + 1, depth, breakLines: [] });
            }
            // Track brace depth
            for (const ch of line) {
                if (ch === '{')
                    depth++;
                else if (ch === '}') {
                    // Check if we're closing a loop
                    if (loopStack.length > 0 && depth === loopStack[loopStack.length - 1].depth + 1) {
                        const loop = loopStack.pop();
                        if (loop.breakLines.length > 1) {
                            violations.push((0, rule_engine_1.createViolation)(this, loop.startLine, 0, `Loop has ${loop.breakLines.length} break statements; only one break per loop is allowed`, lines[loop.startLine - 1].trim()));
                        }
                    }
                    depth--;
                }
            }
            // Count break statements within current loop
            if (breakRegex.test(line) && loopStack.length > 0) {
                loopStack[loopStack.length - 1].breakLines.push(i + 1);
            }
        }
        return violations;
    }
}
exports.Rule_C_15_4 = Rule_C_15_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNS00LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNS00LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyxtR0FBbUcsQ0FBQztJQUNsSCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLHNDQUFzQztRQUN0Qyx3RUFBd0U7UUFDeEUsTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQUM7UUFDMUMsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDO1FBRWpDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLE1BQU0sU0FBUyxHQUFpRSxFQUFFLENBQUM7UUFFbkYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsdUJBQXVCO1lBQ3ZCLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM1QixTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzlELENBQUM7WUFFRCxvQkFBb0I7WUFDcEIsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxFQUFFLEtBQUssR0FBRztvQkFBRSxLQUFLLEVBQUUsQ0FBQztxQkFDbkIsSUFBSSxFQUFFLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQ3BCLGdDQUFnQztvQkFDaEMsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxLQUFLLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUNoRixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFHLENBQUM7d0JBQzlCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQy9CLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixJQUFJLENBQUMsU0FBUyxFQUNkLENBQUMsRUFDRCxZQUFZLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSx1REFBdUQsRUFDekYsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQ2pDLENBQ0YsQ0FBQzt3QkFDSixDQUFDO29CQUNILENBQUM7b0JBQ0QsS0FBSyxFQUFFLENBQUM7Z0JBQ1YsQ0FBQztZQUNILENBQUM7WUFFRCw2Q0FBNkM7WUFDN0MsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xELFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pELENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBNURELGtDQTREQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxNS40XHJcbiAqIFRoZXJlIHNoYWxsIGJlIG5vIG1vcmUgdGhhbiBvbmUgYnJlYWsgb3IgZ290byBzdGF0ZW1lbnQgdXNlZCB0byB0ZXJtaW5hdGVcclxuICogYW55IGl0ZXJhdGlvbiBzdGF0ZW1lbnQuXHJcbiAqIERldGVjdHMgbXVsdGlwbGUgYnJlYWsgc3RhdGVtZW50cyBpbiBhIHNpbmdsZSBsb29wLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xNV80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE1LjQnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZXJlIHNoYWxsIGJlIG5vIG1vcmUgdGhhbiBvbmUgYnJlYWsgb3IgZ290byBzdGF0ZW1lbnQgdXNlZCB0byB0ZXJtaW5hdGUgYW55IGl0ZXJhdGlvbiBzdGF0ZW1lbnQnO1xyXG4gIHNldmVyaXR5ID0gJ2Fkdmlzb3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIFRyYWNrIGxvb3AgbmVzdGluZyBhbmQgYnJlYWsgY291bnRzXHJcbiAgICAvLyBXZSBsb29rIGZvciBmb3Ivd2hpbGUvZG8gbG9vcHMgYW5kIGNvdW50IGJyZWFrIHN0YXRlbWVudHMgd2l0aGluIHRoZW1cclxuICAgIGNvbnN0IGxvb3BLZXl3b3JkcyA9IC9cXGIoZm9yfHdoaWxlfGRvKVxcYi87XHJcbiAgICBjb25zdCBicmVha1JlZ2V4ID0gL1xcYmJyZWFrXFxzKjsvO1xyXG5cclxuICAgIGxldCBkZXB0aCA9IDA7XHJcbiAgICBjb25zdCBsb29wU3RhY2s6IHsgc3RhcnRMaW5lOiBudW1iZXI7IGRlcHRoOiBudW1iZXI7IGJyZWFrTGluZXM6IG51bWJlcltdIH1bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIGxvb3Agc3RhcnRcclxuICAgICAgaWYgKGxvb3BLZXl3b3Jkcy50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgbG9vcFN0YWNrLnB1c2goeyBzdGFydExpbmU6IGkgKyAxLCBkZXB0aCwgYnJlYWtMaW5lczogW10gfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFRyYWNrIGJyYWNlIGRlcHRoXHJcbiAgICAgIGZvciAoY29uc3QgY2ggb2YgbGluZSkge1xyXG4gICAgICAgIGlmIChjaCA9PT0gJ3snKSBkZXB0aCsrO1xyXG4gICAgICAgIGVsc2UgaWYgKGNoID09PSAnfScpIHtcclxuICAgICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIGNsb3NpbmcgYSBsb29wXHJcbiAgICAgICAgICBpZiAobG9vcFN0YWNrLmxlbmd0aCA+IDAgJiYgZGVwdGggPT09IGxvb3BTdGFja1tsb29wU3RhY2subGVuZ3RoIC0gMV0uZGVwdGggKyAxKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvb3AgPSBsb29wU3RhY2sucG9wKCkhO1xyXG4gICAgICAgICAgICBpZiAobG9vcC5icmVha0xpbmVzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgIGxvb3Auc3RhcnRMaW5lLFxyXG4gICAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgICBgTG9vcCBoYXMgJHtsb29wLmJyZWFrTGluZXMubGVuZ3RofSBicmVhayBzdGF0ZW1lbnRzOyBvbmx5IG9uZSBicmVhayBwZXIgbG9vcCBpcyBhbGxvd2VkYCxcclxuICAgICAgICAgICAgICAgICAgbGluZXNbbG9vcC5zdGFydExpbmUgLSAxXS50cmltKClcclxuICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBkZXB0aC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ291bnQgYnJlYWsgc3RhdGVtZW50cyB3aXRoaW4gY3VycmVudCBsb29wXHJcbiAgICAgIGlmIChicmVha1JlZ2V4LnRlc3QobGluZSkgJiYgbG9vcFN0YWNrLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBsb29wU3RhY2tbbG9vcFN0YWNrLmxlbmd0aCAtIDFdLmJyZWFrTGluZXMucHVzaChpICsgMSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19