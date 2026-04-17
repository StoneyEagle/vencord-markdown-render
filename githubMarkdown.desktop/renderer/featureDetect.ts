const PATTERNS: RegExp[] = [
  /^\s*\|.*\|.*\n\s*\|[\s\-:|]+\|/m,                  // table
  /^- \[[ xX]\] /m,                                     // task list
  /^> \[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]/mi,     // alert
  /^\$\$/m,                                             // block math
  /^```mermaid/m,                                       // mermaid
  /\[\^[\w-]+\]/,                                       // footnote ref
];

export function hasGfmFeature(content: string): boolean {
  for (const re of PATTERNS) if (re.test(content)) return true;
  return false;
}
