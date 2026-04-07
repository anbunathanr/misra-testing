"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.2
 * Function types shall be in prototype form with named parameters.
 * Detects function declarations where parameters are types without names.
 */
class Rule_C_8_2 {
    id = 'MISRA-C-8.2';
    description = 'Function types shall be in prototype form with named parameters';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    typeKeywords = new Set([
        'int', 'char', 'short', 'long', 'float', 'double', 'void',
        'unsigned', 'signed', 'struct', 'union', 'enum',
        'const', 'volatile', '_Bool', '_Complex',
    ]);
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Match function declarations (ending with ;)
        const protoRegex = /^(?:(?:static|extern|inline)\s+)*[\w\s*]+\s+(\w+)\s*\(([^)]*)\)\s*;/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.endsWith(';') || line.startsWith('#') || line.startsWith('//'))
                continue;
            const match = line.match(protoRegex);
            if (!match)
                continue;
            const funcName = match[1];
            const paramsStr = match[2].trim();
            // Skip if no params or void
            if (!paramsStr || paramsStr === 'void' || paramsStr === '')
                continue;
            // Skip control flow keywords
            if (['if', 'for', 'while', 'switch'].includes(funcName))
                continue;
            const params = paramsStr.split(',').map(p => p.trim());
            for (const param of params) {
                if (!param)
                    continue;
                // A param with no name is just a type (e.g., "int", "char*", "const int")
                // A named param has at least two tokens: type + name
                const tokens = param.replace(/\*/g, ' * ').trim().split(/\s+/).filter(Boolean);
                // Check if last token is a type keyword (meaning no name was given)
                const lastToken = tokens[tokens.length - 1].replace(/[*&]/, '');
                if (tokens.length === 1 || this.typeKeywords.has(lastToken)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Function '${funcName}' prototype parameter '${param}' has no name`, line));
                    break; // Report once per function
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_2 = Rule_C_8_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsVUFBVTtJQUNyQixFQUFFLEdBQUcsYUFBYSxDQUFDO0lBQ25CLFdBQVcsR0FBRyxpRUFBaUUsQ0FBQztJQUNoRixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFUCxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDdEMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTTtRQUN6RCxVQUFVLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTTtRQUMvQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxVQUFVO0tBQ3pDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4Qiw4Q0FBOEM7UUFDOUMsTUFBTSxVQUFVLEdBQUcscUVBQXFFLENBQUM7UUFFekYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFBRSxTQUFTO1lBRW5GLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLEtBQUs7Z0JBQUUsU0FBUztZQUVyQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRWxDLDRCQUE0QjtZQUM1QixJQUFJLENBQUMsU0FBUyxJQUFJLFNBQVMsS0FBSyxNQUFNLElBQUksU0FBUyxLQUFLLEVBQUU7Z0JBQUUsU0FBUztZQUVyRSw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7Z0JBQUUsU0FBUztZQUVsRSxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBRXZELEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxLQUFLO29CQUFFLFNBQVM7Z0JBQ3JCLDBFQUEwRTtnQkFDMUUscURBQXFEO2dCQUNyRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUUvRSxvRUFBb0U7Z0JBQ3BFLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hFLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDNUQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGFBQWEsUUFBUSwwQkFBMEIsS0FBSyxlQUFlLEVBQ25FLElBQUksQ0FDTCxDQUNGLENBQUM7b0JBQ0YsTUFBTSxDQUFDLDJCQUEyQjtnQkFDcEMsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBaEVELGdDQWdFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSA4LjJcclxuICogRnVuY3Rpb24gdHlwZXMgc2hhbGwgYmUgaW4gcHJvdG90eXBlIGZvcm0gd2l0aCBuYW1lZCBwYXJhbWV0ZXJzLlxyXG4gKiBEZXRlY3RzIGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyB3aGVyZSBwYXJhbWV0ZXJzIGFyZSB0eXBlcyB3aXRob3V0IG5hbWVzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ184XzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtOC4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdGdW5jdGlvbiB0eXBlcyBzaGFsbCBiZSBpbiBwcm90b3R5cGUgZm9ybSB3aXRoIG5hbWVkIHBhcmFtZXRlcnMnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdEZWNsYXJhdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBwcml2YXRlIHJlYWRvbmx5IHR5cGVLZXl3b3JkcyA9IG5ldyBTZXQoW1xyXG4gICAgJ2ludCcsICdjaGFyJywgJ3Nob3J0JywgJ2xvbmcnLCAnZmxvYXQnLCAnZG91YmxlJywgJ3ZvaWQnLFxyXG4gICAgJ3Vuc2lnbmVkJywgJ3NpZ25lZCcsICdzdHJ1Y3QnLCAndW5pb24nLCAnZW51bScsXHJcbiAgICAnY29uc3QnLCAndm9sYXRpbGUnLCAnX0Jvb2wnLCAnX0NvbXBsZXgnLFxyXG4gIF0pO1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIE1hdGNoIGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyAoZW5kaW5nIHdpdGggOylcclxuICAgIGNvbnN0IHByb3RvUmVnZXggPSAvXig/Oig/OnN0YXRpY3xleHRlcm58aW5saW5lKVxccyspKltcXHdcXHMqXStcXHMrKFxcdyspXFxzKlxcKChbXildKilcXClcXHMqOy87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKCFsaW5lLmVuZHNXaXRoKCc7JykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgbGluZS5zdGFydHNXaXRoKCcvLycpKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaChwcm90b1JlZ2V4KTtcclxuICAgICAgaWYgKCFtYXRjaCkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBmdW5jTmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICBjb25zdCBwYXJhbXNTdHIgPSBtYXRjaFsyXS50cmltKCk7XHJcblxyXG4gICAgICAvLyBTa2lwIGlmIG5vIHBhcmFtcyBvciB2b2lkXHJcbiAgICAgIGlmICghcGFyYW1zU3RyIHx8IHBhcmFtc1N0ciA9PT0gJ3ZvaWQnIHx8IHBhcmFtc1N0ciA9PT0gJycpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gU2tpcCBjb250cm9sIGZsb3cga2V5d29yZHNcclxuICAgICAgaWYgKFsnaWYnLCAnZm9yJywgJ3doaWxlJywgJ3N3aXRjaCddLmluY2x1ZGVzKGZ1bmNOYW1lKSkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBwYXJhbXMgPSBwYXJhbXNTdHIuc3BsaXQoJywnKS5tYXAocCA9PiBwLnRyaW0oKSk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IHBhcmFtIG9mIHBhcmFtcykge1xyXG4gICAgICAgIGlmICghcGFyYW0pIGNvbnRpbnVlO1xyXG4gICAgICAgIC8vIEEgcGFyYW0gd2l0aCBubyBuYW1lIGlzIGp1c3QgYSB0eXBlIChlLmcuLCBcImludFwiLCBcImNoYXIqXCIsIFwiY29uc3QgaW50XCIpXHJcbiAgICAgICAgLy8gQSBuYW1lZCBwYXJhbSBoYXMgYXQgbGVhc3QgdHdvIHRva2VuczogdHlwZSArIG5hbWVcclxuICAgICAgICBjb25zdCB0b2tlbnMgPSBwYXJhbS5yZXBsYWNlKC9cXCovZywgJyAqICcpLnRyaW0oKS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKTtcclxuXHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgbGFzdCB0b2tlbiBpcyBhIHR5cGUga2V5d29yZCAobWVhbmluZyBubyBuYW1lIHdhcyBnaXZlbilcclxuICAgICAgICBjb25zdCBsYXN0VG9rZW4gPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdLnJlcGxhY2UoL1sqJl0vLCAnJyk7XHJcbiAgICAgICAgaWYgKHRva2Vucy5sZW5ndGggPT09IDEgfHwgdGhpcy50eXBlS2V5d29yZHMuaGFzKGxhc3RUb2tlbikpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICBgRnVuY3Rpb24gJyR7ZnVuY05hbWV9JyBwcm90b3R5cGUgcGFyYW1ldGVyICcke3BhcmFtfScgaGFzIG5vIG5hbWVgLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIGJyZWFrOyAvLyBSZXBvcnQgb25jZSBwZXIgZnVuY3Rpb25cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19