"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_1_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-1-2
 * A project shall not contain infeasible paths.
 * Detects non-reachable code (statements after return/break/continue/throw).
 */
class Rule_CPP_0_1_2 {
    id = 'MISRA-CPP-0.1.2';
    description = 'A project shall not contain non-reachable code';
    severity = 'required';
    category = 'Unused code';
    language = 'CPP';
    terminators = ['return', 'break', 'continue', 'goto', 'throw'];
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            const hasTerminator = this.terminators.some(t => {
                const regex = new RegExp(`\\b${t}\\b`);
                return regex.test(line) && line.endsWith(';');
            });
            if (!hasTerminator)
                continue;
            for (let j = i + 1; j < lines.length; j++) {
                const nextLine = lines[j].trim();
                if (nextLine === '' || nextLine === '}' || nextLine === '};')
                    continue;
                if (nextLine.startsWith('}'))
                    break;
                // Skip labels (case/default/goto targets)
                if (/^[a-zA-Z_]\w*\s*:/.test(nextLine) || nextLine.startsWith('case ') || nextLine === 'default:')
                    break;
                violations.push((0, rule_engine_1.createViolation)(this, j + 1, 0, 'Non-reachable code detected after control flow statement', nextLine));
                break;
            }
        }
        return violations;
    }
}
exports.Rule_CPP_0_1_2 = Rule_CPP_0_1_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTEtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0xLTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxnREFBZ0QsQ0FBQztJQUMvRCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFVCxXQUFXLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFaEYsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU3QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDOUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN2QyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxhQUFhO2dCQUFFLFNBQVM7WUFFN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFFakMsSUFBSSxRQUFRLEtBQUssRUFBRSxJQUFJLFFBQVEsS0FBSyxHQUFHLElBQUksUUFBUSxLQUFLLElBQUk7b0JBQUUsU0FBUztnQkFDdkUsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztvQkFBRSxNQUFNO2dCQUVwQywwQ0FBMEM7Z0JBQzFDLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksUUFBUSxLQUFLLFVBQVU7b0JBQUUsTUFBTTtnQkFFekcsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDBEQUEwRCxFQUMxRCxRQUFRLENBQ1QsQ0FDRixDQUFDO2dCQUNGLE1BQU07WUFDUixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQS9DRCx3Q0ErQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAwLTEtMlxyXG4gKiBBIHByb2plY3Qgc2hhbGwgbm90IGNvbnRhaW4gaW5mZWFzaWJsZSBwYXRocy5cclxuICogRGV0ZWN0cyBub24tcmVhY2hhYmxlIGNvZGUgKHN0YXRlbWVudHMgYWZ0ZXIgcmV0dXJuL2JyZWFrL2NvbnRpbnVlL3Rocm93KS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8wXzFfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTAuMS4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdBIHByb2plY3Qgc2hhbGwgbm90IGNvbnRhaW4gbm9uLXJlYWNoYWJsZSBjb2RlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnVW51c2VkIGNvZGUnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIHByaXZhdGUgcmVhZG9ubHkgdGVybWluYXRvcnMgPSBbJ3JldHVybicsICdicmVhaycsICdjb250aW51ZScsICdnb3RvJywgJ3Rocm93J107XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGggLSAxOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuXHJcbiAgICAgIGNvbnN0IGhhc1Rlcm1pbmF0b3IgPSB0aGlzLnRlcm1pbmF0b3JzLnNvbWUodCA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBcXFxcYiR7dH1cXFxcYmApO1xyXG4gICAgICAgIHJldHVybiByZWdleC50ZXN0KGxpbmUpICYmIGxpbmUuZW5kc1dpdGgoJzsnKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoIWhhc1Rlcm1pbmF0b3IpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICBjb25zdCBuZXh0TGluZSA9IGxpbmVzW2pdLnRyaW0oKTtcclxuXHJcbiAgICAgICAgaWYgKG5leHRMaW5lID09PSAnJyB8fCBuZXh0TGluZSA9PT0gJ30nIHx8IG5leHRMaW5lID09PSAnfTsnKSBjb250aW51ZTtcclxuICAgICAgICBpZiAobmV4dExpbmUuc3RhcnRzV2l0aCgnfScpKSBicmVhaztcclxuXHJcbiAgICAgICAgLy8gU2tpcCBsYWJlbHMgKGNhc2UvZGVmYXVsdC9nb3RvIHRhcmdldHMpXHJcbiAgICAgICAgaWYgKC9eW2EtekEtWl9dXFx3Klxccyo6Ly50ZXN0KG5leHRMaW5lKSB8fCBuZXh0TGluZS5zdGFydHNXaXRoKCdjYXNlICcpIHx8IG5leHRMaW5lID09PSAnZGVmYXVsdDonKSBicmVhaztcclxuXHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBqICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ05vbi1yZWFjaGFibGUgY29kZSBkZXRlY3RlZCBhZnRlciBjb250cm9sIGZsb3cgc3RhdGVtZW50JyxcclxuICAgICAgICAgICAgbmV4dExpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==