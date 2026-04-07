"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_15_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 15.2
 * The goto statement shall jump to a label declared later in the same function.
 * Detects goto jumping forward over declarations (backward jumps are violations).
 */
class Rule_C_15_2 {
    id = 'MISRA-C-15.2';
    description = 'The goto statement shall jump to a label declared later in the same function';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Collect all goto statements and labels
        const gotoStatements = [];
        const labelDefinitions = [];
        const gotoRegex = /\bgoto\s+(\w+)\s*;/;
        const labelRegex = /^(\w+)\s*:/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            const gotoMatch = line.match(gotoRegex);
            if (gotoMatch) {
                gotoStatements.push({ label: gotoMatch[1], line: i + 1 });
            }
            const labelMatch = line.match(labelRegex);
            if (labelMatch && !['case', 'default'].includes(labelMatch[1])) {
                labelDefinitions.push({ label: labelMatch[1], line: i + 1 });
            }
        }
        // Check for backward gotos (goto to a label that appears before the goto)
        for (const gotoStmt of gotoStatements) {
            const targetLabel = labelDefinitions.find(l => l.label === gotoStmt.label);
            if (targetLabel && targetLabel.line < gotoStmt.line) {
                violations.push((0, rule_engine_1.createViolation)(this, gotoStmt.line, 0, `goto '${gotoStmt.label}' jumps backward to line ${targetLabel.line}, which may jump over declarations`, lines[gotoStmt.line - 1].trim()));
            }
        }
        return violations;
    }
}
exports.Rule_C_15_2 = Rule_C_15_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNS0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNS0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLDhFQUE4RSxDQUFDO0lBQzdGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIseUNBQXlDO1FBQ3pDLE1BQU0sY0FBYyxHQUFzQyxFQUFFLENBQUM7UUFDN0QsTUFBTSxnQkFBZ0IsR0FBc0MsRUFBRSxDQUFDO1FBRS9ELE1BQU0sU0FBUyxHQUFHLG9CQUFvQixDQUFDO1FBQ3ZDLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQztRQUVoQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2QsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVELENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzFDLElBQUksVUFBVSxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELENBQUM7UUFDSCxDQUFDO1FBRUQsMEVBQTBFO1FBQzFFLEtBQUssTUFBTSxRQUFRLElBQUksY0FBYyxFQUFFLENBQUM7WUFDdEMsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0UsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BELFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixRQUFRLENBQUMsSUFBSSxFQUNiLENBQUMsRUFDRCxTQUFTLFFBQVEsQ0FBQyxLQUFLLDRCQUE0QixXQUFXLENBQUMsSUFBSSxvQ0FBb0MsRUFDdkcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQ2hDLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBcERELGtDQW9EQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxNS4yXHJcbiAqIFRoZSBnb3RvIHN0YXRlbWVudCBzaGFsbCBqdW1wIHRvIGEgbGFiZWwgZGVjbGFyZWQgbGF0ZXIgaW4gdGhlIHNhbWUgZnVuY3Rpb24uXHJcbiAqIERldGVjdHMgZ290byBqdW1waW5nIGZvcndhcmQgb3ZlciBkZWNsYXJhdGlvbnMgKGJhY2t3YXJkIGp1bXBzIGFyZSB2aW9sYXRpb25zKS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTVfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xNS4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgZ290byBzdGF0ZW1lbnQgc2hhbGwganVtcCB0byBhIGxhYmVsIGRlY2xhcmVkIGxhdGVyIGluIHRoZSBzYW1lIGZ1bmN0aW9uJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBDb2xsZWN0IGFsbCBnb3RvIHN0YXRlbWVudHMgYW5kIGxhYmVsc1xyXG4gICAgY29uc3QgZ290b1N0YXRlbWVudHM6IHsgbGFiZWw6IHN0cmluZzsgbGluZTogbnVtYmVyIH1bXSA9IFtdO1xyXG4gICAgY29uc3QgbGFiZWxEZWZpbml0aW9uczogeyBsYWJlbDogc3RyaW5nOyBsaW5lOiBudW1iZXIgfVtdID0gW107XHJcblxyXG4gICAgY29uc3QgZ290b1JlZ2V4ID0gL1xcYmdvdG9cXHMrKFxcdyspXFxzKjsvO1xyXG4gICAgY29uc3QgbGFiZWxSZWdleCA9IC9eKFxcdyspXFxzKjovO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgZ290b01hdGNoID0gbGluZS5tYXRjaChnb3RvUmVnZXgpO1xyXG4gICAgICBpZiAoZ290b01hdGNoKSB7XHJcbiAgICAgICAgZ290b1N0YXRlbWVudHMucHVzaCh7IGxhYmVsOiBnb3RvTWF0Y2hbMV0sIGxpbmU6IGkgKyAxIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBsYWJlbE1hdGNoID0gbGluZS5tYXRjaChsYWJlbFJlZ2V4KTtcclxuICAgICAgaWYgKGxhYmVsTWF0Y2ggJiYgIVsnY2FzZScsICdkZWZhdWx0J10uaW5jbHVkZXMobGFiZWxNYXRjaFsxXSkpIHtcclxuICAgICAgICBsYWJlbERlZmluaXRpb25zLnB1c2goeyBsYWJlbDogbGFiZWxNYXRjaFsxXSwgbGluZTogaSArIDEgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmb3IgYmFja3dhcmQgZ290b3MgKGdvdG8gdG8gYSBsYWJlbCB0aGF0IGFwcGVhcnMgYmVmb3JlIHRoZSBnb3RvKVxyXG4gICAgZm9yIChjb25zdCBnb3RvU3RtdCBvZiBnb3RvU3RhdGVtZW50cykge1xyXG4gICAgICBjb25zdCB0YXJnZXRMYWJlbCA9IGxhYmVsRGVmaW5pdGlvbnMuZmluZChsID0+IGwubGFiZWwgPT09IGdvdG9TdG10LmxhYmVsKTtcclxuICAgICAgaWYgKHRhcmdldExhYmVsICYmIHRhcmdldExhYmVsLmxpbmUgPCBnb3RvU3RtdC5saW5lKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBnb3RvU3RtdC5saW5lLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICBgZ290byAnJHtnb3RvU3RtdC5sYWJlbH0nIGp1bXBzIGJhY2t3YXJkIHRvIGxpbmUgJHt0YXJnZXRMYWJlbC5saW5lfSwgd2hpY2ggbWF5IGp1bXAgb3ZlciBkZWNsYXJhdGlvbnNgLFxyXG4gICAgICAgICAgICBsaW5lc1tnb3RvU3RtdC5saW5lIC0gMV0udHJpbSgpXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=