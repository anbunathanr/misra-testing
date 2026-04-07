"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_15_0_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 15-0-3
 * Control shall not be transferred into a try or catch block using a goto or a switch statement.
 * Detects goto or switch that jumps into try/catch blocks.
 */
class Rule_CPP_15_0_3 {
    id = 'MISRA-CPP-15.0.3';
    description = 'Control shall not be transferred into a try or catch block';
    severity = 'required';
    category = 'Exception handling';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track try/catch blocks and look for goto/switch that could jump into them
        const tryBlocks = [];
        let braceDepth = 0;
        let tryStart = -1;
        // First pass: identify try/catch blocks
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('try') && line.includes('{')) {
                tryStart = i;
                braceDepth = 1;
            }
            else if (tryStart >= 0) {
                braceDepth += (line.match(/{/g) || []).length;
                braceDepth -= (line.match(/}/g) || []).length;
                if (braceDepth === 0) {
                    tryBlocks.push({ start: tryStart, end: i });
                    tryStart = -1;
                }
            }
        }
        // Second pass: look for goto statements or labels inside try blocks
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || !line)
                continue;
            // Check for goto statements
            if (line.includes('goto')) {
                const gotoMatch = line.match(/goto\s+(\w+)/);
                if (gotoMatch) {
                    const label = gotoMatch[1];
                    // Check if the label is inside a try block
                    for (const block of tryBlocks) {
                        // Look for the label
                        for (let j = block.start; j <= block.end; j++) {
                            if (lines[j].includes(`${label}:`)) {
                                // goto is outside, label is inside
                                if (i < block.start || i > block.end) {
                                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `goto statement transfers control into a try/catch block`, line));
                                }
                            }
                        }
                    }
                }
            }
            // Check for switch statements that might jump into try blocks
            if (line.includes('switch')) {
                for (const block of tryBlocks) {
                    if (i < block.start && i + 10 > block.start) {
                        // Switch is close to a try block - potential violation
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `switch statement may transfer control into a try/catch block`, line));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_15_0_3 = Rule_CPP_15_0_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNS0wLTMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTE1LTAtMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLDREQUE0RCxDQUFDO0lBQzNFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQztJQUNoQyxRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4Qiw0RUFBNEU7UUFDNUUsTUFBTSxTQUFTLEdBQTBDLEVBQUUsQ0FBQztRQUM1RCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFbEIsd0NBQXdDO1FBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQy9DLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBQ2IsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNqQixDQUFDO2lCQUFNLElBQUksUUFBUSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN6QixVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDOUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBRTlDLElBQUksVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNyQixTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDNUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxvRUFBb0U7UUFDcEUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRTdDLDRCQUE0QjtZQUM1QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBRTNCLDJDQUEyQztvQkFDM0MsS0FBSyxNQUFNLEtBQUssSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDOUIscUJBQXFCO3dCQUNyQixLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDOUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDO2dDQUNuQyxtQ0FBbUM7Z0NBQ25DLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQ0FDckMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHlEQUF5RCxFQUN6RCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dDQUNKLENBQUM7NEJBQ0gsQ0FBQzt3QkFDSCxDQUFDO29CQUNILENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7WUFFRCw4REFBOEQ7WUFDOUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLEtBQUssTUFBTSxLQUFLLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQzlCLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQzVDLHVEQUF1RDt3QkFDdkQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDhEQUE4RCxFQUM5RCxJQUFJLENBQ0wsQ0FDRixDQUFDO29CQUNKLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBekZELDBDQXlGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDE1LTAtM1xyXG4gKiBDb250cm9sIHNoYWxsIG5vdCBiZSB0cmFuc2ZlcnJlZCBpbnRvIGEgdHJ5IG9yIGNhdGNoIGJsb2NrIHVzaW5nIGEgZ290byBvciBhIHN3aXRjaCBzdGF0ZW1lbnQuXHJcbiAqIERldGVjdHMgZ290byBvciBzd2l0Y2ggdGhhdCBqdW1wcyBpbnRvIHRyeS9jYXRjaCBibG9ja3MuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMTVfMF8zIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMTUuMC4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdDb250cm9sIHNoYWxsIG5vdCBiZSB0cmFuc2ZlcnJlZCBpbnRvIGEgdHJ5IG9yIGNhdGNoIGJsb2NrJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRXhjZXB0aW9uIGhhbmRsaW5nJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIFRyYWNrIHRyeS9jYXRjaCBibG9ja3MgYW5kIGxvb2sgZm9yIGdvdG8vc3dpdGNoIHRoYXQgY291bGQganVtcCBpbnRvIHRoZW1cclxuICAgIGNvbnN0IHRyeUJsb2NrczogQXJyYXk8eyBzdGFydDogbnVtYmVyOyBlbmQ6IG51bWJlciB9PiA9IFtdO1xyXG4gICAgbGV0IGJyYWNlRGVwdGggPSAwO1xyXG4gICAgbGV0IHRyeVN0YXJ0ID0gLTE7XHJcblxyXG4gICAgLy8gRmlyc3QgcGFzczogaWRlbnRpZnkgdHJ5L2NhdGNoIGJsb2Nrc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoJ3RyeScpICYmIGxpbmUuaW5jbHVkZXMoJ3snKSkge1xyXG4gICAgICAgIHRyeVN0YXJ0ID0gaTtcclxuICAgICAgICBicmFjZURlcHRoID0gMTtcclxuICAgICAgfSBlbHNlIGlmICh0cnlTdGFydCA+PSAwKSB7XHJcbiAgICAgICAgYnJhY2VEZXB0aCArPSAobGluZS5tYXRjaCgvey9nKSB8fCBbXSkubGVuZ3RoO1xyXG4gICAgICAgIGJyYWNlRGVwdGggLT0gKGxpbmUubWF0Y2goL30vZykgfHwgW10pLmxlbmd0aDtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoYnJhY2VEZXB0aCA9PT0gMCkge1xyXG4gICAgICAgICAgdHJ5QmxvY2tzLnB1c2goeyBzdGFydDogdHJ5U3RhcnQsIGVuZDogaSB9KTtcclxuICAgICAgICAgIHRyeVN0YXJ0ID0gLTE7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2Vjb25kIHBhc3M6IGxvb2sgZm9yIGdvdG8gc3RhdGVtZW50cyBvciBsYWJlbHMgaW5zaWRlIHRyeSBibG9ja3NcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBDaGVjayBmb3IgZ290byBzdGF0ZW1lbnRzXHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCdnb3RvJykpIHtcclxuICAgICAgICBjb25zdCBnb3RvTWF0Y2ggPSBsaW5lLm1hdGNoKC9nb3RvXFxzKyhcXHcrKS8pO1xyXG4gICAgICAgIGlmIChnb3RvTWF0Y2gpIHtcclxuICAgICAgICAgIGNvbnN0IGxhYmVsID0gZ290b01hdGNoWzFdO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFiZWwgaXMgaW5zaWRlIGEgdHJ5IGJsb2NrXHJcbiAgICAgICAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIHRyeUJsb2Nrcykge1xyXG4gICAgICAgICAgICAvLyBMb29rIGZvciB0aGUgbGFiZWxcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IGJsb2NrLnN0YXJ0OyBqIDw9IGJsb2NrLmVuZDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGxpbmVzW2pdLmluY2x1ZGVzKGAke2xhYmVsfTpgKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZ290byBpcyBvdXRzaWRlLCBsYWJlbCBpcyBpbnNpZGVcclxuICAgICAgICAgICAgICAgIGlmIChpIDwgYmxvY2suc3RhcnQgfHwgaSA+IGJsb2NrLmVuZCkge1xyXG4gICAgICAgICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAgICAgICAgIGBnb3RvIHN0YXRlbWVudCB0cmFuc2ZlcnMgY29udHJvbCBpbnRvIGEgdHJ5L2NhdGNoIGJsb2NrYCxcclxuICAgICAgICAgICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBmb3Igc3dpdGNoIHN0YXRlbWVudHMgdGhhdCBtaWdodCBqdW1wIGludG8gdHJ5IGJsb2Nrc1xyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygnc3dpdGNoJykpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIHRyeUJsb2Nrcykge1xyXG4gICAgICAgICAgaWYgKGkgPCBibG9jay5zdGFydCAmJiBpICsgMTAgPiBibG9jay5zdGFydCkge1xyXG4gICAgICAgICAgICAvLyBTd2l0Y2ggaXMgY2xvc2UgdG8gYSB0cnkgYmxvY2sgLSBwb3RlbnRpYWwgdmlvbGF0aW9uXHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgYHN3aXRjaCBzdGF0ZW1lbnQgbWF5IHRyYW5zZmVyIGNvbnRyb2wgaW50byBhIHRyeS9jYXRjaCBibG9ja2AsXHJcbiAgICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=