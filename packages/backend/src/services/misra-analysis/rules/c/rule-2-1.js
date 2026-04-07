"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_2_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 2.1
 * A project shall not contain unreachable code.
 * Detects statements after return/break/continue/goto at the same block level.
 */
class Rule_C_2_1 {
    id = 'MISRA-C-2.1';
    description = 'A project shall not contain unreachable code';
    severity = 'mandatory';
    category = 'Unused code';
    language = 'C';
    terminators = ['return', 'break', 'continue', 'goto'];
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            // Check if this line ends with a terminator statement
            const hasTerminator = this.terminators.some(t => {
                const regex = new RegExp(`\\b${t}\\b`);
                return regex.test(line) && line.endsWith(';');
            });
            if (!hasTerminator)
                continue;
            // Look ahead for unreachable code (non-empty, non-closing-brace lines)
            for (let j = i + 1; j < lines.length; j++) {
                const nextLine = lines[j].trim();
                // Stop at closing brace (end of block)
                if (nextLine === '}' || nextLine === '};' || nextLine === '')
                    continue;
                if (nextLine.startsWith('}'))
                    break;
                // Skip labels (case/default/goto targets)
                if (/^[a-zA-Z_]\w*\s*:/.test(nextLine) || nextLine.startsWith('case ') || nextLine === 'default:')
                    break;
                // This is unreachable code
                violations.push((0, rule_engine_1.createViolation)(this, j + 1, 0, 'Unreachable code detected after control flow statement', nextLine));
                break; // Only report first unreachable statement per block
            }
        }
        return violations;
    }
}
exports.Rule_C_2_1 = Rule_C_2_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTItMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsVUFBVTtJQUNyQixFQUFFLEdBQUcsYUFBYSxDQUFDO0lBQ25CLFdBQVcsR0FBRyw4Q0FBOEMsQ0FBQztJQUM3RCxRQUFRLEdBQUcsV0FBb0IsQ0FBQztJQUNoQyxRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFUCxXQUFXLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUV2RSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdCLHNEQUFzRDtZQUN0RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDOUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN2QyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxhQUFhO2dCQUFFLFNBQVM7WUFFN0IsdUVBQXVFO1lBQ3ZFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBRWpDLHVDQUF1QztnQkFDdkMsSUFBSSxRQUFRLEtBQUssR0FBRyxJQUFJLFFBQVEsS0FBSyxJQUFJLElBQUksUUFBUSxLQUFLLEVBQUU7b0JBQUUsU0FBUztnQkFDdkUsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztvQkFBRSxNQUFNO2dCQUVwQywwQ0FBMEM7Z0JBQzFDLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksUUFBUSxLQUFLLFVBQVU7b0JBQUUsTUFBTTtnQkFFekcsMkJBQTJCO2dCQUMzQixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0Qsd0RBQXdELEVBQ3hELFFBQVEsQ0FDVCxDQUNGLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLG9EQUFvRDtZQUM3RCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQW5ERCxnQ0FtREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMi4xXHJcbiAqIEEgcHJvamVjdCBzaGFsbCBub3QgY29udGFpbiB1bnJlYWNoYWJsZSBjb2RlLlxyXG4gKiBEZXRlY3RzIHN0YXRlbWVudHMgYWZ0ZXIgcmV0dXJuL2JyZWFrL2NvbnRpbnVlL2dvdG8gYXQgdGhlIHNhbWUgYmxvY2sgbGV2ZWwuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzJfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgcHJvamVjdCBzaGFsbCBub3QgY29udGFpbiB1bnJlYWNoYWJsZSBjb2RlJztcclxuICBzZXZlcml0eSA9ICdtYW5kYXRvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1VudXNlZCBjb2RlJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgcHJpdmF0ZSByZWFkb25seSB0ZXJtaW5hdG9ycyA9IFsncmV0dXJuJywgJ2JyZWFrJywgJ2NvbnRpbnVlJywgJ2dvdG8nXTtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aCAtIDE7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBsaW5lIGVuZHMgd2l0aCBhIHRlcm1pbmF0b3Igc3RhdGVtZW50XHJcbiAgICAgIGNvbnN0IGhhc1Rlcm1pbmF0b3IgPSB0aGlzLnRlcm1pbmF0b3JzLnNvbWUodCA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBcXFxcYiR7dH1cXFxcYmApO1xyXG4gICAgICAgIHJldHVybiByZWdleC50ZXN0KGxpbmUpICYmIGxpbmUuZW5kc1dpdGgoJzsnKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoIWhhc1Rlcm1pbmF0b3IpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gTG9vayBhaGVhZCBmb3IgdW5yZWFjaGFibGUgY29kZSAobm9uLWVtcHR5LCBub24tY2xvc2luZy1icmFjZSBsaW5lcylcclxuICAgICAgZm9yIChsZXQgaiA9IGkgKyAxOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICBjb25zdCBuZXh0TGluZSA9IGxpbmVzW2pdLnRyaW0oKTtcclxuXHJcbiAgICAgICAgLy8gU3RvcCBhdCBjbG9zaW5nIGJyYWNlIChlbmQgb2YgYmxvY2spXHJcbiAgICAgICAgaWYgKG5leHRMaW5lID09PSAnfScgfHwgbmV4dExpbmUgPT09ICd9OycgfHwgbmV4dExpbmUgPT09ICcnKSBjb250aW51ZTtcclxuICAgICAgICBpZiAobmV4dExpbmUuc3RhcnRzV2l0aCgnfScpKSBicmVhaztcclxuXHJcbiAgICAgICAgLy8gU2tpcCBsYWJlbHMgKGNhc2UvZGVmYXVsdC9nb3RvIHRhcmdldHMpXHJcbiAgICAgICAgaWYgKC9eW2EtekEtWl9dXFx3Klxccyo6Ly50ZXN0KG5leHRMaW5lKSB8fCBuZXh0TGluZS5zdGFydHNXaXRoKCdjYXNlICcpIHx8IG5leHRMaW5lID09PSAnZGVmYXVsdDonKSBicmVhaztcclxuXHJcbiAgICAgICAgLy8gVGhpcyBpcyB1bnJlYWNoYWJsZSBjb2RlXHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBqICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ1VucmVhY2hhYmxlIGNvZGUgZGV0ZWN0ZWQgYWZ0ZXIgY29udHJvbCBmbG93IHN0YXRlbWVudCcsXHJcbiAgICAgICAgICAgIG5leHRMaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgICBicmVhazsgLy8gT25seSByZXBvcnQgZmlyc3QgdW5yZWFjaGFibGUgc3RhdGVtZW50IHBlciBibG9ja1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==