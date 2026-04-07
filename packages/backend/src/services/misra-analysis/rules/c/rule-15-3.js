"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_15_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 15.3
 * Any label referenced by a goto statement shall be declared in the same block,
 * or in any block enclosing the goto statement.
 * Detects goto jumping to a label that is not in the same or enclosing block.
 */
class Rule_C_15_3 {
    id = 'MISRA-C-15.3';
    description = 'Any label referenced by a goto statement shall be declared in the same block or an enclosing block';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Collect goto statements and label definitions with their brace depth
        const gotoStatements = [];
        const labelDefinitions = [];
        const gotoRegex = /\bgoto\s+(\w+)\s*;/;
        const labelRegex = /^(\w+)\s*:/;
        let depth = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            // Track brace depth
            for (const ch of line) {
                if (ch === '{')
                    depth++;
                else if (ch === '}')
                    depth--;
            }
            const gotoMatch = line.match(gotoRegex);
            if (gotoMatch) {
                gotoStatements.push({ label: gotoMatch[1], line: i + 1, depth });
            }
            const labelMatch = line.match(labelRegex);
            if (labelMatch && !['case', 'default'].includes(labelMatch[1])) {
                labelDefinitions.push({ label: labelMatch[1], line: i + 1, depth });
            }
        }
        // Check for gotos jumping to labels at a deeper nesting level (outside enclosing block)
        for (const gotoStmt of gotoStatements) {
            const targetLabel = labelDefinitions.find(l => l.label === gotoStmt.label);
            if (targetLabel && targetLabel.depth > gotoStmt.depth) {
                violations.push((0, rule_engine_1.createViolation)(this, gotoStmt.line, 0, `goto '${gotoStmt.label}' jumps to a label outside the current block scope`, lines[gotoStmt.line - 1].trim()));
            }
        }
        return violations;
    }
}
exports.Rule_C_15_3 = Rule_C_15_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNS0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNS0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyxvR0FBb0csQ0FBQztJQUNuSCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLHVFQUF1RTtRQUN2RSxNQUFNLGNBQWMsR0FBcUQsRUFBRSxDQUFDO1FBQzVFLE1BQU0sZ0JBQWdCLEdBQXFELEVBQUUsQ0FBQztRQUU5RSxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQztRQUN2QyxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUM7UUFFaEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsb0JBQW9CO1lBQ3BCLEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ3RCLElBQUksRUFBRSxLQUFLLEdBQUc7b0JBQUUsS0FBSyxFQUFFLENBQUM7cUJBQ25CLElBQUksRUFBRSxLQUFLLEdBQUc7b0JBQUUsS0FBSyxFQUFFLENBQUM7WUFDL0IsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZCxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ25FLENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzFDLElBQUksVUFBVSxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN0RSxDQUFDO1FBQ0gsQ0FBQztRQUVELHdGQUF3RjtRQUN4RixLQUFLLE1BQU0sUUFBUSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNFLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN0RCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osUUFBUSxDQUFDLElBQUksRUFDYixDQUFDLEVBQ0QsU0FBUyxRQUFRLENBQUMsS0FBSyxvREFBb0QsRUFDM0UsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQ2hDLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBM0RELGtDQTJEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxNS4zXHJcbiAqIEFueSBsYWJlbCByZWZlcmVuY2VkIGJ5IGEgZ290byBzdGF0ZW1lbnQgc2hhbGwgYmUgZGVjbGFyZWQgaW4gdGhlIHNhbWUgYmxvY2ssXHJcbiAqIG9yIGluIGFueSBibG9jayBlbmNsb3NpbmcgdGhlIGdvdG8gc3RhdGVtZW50LlxyXG4gKiBEZXRlY3RzIGdvdG8ganVtcGluZyB0byBhIGxhYmVsIHRoYXQgaXMgbm90IGluIHRoZSBzYW1lIG9yIGVuY2xvc2luZyBibG9jay5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTVfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xNS4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdBbnkgbGFiZWwgcmVmZXJlbmNlZCBieSBhIGdvdG8gc3RhdGVtZW50IHNoYWxsIGJlIGRlY2xhcmVkIGluIHRoZSBzYW1lIGJsb2NrIG9yIGFuIGVuY2xvc2luZyBibG9jayc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0NvbnRyb2wgZmxvdyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gQ29sbGVjdCBnb3RvIHN0YXRlbWVudHMgYW5kIGxhYmVsIGRlZmluaXRpb25zIHdpdGggdGhlaXIgYnJhY2UgZGVwdGhcclxuICAgIGNvbnN0IGdvdG9TdGF0ZW1lbnRzOiB7IGxhYmVsOiBzdHJpbmc7IGxpbmU6IG51bWJlcjsgZGVwdGg6IG51bWJlciB9W10gPSBbXTtcclxuICAgIGNvbnN0IGxhYmVsRGVmaW5pdGlvbnM6IHsgbGFiZWw6IHN0cmluZzsgbGluZTogbnVtYmVyOyBkZXB0aDogbnVtYmVyIH1bXSA9IFtdO1xyXG5cclxuICAgIGNvbnN0IGdvdG9SZWdleCA9IC9cXGJnb3RvXFxzKyhcXHcrKVxccyo7LztcclxuICAgIGNvbnN0IGxhYmVsUmVnZXggPSAvXihcXHcrKVxccyo6LztcclxuXHJcbiAgICBsZXQgZGVwdGggPSAwO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBUcmFjayBicmFjZSBkZXB0aFxyXG4gICAgICBmb3IgKGNvbnN0IGNoIG9mIGxpbmUpIHtcclxuICAgICAgICBpZiAoY2ggPT09ICd7JykgZGVwdGgrKztcclxuICAgICAgICBlbHNlIGlmIChjaCA9PT0gJ30nKSBkZXB0aC0tO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBnb3RvTWF0Y2ggPSBsaW5lLm1hdGNoKGdvdG9SZWdleCk7XHJcbiAgICAgIGlmIChnb3RvTWF0Y2gpIHtcclxuICAgICAgICBnb3RvU3RhdGVtZW50cy5wdXNoKHsgbGFiZWw6IGdvdG9NYXRjaFsxXSwgbGluZTogaSArIDEsIGRlcHRoIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBsYWJlbE1hdGNoID0gbGluZS5tYXRjaChsYWJlbFJlZ2V4KTtcclxuICAgICAgaWYgKGxhYmVsTWF0Y2ggJiYgIVsnY2FzZScsICdkZWZhdWx0J10uaW5jbHVkZXMobGFiZWxNYXRjaFsxXSkpIHtcclxuICAgICAgICBsYWJlbERlZmluaXRpb25zLnB1c2goeyBsYWJlbDogbGFiZWxNYXRjaFsxXSwgbGluZTogaSArIDEsIGRlcHRoIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZm9yIGdvdG9zIGp1bXBpbmcgdG8gbGFiZWxzIGF0IGEgZGVlcGVyIG5lc3RpbmcgbGV2ZWwgKG91dHNpZGUgZW5jbG9zaW5nIGJsb2NrKVxyXG4gICAgZm9yIChjb25zdCBnb3RvU3RtdCBvZiBnb3RvU3RhdGVtZW50cykge1xyXG4gICAgICBjb25zdCB0YXJnZXRMYWJlbCA9IGxhYmVsRGVmaW5pdGlvbnMuZmluZChsID0+IGwubGFiZWwgPT09IGdvdG9TdG10LmxhYmVsKTtcclxuICAgICAgaWYgKHRhcmdldExhYmVsICYmIHRhcmdldExhYmVsLmRlcHRoID4gZ290b1N0bXQuZGVwdGgpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGdvdG9TdG10LmxpbmUsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgIGBnb3RvICcke2dvdG9TdG10LmxhYmVsfScganVtcHMgdG8gYSBsYWJlbCBvdXRzaWRlIHRoZSBjdXJyZW50IGJsb2NrIHNjb3BlYCxcclxuICAgICAgICAgICAgbGluZXNbZ290b1N0bXQubGluZSAtIDFdLnRyaW0oKVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19