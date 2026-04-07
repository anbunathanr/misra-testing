"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_9_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 9.3
 * Arrays shall not be partially initialized.
 */
class Rule_C_9_3 {
    id = 'MISRA-C-9.3';
    description = 'Arrays shall not be partially initialized';
    severity = 'required';
    category = 'Initialization';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for array with explicit size but fewer initializers
            const arrayMatch = line.match(/\w+\s+\w+\[(\d+)\]\s*=\s*\{([^}]*)\}/);
            if (arrayMatch) {
                const size = parseInt(arrayMatch[1]);
                const initializers = arrayMatch[2].split(',').filter(s => s.trim());
                if (initializers.length > 0 && initializers.length < size) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Array partially initialized (${initializers.length} of ${size} elements)`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_9_3 = Rule_C_9_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS05LTMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTktMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLDJDQUEyQyxDQUFDO0lBQzFELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztJQUM1QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyw0REFBNEQ7WUFDNUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1lBQ3RFLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUVwRSxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7b0JBQzFELFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxnQ0FBZ0MsWUFBWSxDQUFDLE1BQU0sT0FBTyxJQUFJLFlBQVksRUFDMUUsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFuQ0QsZ0NBbUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDkuM1xyXG4gKiBBcnJheXMgc2hhbGwgbm90IGJlIHBhcnRpYWxseSBpbml0aWFsaXplZC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfOV8zIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTkuMyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQXJyYXlzIHNoYWxsIG5vdCBiZSBwYXJ0aWFsbHkgaW5pdGlhbGl6ZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdJbml0aWFsaXphdGlvbic7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIGFycmF5IHdpdGggZXhwbGljaXQgc2l6ZSBidXQgZmV3ZXIgaW5pdGlhbGl6ZXJzXHJcbiAgICAgIGNvbnN0IGFycmF5TWF0Y2ggPSBsaW5lLm1hdGNoKC9cXHcrXFxzK1xcdytcXFsoXFxkKylcXF1cXHMqPVxccypcXHsoW159XSopXFx9Lyk7XHJcbiAgICAgIGlmIChhcnJheU1hdGNoKSB7XHJcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHBhcnNlSW50KGFycmF5TWF0Y2hbMV0pO1xyXG4gICAgICAgIGNvbnN0IGluaXRpYWxpemVycyA9IGFycmF5TWF0Y2hbMl0uc3BsaXQoJywnKS5maWx0ZXIocyA9PiBzLnRyaW0oKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGluaXRpYWxpemVycy5sZW5ndGggPiAwICYmIGluaXRpYWxpemVycy5sZW5ndGggPCBzaXplKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYEFycmF5IHBhcnRpYWxseSBpbml0aWFsaXplZCAoJHtpbml0aWFsaXplcnMubGVuZ3RofSBvZiAke3NpemV9IGVsZW1lbnRzKWAsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=