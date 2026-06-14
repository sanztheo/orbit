@AGENTS.md

## Design System

All UI must follow these rules:

### Font
- Geist Sans (already wired via next/font/google in layout.tsx → --font-geist-sans CSS var)

### Icons
- Use lucide-react for ALL icons (already a dep). Never use emoji as icons in code.
- Common: ArrowLeft, Plus, Pencil, Trash2, Save, Loader2, Search, X, ChevronRight
- Nav: LayoutDashboard, Users, Briefcase, CheckSquare, BookOpen, Settings2
- Data: Mail, Phone, Building2, Calendar, Clock, Bell, Star, Tag, Link2

### Components (shadcn/ui only)
- Forms: <Input> <Select>/<SelectTrigger>/<SelectValue>/<SelectContent>/<SelectItem> <Textarea> <Label>
- Actions: <Button variant="default|outline|ghost|destructive" size="sm|default|icon">
- Layout: <Card>/<CardHeader>/<CardTitle>/<CardDescription>/<CardContent>/<CardFooter>
- Feedback: <Badge> <Skeleton> <Separator> <Tooltip>
- Never use raw <input>, <select>, <textarea>, <button> in page/component files

### Loading states
- Buttons: <Loader2 className="h-4 w-4 mr-2 animate-spin" /> before label text
- Sections: <Skeleton className="h-8 w-full" /> grid placeholders

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
