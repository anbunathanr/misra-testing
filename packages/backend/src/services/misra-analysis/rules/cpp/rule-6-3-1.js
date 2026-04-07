"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_6_3_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 6-3-1
 * The statement forming the body of a switch, while, do...while or for statement shall be a compound statement.
 */
class Rule_CPP_6_3_1 {
    id = 'MISRA-CPP-6.3.1';
    description = 'The statement forming the body of a switch, while, do...while or for statement shall be a compound statement';
    severity = 'required';
    category = 'Control flow';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Check for while/for/do control structures
            const controlFlowRegex = /^\s*(while|for|do)\s*\([^)]*\)\s*(.*)$/;
            const match = line.match(controlFlowRegex);
            if (match) {
                const rest = match[2].trim();
                // If there's content on the same line and it doesn't start with {, it's a violation
                if (rest && !rest.startsWith('{')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `${match[1]} statement body must be a compound statement (use braces)`, line));
                }
                // If nothing on the same line, check the next line
                else if (!rest && i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine && !nextLine.startsWith('{')) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `${match[1]} statement body must be a compound statement (use braces)`, line));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_6_3_1 = Rule_CPP_6_3_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTMtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNi0zLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLDhHQUE4RyxDQUFDO0lBQzdILFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsNENBQTRDO1lBQzVDLE1BQU0sZ0JBQWdCLEdBQUcsd0NBQXdDLENBQUM7WUFDbEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRTNDLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUU3QixvRkFBb0Y7Z0JBQ3BGLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNsQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLDJEQUEyRCxFQUN0RSxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7Z0JBQ0QsbURBQW1EO3FCQUM5QyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN2QyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNyQyxJQUFJLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDMUMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQywyREFBMkQsRUFDdEUsSUFBSSxDQUNMLENBQ0YsQ0FBQztvQkFDSixDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXJERCx3Q0FxREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSA2LTMtMVxyXG4gKiBUaGUgc3RhdGVtZW50IGZvcm1pbmcgdGhlIGJvZHkgb2YgYSBzd2l0Y2gsIHdoaWxlLCBkby4uLndoaWxlIG9yIGZvciBzdGF0ZW1lbnQgc2hhbGwgYmUgYSBjb21wb3VuZCBzdGF0ZW1lbnQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfNl8zXzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC02LjMuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHN0YXRlbWVudCBmb3JtaW5nIHRoZSBib2R5IG9mIGEgc3dpdGNoLCB3aGlsZSwgZG8uLi53aGlsZSBvciBmb3Igc3RhdGVtZW50IHNoYWxsIGJlIGEgY29tcG91bmQgc3RhdGVtZW50JztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciB3aGlsZS9mb3IvZG8gY29udHJvbCBzdHJ1Y3R1cmVzXHJcbiAgICAgIGNvbnN0IGNvbnRyb2xGbG93UmVnZXggPSAvXlxccyood2hpbGV8Zm9yfGRvKVxccypcXChbXildKlxcKVxccyooLiopJC87XHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaChjb250cm9sRmxvd1JlZ2V4KTtcclxuICAgICAgXHJcbiAgICAgIGlmIChtYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IHJlc3QgPSBtYXRjaFsyXS50cmltKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSWYgdGhlcmUncyBjb250ZW50IG9uIHRoZSBzYW1lIGxpbmUgYW5kIGl0IGRvZXNuJ3Qgc3RhcnQgd2l0aCB7LCBpdCdzIGEgdmlvbGF0aW9uXHJcbiAgICAgICAgaWYgKHJlc3QgJiYgIXJlc3Quc3RhcnRzV2l0aCgneycpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYCR7bWF0Y2hbMV19IHN0YXRlbWVudCBib2R5IG11c3QgYmUgYSBjb21wb3VuZCBzdGF0ZW1lbnQgKHVzZSBicmFjZXMpYCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIElmIG5vdGhpbmcgb24gdGhlIHNhbWUgbGluZSwgY2hlY2sgdGhlIG5leHQgbGluZVxyXG4gICAgICAgIGVsc2UgaWYgKCFyZXN0ICYmIGkgKyAxIDwgbGluZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICBjb25zdCBuZXh0TGluZSA9IGxpbmVzW2kgKyAxXS50cmltKCk7XHJcbiAgICAgICAgICBpZiAobmV4dExpbmUgJiYgIW5leHRMaW5lLnN0YXJ0c1dpdGgoJ3snKSkge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAgIGAke21hdGNoWzFdfSBzdGF0ZW1lbnQgYm9keSBtdXN0IGJlIGEgY29tcG91bmQgc3RhdGVtZW50ICh1c2UgYnJhY2VzKWAsXHJcbiAgICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=